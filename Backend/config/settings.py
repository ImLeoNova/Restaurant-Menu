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

SERVER_IP = get_env("SERVER_IP", default=None) or get_local_ip()
SERVER_PORT = get_env("SERVER_PORT", default=8080, cast=int)

DB_HOST = get_env("DB_HOST", default="localhost")
DB_USER = get_env("DB_USER", default="root")
DB_PASSWORD = get_env("DB_PASSWORD", default="")
DB_NAME = get_env("DB_NAME", default="restaurant")

SECRET_KEY = get_env("SECRET_KEY", required=True)

UPLOAD_FOLDER = get_env("UPLOAD_FOLDER", default="products")
CATEGORY_UPLOAD_FOLDER = get_env("CATEGORY_UPLOAD_FOLDER", default="categories")
MAX_CONTENT_LENGTH = get_env("MAX_CONTENT_LENGTH", default=5242880, cast=int)

ALLOWED_EXTENSIONS = {
    ext.strip().lower()
    for ext in get_env("ALLOWED_EXTENSIONS", default="png,jpg,jpeg,gif,webp").split(",")
    if ext.strip()
}


# Ai Config
OPENAI_KEY = get_env("OPENAI_KEY", default=None)
OPENAI_BASEURL = get_env("OPENAI_BASEURL", default="https://api.openai.com/v1")
