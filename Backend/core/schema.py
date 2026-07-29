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
          `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
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
          `category_ID` int(11) NOT NULL,
          `price` decimal(10,2) NOT NULL,
          `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`product_ID`),
          KEY `idx_products_category_id` (`category_ID`),
          CONSTRAINT `fk_products_categories`
            FOREIGN KEY (`category_ID`) REFERENCES `categories` (`category_ID`)
            ON DELETE RESTRICT
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
          `first_name` varchar(120) DEFAULT NULL,
          `last_name` varchar(120) DEFAULT NULL,
          `phone_number` varchar(20) DEFAULT NULL,
          `address` varchar(500) DEFAULT NULL,
          `national_id` varchar(10) DEFAULT NULL,
          `avatar` varchar(350) DEFAULT NULL,
          `conversation_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
          `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`user_ID`),
          UNIQUE KEY `uq_users_username` (`username`),
          UNIQUE KEY `uq_users_email` (`email`),
          UNIQUE KEY `uq_users_national_id` (`national_id`)
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
            ON DELETE CASCADE,
          CONSTRAINT `fk_product_comments_user`
            FOREIGN KEY (`user_ID`) REFERENCES `restaurantusers` (`user_ID`)
            ON DELETE CASCADE,
          CONSTRAINT `chk_product_comments_rating`
            CHECK (`rating` BETWEEN 1 AND 5)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
    ),
]

DESIRED_SCHEMA = {
    'categories': {
        'columns': {
            'category_ID': {
                'column_type': 'int(11)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': 'auto_increment',
            },
            'slug': {
                'column_type': 'varchar(120)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'title': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'image': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': "",
                'extra': '',
            },
            'created_at': {
                'column_type': 'datetime',
                'is_nullable': 'NO',
                'column_default': 'CURRENT_TIMESTAMP',
                'extra': '',
            },
            'updated_at': {
                'column_type': 'datetime',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
        },
        'primary_key': ['category_ID'],
        'unique_keys': {
            'uq_categories_slug': ['slug'],
        },
        'indexes': {},
        'foreign_keys': {},
        'checks': {},
        'table_options': {
            'engine': 'InnoDB',
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci',
        },
    },
    'products': {
        'columns': {
            'product_ID': {
                'column_type': 'int(11)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': 'auto_increment',
            },
            'image': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'title': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'description': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'category': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'category_ID': {
                'column_type': 'int(11)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'price': {
                'column_type': 'decimal(10,2)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'created_at': {
                'column_type': 'datetime',
                'is_nullable': 'NO',
                'column_default': 'CURRENT_TIMESTAMP',
                'extra': '',
            },
            'updated_at': {
                'column_type': 'datetime',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
        },
        'primary_key': ['product_ID'],
        'unique_keys': {},
        'indexes': {
            'idx_products_category_id': ['category_ID'],
        },
        'foreign_keys': {
            'fk_products_categories': {
                'columns': ['category_ID'],
                'referenced_table': 'categories',
                'referenced_columns': ['category_ID'],
                'on_delete': 'RESTRICT',
            },
        },
        'checks': {},
        'table_options': {
            'engine': 'InnoDB',
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci',
        },
    },
    'restaurantusers': {
        'columns': {
            'user_ID': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'username': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'password': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'email': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'role': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'first_name': {
                'column_type': 'varchar(120)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'last_name': {
                'column_type': 'varchar(120)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'phone_number': {
                'column_type': 'varchar(20)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'address': {
                'column_type': 'varchar(500)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'national_id': {
                'column_type': 'varchar(10)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'avatar': {
                'column_type': 'varchar(350)',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
            'conversation_history': {
                'column_type': 'longtext',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'created_at': {
                'column_type': 'datetime',
                'is_nullable': 'NO',
                'column_default': 'CURRENT_TIMESTAMP',
                'extra': '',
            },
            'updated_at': {
                'column_type': 'datetime',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
        },
        'primary_key': ['user_ID'],
        'unique_keys': {
            'uq_users_username': ['username'],
            'uq_users_email': ['email'],
            'uq_users_national_id': ['national_id'],
        },
        'indexes': {},
        'foreign_keys': {},
        'checks': {},
        'table_options': {
            'engine': 'InnoDB',
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci',
        },
    },
    'product_comments': {
        'columns': {
            'comment_ID': {
                'column_type': 'int(11)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': 'auto_increment',
            },
            'product_ID': {
                'column_type': 'int(11)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'user_ID': {
                'column_type': 'varchar(350)',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'content': {
                'column_type': 'text',
                'is_nullable': 'NO',
                'column_default': None,
                'extra': '',
            },
            'rating': {
                'column_type': 'tinyint(4)',
                'is_nullable': 'NO',
                'column_default': '5',
                'extra': '',
            },
            'created_at': {
                'column_type': 'datetime',
                'is_nullable': 'NO',
                'column_default': 'CURRENT_TIMESTAMP',
                'extra': '',
            },
            'updated_at': {
                'column_type': 'datetime',
                'is_nullable': 'YES',
                'column_default': None,
                'extra': '',
            },
        },
        'primary_key': ['comment_ID'],
        'unique_keys': {},
        'indexes': {
            'idx_product_comments_product': ['product_ID'],
            'idx_product_comments_user': ['user_ID'],
        },
        'foreign_keys': {
            'fk_product_comments_product': {
                'columns': ['product_ID'],
                'referenced_table': 'products',
                'referenced_columns': ['product_ID'],
                'on_delete': 'CASCADE',
            },
            'fk_product_comments_user': {
                'columns': ['user_ID'],
                'referenced_table': 'restaurantusers',
                'referenced_columns': ['user_ID'],
                'on_delete': 'CASCADE',
            },
        },
        'checks': {
            'chk_product_comments_rating': 'rating BETWEEN 1 AND 5',
        },
        'table_options': {
            'engine': 'InnoDB',
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci',
        },
    },
}


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


def _column_exists(cursor, table_name, column_name):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        LIMIT 1
        """,
        (DB_NAME, table_name, column_name),
    )
    return cursor.fetchone() is not None


def _constraint_exists(cursor, table_name, constraint_name):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND CONSTRAINT_NAME = %s
        LIMIT 1
        """,
        (DB_NAME, table_name, constraint_name),
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


def _normalize_default(value):
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip()
        if normalized.upper() == "NULL":
            return None
        return normalized
    return value


def _normalize_check(clause):
    if clause is None:
        return None
    return " ".join(clause.strip().lower().split())


def _fetch_table_columns(cursor, table_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        ORDER BY ORDINAL_POSITION
        """,
        (DB_NAME, table_name),
    )
    return {
        row[0]: {
            'column_type': row[1],
            'is_nullable': row[2],
            'column_default': _normalize_default(row[3]),
            'extra': row[4] or '',
        }
        for row in cursor.fetchall()
    }


def _fetch_primary_key(cursor, table_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND CONSTRAINT_NAME = 'PRIMARY'
        ORDER BY ORDINAL_POSITION
        """,
        (DB_NAME, table_name),
    )
    return [row[0] for row in cursor.fetchall()]


def _fetch_indexes(cursor, table_name, unique=None):
    query = """
        SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',')
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME != 'PRIMARY'
        GROUP BY INDEX_NAME, NON_UNIQUE
        """
    cursor.execute(query, (DB_NAME, table_name))
    indexes = {}
    for index_name, non_unique, columns in cursor.fetchall():
        if index_name is None:
            continue
        is_unique = non_unique == 0
        if unique is None or unique == is_unique:
            indexes[index_name] = [col.strip() for col in columns.split(",")] if columns else []
    return indexes


def _fetch_foreign_keys(cursor, table_name):
    cursor.execute(
        """
        SELECT kcu.CONSTRAINT_NAME,
               GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION SEPARATOR ',') AS columns,
               kcu.REFERENCED_TABLE_NAME,
               GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION SEPARATOR ',') AS referenced_columns,
               rc.DELETE_RULE
        FROM information_schema.KEY_COLUMN_USAGE kcu
        JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
          ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
         AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        WHERE kcu.TABLE_SCHEMA = %s
          AND kcu.TABLE_NAME = %s
          AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
        GROUP BY kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, rc.DELETE_RULE
        """,
        (DB_NAME, table_name),
    )
    foreign_keys = {}
    for name, columns, referenced_table, referenced_columns, delete_rule in cursor.fetchall():
        foreign_keys[name] = {
            'columns': [col.strip() for col in columns.split(',')] if columns else [],
            'referenced_table': referenced_table,
            'referenced_columns': [col.strip() for col in referenced_columns.split(',')] if referenced_columns else [],
            'on_delete': delete_rule,
        }
    return foreign_keys


def _fetch_checks(cursor, table_name):
    cursor.execute(
        """
        SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
        FROM information_schema.TABLE_CONSTRAINTS tc
        JOIN information_schema.CHECK_CONSTRAINTS cc
          ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
         AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        WHERE tc.TABLE_SCHEMA = %s
          AND tc.TABLE_NAME = %s
          AND tc.CONSTRAINT_TYPE = 'CHECK'
        """,
        (DB_NAME, table_name),
    )
    return {row[0]: row[1] for row in cursor.fetchall()}


def _drop_check(cursor, table_name, check_name):
    """Drop a check constraint using syntax that works across MySQL/MariaDB.

    Some MariaDB versions don't accept `DROP CHECK <name>`; try that first
    and fall back to `DROP CONSTRAINT <name>` if it fails.
    """
    try:
        cursor.execute(f"ALTER TABLE `{table_name}` DROP CHECK `{check_name}`")
    except Error:
        try:
            cursor.execute(f"ALTER TABLE `{table_name}` DROP CONSTRAINT `{check_name}`")
        except Error:
            # Re-raise the original error to surface the root cause
            raise


def _fetch_table_options(cursor, table_name):
    cursor.execute(
        """
        SELECT ENGINE, TABLE_COLLATION
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        """,
        (DB_NAME, table_name),
    )
    row = cursor.fetchone()
    if not row:
        return {}
    engine, collation = row
    charset = collation.split('_')[0] if collation else None
    return {
        'engine': engine,
        'charset': charset,
        'collation': collation,
    }


def _build_column_definition(column_name, spec):
    sql = f"`{column_name}` {spec['column_type']}"

    if spec['is_nullable'] == 'YES':
        sql += " NULL"
    else:
        sql += " NOT NULL"

    default = spec.get('column_default')
    if default is not None:
        if default == 'CURRENT_TIMESTAMP':
            sql += " DEFAULT CURRENT_TIMESTAMP"
        else:
            sql += f" DEFAULT '{default}'"
    elif spec['is_nullable'] == 'YES':
        sql += " DEFAULT NULL"

    if spec.get('extra') and 'auto_increment' in spec['extra'].lower():
        sql += " AUTO_INCREMENT"

    return sql


def _sync_products_category_id(cursor):
    cursor.execute(
        """
        UPDATE `products` p
        JOIN `categories` c ON p.`category` = c.`slug`
        SET p.`category_ID` = c.`category_ID`
        WHERE p.`category_ID` IS NULL
        """
    )


def _columns_equivalent(actual, expected):
    actual_type = actual.get('column_type')
    expected_type = expected.get('column_type')
    actual_default = _normalize_default(actual.get('column_default'))
    expected_default = _normalize_default(expected.get('column_default'))

    return (
        actual_type == expected_type
        and actual.get('is_nullable') == expected.get('is_nullable')
        and actual_default == expected_default
        and actual.get('extra', '').lower() == (expected.get('extra') or '').lower()
    )


def _compare_and_fix_table_schema(cursor, table_name, desired):
    actual_columns = _fetch_table_columns(cursor, table_name)
    actual_pk = _fetch_primary_key(cursor, table_name)
    actual_uniques = _fetch_indexes(cursor, table_name, unique=True)
    actual_indexes = _fetch_indexes(cursor, table_name, unique=False)
    actual_foreign_keys = _fetch_foreign_keys(cursor, table_name)
    actual_checks = _fetch_checks(cursor, table_name)
    actual_options = _fetch_table_options(cursor, table_name)

    for column_name, expected_spec in desired['columns'].items():
        if column_name not in actual_columns:
            sql = _build_column_definition(column_name, expected_spec)
            if table_name == 'products' and column_name == 'category_ID' and expected_spec['is_nullable'] == 'NO':
                sql = _build_column_definition(column_name, {**expected_spec, 'is_nullable': 'YES'})
            cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN {sql}")
            print(Fore.YELLOW + f"[SCHEMA]: Added missing column `{column_name}` to `{table_name}`")
            actual_columns[column_name] = expected_spec.copy()

        else:
            if not _columns_equivalent(actual_columns[column_name], expected_spec):
                if (
                    table_name == 'products'
                    and column_name == 'category_ID'
                    and expected_spec['is_nullable'] == 'NO'
                ):
                    _sync_products_category_id(cursor)
                sql = _build_column_definition(column_name, expected_spec)
                cursor.execute(f"ALTER TABLE `{table_name}` MODIFY COLUMN {sql}")
                print(Fore.YELLOW + f"[SCHEMA]: Modified column `{column_name}` in `{table_name}`")

    if actual_pk != desired.get('primary_key', []):
        if actual_pk:
            cursor.execute(f"ALTER TABLE `{table_name}` DROP PRIMARY KEY")
        if desired.get('primary_key'):
            pk_columns = ', '.join(f"`{col}`" for col in desired['primary_key'])
            cursor.execute(f"ALTER TABLE `{table_name}` ADD PRIMARY KEY ({pk_columns})")
            print(Fore.YELLOW + f"[SCHEMA]: Rebuilt primary key for `{table_name}`")

    for key_name, columns in desired.get('unique_keys', {}).items():
        if key_name not in actual_uniques or actual_uniques[key_name] != columns:
            if key_name in actual_uniques:
                cursor.execute(f"ALTER TABLE `{table_name}` DROP INDEX `{key_name}`")
            formatted_columns = ', '.join(f"`{col}`" for col in columns)
            cursor.execute(f"ALTER TABLE `{table_name}` ADD UNIQUE KEY `{key_name}` ({formatted_columns})")
            print(Fore.YELLOW + f"[SCHEMA]: Ensured unique key `{key_name}` on `{table_name}`")

    for index_name, columns in desired.get('indexes', {}).items():
        if index_name not in actual_indexes or actual_indexes[index_name] != columns:
            if index_name in actual_indexes:
                cursor.execute(f"ALTER TABLE `{table_name}` DROP INDEX `{index_name}`")
            formatted_columns = ', '.join(f"`{col}`" for col in columns)
            cursor.execute(f"ALTER TABLE `{table_name}` ADD KEY `{index_name}` ({formatted_columns})")
            print(Fore.YELLOW + f"[SCHEMA]: Ensured index `{index_name}` on `{table_name}`")

    for fk_name, fk_spec in desired.get('foreign_keys', {}).items():
        if fk_name not in actual_foreign_keys or actual_foreign_keys[fk_name] != fk_spec:
            if fk_name in actual_foreign_keys:
                cursor.execute(f"ALTER TABLE `{table_name}` DROP FOREIGN KEY `{fk_name}`")
            cols = ', '.join(f"`{col}`" for col in fk_spec['columns'])
            ref_cols = ', '.join(f"`{col}`" for col in fk_spec['referenced_columns'])
            on_delete = fk_spec.get('on_delete')
            fk_sql = f"ALTER TABLE `{table_name}` ADD CONSTRAINT `{fk_name}` FOREIGN KEY ({cols}) REFERENCES `{fk_spec['referenced_table']}` ({ref_cols})"
            if on_delete:
                fk_sql += f" ON DELETE {on_delete}"
            cursor.execute(fk_sql)
            print(Fore.YELLOW + f"[SCHEMA]: Ensured foreign key `{fk_name}` on `{table_name}`")

    for check_name, check_clause in desired.get('checks', {}).items():
        actual_clause = actual_checks.get(check_name)
        if actual_clause is None or _normalize_check(actual_clause) != _normalize_check(check_clause):
            if actual_clause is not None:
                _drop_check(cursor, table_name, check_name)
            cursor.execute(f"ALTER TABLE `{table_name}` ADD CONSTRAINT `{check_name}` CHECK ({check_clause})")
            print(Fore.YELLOW + f"[SCHEMA]: Ensured check constraint `{check_name}` on `{table_name}`")

    desired_options = desired.get('table_options', {})
    if desired_options:
        if (
            actual_options.get('engine') != desired_options.get('engine')
            or actual_options.get('charset') != desired_options.get('charset')
            or actual_options.get('collation') != desired_options.get('collation')
        ):
            engine = desired_options.get('engine')
            charset = desired_options.get('charset')
            collation = desired_options.get('collation')
            cursor.execute(
                f"ALTER TABLE `{table_name}` ENGINE={engine} DEFAULT CHARSET={charset} COLLATE={collation}"
            )
            print(Fore.YELLOW + f"[SCHEMA]: Updated table options for `{table_name}`")


def _apply_schema_fixes(cursor):
    for table_name, desired in DESIRED_SCHEMA.items():
        if not _table_exists(cursor, table_name):
            continue
        _compare_and_fix_table_schema(cursor, table_name, desired)


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

    connection = None
    cursor = None
    try:
        connection = _connect(DB_NAME)
        cursor = connection.cursor()
        _apply_schema_fixes(cursor)
        connection.commit()
    except Error as e:
        print(Fore.RED + f"[SCHEMA]: Failed to apply schema fixes: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

    try:
        from models.category import Category
        from models.account import Account

        Category.seed_defaults()
        print(Fore.GREEN + "[SCHEMA]: Default categories ensured.")

        Account.seed_default_admin()
        print(Fore.GREEN + "[SCHEMA]: Default admin user ensured.")
    except Exception as e:
        print(Fore.YELLOW + f"[SCHEMA]: Seed skipped: {e}")
