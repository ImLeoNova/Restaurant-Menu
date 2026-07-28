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
