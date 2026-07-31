import logging
import time
from typing import Optional

from config.settings import SMSIR_API_KEY, SMSIR_TEMPLATE_ID

logger = logging.getLogger(__name__)


class SMSServiceError(Exception):
    pass


class SMSService:
    """Reusable SMS delivery layer. Auth logic must never talk to the SDK directly."""

    def __init__(self, api_key: Optional[str] = None, template_id: Optional[int] = None):
        self.api_key = api_key or SMSIR_API_KEY
        self.template_id = template_id or SMSIR_TEMPLATE_ID

    def send_otp(self, phone_number: str, otp_code: str, max_retries: int = 2) -> bool:
        if not self.api_key or not self.template_id:
            logger.error("SMSIR credentials are not configured")
            raise SMSServiceError("سرویس پیامک پیکربندی نشده است.")

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                from smsir import SMSIRClient
                from smsir.endpoints import VerifySend

                client = SMSIRClient(self.api_key)
                client.execute(
                    VerifySend(
                        mobile=phone_number,
                        template_id=int(self.template_id),
                        parameters={"CODE": otp_code},
                    )
                )
                logger.info("OTP SMS sent to %s", self._mask(phone_number))
                return True
            except ImportError as e:
                logger.error("smsir-sdk is not installed: %s", e)
                raise SMSServiceError("سرویس پیامک در دسترس نیست.") from e
            except Exception as e:
                last_error = e
                logger.warning(
                    "SMS send attempt %s failed for %s: %s",
                    attempt + 1,
                    self._mask(phone_number),
                    e,
                )
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))

        logger.error("All SMS send attempts failed for %s: %s", self._mask(phone_number), last_error)
        raise SMSServiceError("ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید.")

    @staticmethod
    def _mask(phone: str) -> str:
        if not phone or len(phone) < 6:
            return "***"
        return phone[:4] + "****" + phone[-3:]


sms_service = SMSService()
