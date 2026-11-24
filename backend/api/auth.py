import re
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.api.auth_security import (
    create_access_token,
    get_current_user_from_header,
    hash_password,
    verify_password,
)
from backend.database import (
    create_user_record,
    get_user_by_id,
    get_user_by_username_or_email,
    update_user_last_login,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# -------------------------------------------------------------
# Request & Response Models
# -------------------------------------------------------------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    def validate_username(cls, v):
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9_.-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, underscores, dashes, and dots."
            )
        return v

    @field_validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Please provide a valid email address with an '@' symbol.")
        parts = v.split("@")
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            raise ValueError("Please provide a valid email address (e.g. name@example.com).")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("/register")
def register(request: RegisterRequest):
    # Check if username or email is already taken
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

    # Hash password with cryptographically random salt
    pw_hash, salt = hash_password(request.password)

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
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": request.username,
            "email": request.email,
            "role": "user",
        },
        "message": "Account created successfully!",
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

    # Update login timestamp and issue JWT access token
    update_user_last_login(user["id"])
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
        },
        "message": "Welcome back!",
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
        "created_at": str(user["created_at"]),
        "last_login": str(user["last_login"]) if user["last_login"] else None,
    }
