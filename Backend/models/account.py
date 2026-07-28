import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
from core.database import execute_query
from core.security import generate_token
from helpers.validators import is_valid_username, is_valid_email, is_valid_password
from helpers.utils import generate_random_string
from utils.security import verify_password, hash_password

class Account:
    def __init__(self, user_id=None):
        self.user_id = user_id


    def add_user(self, username, password, email, role="User"):
        if not is_valid_username(username):
            return False, "Username must be 3 to 30 characters and contain only letters, numbers, or underscore."

        if not is_valid_email(email):
            return False, "Invalid email format."

        if not is_valid_password(password):
            return False, "Password must be at least 8 characters long."

        existing_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `username` = %s OR `email` = %s",
            (username, email),
            fetchone=True
        )

        if existing_user:
            return False, "User already exists."

        user_id = generate_random_string(30)
        hashed_password = hash_password(password)
        conversation_history = json.dumps([], ensure_ascii=False)

        execute_query(
            """
            INSERT INTO `restaurantusers`
            (`user_ID`, `username`, `password`, `email`, `role`, `conversation_history`)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, username, hashed_password, email, role, conversation_history),
            commit=True
        )

        return True, "User successfully added."

    def remove_user(self, user_id):
        found_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `user_ID` = %s",
            (user_id,),
            fetchone=True
        )

        if not found_user:
            return False, "User not found."

        execute_query(
            "DELETE FROM `restaurantusers` WHERE `user_ID` = %s",
            (user_id,),
            commit=True
        )

        return True, "User successfully removed."
    @staticmethod
    def authenticate_user(username, password):
        user_data = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `username` = %s",
            (username,),
            fetchone=True
        )

        if not user_data:
            return None

        stored_password = user_data["password"]
        print(verify_password(password, stored_password))
        if verify_password(password, stored_password):
            return generate_token(user_data["user_ID"], user_data["role"])
        return None


    def get_user_data(self, include_password=False):
        found_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )

        if not found_user:
            return None

        response = {
            "user_ID": str(found_user["user_ID"]),
            "username": str(found_user["username"]),
            "email": str(found_user["email"]),
            "role": str(found_user["role"]),
            "conversation_history": found_user["conversation_history"]
        }

        if include_password:
            response["password"] = str(found_user["password"])

        return response

    def update_user_data(self, allowed_fields):
        if not allowed_fields:
            return False, "No data provided."

        found_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )

        if not found_user:
            return False, "User not found."

        set_parts = []
        values = []

        for column, value in allowed_fields.items():
            set_parts.append(f"`{column}` = %s")
            values.append(value)

        values.append(self.user_id)

        query = f"UPDATE `restaurantusers` SET {', '.join(set_parts)} WHERE `user_ID` = %s"
        execute_query(query, tuple(values), commit=True)

        return True, "User updated successfully."

    def change_password(self, old_password, new_password):
        found_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )

        if not found_user:
            return False, "User not found."

        stored_password = found_user["password"]

        password_is_valid = False
        if stored_password.startswith("pbkdf2:") or stored_password.startswith("scrypt:"):
            password_is_valid = check_password_hash(stored_password, old_password)
        else:
            password_is_valid = stored_password == old_password

        if not password_is_valid:
            return False, "Old password is incorrect."

        if not is_valid_password(new_password):
            return False, "New password must be at least 6 characters long."

        new_hashed_password = generate_password_hash(new_password)

        execute_query(
            "UPDATE `restaurantusers` SET `password` = %s WHERE `user_ID` = %s",
            (new_hashed_password, self.user_id),
            commit=True
        )

        return True, "Password changed successfully."

    def reset_conversation_history(self):
        execute_query(
            "UPDATE `restaurantusers` SET `conversation_history` = %s WHERE `user_ID` = %s",
            (json.dumps([], ensure_ascii=False), self.user_id),
            commit=True
        )
        return True, "Conversation history cleared."

    @staticmethod
    def list_users():
        users = execute_query(
            "SELECT `user_ID`, `username`, `email`, `role` FROM `restaurantusers`",
            fetchall=True
        )
        return users if users else []

    @staticmethod
    def seed_default_admin():
        admin_exists = execute_query(
            "SELECT `user_ID` FROM `restaurantusers` WHERE `role` = %s LIMIT 1",
            ("Admin",),
            fetchone=True,
        )
        if admin_exists:
            return True, "Admin user already exists."

        default_username = (os.getenv("DEFAULT_ADMIN_USERNAME") or "admin").strip() or "admin"
        default_email = (os.getenv("DEFAULT_ADMIN_EMAIL") or "admin@example.com").strip() or "admin@example.com"
        default_password = (os.getenv("DEFAULT_ADMIN_PASSWORD") or "Admin@123456").strip() or "Admin@123456"

        username = default_username
        email = default_email
        counter = 1

        while True:
            existing = execute_query(
                "SELECT `user_ID` FROM `restaurantusers` WHERE `username` = %s OR `email` = %s",
                (username, email),
                fetchone=True,
            )
            if not existing:
                break

            counter += 1
            username = f"{default_username}{counter}"
            if "@" in default_email:
                local_part, domain = default_email.split("@", 1)
                email = f"{local_part}{counter}@{domain}"
            else:
                email = f"{default_email}{counter}"

        user_id = generate_random_string(30)
        hashed_password = hash_password(default_password)
        conversation_history = json.dumps([], ensure_ascii=False)

        execute_query(
            """
            INSERT INTO `restaurantusers`
            (`user_ID`, `username`, `password`, `email`, `role`, `conversation_history`)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, username, hashed_password, email, "Admin", conversation_history),
            commit=True,
        )

        return True, "Default admin user created."
