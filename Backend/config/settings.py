import os
import socket
from dotenv import load_dotenv

load_dotenv()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def get_env(name, default=None, required=False, cast=str):
    value = os.getenv(name, default)

    if required and (value is None or value == ""):
        raise ValueError(f"Environment variable '{name}' is required.")

    if value is not None and cast:
        try:
            return cast(value)
        except Exception:
            raise ValueError(f"Invalid value for environment variable '{name}'.")

    return value


def parse_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "y")

SERVER_IP = get_env("SERVER_IP", default=None) or get_local_ip()
SERVER_PORT = get_env("SERVER_PORT", default=8080, cast=int)

DB_HOST = get_env("DB_HOST", default="localhost")
DB_USER = get_env("DB_USER", default="root")
DB_PASSWORD = get_env("DB_PASSWORD", default="")
DB_NAME = get_env("DB_NAME", default="restaurant")

SECRET_KEY = get_env("SECRET_KEY", required=True)

CORS_ORIGINS = [origin.strip() for origin in get_env("CORS_ORIGINS", default="http://localhost:4200,http://127.0.0.1:4200").split(",") if origin.strip()]

UPLOAD_FOLDER = get_env("UPLOAD_FOLDER", default="products")
CATEGORY_UPLOAD_FOLDER = get_env("CATEGORY_UPLOAD_FOLDER", default="categories")
MAX_CONTENT_LENGTH = get_env("MAX_CONTENT_LENGTH", default=5242880, cast=int)

S3_ENDPOINT_URL = get_env("S3_ENDPOINT_URL", default=None)
S3_ACCESS_KEY_ID = get_env("S3_ACCESS_KEY_ID", default=None)
S3_SECRET_ACCESS_KEY = get_env("S3_SECRET_ACCESS_KEY", default=None)
S3_BUCKET_NAME = get_env("S3_BUCKET_NAME", default=None)
S3_REGION = get_env("S3_REGION", default="us-east-1")

ALLOWED_EXTENSIONS = {
    ext.strip().lower()
    for ext in get_env("ALLOWED_EXTENSIONS", default="png,jpg,jpeg,gif,webp").split(",")
    if ext.strip()
}

COOKIE_SECURE = parse_bool(get_env("COOKIE_SECURE", default="False"))
COOKIE_SAMESITE = get_env("COOKIE_SAMESITE", default="Lax")

# Ai Config
OPENAI_KEY = get_env("OPENAI_KEY", default=None)
OPENAI_BASEURL = get_env("OPENAI_BASEURL", default="https://api.openai.com/v1")

# Comment anti-spam / rate limiting
COMMENT_RATE_LIMIT_PER_HOUR = get_env("COMMENT_RATE_LIMIT_PER_HOUR", default=10, cast=int)
COMMENT_MIN_SECONDS_BETWEEN = get_env("COMMENT_MIN_SECONDS_BETWEEN", default=15, cast=int)

# SMS.ir OTP
SMSIR_API_KEY = get_env("SMSIR_API_KEY", default=None)
SMSIR_TEMPLATE_ID = get_env("SMSIR_TEMPLATE_ID", default=None, cast=int)
OTP_EXPIRY_SECONDS = get_env("OTP_EXPIRY_SECONDS", default=120, cast=int)
OTP_MAX_ATTEMPTS = get_env("OTP_MAX_ATTEMPTS", default=5, cast=int)
OTP_SEND_RATE_LIMIT = get_env("OTP_SEND_RATE_LIMIT", default=3, cast=int)
OTP_SEND_WINDOW_SECONDS = get_env("OTP_SEND_WINDOW_SECONDS", default=600, cast=int)
OTP_VERIFY_TOKEN_EXPIRY = get_env("OTP_VERIFY_TOKEN_EXPIRY", default=900, cast=int)


# ZarinPal Payment Gateway
ZARINPAL_MERCHANT_ID = get_env("ZARINPAL_MERCHANT_ID", default="1d00ae1f-1bf1-4e79-9593-eed875fd457e")
ZARINPAL_SANDBOX = parse_bool(get_env("ZARINPAL_SANDBOX", default="true"))
ZARINPAL_CALLBACK_URL = get_env("ZARINPAL_CALLBACK_URL", default="http://localhost:8080/api/orders/verify")
FRONTEND_URL = get_env("FRONTEND_URL", default="http://localhost:4200")

# Reports / Analytics
STUCK_ORDER_PENDING_HOURS = get_env("STUCK_ORDER_PENDING_HOURS", default=2, cast=float)
STUCK_ORDER_OTHER_HOURS = get_env("STUCK_ORDER_OTHER_HOURS", default=4, cast=float)
PAYMENT_ABANDON_MINUTES = get_env("PAYMENT_ABANDON_MINUTES", default=30, cast=int)
