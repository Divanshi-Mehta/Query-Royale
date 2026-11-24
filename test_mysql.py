
import os
from pathlib import Path

from backend import database

print("Database file:", database.__file__)
print("Environment file exists:", Path("backend/.env").exists())

print("\nEnvironment:")
print("DB_HOST:", os.getenv("DB_HOST"))
print("DB_NAME:", os.getenv("DB_NAME"))
print("DB_USER:", os.getenv("DB_USER"))

print("\nTesting get_db_type():")
try:
    print("Database type:", database.get_db_type())
except Exception as e:
    print("Error:", type(e).__name__, str(e))

print("\nTesting get_db_connection():")
try:
    conn = database.get_db_connection()
    print("Connection type:", type(conn))
    conn.close()
except Exception as e:
    print("Error:", type(e).__name__, str(e))
