import imghdr
import re
from config.settings import ALLOWED_EXTENSIONS


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def is_valid_image(file_storage):
    file_storage.stream.seek(0)
    header = file_storage.stream.read(512)
    file_storage.stream.seek(0)
    image_type = imghdr.what(None, header)
    return image_type in {"png", "jpeg", "gif", "webp"}


def is_valid_email(email):
    pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    return re.match(pattern, email) is not None


def is_valid_username(username):
    pattern = r"^[a-zA-Z0-9_]{3,30}$"
    return re.match(pattern, username) is not None


def is_valid_password(password):
    return isinstance(password, str) and len(password) >= 8
