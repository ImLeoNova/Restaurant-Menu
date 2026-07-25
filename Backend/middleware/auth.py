import jwt
from functools import wraps
from flask import request
from config.settings import SECRET_KEY
from helpers.responses import error_response

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return error_response("Token is missing!", 401)

        token = auth_header
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        try:
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = decoded_token
        except jwt.ExpiredSignatureError:
            return error_response("Token has expired!", 401)
        except jwt.InvalidTokenError:
            return error_response("Invalid token!", 401)

        return f(*args, **kwargs)

    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_data = getattr(request, "user", None)
        if not user_data:
            return error_response("Authentication required.", 401)

        role = str(user_data.get("role", "")).lower()
        
        if role not in ("admin", "founder"):

            return error_response("Admin access required.", 403)

        return f(*args, **kwargs)

    return decorated_function
