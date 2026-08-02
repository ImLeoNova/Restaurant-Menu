from datetime import datetime, timedelta, date
from decimal import Decimal

from core.database import execute_query
from config.settings import (
    STUCK_ORDER_PENDING_HOURS,
    STUCK_ORDER_OTHER_HOURS,
    PAYMENT_ABANDON_MINUTES,
)
from models.order import STATUS_LABELS, VALID_STATUSES


def _parse_range(range_key, start_str=None, end_str=None):
    """Return (start_dt, end_dt, compare_start, compare_end) as datetime objects (inclusive end-of-day)."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = today.replace(hour=23, minute=59, second=59)

    if range_key == "today":
        start = today
        end = end_of_today
        prev_start = today - timedelta(days=1)
        prev_end = today - timedelta(seconds=1)
    elif range_key == "7d":
        start = today - timedelta(days=6)
        end = end_of_today
        prev_start = start - timedelta(days=7)
        prev_end = start - timedelta(seconds=1)
    elif range_key == "30d":
        start = today - timedelta(days=29)
        end = end_of_today
        prev_start = start - timedelta(days=30)
        prev_end = start - timedelta(seconds=1)
    elif range_key == "custom" and start_str and end_str:
        start = datetime.strptime(start_str, "%Y-%m-%d")
        end = datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        delta = (end.date() - start.date()).days + 1
        prev_end = start - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=delta - 1)
        prev_start = prev_start.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        # default 7d
        start = today - timedelta(days=6)
        end = end_of_today
        prev_start = start - timedelta(days=7)
        prev_end = start - timedelta(seconds=1)

    return start, end, prev_start, prev_end


def _date_str(d):
    if isinstance(d, datetime):
        return d.strftime("%Y-%m-%d")
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")
    return str(d)


def _group_expr(start, end):
    """Return SQL expression for grouping: day or week depending on range length."""
    days = (end.date() - start.date()).days + 1
    if days > 30:
        # Approximate week grouping (ISO week number for simplicity in SQL; display uses date)
        return "DATE_FORMAT(created_at, '%x-W%v')", "week"
    return "DATE(created_at)", "day"


class Report:
    """Aggregation queries for operational and financial reports."""

    # ------------------------------------------------------------------
    # Operational
    # ------------------------------------------------------------------

    @staticmethod
    def get_operational(range_key="7d", start_str=None, end_str=None):
        start, end, prev_start, prev_end = _parse_range(range_key, start_str, end_str)

        orders_total = Report._count_orders(start, end)
        orders_total_prev = Report._count_orders(prev_start, prev_end)
        new_users = Report._count_new_users(start, end)
        new_users_prev = Report._count_new_users(prev_start, prev_end)
        avg_rating = Report._avg_rating(start, end)

        return {
            "range": {
                "start": _date_str(start),
                "end": _date_str(end),
                "compare_start": _date_str(prev_start),
                "compare_end": _date_str(prev_end),
            },
            "kpis": {
                "orders_total": orders_total,
                "orders_total_prev": orders_total_prev,
                "new_users": new_users,
                "new_users_prev": new_users_prev,
                "avg_rating": avg_rating,
            },
            "orders_by_status": Report._orders_by_status(start, end),
            "top_products_by_quantity": Report._top_products_by_quantity(start, end),
            "sales_by_category_quantity": Report._sales_by_category_quantity(start, end),
            "new_users_trend": Report._new_users_trend(start, end),
            "rating_trend": Report._rating_trend(start, end),
            "avg_fulfillment_minutes": Report._avg_fulfillment_minutes(start, end),
            "stuck_orders": Report._stuck_orders(),
        }

    @staticmethod
    def _count_orders(start, end):
        row = execute_query(
            "SELECT COUNT(*) AS cnt FROM `orders` WHERE `created_at` BETWEEN %s AND %s",
            (start, end),
            fetchone=True,
        )
        return int(row["cnt"]) if row else 0

    @staticmethod
    def _count_new_users(start, end):
        row = execute_query(
            "SELECT COUNT(*) AS cnt FROM `restaurantusers` WHERE `created_at` BETWEEN %s AND %s",
            (start, end),
            fetchone=True,
        )
        return int(row["cnt"]) if row else 0

    @staticmethod
    def _avg_rating(start, end):
        row = execute_query(
            """
            SELECT COALESCE(AVG(`rating`), 0) AS avg_r
            FROM `product_comments`
            WHERE `created_at` BETWEEN %s AND %s
            """,
            (start, end),
            fetchone=True,
        )
        return round(float(row["avg_r"] or 0), 1) if row else 0.0

    @staticmethod
    def _orders_by_status(start, end):
        rows = execute_query(
            """
            SELECT `status`, COUNT(*) AS cnt
            FROM `orders`
            WHERE `created_at` BETWEEN %s AND %s
            GROUP BY `status`
            """,
            (start, end),
            fetchall=True,
        ) or []
        by_status = {r["status"]: int(r["cnt"]) for r in rows}
        result = []
        for st in VALID_STATUSES:
            result.append({
                "status": st,
                "label": STATUS_LABELS.get(st, st),
                "count": by_status.get(st, 0),
            })
        return result

    @staticmethod
    def _top_products_by_quantity(start, end, limit=10):
        rows = execute_query(
            """
            SELECT oi.`product_ID`, oi.`product_title` AS title,
                   SUM(oi.`quantity`) AS quantity
            FROM `order_items` oi
            INNER JOIN `orders` o ON o.`order_ID` = oi.`order_ID`
            WHERE o.`created_at` BETWEEN %s AND %s
              AND o.`status` != 'cancelled'
            GROUP BY oi.`product_ID`, oi.`product_title`
            ORDER BY quantity DESC
            LIMIT %s
            """,
            (start, end, limit),
            fetchall=True,
        ) or []
        return [
            {
                "product_ID": int(r["product_ID"]),
                "title": r["title"],
                "quantity": int(r["quantity"]),
            }
            for r in rows
        ]

    @staticmethod
    def _sales_by_category_quantity(start, end):
        rows = execute_query(
            """
            SELECT COALESCE(p.`category`, 'unknown') AS category,
                   SUM(oi.`quantity`) AS quantity
            FROM `order_items` oi
            INNER JOIN `orders` o ON o.`order_ID` = oi.`order_ID`
            LEFT JOIN `products` p ON p.`product_ID` = oi.`product_ID`
            WHERE o.`created_at` BETWEEN %s AND %s
              AND o.`status` != 'cancelled'
            GROUP BY COALESCE(p.`category`, 'unknown')
            ORDER BY quantity DESC
            """,
            (start, end),
            fetchall=True,
        ) or []
        return [
            {"category": r["category"], "quantity": int(r["quantity"])}
            for r in rows
        ]

    @staticmethod
    def _new_users_trend(start, end):
        group_expr, _ = _group_expr(start, end)
        rows = execute_query(
            f"""
            SELECT {group_expr} AS period, COUNT(*) AS cnt
            FROM `restaurantusers`
            WHERE `created_at` BETWEEN %s AND %s
            GROUP BY period
            ORDER BY period
            """,
            (start, end),
            fetchall=True,
        ) or []
        return [{"date": str(r["period"]), "count": int(r["cnt"])} for r in rows]

    @staticmethod
    def _rating_trend(start, end):
        # Group by week-start (Saturday) for longer ranges; day otherwise
        days = (end.date() - start.date()).days + 1
        if days > 14:
            rows = execute_query(
                """
                SELECT DATE_SUB(DATE(created_at), INTERVAL ((DAYOFWEEK(created_at) + 5) % 7) DAY) AS week_start,
                       AVG(rating) AS avg_rating
                FROM `product_comments`
                WHERE `created_at` BETWEEN %s AND %s
                GROUP BY week_start
                ORDER BY week_start
                """,
                (start, end),
                fetchall=True,
            ) or []
            return [
                {
                    "week_start": _date_str(r["week_start"]),
                    "avg_rating": round(float(r["avg_rating"] or 0), 1),
                }
                for r in rows
            ]
        rows = execute_query(
            """
            SELECT DATE(created_at) AS d, AVG(rating) AS avg_rating
            FROM `product_comments`
            WHERE `created_at` BETWEEN %s AND %s
            GROUP BY d
            ORDER BY d
            """,
            (start, end),
            fetchall=True,
        ) or []
        return [
            {
                "week_start": _date_str(r["d"]),
                "avg_rating": round(float(r["avg_rating"] or 0), 1),
            }
            for r in rows
        ]

    @staticmethod
    def _avg_fulfillment_minutes(start, end):
        row = execute_query(
            """
            SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(updated_at, created_at))) AS avg_m
            FROM `orders`
            WHERE `status` = 'delivered'
              AND `created_at` BETWEEN %s AND %s
            """,
            (start, end),
            fetchone=True,
        )
        if not row or row["avg_m"] is None:
            return 0.0
        return round(float(row["avg_m"]), 1)

    @staticmethod
    def _stuck_orders(limit=20):
        pending_h = float(STUCK_ORDER_PENDING_HOURS)
        other_h = float(STUCK_ORDER_OTHER_HOURS)
        rows = execute_query(
            """
            SELECT `order_ID`, `status`, `recipient_name`,
                   COALESCE(`updated_at`, `created_at`) AS last_update,
                   TIMESTAMPDIFF(MINUTE, COALESCE(`updated_at`, `created_at`), NOW()) / 60.0 AS hours_stuck
            FROM `orders`
            WHERE `status` NOT IN ('delivered', 'cancelled')
              AND (
                (`status` = 'pending' AND TIMESTAMPDIFF(MINUTE, COALESCE(`updated_at`, `created_at`), NOW()) >= %s * 60)
                OR
                (`status` != 'pending' AND TIMESTAMPDIFF(MINUTE, COALESCE(`updated_at`, `created_at`), NOW()) >= %s * 60)
              )
            ORDER BY hours_stuck DESC
            LIMIT %s
            """,
            (pending_h, other_h, limit),
            fetchall=True,
        ) or []
        return [
            {
                "order_ID": int(r["order_ID"]),
                "status": r["status"],
                "hours_stuck": round(float(r["hours_stuck"] or 0), 1),
                "recipient_name": r.get("recipient_name") or "",
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Financial (Founder only)
    # ------------------------------------------------------------------

    @staticmethod
    def get_financial(range_key="7d", start_str=None, end_str=None):
        start, end, prev_start, prev_end = _parse_range(range_key, start_str, end_str)

        revenue_total = Report._revenue(start, end)
        revenue_total_prev = Report._revenue(prev_start, prev_end)
        aov = Report._aov(start, end)
        aov_prev = Report._aov(prev_start, prev_end)

        return {
            "range": {
                "start": _date_str(start),
                "end": _date_str(end),
                "compare_start": _date_str(prev_start),
                "compare_end": _date_str(prev_end),
            },
            "kpis": {
                "revenue_total": revenue_total,
                "revenue_total_prev": revenue_total_prev,
                "average_order_value": aov,
                "average_order_value_prev": aov_prev,
            },
            "revenue_trend": Report._revenue_trend(start, end),
            "revenue_by_category": Report._revenue_by_category(start, end),
            "top_customers": Report._top_customers(start, end),
            "repeat_vs_new": Report._repeat_vs_new(start, end),
            "payment_funnel": Report._payment_funnel(start, end),
        }

    @staticmethod
    def _revenue(start, end):
        row = execute_query(
            """
            SELECT COALESCE(SUM(`total_amount`), 0) AS rev
            FROM `orders`
            WHERE `created_at` BETWEEN %s AND %s
              AND `status` != 'cancelled'
            """,
            (start, end),
            fetchone=True,
        )
        return int(float(row["rev"] or 0)) if row else 0

    @staticmethod
    def _aov(start, end):
        row = execute_query(
            """
            SELECT COALESCE(AVG(`total_amount`), 0) AS aov
            FROM `orders`
            WHERE `created_at` BETWEEN %s AND %s
              AND `status` != 'cancelled'
            """,
            (start, end),
            fetchone=True,
        )
        return int(float(row["aov"] or 0)) if row else 0

    @staticmethod
    def _revenue_trend(start, end):
        group_expr, _ = _group_expr(start, end)
        rows = execute_query(
            f"""
            SELECT {group_expr} AS period,
                   COALESCE(SUM(`total_amount`), 0) AS revenue
            FROM `orders`
            WHERE `created_at` BETWEEN %s AND %s
              AND `status` != 'cancelled'
            GROUP BY period
            ORDER BY period
            """,
            (start, end),
            fetchall=True,
        ) or []
        return [
            {"date": str(r["period"]), "revenue": int(float(r["revenue"] or 0))}
            for r in rows
        ]

    @staticmethod
    def _revenue_by_category(start, end):
        rows = execute_query(
            """
            SELECT COALESCE(p.`category`, 'unknown') AS category,
                   COALESCE(SUM(oi.`product_price` * oi.`quantity`), 0) AS revenue
            FROM `order_items` oi
            INNER JOIN `orders` o ON o.`order_ID` = oi.`order_ID`
            LEFT JOIN `products` p ON p.`product_ID` = oi.`product_ID`
            WHERE o.`created_at` BETWEEN %s AND %s
              AND o.`status` != 'cancelled'
            GROUP BY COALESCE(p.`category`, 'unknown')
            ORDER BY revenue DESC
            """,
            (start, end),
            fetchall=True,
        ) or []
        return [
            {"category": r["category"], "revenue": int(float(r["revenue"] or 0))}
            for r in rows
        ]

    @staticmethod
    def _top_customers(start, end, limit=10):
        rows = execute_query(
            """
            SELECT o.`user_ID`,
                   COALESCE(u.`username`, o.`user_ID`) AS username,
                   SUM(o.`total_amount`) AS total_spent,
                   COUNT(*) AS orders_count
            FROM `orders` o
            LEFT JOIN `restaurantusers` u ON u.`user_ID` = o.`user_ID`
            WHERE o.`created_at` BETWEEN %s AND %s
              AND o.`status` != 'cancelled'
            GROUP BY o.`user_ID`, u.`username`
            ORDER BY total_spent DESC
            LIMIT %s
            """,
            (start, end, limit),
            fetchall=True,
        ) or []
        return [
            {
                "user_ID": r["user_ID"],
                "username": r["username"],
                "total_spent": int(float(r["total_spent"] or 0)),
                "orders_count": int(r["orders_count"]),
            }
            for r in rows
        ]

    @staticmethod
    def _repeat_vs_new(start, end):
        # Customers who placed ≥1 order in range
        rows = execute_query(
            """
            SELECT o.`user_ID`,
                   COUNT(*) AS cnt,
                   SUM(o.`total_amount`) AS spent,
                   (
                     SELECT COUNT(*) FROM `orders` o2
                     WHERE o2.`user_ID` = o.`user_ID`
                       AND o2.`created_at` < %s
                       AND o2.`status` != 'cancelled'
                   ) AS prior_orders
            FROM `orders` o
            WHERE o.`created_at` BETWEEN %s AND %s
              AND o.`status` != 'cancelled'
            GROUP BY o.`user_ID`
            """,
            (start, start, end),
            fetchall=True,
        ) or []

        repeat_customers = 0
        new_customers = 0
        repeat_revenue = 0.0
        total_revenue = 0.0
        for r in rows:
            spent = float(r["spent"] or 0)
            total_revenue += spent
            if int(r["prior_orders"] or 0) > 0:
                repeat_customers += 1
                repeat_revenue += spent
            else:
                new_customers += 1

        share = (repeat_revenue / total_revenue) if total_revenue > 0 else 0.0
        return {
            "repeat_customers": repeat_customers,
            "new_customers": new_customers,
            "repeat_revenue_share": round(share, 4),
        }

    @staticmethod
    def _payment_funnel(start, end):
        intents = execute_query(
            """
            SELECT COUNT(*) AS cnt FROM `payment_intents`
            WHERE `created_at` BETWEEN %s AND %s
            """,
            (start, end),
            fetchone=True,
        )
        intents_created = int(intents["cnt"]) if intents else 0

        # Orders that have an authority (came from a payment intent)
        completed = execute_query(
            """
            SELECT COUNT(*) AS cnt FROM `orders`
            WHERE `created_at` BETWEEN %s AND %s
              AND `authority` IS NOT NULL
              AND `status` != 'cancelled'
            """,
            (start, end),
            fetchone=True,
        )
        orders_completed = int(completed["cnt"]) if completed else 0

        # Also count still-open intents older than abandon threshold as abandoned
        # Simple rate: 1 - completed / (intents + completed that already deleted intent)
        # Better approximation: intents still sitting + completed
        total_attempts = intents_created + orders_completed
        # But intents that converted are deleted, so intents_created is only the remaining ones
        # in the window. Use a more accurate approach:
        all_authorities = execute_query(
            """
            SELECT COUNT(DISTINCT authority) AS cnt FROM (
              SELECT authority FROM payment_intents
              WHERE created_at BETWEEN %s AND %s
              UNION
              SELECT authority FROM orders
              WHERE created_at BETWEEN %s AND %s AND authority IS NOT NULL
            ) t
            """,
            (start, end, start, end),
            fetchone=True,
        )
        total_attempts = int(all_authorities["cnt"]) if all_authorities else 0
        abandonment_rate = 0.0
        if total_attempts > 0:
            abandonment_rate = round(1.0 - (orders_completed / total_attempts), 4)

        return {
            "intents_created": total_attempts,
            "orders_completed": orders_completed,
            "abandonment_rate": abandonment_rate,
        }
