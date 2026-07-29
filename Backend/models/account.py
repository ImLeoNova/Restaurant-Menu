import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from core.database import execute_query
from core.security import generate_token
from helpers.validators import (
    is_valid_username,
    is_valid_email,
    is_valid_password,
    is_valid_phone_number,
    is_valid_national_id,
    is_valid_address,
    allowed_file,
    is_valid_image,
)
from helpers.utils import generate_random_string
from storage.s3_client import s3_client
from utils.security import verify_password, hash_password


def _guess_content_type(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return mapping.get(ext, "application/octet-stream")


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
            "conversation_history": found_user["conversation_history"],
            "first_name": str(found_user["first_name"]) if found_user.get("first_name") is not None else "",
            "last_name": str(found_user["last_name"]) if found_user.get("last_name") is not None else "",
            "phone_number": str(found_user["phone_number"]) if found_user.get("phone_number") is not None else "",
            "address": str(found_user["address"]) if found_user.get("address") is not None else "",
            "national_id": str(found_user["national_id"]) if found_user.get("national_id") is not None else "",
            "avatar": str(found_user["avatar"]) if found_user.get("avatar") is not None else "",
            "profile_completed": bool(
                found_user.get("first_name") and
                found_user.get("last_name") and
                found_user.get("phone_number") and
                found_user.get("address")
            ),
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

    def update_profile_details(self, first_name=None, last_name=None, phone_number=None,
                            address=None, national_id=None):
        if first_name is None and last_name is None and phone_number is None and address is None and national_id is None:
            return False, "No data provided."

        found_user = execute_query(
            "SELECT * FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )

        if not found_user:
            return False, "User not found."

        if first_name is not None:
            if not isinstance(first_name, str) or not 1 <= len(first_name.strip()) <= 120:
                return False, "Invalid first name."
            first_name = first_name.strip()

        if last_name is not None:
            if not isinstance(last_name, str) or not 1 <= len(last_name.strip()) <= 120:
                return False, "Invalid last name."
            last_name = last_name.strip()

        if phone_number is not None:
            if not is_valid_phone_number(phone_number):
                return False, "Invalid phone number."
            phone_number = phone_number.strip()

        if address is not None:
            if not is_valid_address(address):
                return False, "Invalid address."
            address = address.strip()

        if national_id is not None:
            if not is_valid_national_id(national_id):
                return False, "Invalid national ID."
            national_id = national_id.strip()

        set_parts = []
        values = []

        if first_name is not None:
            set_parts.append("`first_name` = %s")
            values.append(first_name)
        if last_name is not None:
            set_parts.append("`last_name` = %s")
            values.append(last_name)
        if phone_number is not None:
            set_parts.append("`phone_number` = %s")
            values.append(phone_number)
        if address is not None:
            set_parts.append("`address` = %s")
            values.append(address)
        if national_id is not None:
            set_parts.append("`national_id` = %s")
            values.append(national_id)

        values.append(self.user_id)
        query = f"UPDATE `restaurantusers` SET {', '.join(set_parts)} WHERE `user_ID` = %s"
        execute_query(query, tuple(values), commit=True)

        return True, "Profile updated successfully."

    def _build_avatar_key(self, filename):
        return f"images/avatars/{self.user_id}/{filename}"

    def get_avatar_key(self):
        found_user = execute_query(
            "SELECT `avatar` FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )
        if not found_user:
            return None
        return found_user["avatar"]

    def set_avatar(self, image_file):
        if not image_file or image_file.filename == "":
            return False, "Avatar image is required."

        if not allowed_file(image_file.filename):
            return False, "Invalid image file type."

        if not is_valid_image(image_file):
            return False, "Invalid image content."

        current_user = execute_query(
            "SELECT `avatar` FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )
        if not current_user:
            return False, "User not found."

        old_avatar_key = current_user["avatar"]
        safe_name = secure_filename(image_file.filename)
        image_file.stream.seek(0)
        object_key = self._build_avatar_key(safe_name)

        content_type = _guess_content_type(safe_name)
        s3_client.upload_image(image_file.stream, object_key, content_type=content_type)

        execute_query(
            "UPDATE `restaurantusers` SET `avatar` = %s WHERE `user_ID` = %s",
            (object_key, self.user_id),
            commit=True
        )

        if old_avatar_key:
            try:
                s3_client.delete_image(old_avatar_key)
            except Exception:
                pass

        return True, "Avatar uploaded successfully."

    def remove_avatar(self):
        found_user = execute_query(
            "SELECT `avatar` FROM `restaurantusers` WHERE `user_ID` = %s",
            (self.user_id,),
            fetchone=True
        )

        if not found_user:
            return False, "User not found."

        avatar_key = found_user["avatar"]
        if not avatar_key:
            return False, "No avatar to remove."

        execute_query(
            "UPDATE `restaurantusers` SET `avatar` = %s WHERE `user_ID` = %s",
            (None, self.user_id),
            commit=True
        )

        try:
            s3_client.delete_image(avatar_key)
        except Exception:
            pass

        return True, "Avatar removed successfully."

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
        def create_user(role, default_username, default_email, default_password):
            exists = execute_query(
                "SELECT `user_ID` FROM `restaurantusers` WHERE `role` = %s LIMIT 1",
                (role,),
                fetchone=True,
            )

            if exists:
                return

            username = default_username
            email = default_email
            counter = 1

            while True:
                existing = execute_query(
                    """
                    SELECT `user_ID`
                    FROM `restaurantusers`
                    WHERE `username` = %s OR `email` = %s
                    """,
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

            execute_query(
                """
                INSERT INTO `restaurantusers`
                (`user_ID`, `username`, `password`, `email`, `role`, `conversation_history`)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    generate_random_string(30),
                    username,
                    hash_password(default_password), 
                    email,
                    role,
                    json.dumps([], ensure_ascii=False),
                ),
                commit=True,
            )

        # Founder
        create_user(
            role="Founder",
            default_username=os.getenv("DEFAULT_FOUNDER_USERNAME", "superadmin").strip() or "superadmin",
            default_email=os.getenv("DEFAULT_FOUNDER_EMAIL", "superadmin@example.com").strip() or "superadmin@example.com",
            default_password=os.getenv("DEFAULT_FOUNDER_PASSWORD", "SuperAdmin@123456").strip() or "SuperAdmin@123456",
        )

        # Admin
        create_user(
            role="Admin",
            default_username=os.getenv("DEFAULT_ADMIN_USERNAME", "admin").strip() or "admin",
            default_email=os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com").strip() or "admin@example.com",
            default_password=os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123456").strip() or "Admin@123456",
        )

        # Normal User
        create_user(
            role="User",
            default_username=os.getenv("DEFAULT_USER_USERNAME", "user").strip() or "user",
            default_email=os.getenv("DEFAULT_USER_EMAIL", "user@example.com").strip() or "user@example.com",
            default_password=os.getenv("DEFAULT_USER_PASSWORD", "User@123456").strip() or "User@123456",
        )

        return True, "Default Founder, Admin and User ensured."
