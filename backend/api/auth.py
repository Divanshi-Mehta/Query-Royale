import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field, field_validator

from backend.api.auth_security import (
    create_access_token,
    create_preauth_token,
    decode_token,
    get_current_user_from_header,
    hash_password,
    verify_password,
)
from backend.api.qr_generator import generate_qr_svg
from backend.api.totp import (
    generate_backup_codes,
    generate_totp_secret,
    get_otpauth_url,
    verify_totp_code,
)
from backend.database import (
    create_user_record,
    get_user_by_id,
    get_user_by_username_or_email,
    update_user_2fa_record,
    update_user_backup_codes,
    update_user_last_login,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# -------------------------------------------------------------
# Request & Response Models
# -------------------------------------------------------------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=6, max_length=128)
    enable_2fa_now: bool = False

    @field_validator("username")
    def validate_username(cls, v):
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, underscores, and dashes."
            )
        return v

    @field_validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Please provide a valid email address.")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class Login2FARequest(BaseModel):
    pre_auth_token: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None


class TwoFAConfirmRequest(BaseModel):
    secret: str
    totp_code: str
    backup_codes: List[str]


class TwoFADisableRequest(BaseModel):
    password: str


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("/register")
def register(request: RegisterRequest):
    # Check if username or email already taken
    existing_user = get_user_by_username_or_email(request.username)
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username is already registered."
        )

    existing_email = get_user_by_username_or_email(request.email)
    if existing_email:
        raise HTTPException(
            status_code=400, detail="Email address is already registered."
        )

    # Hash password with random salt
    pw_hash, salt = hash_password(request.password)

    if not request.enable_2fa_now:
        # Standard registration without 2FA
        user_id = create_user_record(
            username=request.username,
            email=request.email,
            password_hash=pw_hash,
            password_salt=salt,
            role="user",
            is_2fa_enabled=0,
        )
        token = create_access_token(user_id=user_id, username=request.username)
        return {
            "status": "success",
            "requires_2fa": False,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "username": request.username,
                "email": request.email,
                "role": "user",
                "is_2fa_enabled": False,
            },
            "message": "Account created successfully!",
        }

    # Registration with 2FA setup
    secret = generate_totp_secret()
    backup_codes = generate_backup_codes(5)
    otpauth_url = get_otpauth_url(request.username, secret)
    qr_svg = generate_qr_svg(otpauth_url)

    # Save user with 2FA enabled
    user_id = create_user_record(
        username=request.username,
        email=request.email,
        password_hash=pw_hash,
        password_salt=salt,
        role="user",
        is_2fa_enabled=1,
        totp_secret=secret,
        backup_codes=backup_codes,
    )

    pre_auth_token = create_preauth_token(user_id, request.username)

    return {
        "status": "2fa_setup_required",
        "requires_2fa": True,
        "pre_auth_token": pre_auth_token,
        "user_id": user_id,
        "username": request.username,
        "email": request.email,
        "totp_secret": secret,
        "otpauth_url": otpauth_url,
        "qr_svg": qr_svg,
        "backup_codes": backup_codes,
        "message": "Account created! Scan the QR code or enter the key in your authenticator app to complete setup.",
    }


@router.post("/login")
def login(request: LoginRequest):
    user = get_user_by_username_or_email(request.username.strip())
    if not user:
        raise HTTPException(
            status_code=401, detail="Invalid username/email or password."
        )

    if not verify_password(
        request.password, user["password_hash"], user["password_salt"]
    ):
        raise HTTPException(
            status_code=401, detail="Invalid username/email or password."
        )

    # Check if 2FA is required for this account
    is_2fa_active = bool(user["is_2fa_enabled"])

    if is_2fa_active:
        pre_auth_token = create_preauth_token(user["id"], user["username"])
        return {
            "status": "2fa_required",
            "requires_2fa": True,
            "pre_auth_token": pre_auth_token,
            "user_id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "message": "Two-factor authentication required. Please enter your 6-digit authenticator code.",
        }

    # Direct login when 2FA is not enabled
    update_user_last_login(user["id"])
    token = create_access_token(
        user_id=user["id"],
        username=user["username"],
        role=user.get("role", "user"),
    )

    return {
        "status": "success",
        "requires_2fa": False,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user.get("role", "user"),
            "is_2fa_enabled": False,
        },
        "message": "Welcome back!",
    }


@router.post("/login-2fa")
def login_2fa(request: Login2FARequest):
    # Validate the pre_auth_token
    payload = decode_token(request.pre_auth_token, expected_type="2fa_preauth")
    user_id = int(payload["sub"])

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not user["is_2fa_enabled"]:
        raise HTTPException(
            status_code=400,
            detail="Two-factor authentication is not active on this account.",
        )

    verified = False

    # Check TOTP 6-digit code
    if request.totp_code:
        totp_secret = user["totp_secret"]
        if totp_secret and verify_totp_code(totp_secret, request.totp_code):
            verified = True
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid 6-digit verification code. Please check your authenticator app and try again.",
            )

    # Check Backup recovery code
    elif request.backup_code:
        raw_backups = user.get("backup_codes")
        backup_list = json.loads(raw_backups) if raw_backups else []
        clean_input_code = request.backup_code.strip().upper()

        if clean_input_code in [c.upper() for c in backup_list]:
            # Consume the single-use backup code
            remaining = [
                c for c in backup_list if c.upper() != clean_input_code
            ]
            update_user_backup_codes(user_id, remaining)
            verified = True
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid or previously used backup recovery code.",
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide a 6-digit TOTP code or backup recovery code.",
        )

    if not verified:
        raise HTTPException(
            status_code=400, detail="Two-factor authentication failed."
        )

    # Authentication successful: update login timestamp and return JWT access token
    update_user_last_login(user_id)
    token = create_access_token(
        user_id=user["id"],
        username=user["username"],
        role=user.get("role", "user"),
    )

    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user.get("role", "user"),
            "is_2fa_enabled": True,
        },
        "message": "2FA verification successful. Welcome back!",
    }


@router.get("/me")
def get_me(user_info: Dict[str, Any] = Depends(get_current_user_from_header)):
    user = get_user_by_id(user_info["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "is_2fa_enabled": bool(user["is_2fa_enabled"]),
        "created_at": str(user["created_at"]),
        "last_login": str(user["last_login"]) if user["last_login"] else None,
    }


@router.post("/2fa/setup")
def setup_2fa(
    user_info: Dict[str, Any] = Depends(get_current_user_from_header),
):
    user = get_user_by_id(user_info["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    secret = generate_totp_secret()
    backup_codes = generate_backup_codes(5)
    otpauth_url = get_otpauth_url(user["username"], secret)
    qr_svg = generate_qr_svg(otpauth_url)

    return {
        "secret": secret,
        "otpauth_url": otpauth_url,
        "qr_svg": qr_svg,
        "backup_codes": backup_codes,
    }


@router.post("/2fa/confirm")
def confirm_2fa(
    request: TwoFAConfirmRequest,
    user_info: Dict[str, Any] = Depends(get_current_user_from_header),
):
    user_id = user_info["user_id"]

    # Verify that the test code matches the provided secret
    if not verify_totp_code(request.secret, request.totp_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid 6-digit confirmation code. Please make sure your authenticator app is synced and enter the code again.",
        )

    # Save to database
    update_user_2fa_record(
        user_id=user_id,
        is_2fa_enabled=True,
        totp_secret=request.secret,
        backup_codes=request.backup_codes,
    )

    return {
        "status": "success",
        "message": "Two-factor authentication successfully activated for your account!",
        "is_2fa_enabled": True,
    }


@router.post("/2fa/disable")
def disable_2fa(
    request: TwoFADisableRequest,
    user_info: Dict[str, Any] = Depends(get_current_user_from_header),
):
    user = get_user_by_id(user_info["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(
        request.password, user["password_hash"], user["password_salt"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Incorrect password. Password is required to disable 2FA.",
        )

    update_user_2fa_record(
        user_id=user["id"],
        is_2fa_enabled=False,
        totp_secret=None,
        backup_codes=None,
    )

    return {
        "status": "success",
        "message": "Two-factor authentication has been disabled.",
        "is_2fa_enabled": False,
    }


@router.post("/2fa/regenerate-backups")
def regenerate_backups(
    user_info: Dict[str, Any] = Depends(get_current_user_from_header),
):
    user = get_user_by_id(user_info["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not user["is_2fa_enabled"]:
        raise HTTPException(
            status_code=400,
            detail="2FA must be active to generate backup codes.",
        )

    new_codes = generate_backup_codes(5)
    update_user_backup_codes(user["id"], new_codes)

    return {
        "status": "success",
        "backup_codes": new_codes,
        "message": "New backup recovery codes generated. Old codes are now invalid.",
    }
