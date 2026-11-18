import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import List, Optional
from urllib.parse import quote


def generate_totp_secret() -> str:
    """Generate a 160-bit (20 bytes) cryptographically random Base32 TOTP secret."""
    random_bytes = secrets.token_bytes(20)
    return base64.b32encode(random_bytes).decode("ascii").replace("=", "")


def generate_totp_code(secret_b32: str, timestamp: Optional[int] = None) -> str:
    """
    Generate standard 6-digit TOTP code (RFC 6238) for a given Base32 secret
    and Unix timestamp (defaulting to current time).
    """
    if timestamp is None:
        timestamp = int(time.time())

    # Standard 30-second window
    counter = timestamp // 30

    # Ensure secret is properly padded for Base32 decoding
    secret_cleaned = secret_b32.strip().replace(" ", "").upper()
    padding = (8 - len(secret_cleaned) % 8) % 8
    secret_padded = secret_cleaned + ("=" * padding)
    key = base64.b32decode(secret_padded, casefold=True)

    # 8-byte big-endian counter
    msg = struct.pack(">Q", counter)

    # HMAC-SHA1
    digest = hmac.new(key, msg, hashlib.sha1).digest()

    # Dynamic truncation (RFC 4226)
    offset = digest[19] & 0x0F
    code_int = (
        struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    ) % 1_000_000

    return f"{code_int:06d}"


def verify_totp_code(secret_b32: str, code: str, window: int = 1) -> bool:
    """
    Verify if a 6-digit TOTP code is valid within the time skew window
    (default: window=1 allows -30s to +30s).
    """
    if not secret_b32 or not code:
        return False

    code_cleaned = str(code).strip().replace(" ", "")
    if len(code_cleaned) != 6 or not code_cleaned.isdigit():
        return False

    now = int(time.time())
    # Test windows: current, -1, +1 (or up to window)
    for step_offset in range(-window, window + 1):
        test_time = now + (step_offset * 30)
        expected = generate_totp_code(secret_b32, test_time)
        if hmac.compare_digest(expected, code_cleaned):
            return True

    return False


def generate_backup_codes(count: int = 5) -> List[str]:
    """Generate human-friendly single-use recovery backup codes."""
    codes = []
    for _ in range(count):
        part1 = secrets.token_hex(2).upper()
        part2 = secrets.token_hex(2).upper()
        codes.append(f"QR-{part1}-{part2}")
    return codes


def get_otpauth_url(
    username: str, secret: str, issuer: str = "Query Royale"
) -> str:
    """Generate standard otpauth:// URI for authenticator applications."""
    encoded_issuer = quote(issuer)
    encoded_label = quote(f"{issuer}:{username}")
    return (
        f"otpauth://totp/{encoded_label}?"
        f"secret={secret}&issuer={encoded_issuer}&algorithm=SHA1&digits=6&period=30"
    )
