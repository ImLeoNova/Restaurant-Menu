from flask import Blueprint, request
import jwt
from helpers.responses import success_response, error_response
from config.settings import SECRET_KEY

token_bp = Blueprint("token_bp", __name__)

@token_bp.route("/api/user/verify-token", methods=["POST", "GET"])
def verify_token():
    try:
        body = request.get_json(silent=True) or {}
        token = body.get("token") or request.cookies.get("access_token")

        if not token:
            return error_response("Token is missing!", 400)

        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return success_response("Token is valid!", {"token": token})

    except jwt.ExpiredSignatureError:
        return error_response("Token has expired!", 401)
    except jwt.InvalidTokenError:
        return error_response("Invalid token!", 401)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@token_bp.route("/verify-token", methods=["POST"])
def verify_token_legacy():
    return verify_token()
