from database import get_db_connection


try:
    connection = get_db_connection()

    print(" Database connection successful!")

    connection.close()
    print(" Connection closed.")

except Exception as error:
    print(" Database connection failed!")
    print("Error:", error)