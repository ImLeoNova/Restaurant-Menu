from flask import Blueprint, request, redirect
from middleware.auth import token_required, admin_required
from helpers.responses import success_response, error_response
from models.order import Order, VALID_STATUSES
from services.zarinpal import ZarinPal
from config.settings import (
    ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX, ZARINPAL_CALLBACK_URL, FRONTEND_URL,
)
from core.database import execute_query

order_bp = Blueprint("order_bp", __name__)

def _get_zarinpal():
    return ZarinPal(
        merchant_id=ZARINPAL_MERCHANT_ID,
        callback_url=ZARINPAL_CALLBACK_URL,
        sandbox=ZARINPAL_SANDBOX,
    )

@order_bp.route("/api/orders/create", methods=["POST"])
@token_required
def create_order():
    try:
        user_id = request.user.get("user_id")
        if not user_id:
            return error_response("احراز هویت نامعتبر است.", 401)
        body = request.get_json()
        if not body:
            return error_response("بدنه درخواست نامعتبر است.", 400)
        items = body.get("items")
        recipient_name = str(body.get("recipient_name") or "").strip()
        recipient_phone = str(body.get("recipient_phone") or "").strip()
        delivery_address = str(body.get("delivery_address") or "").strip()
        if not recipient_name or not recipient_phone or not delivery_address:
            return error_response("نام گیرنده، شماره تماس و آدرس تحویل الزامی است.", 400)
        ok, message, resolved, total_tomans = Order.resolve_cart_items(items)
        if not ok:
            return error_response(message, 400)
        amount_rials = int(round(total_tomans * 10))
        if amount_rials < 1000:
            return error_response("مبلغ پرداخت کمتر از حد مجاز درگاه است.", 400)
        user_row = execute_query(
            "SELECT `phone_number`, `email` FROM `restaurantusers` WHERE `user_ID` = %s",
            (user_id,), fetchone=True,
        )
        mobile = (user_row or {}).get("phone_number") or None
        email = (user_row or {}).get("email") or None
        if email and ("@" not in str(email) or str(email).endswith("@phone.local")):
            email = None
        zarinpal = _get_zarinpal()
        try:
            payment_url, authority = zarinpal.get_payment_link(
                amount=amount_rials,
                description=f"پرداخت سفارش رستوران - {total_tomans} تومان",
                mobile=mobile, email=email,
            )
        except Exception as e:
            return error_response(f"خطا در ایجاد درخواست پرداخت: {str(e)}", 502)
        Order.save_payment_intent(
            authority, user_id, resolved, total_tomans,
            recipient_name, recipient_phone, delivery_address,
        )
        return success_response("درخواست پرداخت ایجاد شد.", {
            "payment_url": payment_url, "authority": authority,
            "total_amount": total_tomans, "amount_rials": amount_rials,
        })
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@order_bp.route("/api/orders/verify", methods=["GET"])
def verify_order():
    try:
        authority = request.args.get("Authority") or request.args.get("authority")
        status = request.args.get("Status") or request.args.get("status")
        frontend_base = (FRONTEND_URL or "http://localhost:4200").rstrip("/")
        if not authority:
            return redirect(f"{frontend_base}/payment/result?success=0&message=missing_authority")
        if str(status).upper() != "OK":
            Order.delete_payment_intent(authority)
            return redirect(f"{frontend_base}/payment/result?success=0&message=cancelled")
        existing = Order.find_by_authority(authority)
        if existing:
            return redirect(f"{frontend_base}/payment/result?success=1&order_id={existing['order_ID']}")
        intent = Order.get_payment_intent(authority)
        if not intent:
            return redirect(f"{frontend_base}/payment/result?success=0&message=intent_not_found")
        total_tomans = float(intent["total_amount"])
        amount_rials = int(round(total_tomans * 10))
        items = __import__("json").loads(intent["items_json"])
        user_id = intent["user_ID"]
        recipient_name = intent.get("recipient_name") or ""
        recipient_phone = intent.get("recipient_phone") or ""
        delivery_address = intent.get("delivery_address") or ""
        zarinpal = _get_zarinpal()
        try:
            verify_data = zarinpal.verify_payment(authority=authority, amount=amount_rials)
        except Exception:
            return redirect(f"{frontend_base}/payment/result?success=0&message=verify_failed")
        ref_id = verify_data.get("ref_id")
        order_id = Order.create_from_intent(
            user_id=user_id, authority=authority, ref_id=ref_id,
            items=items, total_amount=total_tomans,
            recipient_name=recipient_name, recipient_phone=recipient_phone,
            delivery_address=delivery_address,
        )
        return redirect(f"{frontend_base}/payment/result?success=1&order_id={order_id}&ref_id={ref_id or ''}")
    except Exception:
        frontend_base = (FRONTEND_URL or "http://localhost:4200").rstrip("/")
        return redirect(f"{frontend_base}/payment/result?success=0&message=server_error")

@order_bp.route("/api/orders/my", methods=["GET"])
@token_required
def my_orders():
    try:
        user_id = request.user.get("user_id")
        if not user_id:
            return error_response("احراز هویت نامعتبر است.", 401)
        return success_response("سفارش‌های شما با موفقیت دریافت شد.", Order.list_user_orders(user_id))
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@order_bp.route("/api/orders/<int:order_id>", methods=["GET"])
@token_required
def get_order(order_id):
    try:
        user_id = request.user.get("user_id")
        role = str(request.user.get("role", "")).lower()
        if not user_id:
            return error_response("احراز هویت نامعتبر است.", 401)
        if role in ("admin", "founder"):
            order = execute_query("SELECT * FROM `orders` WHERE `order_ID` = %s", (order_id,), fetchone=True)
            data = Order.serialize_order(order) if order else None
        else:
            data = Order.get_user_order(order_id, user_id)
        if not data:
            return error_response("سفارش پیدا نشد.", 404)
        return success_response("سفارش با موفقیت دریافت شد.", data)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@order_bp.route("/api/admin/orders", methods=["GET"])
@token_required
@admin_required
def admin_list_orders():
    try:
        status = request.args.get("status")
        page = request.args.get("page", 1)
        per_page = request.args.get("per_page", 20)
        if status and status not in VALID_STATUSES:
            return error_response("وضعیت فیلتر نامعتبر است.", 400)
        return success_response("لیست سفارش‌ها با موفقیت دریافت شد.",
                                Order.list_all_orders(status=status, page=page, per_page=per_page))
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)

@order_bp.route("/api/admin/orders/<int:order_id>", methods=["PATCH"])
@token_required
@admin_required
def admin_update_order(order_id):
    try:
        body = request.get_json()
        if not body:
            return error_response("بدنه درخواست نامعتبر است.", 400)
        ok, message, data = Order.update_order(order_id, status=body.get("status"), admin_note=body.get("admin_note"))
        if not ok:
            return error_response(message, 404 if "پیدا نشد" in message else 400)
        return success_response(message, data)
    except Exception as e:
        return error_response(f"Internal Server Error: {str(e)}", 500)
