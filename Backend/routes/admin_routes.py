from flask import Blueprint, request
from models.account import Account
from middleware.auth import token_required, admin_required
from helpers.responses import success_response, error_response
from helpers.validators import (
    is_valid_username,
    is_valid_email,
    is_valid_phone_number,
    is_valid_national_id,
    is_valid_address,
)
from core.database import execute_query

admin_bp = Blueprint("admin_bp", __name__)


@admin_bp.route("/api/admin/users", methods=["GET"])
@token_required
@admin_required
def admin_list_users():
    try:
        users = Account.list_users()
        return success_response("Users fetched successfully.", users)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@admin_bp.route("/api/admin/user/create", methods=["POST"])
@token_required
@admin_required
def admin_create_user():
    try:
        body = request.get_json()
        if not body:
            return error_response("Invalid JSON body.", 400)

        username = body.get("username")
        password = body.get("password")
        email    = body.get("email")
        role     = body.get("role", "User").capitalize()

        if not username or not password or not email:
            return error_response("Username, password, and email are required.", 400)

        if role not in ["user", "admin"]:
            return error_response("Role must be either 'user' or 'admin'.", 400)

        if not is_valid_username(username):
            return error_response("Invalid username format.", 400)

        if not is_valid_email(email):
            return error_response("Invalid email format.", 400)

        account = Account()
        status, message = account.add_user(username, password, email, role)

        if not status:
            return error_response(message, 400)

        return success_response(message, status_code=201)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@admin_bp.route("/api/admin/user/<string:user_id>", methods=["PUT"])
@token_required
@admin_required
def admin_update_user(user_id):
    try:
        body = request.get_json()
        if not body:
            return error_response("Invalid JSON body.", 400)

        username = body.get("username")
        email    = body.get("email")
        role     = body.get("role")
        first_name = body.get("first_name")
        last_name = body.get("last_name")
        phone_number = body.get("phone_number")
        address = body.get("address")
        national_id = body.get("national_id")

        update_fields = {}

        if username is not None:
            if not is_valid_username(username):
                return error_response("Invalid username format.", 400)
            if execute_query(
                "SELECT 1 FROM `restaurantusers` WHERE `username` = %s AND `user_ID` != %s",
                (username, user_id), fetchone=True
            ):
                return error_response("Username already in use.", 400)
            update_fields["username"] = username

        if email is not None:
            if not is_valid_email(email):
                return error_response("Invalid email format.", 400)
            if execute_query(
                "SELECT 1 FROM `restaurantusers` WHERE `email` = %s AND `user_ID` != %s",
                (email, user_id), fetchone=True
            ):
                return error_response("Email already in use.", 400)
            update_fields["email"] = email

        if role is not None:
            role = role.lower()
            if role not in ["user", "admin", "founder"]:
                return error_response("Role must be either 'user', 'admin', or 'founder'.", 400)
            update_fields["role"] = role.capitalize()

        if first_name is not None:
            if not isinstance(first_name, str) or not 1 <= len(first_name.strip()) <= 120:
                return error_response("Invalid first name.", 400)
            update_fields["first_name"] = first_name.strip()

        if last_name is not None:
            if not isinstance(last_name, str) or not 1 <= len(last_name.strip()) <= 120:
                return error_response("Invalid last name.", 400)
            update_fields["last_name"] = last_name.strip()

        if phone_number is not None:
            if not is_valid_phone_number(phone_number):
                return error_response("Invalid phone number.", 400)
            update_fields["phone_number"] = phone_number.strip()

        if address is not None:
            if not is_valid_address(address):
                return error_response("Invalid address.", 400)
            update_fields["address"] = address.strip()

        if national_id is not None:
            if not is_valid_national_id(national_id):
                return error_response("Invalid national ID.", 400)
            if execute_query(
                "SELECT 1 FROM `restaurantusers` WHERE `national_id` = %s AND `user_ID` != %s",
                (national_id, user_id), fetchone=True
            ):
                return error_response("National ID already in use.", 400)
            update_fields["national_id"] = national_id.strip()

        if not update_fields:
            return error_response("No valid fields provided for update.", 400)

        account = Account(user_id)
        status, message = account.update_user_data(update_fields)

        if not status:
            return error_response(message, 404)

        return success_response(message, account.get_user_data(include_password=False))

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)


@admin_bp.route("/api/admin/user/<string:user_id>", methods=["DELETE"])
@token_required
@admin_required
def admin_delete_user(user_id):
    try:
        account = Account()
        status, message = account.remove_user(user_id)

        if not status:
            return error_response(message, 404)

        return success_response(message)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)