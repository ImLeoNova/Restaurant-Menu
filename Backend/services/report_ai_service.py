"""Weekly AI summary generation for the Analytics & Reports panel."""

import logging
from datetime import timedelta

from openai import OpenAI
from config import settings
from helpers.dates import get_previous_persian_week_bounds, get_current_persian_week_bounds
from models.report import Report
from models.weekly_summary import WeeklySummary

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        if not settings.OPENAI_KEY:
            raise RuntimeError("OPENAI_KEY is not configured")
        _client = OpenAI(
            base_url=settings.OPENAI_BASEURL,
            api_key=settings.OPENAI_KEY,
        )
    return _client


def _build_prompt_payload(operational, financial):
    """Compact dict of numbers for the LLM prompt."""
    kpis_op = operational.get("kpis", {})
    kpis_fin = financial.get("kpis", {}) if financial else {}
    top_qty = operational.get("top_products_by_quantity", [])[:3]
    top_spend = (financial.get("top_customers", [])[:3] if financial else [])

    return {
        "orders_total": kpis_op.get("orders_total", 0),
        "orders_total_prev": kpis_op.get("orders_total_prev", 0),
        "new_users": kpis_op.get("new_users", 0),
        "new_users_prev": kpis_op.get("new_users_prev", 0),
        "avg_rating": kpis_op.get("avg_rating", 0),
        "avg_fulfillment_minutes": operational.get("avg_fulfillment_minutes", 0),
        "top_products": [{"title": p["title"], "qty": p["quantity"]} for p in top_qty],
        "revenue_total": kpis_fin.get("revenue_total"),
        "revenue_total_prev": kpis_fin.get("revenue_total_prev"),
        "aov": kpis_fin.get("average_order_value"),
        "top_customers": [
            {"username": c["username"], "spent": c["total_spent"]}
            for c in top_spend
        ] if top_spend else [],
        "payment_funnel": financial.get("payment_funnel") if financial else None,
    }


def _pct_change(curr, prev):
    if not prev:
        return None
    return round(((curr - prev) / prev) * 100, 1)


def _generate_text(system_prompt, user_prompt):
    client = _get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.6,
        max_tokens=400,
    )
    return (response.choices[0].message.content or "").strip()


def generate_weekly_summaries(week_start=None, week_end=None, force=False):
    """
    Generate founder + admin summaries for the given Persian week (or previous week).
    Idempotent: skips if a row already exists unless force=True.
    Returns the saved dict or None on skip/failure.
    """
    if week_start is None or week_end is None:
        # Job runs Friday 23:59 → summarize the week that is about to end
        week_start, week_end = get_current_persian_week_bounds()

    week_start_str = str(week_start)
    week_end_str = str(week_end)

    if not force and WeeklySummary.exists_for_week(week_start_str, week_end_str):
        logger.info("Weekly summary already exists for %s – %s; skipping", week_start_str, week_end_str)
        return WeeklySummary.get_summary_for_week(week_start_str)

    try:
        operational = Report.get_operational(
            "custom", start_str=week_start_str, end_str=week_end_str
        )
        financial = Report.get_financial(
            "custom", start_str=week_start_str, end_str=week_end_str
        )
    except Exception as exc:
        logger.exception("Failed to aggregate report data for weekly summary: %s", exc)
        raise

    payload = _build_prompt_payload(operational, financial)
    orders_delta = _pct_change(payload["orders_total"], payload["orders_total_prev"])
    users_delta = _pct_change(payload["new_users"], payload["new_users_prev"])
    rev_delta = _pct_change(payload.get("revenue_total") or 0, payload.get("revenue_total_prev") or 0)

    common_facts = (
        f"بازه: {week_start_str} تا {week_end_str}\n"
        f"تعداد سفارش‌ها: {payload['orders_total']} (هفته قبل: {payload['orders_total_prev']}"
        f"{f'، تغییر: {orders_delta}%' if orders_delta is not None else ''})\n"
        f"کاربران جدید: {payload['new_users']} (هفته قبل: {payload['new_users_prev']}"
        f"{f'، تغییر: {users_delta}%' if users_delta is not None else ''})\n"
        f"میانگین امتیاز نظرات: {payload['avg_rating']}\n"
        f"میانگین زمان آماده‌سازی تا تحویل: {payload['avg_fulfillment_minutes']} دقیقه\n"
        f"پرفروش‌ترین محصولات (تعداد): {payload['top_products']}\n"
    )

    founder_facts = common_facts + (
        f"درآمد کل: {payload.get('revenue_total')} تومان "
        f"(هفته قبل: {payload.get('revenue_total_prev')}"
        f"{f'، تغییر: {rev_delta}%' if rev_delta is not None else ''})\n"
        f"میانگین ارزش سفارش (AOV): {payload.get('aov')} تومان\n"
        f"برترین مشتریان از نظر هزینه: {payload.get('top_customers')}\n"
        f"قیف پرداخت: {payload.get('payment_funnel')}\n"
    )

    system_founder = (
        "تو یک تحلیل‌گر کسب‌وکار رستوران هستی. گزارش هفتگی کوتاه و حرفه‌ای به زبان فارسی بنویس "
        "(۲ تا ۴ جمله). لحن رسمی-دوستانه و کسب‌وکاری داشته باش. حتماً به رشد/کاهش سفارش‌ها، "
        "درآمد، محصولات پرفروش و نکات مهم اشاره کن. اعداد را به صورت طبیعی در جمله بگنجان."
    )
    system_admin = (
        "تو یک تحلیل‌گر عملیات رستوران هستی. گزارش هفتگی کوتاه و حرفه‌ای به زبان فارسی بنویس "
        "(۲ تا ۴ جمله). فقط به شاخص‌های عملیاتی اشاره کن: تعداد سفارش‌ها، کاربران جدید، "
        "محصولات پرفروش از نظر تعداد، امتیاز نظرات و زمان آماده‌سازی. "
        "هرگز هیچ رقم پولی، درآمد، تومان، ریال یا مبلغی ننویس. لحن رسمی-دوستانه داشته باش."
    )

    try:
        summary_founder = _generate_text(
            system_founder,
            "بر اساس این داده‌ها یک خلاصه هفتگی برای مدیرعامل بنویس:\n" + founder_facts,
        )
        summary_admin = _generate_text(
            system_admin,
            "بر اساس این داده‌ها یک خلاصه هفتگی عملیاتی برای مدیر بنویس (بدون هیچ رقم پولی):\n"
            + common_facts,
        )
    except Exception as exc:
        logger.exception("AI completion failed for weekly summary: %s", exc)
        raise

    if not summary_founder or not summary_admin:
        raise RuntimeError("AI returned empty summary text")

    WeeklySummary.save_summary(
        week_start_str, week_end_str, summary_founder, summary_admin
    )
    logger.info("Weekly summary saved for %s – %s", week_start_str, week_end_str)
    return WeeklySummary.get_summary_for_week(week_start_str)


def run_scheduled_weekly_summary():
    """Wrapper for the APScheduler job — never raises out of the job."""
    try:
        generate_weekly_summaries(force=False)
    except Exception as exc:
        logger.exception("Scheduled weekly summary job failed: %s", exc)
