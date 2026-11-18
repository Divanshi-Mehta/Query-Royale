import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
from fastapi import Header, HTTPException

# 256-bit secret key for HMAC SHA-256 JWT
JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "query_royale_prod_jwt_super_secret_auth_key_2026_9876543210_token_encryption",
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
PREAUTH_TOKEN_EXPIRE_MINUTES = 5


def hash_password(password: str) -> Tuple[str, str]:
    """Generates a PBKDF2-HMAC-SHA256 salted hash and hex salt."""
    salt_bytes = secrets.token_bytes(16)
    salt_hex = salt_bytes.hex()
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        100_000,
    ).hex()
    return pw_hash, salt_hex


def verify_password(password: str, stored_hash: str, salt_hex: str) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash and salt."""
    try:
        salt_bytes = bytes.fromhex(salt_hex)
        calc_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_bytes,
            100_000,
        ).hex()
        return hmac.compare_digest(calc_hash, stored_hash)
    except Exception:
        return False


def create_access_token(
    user_id: int,
    username: str,
    role: str = "user",
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed JWT access token for full application authentication."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_preauth_token(user_id: int, username: str) -> str:
    """Creates a short-lived JWT token valid strictly for completing 2FA."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=PREAUTH_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "2fa_preauth",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """Decodes and validates a JWT token and its intended claim type."""
    try:
        payload = jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token type. Expected {expected_type} token.",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Authentication token has expired."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401, detail="Invalid authentication token."
        )


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Dependency helper to extract user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected Bearer token.",
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_token(token, expected_type="access")
    user_id = int(payload["sub"])
    return {"user_id": user_id, "username": payload["username"]}
