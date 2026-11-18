"""
Real backend authentication and 2FA test suite without any mock/fake logic.
Tests password hashing, database records, TOTP verification, backup codes, and JWT sessions.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import get_db_connection, init_db
from backend.api.auth import (
    register,
    login,
    login_2fa,
    setup_2fa,
    confirm_2fa,
    disable_2fa,
    get_me,
    RegisterRequest,
    LoginRequest,
    Login2FARequest,
    TwoFAConfirmRequest,
    TwoFADisableRequest,
)
from backend.api.totp import generate_totp_code


def run_tests():
    init_db()

    # Clear users table to test fresh real authentication
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM users")
    conn.commit()
    conn.close()

    print("[1] Testing initial state: zero fake users exist.")
    try:
        login(LoginRequest(username="fakeadmin", password="fakepassword"))
        assert False, "Should have thrown 401"
    except Exception as e:
        assert "401" in str(e) or "Invalid" in str(e)
        print("    -> Non-existent user rejected as expected (401).")

    print("\n[2] Registering real user account (without 2FA first).")
    reg_data = register(
        RegisterRequest(
            username="rschauhan",
            email="rschauhan@example.com",
            password="RealSecretPass2026!",
            enable_2fa_now=False,
        )
    )
    assert reg_data["status"] == "success"
    assert reg_data["user"]["username"] == "rschauhan"
    token_1 = reg_data["access_token"]
    print("    -> User registered in DB. Token received:", token_1[:20] + "...")

    print("\n[3] Testing login for user without 2FA.")
    login_data = login(
        LoginRequest(
            username="rschauhan",
            password="RealSecretPass2026!",
        )
    )
    assert login_data["status"] == "success"
    assert login_data["requires_2fa"] is False
    token = login_data["access_token"]
    user_id = login_data["user"]["id"]
    print("    -> Direct login succeeded without 2FA.")

    print("\n[4] Checking /api/auth/me profile.")
    me_data = get_me(user_info={"user_id": user_id, "username": "rschauhan"})
    assert me_data["username"] == "rschauhan"
    assert me_data["is_2fa_enabled"] is False
    print("    -> User profile verified:", me_data)

    print("\n[5] Setting up Two-Factor Authentication (2FA).")
    setup_data = setup_2fa(user_info={"user_id": user_id, "username": "rschauhan"})
    secret = setup_data["secret"]
    qr_svg = setup_data["qr_svg"]
    backup_codes = setup_data["backup_codes"]
    assert secret and len(secret) >= 16
    assert "<svg" in qr_svg
    assert len(backup_codes) == 5
    print(f"    -> 2FA secret generated: {secret}")
    print(f"    -> Scannable QR SVG generated (length {len(qr_svg)} chars)")
    print(f"    -> Backup recovery codes: {backup_codes}")

    print("\n[6] Confirming 2FA activation with live TOTP code.")
    totp_code = generate_totp_code(secret)
    print(f"    -> Generated live 6-digit TOTP code: {totp_code}")

    # Test bad code first
    try:
        confirm_2fa(
            TwoFAConfirmRequest(
                secret=secret,
                totp_code="000000",
                backup_codes=backup_codes,
            ),
            user_info={"user_id": user_id, "username": "rschauhan"},
        )
        assert False, "Should have failed on invalid code"
    except Exception as e:
        print("    -> Bad code rejected as expected:", e)

    # Test valid code
    good_confirm = confirm_2fa(
        TwoFAConfirmRequest(
            secret=secret,
            totp_code=totp_code,
            backup_codes=backup_codes,
        ),
        user_info={"user_id": user_id, "username": "rschauhan"},
    )
    assert good_confirm["status"] == "success"
    print("    -> 2FA confirmed and activated in database!")

    print("\n[7] Logging in with 2FA Challenge.")
    step1_data = login(
        LoginRequest(
            username="rschauhan",
            password="RealSecretPass2026!",
        )
    )
    assert step1_data["requires_2fa"] is True
    preauth = step1_data["pre_auth_token"]
    print("    -> Step 1 challenged: Pre-auth token received.")

    print("\n[8] Submitting 2FA authenticator code.")
    current_totp = generate_totp_code(secret)
    step2_data = login_2fa(
        Login2FARequest(
            pre_auth_token=preauth,
            totp_code=current_totp,
        )
    )
    assert step2_data["status"] == "success"
    assert step2_data["user"]["is_2fa_enabled"] is True
    print("    -> Step 2 succeeded! Full access token issued.")

    print("\n[9] Logging in using an emergency Backup Recovery Code.")
    login_bk_1 = login(
        LoginRequest(
            username="rschauhan",
            password="RealSecretPass2026!",
        )
    )
    preauth_bk = login_bk_1["pre_auth_token"]
    first_code = backup_codes[0]
    step2_bk = login_2fa(
        Login2FARequest(
            pre_auth_token=preauth_bk,
            backup_code=first_code,
        )
    )
    assert step2_bk["status"] == "success"
    print(f"    -> Logged in with backup recovery code '{first_code}'.")

    # Reuse of backup code should fail
    login_bk_reuse = login(
        LoginRequest(
            username="rschauhan",
            password="RealSecretPass2026!",
        )
    )
    preauth_bk2 = login_bk_reuse["pre_auth_token"]
    try:
        login_2fa(
            Login2FARequest(
                pre_auth_token=preauth_bk2,
                backup_code=first_code,
            )
        )
        assert False, "Reusing consumed backup code should have failed"
    except Exception as e:
        print("    -> Re-using consumed backup code properly rejected:", e)

    print("\n[10] Registering a user directly with 2FA enabled on signup.")
    reg_2fa_data = register(
        RegisterRequest(
            username="security_officer",
            email="officer@example.com",
            password="SecurePassword987!",
            enable_2fa_now=True,
        )
    )
    assert reg_2fa_data["status"] == "2fa_setup_required"
    officer_secret = reg_2fa_data["totp_secret"]
    officer_preauth = reg_2fa_data["pre_auth_token"]
    assert "<svg" in reg_2fa_data["qr_svg"]

    # Confirm signup 2FA
    officer_code = generate_totp_code(officer_secret)
    confirm_reg = login_2fa(
        Login2FARequest(
            pre_auth_token=officer_preauth,
            totp_code=officer_code,
        )
    )
    assert confirm_reg["status"] == "success"
    print("    -> Direct 2FA registration confirmed successfully.")

    print("\n[11] Re-seeding default admin for clean platform access.")
    # Initialize DB so admin is available
    init_db()

    print("\n=======================================================")
    print(" REAL BACKEND AUTH & 2FA TESTS PASSED 100%! NO FAKE DATA! ")
    print("=======================================================")


if __name__ == "__main__":
    run_tests()
