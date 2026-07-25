import mysql.connector
from mysql.connector import Error
from colorama import Fore

from config.settings import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME


# Order matters: product_comments depends on products (FK).
TABLE_DEFINITIONS = [
    (
        "categories",
        """
        CREATE TABLE IF NOT EXISTS `categories` (
          `category_ID` int(11) NOT NULL AUTO_INCREMENT,
          `slug` varchar(120) NOT NULL,
          `title` varchar(350) NOT NULL,
          `image` varchar(350) NOT NULL DEFAULT '',
          `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`category_ID`),
          UNIQUE KEY `uq_categories_slug` (`slug`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
    ),
    (
        "products",
        """
        CREATE TABLE IF NOT EXISTS `products` (
          `product_ID` int(11) NOT NULL AUTO_INCREMENT,
          `image` varchar(350) NOT NULL,
          `title` varchar(350) NOT NULL,
          `description` varchar(350) NOT NULL,
          `category` varchar(350) NOT NULL,
          `price` varchar(350) NOT NULL,
          PRIMARY KEY (`product_ID`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
    ),
    (
        "restaurantusers",
        """
        CREATE TABLE IF NOT EXISTS `restaurantusers` (
          `user_ID` varchar(350) NOT NULL,
          `username` varchar(350) NOT NULL,
          `password` varchar(350) NOT NULL,
          `email` varchar(350) NOT NULL,
          `role` varchar(350) NOT NULL,
          `conversation_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
          PRIMARY KEY (`user_ID`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
    ),
    (
        "product_comments",
        """
        CREATE TABLE IF NOT EXISTS `product_comments` (
          `comment_ID` int(11) NOT NULL AUTO_INCREMENT,
          `product_ID` int(11) NOT NULL,
          `user_ID` varchar(350) NOT NULL,
          `content` text NOT NULL,
          `rating` tinyint(4) NOT NULL DEFAULT 5,
          `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`comment_ID`),
          KEY `idx_product_comments_product` (`product_ID`),
          KEY `idx_product_comments_user` (`user_ID`),
          CONSTRAINT `fk_product_comments_product`
            FOREIGN KEY (`product_ID`) REFERENCES `products` (`product_ID`)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
    ),
]


def _connect(database=None):
    kwargs = {
        "host": DB_HOST,
        "user": DB_USER,
        "password": DB_PASSWORD,
    }
    if database:
        kwargs["database"] = database
    return mysql.connector.connect(**kwargs)


def _table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        LIMIT 1
        """,
        (DB_NAME, table_name),
    )
    return cursor.fetchone() is not None


def ensure_database():
    connection = None
    cursor = None
    try:
        connection = _connect()
        cursor = connection.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
        )
        connection.commit()
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def ensure_tables():
    connection = None
    cursor = None
    created = []

    try:
        connection = _connect(DB_NAME)
        cursor = connection.cursor()

        for table_name, ddl in TABLE_DEFINITIONS:
            if _table_exists(cursor, table_name):
                continue

            cursor.execute(ddl)
            created.append(table_name)
            print(Fore.YELLOW + f"[SCHEMA]: Created missing table `{table_name}`")

        connection.commit()

        if not created:
            print(Fore.GREEN + "[SCHEMA]: All required tables already exist.")
        else:
            print(
                Fore.GREEN
                + f"[SCHEMA]: Ensured schema. Created: {', '.join(created)}"
            )

    except Error as e:
        print(Fore.RED + f"[SCHEMA]: Failed to ensure tables: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def ensure_schema():
    """Create database + missing tables on app startup."""
    print(Fore.LIGHTBLUE_EX + "[SCHEMA]: Checking database schema...")
    ensure_database()
    ensure_tables()

    try:
        from models.category import Category

        Category.seed_defaults()
        print(Fore.GREEN + "[SCHEMA]: Default categories ensured.")
    except Exception as e:
        print(Fore.YELLOW + f"[SCHEMA]: Category seed skipped: {e}")
