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


def is_valid_phone_number(phone):
    import re
    return bool(re.fullmatch(r"(0|\+98)9\d{9}", phone or ""))


def is_valid_national_id(national_id):
    if not national_id:
        return True
    if not national_id.isdigit() or len(national_id) != 10:
        return False
    check = int(national_id[9])
    s = sum(int(national_id[i]) * (10 - i) for i in range(9))
    r = s % 11
    return check == r if r < 2 else check == 11 - r


def is_valid_address(address):
    return address is not None and 5 <= len(address.strip()) <= 500
