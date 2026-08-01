import uuid
import requests


class ZarinPal:
    SANDBOX_BASE = "https://sandbox.zarinpal.com/pg/v4/payment"
    SANDBOX_STARTPAY = "https://sandbox.zarinpal.com/pg/StartPay"
    LIVE_BASE = "https://payment.zarinpal.com/pg/v4/payment"
    LIVE_STARTPAY = "https://payment.zarinpal.com/pg/StartPay"

    def __init__(self, merchant_id=None, callback_url="https://example.com/verify", sandbox=True, timeout=15):
        self.merchant_id = merchant_id or str(uuid.uuid4())
        self.callback_url = callback_url
        self.timeout = timeout
        self.base_url = self.SANDBOX_BASE if sandbox else self.LIVE_BASE
        self.startpay_url = self.SANDBOX_STARTPAY if sandbox else self.LIVE_STARTPAY

    def get_payment_link(self, amount, description, mobile=None, email=None):
        payload = {
            "merchant_id": self.merchant_id,
            "amount": amount,
            "callback_url": self.callback_url,
            "description": description,
        }
        if mobile:
            payload["metadata"] = {"mobile": mobile}
        if email:
            payload.setdefault("metadata", {})["email"] = email
        resp = requests.post(f"{self.base_url}/request.json", json=payload, timeout=self.timeout)
        data = resp.json()
        if not resp.ok or not data.get("data") or data["data"].get("code") != 100:
            raise Exception(f"Payment request failed: {data.get('errors')}")
        authority = data["data"]["authority"]
        return f"{self.startpay_url}/{authority}", authority

    def verify_payment(self, authority, amount):
        payload = {
            "merchant_id": self.merchant_id,
            "amount": amount,
            "authority": authority,
        }
        resp = requests.post(f"{self.base_url}/verify.json", json=payload, timeout=self.timeout)
        data = resp.json()
        if not resp.ok or not data.get("data") or data["data"].get("code") not in (100, 101):
            raise Exception(f"Payment verification failed: {data.get('errors')}")
        return data["data"]
