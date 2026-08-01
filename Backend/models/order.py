
import json
from decimal import Decimal
from core.database import execute_query, get_db_connection
from mysql.connector import Error

VALID_STATUSES = (
    "pending", "confirmed", "preparing", "ready",
    "delivering", "delivered", "cancelled",
)
STATUS_LABELS = {
    "pending": "در حال بررسی",
    "confirmed": "تأیید شده",
    "preparing": "در حال آماده‌سازی",
    "ready": "آماده تحویل",
    "delivering": "در حال ارسال",
    "delivered": "تحویل داده شده",
    "cancelled": "لغو شده",
}

class Order:
    def __init__(self, order_id=None):
        self.order_id = order_id

    @staticmethod
    def resolve_cart_items(items):
        if not items or not isinstance(items, list):
            return False, "لیست اقلام سفارش نامعتبر است.", None, None
        resolved = []
        total = Decimal("0")
        for raw in items:
            if not isinstance(raw, dict):
                return False, "فرمت اقلام سفارش نامعتبر است.", None, None
            product_id = raw.get("product_ID") or raw.get("product_id")
            quantity = raw.get("quantity")
            try:
                product_id = int(product_id)
                quantity = int(quantity)
            except (TypeError, ValueError):
                return False, "شناسه محصول یا تعداد نامعتبر است.", None, None
            if quantity < 1:
                return False, "تعداد باید حداقل ۱ باشد.", None, None
            product = execute_query(
                "SELECT `product_ID`, `title`, `price`, `image` FROM `products` WHERE `product_ID` = %s",
                (product_id,), fetchone=True,
            )
            if not product:
                return False, f"محصول با شناسه {product_id} پیدا نشد.", None, None
            price = Decimal(str(product["price"]))
            total += price * quantity
            resolved.append({
                "product_ID": product_id,
                "product_title": product["title"],
                "product_price": float(price),
                "quantity": quantity,
                "image": product.get("image") or "",
            })
        if total <= 0:
            return False, "مبلغ سفارش باید بیشتر از صفر باشد.", None, None
        return True, "ok", resolved, float(total)

    @staticmethod
    def save_payment_intent(authority, user_id, items, total_amount):
        execute_query(
            """INSERT INTO `payment_intents` (`authority`, `user_ID`, `items_json`, `total_amount`)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE
                 `user_ID`=VALUES(`user_ID`), `items_json`=VALUES(`items_json`),
                 `total_amount`=VALUES(`total_amount`), `created_at`=CURRENT_TIMESTAMP""",
            (authority, user_id, json.dumps(items, ensure_ascii=False), total_amount),
            commit=True,
        )

    @staticmethod
    def get_payment_intent(authority):
        return execute_query(
            "SELECT * FROM `payment_intents` WHERE `authority` = %s",
            (authority,), fetchone=True,
        )

    @staticmethod
    def delete_payment_intent(authority):
        execute_query("DELETE FROM `payment_intents` WHERE `authority` = %s", (authority,), commit=True)

    @staticmethod
    def create_from_intent(user_id, authority, ref_id, items, total_amount):
        connection = None
        cursor = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            connection.start_transaction()
            cursor.execute(
                """INSERT INTO `orders` (`user_ID`, `total_amount`, `status`, `authority`, `ref_id`)
                   VALUES (%s, %s, 'pending', %s, %s)""",
                (user_id, total_amount, authority, str(ref_id) if ref_id is not None else None),
            )
            order_id = cursor.lastrowid
            for item in items:
                cursor.execute(
                    """INSERT INTO `order_items`
                       (`order_ID`, `product_ID`, `product_title`, `product_price`, `quantity`, `image`)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (order_id, item["product_ID"], item["product_title"],
                     item["product_price"], item["quantity"], item.get("image") or ""),
                )
            cursor.execute("DELETE FROM `payment_intents` WHERE `authority` = %s", (authority,))
            connection.commit()
            return order_id
        except Error:
            if connection:
                connection.rollback()
            raise
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def find_by_authority(authority):
        return execute_query("SELECT * FROM `orders` WHERE `authority` = %s", (authority,), fetchone=True)

    @staticmethod
    def get_order_items(order_id):
        rows = execute_query(
            """SELECT `item_ID`, `order_ID`, `product_ID`, `product_title`,
                      `product_price`, `quantity`, `image`
               FROM `order_items` WHERE `order_ID` = %s""",
            (order_id,), fetchall=True,
        )
        return rows or []

    @staticmethod
    def serialize_order(order, include_items=True):
        if not order:
            return None
        data = {
            "order_ID": order["order_ID"],
            "user_ID": order["user_ID"],
            "total_amount": float(order["total_amount"]),
            "status": order["status"],
            "status_label": STATUS_LABELS.get(order["status"], order["status"]),
            "authority": order.get("authority"),
            "ref_id": order.get("ref_id"),
            "admin_note": order.get("admin_note"),
            "created_at": order["created_at"].isoformat() if order.get("created_at") else None,
            "updated_at": order["updated_at"].isoformat() if order.get("updated_at") else None,
        }
        if include_items:
            items = Order.get_order_items(order["order_ID"])
            data["items"] = [{
                "item_ID": i["item_ID"],
                "product_ID": i["product_ID"],
                "product_title": i["product_title"],
                "product_price": float(i["product_price"]),
                "quantity": i["quantity"],
                "image": i.get("image") or "",
                "line_total": float(i["product_price"]) * i["quantity"],
            } for i in items]
        return data

    @staticmethod
    def list_user_orders(user_id):
        rows = execute_query(
            "SELECT * FROM `orders` WHERE `user_ID` = %s ORDER BY `created_at` DESC",
            (user_id,), fetchall=True,
        )
        return [Order.serialize_order(r) for r in (rows or [])]

    @staticmethod
    def get_user_order(order_id, user_id):
        order = execute_query(
            "SELECT * FROM `orders` WHERE `order_ID` = %s AND `user_ID` = %s",
            (order_id, user_id), fetchone=True,
        )
        return Order.serialize_order(order) if order else None

    @staticmethod
    def list_all_orders(status=None, page=1, per_page=20):
        page = max(1, int(page or 1))
        per_page = min(100, max(1, int(per_page or 20)))
        offset = (page - 1) * per_page
        if status:
            rows = execute_query(
                "SELECT * FROM `orders` WHERE `status` = %s ORDER BY `created_at` DESC LIMIT %s OFFSET %s",
                (status, per_page, offset), fetchall=True,
            )
            count_row = execute_query(
                "SELECT COUNT(*) AS cnt FROM `orders` WHERE `status` = %s", (status,), fetchone=True,
            )
        else:
            rows = execute_query(
                "SELECT * FROM `orders` ORDER BY `created_at` DESC LIMIT %s OFFSET %s",
                (per_page, offset), fetchall=True,
            )
            count_row = execute_query("SELECT COUNT(*) AS cnt FROM `orders`", fetchone=True)
        total = int(count_row["cnt"]) if count_row else 0
        return {
            "orders": [Order.serialize_order(r) for r in (rows or [])],
            "page": page, "per_page": per_page, "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        }

    @staticmethod
    def update_order(order_id, status=None, admin_note=None):
        order = execute_query("SELECT * FROM `orders` WHERE `order_ID` = %s", (order_id,), fetchone=True)
        if not order:
            return False, "سفارش پیدا نشد.", None
        sets, values = [], []
        if status is not None:
            if status not in VALID_STATUSES:
                return False, "وضعیت سفارش نامعتبر است.", None
            sets.append("`status` = %s"); values.append(status)
        if admin_note is not None:
            sets.append("`admin_note` = %s"); values.append(admin_note)
        if not sets:
            return False, "هیچ فیلدی برای به‌روزرسانی ارسال نشده است.", None
        values.append(order_id)
        execute_query(f"UPDATE `orders` SET {', '.join(sets)} WHERE `order_ID` = %s", tuple(values), commit=True)
        updated = execute_query("SELECT * FROM `orders` WHERE `order_ID` = %s", (order_id,), fetchone=True)
        return True, "سفارش با موفقیت به‌روزرسانی شد.", Order.serialize_order(updated)
