import mysql.connector
from mysql.connector import Error
from config.settings import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

def get_db_connection():
    connection = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    # Force Tehran's clock for this session regardless of the MySQL server's
    # own configured timezone, so CURRENT_TIMESTAMP always produces Tehran
    # local time. Iran has had no DST since 2022, so the fixed +03:30 offset
    # never changes. This must stay consistent with helpers.dates.to_iso_tehran,
    # which assumes naive datetimes coming back from the DB are Tehran time.
    cursor = connection.cursor()
    cursor.execute("SET time_zone = '+03:30'")
    cursor.close()
    return connection

def execute_query(query, params=None, fetchone=False, fetchall=False, commit=False):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())

        if commit:
            connection.commit()

        if fetchone:
            return cursor.fetchone()

        if fetchall:
            return cursor.fetchall()

        return True

    except Error as e:
        raise e

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()