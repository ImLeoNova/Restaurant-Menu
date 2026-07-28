from flask import Blueprint, request
from models.account import Account
from middleware.auth import token_required
from helpers.responses import success_response, error_response
from helpers.validators import is_valid_username, is_valid_email
from core.database import execute_query
from utils.security import hash_password
from helpers.rate_limit import RateLimiter
from config.settings import COOKIE_SECURE, COOKIE_SAMESITE

user_bp = Blueprint("user_bp", __name__)

login_rate_limiter = RateLimiter(max_requests=5, window_seconds=300)

@user_bp.route("/api/user/register", methods=["POST"])
def register_user():
    try:
        body = request.get_json()

        if not body:
            return error_response("Invalid JSON body.", 400)

        username = body.get("username")
        password = body.get("password")
        email = body.get("email")

        if not username or not password or not email:
            return error_response("Username, password, and email are required.", 400)

        account = Account()
        status, message = account.add_user(username, password, email, role="user")

        if not status:
            return error_response(message, 400)

        return success_response(message, status_code=201)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@user_bp.route("/api/user/add", methods=["POST"])
def add_user_legacy():
    return register_user()

@user_bp.route("/api/user/login", methods=["POST"])
def login():
    try:
        body = request.get_json()

        if not body:
            return error_response("Invalid JSON body.", 400)

        username = body.get("username")
        password = body.get("password")

        if not username or not password:
            return error_response("Username and password are required.", 400)

        client_ip = request.remote_addr or "unknown"
        if not login_rate_limiter.is_allowed(client_ip):
            return error_response("Too many login attempts. Please try again later.", 429)

        token = Account.authenticate_user(username, password)

        if not token:
            return error_response("Invalid username or password.", 401)

        response, status_code = success_response("Login successful.", {"token": token}, 200)
        response.set_cookie(
            "access_token",
            token,
            httponly=True,
            samesite=COOKIE_SAMESITE,
            secure=COOKIE_SECURE,
            path="/",
        )
        return response, status_code

    except Exception as e:

        return error_response(f"Internal Server Error", 500)

@user_bp.route("/api/user/me", methods=["GET"])
@token_required
def get_my_profile():
    try:
        user_id = request.user["user_id"]
        account = Account(user_id)
        user_data = account.get_user_data(include_password=False)

        if not user_data:
            return error_response("User not found.", 404)

        return success_response("User profile fetched successfully.", user_data)

    except Exception as e:
        print(e)
        return error_response(f"Internal Server Error", 500)

@user_bp.route("/api/user/userinfo/", methods=["POST"])
@token_required
def get_user_info_legacy():
    try:
        user_id = request.json.get("userID")
        token_user_id = request.user["user_id"]

        if str(user_id) != str(token_user_id):
            return error_response("The provided user ID does not match the token user ID.", 400)

        account = Account(user_id)
        user_data = account.get_user_data(include_password=False)

        if not user_data:
            return error_response("User not found.", 404)

        return success_response("User information fetched successfully.", user_data)

    except Exception as e:
        print(e)
        return error_response(f"Internal Server Error", 500)

@user_bp.route("/api/user/update-profile", methods=["PUT"])
@token_required
def update_profile():
    try:
        body = request.get_json()

        if not body:
            return error_response("Invalid JSON body.", 400)

        username = body.get("username")
        email = body.get("email")

        update_fields = {}

        if username is not None:
            if not is_valid_username(username):
                return error_response("Invalid username format.", 400)

            existing = execute_query(
                "SELECT * FROM `restaurantusers` WHERE `username` = %s AND `user_ID` != %s",
                (username, request.user["user_id"]),
                fetchone=True
            )
            if existing:
                return error_response("Username already in use.", 400)

            update_fields["username"] = username

        if email is not None:
            if not is_valid_email(email):
                return error_response("Invalid email format.", 400)

            existing = execute_query(
                "SELECT * FROM `restaurantusers` WHERE `email` = %s AND `user_ID` != %s",
                (email, request.user["user_id"]),
                fetchone=True
            )
            if existing:
                return error_response("Email already in use.", 400)

            update_fields["email"] = email

        account = Account(request.user["user_id"])
        status, message = account.update_user_data(update_fields)

        if not status:
            return error_response(message, 400)

        updated_user = account.get_user_data(include_password=False)
        return success_response(message, updated_user)

    except Exception as e:
        print(e)
        return error_response(f"Internal Server Error", 500)

@user_bp.route("/api/user/change-password", methods=["PUT"])
@token_required
def change_password():
    try:
        body = request.get_json()

        if not body:
            return error_response("Invalid JSON body.", 400)

        old_password = body.get("old_password")
        new_password = body.get("new_password")

        if not old_password or not new_password:
            return error_response("Old password and new password are required.", 400)

        account = Account(request.user["user_id"])
        status, message = account.change_password(old_password, new_password)

        if not status:
            return error_response(message, 400)

        return success_response(message)

    except Exception as e:
        print(e)
        return error_response(f"Internal Server Error", 500)

@user_bp.route("/api/user/logout", methods=["POST"])
def logout():
    response, status_code = success_response("Logout successful.", None, 200)
    response.set_cookie(
        "access_token",
        "",
        httponly=True,
        samesite="None",
        secure=True,
        path="/",
        expires=0,
    )
    return response, status_code


@user_bp.route("/api/user/delete-me", methods=["DELETE"])
@token_required
def delete_my_account():
    try:
        user_id = request.user["user_id"]
        account = Account()
        status, message = account.remove_user(user_id)

        if not status:
            return error_response(message, 404)

        return success_response(message)

    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
