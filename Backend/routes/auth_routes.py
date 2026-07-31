from flask import Blueprint, request

from helpers.responses import success_response, error_response
from helpers.validators import is_valid_username
from services.otp_service import send_otp, verify_otp, ensure_otp_table
from core.database import execute_query

auth_bp = Blueprint("auth_bp", __name__)

# Ensure table exists on first import / app start
try:
    ensure_otp_table()
except Exception:
    pass


@auth_bp.route("/api/auth/otp/send", methods=["POST"])
def otp_send():
    try:
        body = request.get_json(silent=True) or {}
        phone = body.get("phone") or body.get("phone_number")
        if not phone:
            return error_response("شماره موبایل الزامی است.", 400)

        client_ip = request.remote_addr or "unknown"
        ok, message, data = send_otp(phone, client_ip)
        if not ok:
            return error_response(message, 400)
        return success_response(message, data)
    except Exception as e:
        return error_response("خطای داخلی سرور.", 500)


@auth_bp.route("/api/auth/otp/verify", methods=["POST"])
def otp_verify():
    try:
        body = request.get_json(silent=True) or {}
        phone = body.get("phone") or body.get("phone_number")
        code = body.get("code") or body.get("otp")
        if not phone or not code:
            return error_response("شماره موبایل و کد تأیید الزامی است.", 400)

        ok, message, data = verify_otp(phone, code)
        if not ok:
            return error_response(message, 400)
        return success_response(message, data)
    except Exception:
        return error_response("خطای داخلی سرور.", 500)


@auth_bp.route("/api/auth/username/check", methods=["POST"])
def username_check():
    try:
        body = request.get_json(silent=True) or {}
        username = (body.get("username") or "").strip()
        if not username:
            return error_response("نام کاربری الزامی است.", 400)

        if not is_valid_username(username):
            return success_response("فرمت نام کاربری نامعتبر است.", {
                "available": False,
                "reason": "invalid_format",
            })

        reserved = {
            "admin", "administrator", "root", "superadmin", "support",
            "system", "null", "undefined", "moderator", "owner", "api",
        }
        if username.lower() in reserved:
            return success_response("این نام کاربری رزرو شده است.", {
                "available": False,
                "reason": "reserved",
            })

        existing = execute_query(
            "SELECT `user_ID` FROM `restaurantusers` WHERE `username` = %s LIMIT 1",
            (username,),
            fetchone=True,
        )
        if existing:
            return success_response("نام کاربری قبلاً استفاده شده است.", {
                "available": False,
                "reason": "taken",
            })

        return success_response("نام کاربری آزاد است.", {
            "available": True,
            "reason": None,
        })
    except Exception:
        return error_response("خطای داخلی سرور.", 500)
