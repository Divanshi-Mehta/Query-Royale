from getpass import getpass

from backend.api.auth_security import hash_password
from backend.database import (
    get_db_type,
    create_user_record,
    get_user_by_username_or_email,
)

if get_db_type() != "mysql":
    raise RuntimeError("MySQL is not connected. Setup stopped.")

username = "admin"
email = "admin@queryroyale.local"

existing_user = get_user_by_username_or_email(username)
existing_email = get_user_by_username_or_email(email)

if existing_user or existing_email:
    print("Admin username or email already exists.")
else:
    password = getpass("Enter admin account password: ")

    if not 6 <= len(password) <= 128:
        raise ValueError("Password must contain 6-128 characters.")

    password_hash, password_salt = hash_password(password)

    user_id = create_user_record(
        username=username,
        email=email,
        password_hash=password_hash,
        password_salt=password_salt,
        role="admin",
        is_2fa_enabled=0,
    )

    print("Admin account created successfully!")
    print("User ID:", user_id)
    print("Database:", get_db_type())