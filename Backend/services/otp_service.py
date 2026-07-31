import hashlib
import hmac
import logging
import secrets
import time
from datetime import datetime, timedelta

import jwt

from config.settings import (
    SECRET_KEY,
    OTP_EXPIRY_SECONDS,
    OTP_MAX_ATTEMPTS,
    OTP_SEND_RATE_LIMIT,
    OTP_SEND_WINDOW_SECONDS,
    OTP_VERIFY_TOKEN_EXPIRY,
)
from core.database import execute_query
from helpers.rate_limit import RateLimiter
from helpers.validators import is_valid_phone_number
from services.sms_service import sms_service, SMSServiceError

logger = logging.getLogger(__name__)

send_limiter = RateLimiter(max_requests=OTP_SEND_RATE_LIMIT, window_seconds=OTP_SEND_WINDOW_SECONDS)
ip_send_limiter = RateLimiter(max_requests=10, window_seconds=600)


def _normalize_phone(phone: str) -> str:
    phone = (phone or "").strip().replace(" ", "").replace("-", "")
    if phone.startswith("+98"):
        phone = "0" + phone[3:]
    elif phone.startswith("98") and len(phone) == 12:
        phone = "0" + phone[2:]
    return phone


def _hash_otp(otp: str, phone: str) -> str:
    material = f"{otp}:{phone}:{SECRET_KEY}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def _verify_otp_hash(otp: str, phone: str, stored_hash: str) -> bool:
    return hmac.compare_digest(_hash_otp(otp, phone), stored_hash)


def ensure_otp_table():
    execute_query(
        """
        CREATE TABLE IF NOT EXISTS `otp_verifications` (
          `id` BIGINT NOT NULL AUTO_INCREMENT,
          `phone_number` VARCHAR(20) NOT NULL,
          `otp_hash` VARCHAR(128) NOT NULL,
          `expires_at` DATETIME NOT NULL,
          `attempts` INT NOT NULL DEFAULT 0,
          `max_attempts` INT NOT NULL DEFAULT 5,
          `is_used` TINYINT(1) NOT NULL DEFAULT 0,
          `verification_token` VARCHAR(128) DEFAULT NULL,
          `token_expires_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_otp_phone` (`phone_number`),
          KEY `idx_otp_token` (`verification_token`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """,
        commit=True,
    )


def send_otp(phone: str, client_ip: str = "unknown") -> tuple[bool, str, dict | None]:
    phone = _normalize_phone(phone)
    if not is_valid_phone_number(phone):
        return False, "شماره موبایل معتبر نیست.", None

    if not send_limiter.is_allowed(phone):
        return False, "تعداد درخواست‌های ارسال کد بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.", None

    if not ip_send_limiter.is_allowed(client_ip):
        return False, "تعداد درخواست‌ها از این آدرس بیش از حد مجاز است.", None

    existing = execute_query(
        "SELECT user_ID FROM `restaurantusers` WHERE `phone_number` = %s LIMIT 1",
        (phone,),
        fetchone=True,
    )
    if existing:
        return False, "این شماره موبایل قبلاً ثبت شده است.", None

    # Invalidate previous unused OTPs for this phone
    execute_query(
        "UPDATE `otp_verifications` SET `is_used` = 1 WHERE `phone_number` = %s AND `is_used` = 0",
        (phone,),
        commit=True,
    )

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = _hash_otp(otp_code, phone)
    expires_at = datetime.utcnow() + timedelta(seconds=OTP_EXPIRY_SECONDS)

    execute_query(
        """
        INSERT INTO `otp_verifications`
        (`phone_number`, `otp_hash`, `expires_at`, `attempts`, `max_attempts`, `is_used`)
        VALUES (%s, %s, %s, 0, %s, 0)
        """,
        (phone, otp_hash, expires_at, OTP_MAX_ATTEMPTS),
        commit=True,
    )

    try:
        # Convert 09xxxxxxxxx → 989xxxxxxxxx for SMS.ir
        mobile = "98" + phone[1:] if phone.startswith("0") else phone
        sms_service.send_otp(mobile, otp_code)
    except SMSServiceError as e:
        return False, str(e), None
    except Exception:
        logger.exception("Unexpected SMS failure")
        return False, "ارسال پیامک با خطا مواجه شد.", None

    return True, "کد تأیید ارسال شد.", {
        "phone": phone,
        "expires_in": OTP_EXPIRY_SECONDS,
    }


def verify_otp(phone: str, code: str) -> tuple[bool, str, dict | None]:
    phone = _normalize_phone(phone)
    code = (code or "").strip()

    if not is_valid_phone_number(phone):
        return False, "شماره موبایل معتبر نیست.", None

    if not code.isdigit() or len(code) != 6:
        return False, "کد تأیید نامعتبر است.", None

    row = execute_query(
        """
        SELECT * FROM `otp_verifications`
        WHERE `phone_number` = %s AND `is_used` = 0
        ORDER BY `id` DESC LIMIT 1
        """,
        (phone,),
        fetchone=True,
    )

    if not row:
        return False, "کد تأیید یافت نشد. لطفاً دوباره درخواست کنید.", None

    if row["attempts"] >= row["max_attempts"]:
        execute_query(
            "UPDATE `otp_verifications` SET `is_used` = 1 WHERE `id` = %s",
            (row["id"],),
            commit=True,
        )
        return False, "تعداد تلاش‌های مجاز به پایان رسید. لطفاً کد جدید درخواست کنید.", None

    expires_at = row["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if datetime.utcnow() > expires_at:
        execute_query(
            "UPDATE `otp_verifications` SET `is_used` = 1 WHERE `id` = %s",
            (row["id"],),
            commit=True,
        )
        return False, "کد تأیید منقضی شده است.", None

    if not _verify_otp_hash(code, phone, row["otp_hash"]):
        execute_query(
            "UPDATE `otp_verifications` SET `attempts` = `attempts` + 1 WHERE `id` = %s",
            (row["id"],),
            commit=True,
        )
        remaining = row["max_attempts"] - (row["attempts"] + 1)
        return False, f"کد تأیید نادرست است. {max(remaining, 0)} تلاش باقی‌مانده.", None

    # Mark used + issue short-lived verification token (prevents replay)
    verification_token = secrets.token_urlsafe(32)
    token_expires = datetime.utcnow() + timedelta(seconds=OTP_VERIFY_TOKEN_EXPIRY)

    execute_query(
        """
        UPDATE `otp_verifications`
        SET `is_used` = 1, `verification_token` = %s, `token_expires_at` = %s
        WHERE `id` = %s
        """,
        (verification_token, token_expires, row["id"]),
        commit=True,
    )

    # JWT proof for registration (signed, short-lived)
    jwt_token = jwt.encode(
        {
            "phone": phone,
            "purpose": "phone_verified",
            "vtoken": verification_token,
            "exp": int(time.time()) + OTP_VERIFY_TOKEN_EXPIRY,
        },
        SECRET_KEY,
        algorithm="HS256",
    )

    return True, "شماره موبایل با موفقیت تأیید شد.", {
        "phone": phone,
        "verification_token": jwt_token,
        "expires_in": OTP_VERIFY_TOKEN_EXPIRY,
    }


def consume_verification_token(token: str, phone: str) -> tuple[bool, str]:
    """Validate and single-use consume a phone verification JWT before account creation."""
    phone = _normalize_phone(phone)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return False, "توکن تأیید منقضی شده است. لطفاً دوباره شماره را تأیید کنید."
    except jwt.InvalidTokenError:
        return False, "توکن تأیید نامعتبر است."

    if payload.get("purpose") != "phone_verified":
        return False, "توکن تأیید نامعتبر است."

    if _normalize_phone(payload.get("phone", "")) != phone:
        return False, "شماره موبایل با توکن تأیید مطابقت ندارد."

    vtoken = payload.get("vtoken")
    if not vtoken:
        return False, "توکن تأیید نامعتبر است."

    row = execute_query(
        """
        SELECT * FROM `otp_verifications`
        WHERE `verification_token` = %s AND `phone_number` = %s
        LIMIT 1
        """,
        (vtoken, phone),
        fetchone=True,
    )

    if not row:
        return False, "توکن تأیید یافت نشد یا قبلاً استفاده شده است."

    token_expires = row.get("token_expires_at")
    if token_expires:
        if isinstance(token_expires, str):
            token_expires = datetime.fromisoformat(token_expires)
        if datetime.utcnow() > token_expires:
            return False, "توکن تأیید منقضی شده است."

    # Single-use: clear token so it cannot be reused
    execute_query(
        "UPDATE `otp_verifications` SET `verification_token` = NULL, `token_expires_at` = NULL WHERE `id` = %s",
        (row["id"],),
        commit=True,
    )

    return True, "ok"
