from flask import Blueprint, request

from middleware.auth import token_required, admin_required, founder_required
from helpers.responses import success_response, error_response
from models.report import Report
from models.weekly_summary import WeeklySummary
from services.report_ai_service import generate_weekly_summaries

report_bp = Blueprint("report_bp", __name__)


def _range_params():
    range_key = (request.args.get("range") or "7d").strip().lower()
    start = request.args.get("start")
    end = request.args.get("end")
    if range_key not in ("today", "7d", "30d", "custom"):
        range_key = "7d"
    return range_key, start, end


@report_bp.route("/api/admin/reports/operational", methods=["GET"])
@token_required
@admin_required
def operational_report():
    try:
        range_key, start, end = _range_params()
        data = Report.get_operational(range_key, start, end)
        return success_response("گزارش عملیاتی", data)
    except Exception as e:
        return error_response(f"خطا در دریافت گزارش عملیاتی: {e}", 500)


@report_bp.route("/api/admin/reports/financial", methods=["GET"])
@token_required
@founder_required
def financial_report():
    try:
        range_key, start, end = _range_params()
        data = Report.get_financial(range_key, start, end)
        return success_response("گزارش مالی", data)
    except Exception as e:
        return error_response(f"خطا در دریافت گزارش مالی: {e}", 500)


@report_bp.route("/api/admin/reports/weekly-summary", methods=["GET"])
@token_required
@admin_required
def get_weekly_summary():
    try:
        row = WeeklySummary.get_latest_summary()
        if not row:
            return success_response("خلاصه هفتگی", {
                "week_start": None,
                "week_end": None,
                "summary": None,
                "generated_at": None,
                "available": False,
            })

        role = str(getattr(request, "user", {}).get("role", "")).lower()
        summary_text = (
            row["summary_founder"] if role == "founder" else row["summary_admin"]
        )
        return success_response("خلاصه هفتگی", {
            "week_start": row["week_start"],
            "week_end": row["week_end"],
            "summary": summary_text,
            "generated_at": row["generated_at"],
            "available": True,
        })
    except Exception as e:
        return error_response(f"خطا در دریافت خلاصه هفتگی: {e}", 500)


@report_bp.route("/api/admin/reports/weekly-summary/generate", methods=["POST"])
@token_required
@founder_required
def generate_weekly_summary_endpoint():
    try:
        body = request.get_json(silent=True) or {}
        force = bool(body.get("force", True))
        week_start = body.get("week_start")
        week_end = body.get("week_end")
        result = generate_weekly_summaries(
            week_start=week_start,
            week_end=week_end,
            force=force,
        )
        if not result:
            return error_response("تولید خلاصه ناموفق بود.", 500)
        role = str(getattr(request, "user", {}).get("role", "")).lower()
        summary_text = (
            result["summary_founder"] if role == "founder" else result["summary_admin"]
        )
        return success_response("خلاصه هفتگی تولید شد", {
            "week_start": result["week_start"],
            "week_end": result["week_end"],
            "summary": summary_text,
            "generated_at": result["generated_at"],
            "available": True,
        })
    except Exception as e:
        return error_response(f"خطا در تولید خلاصه هفتگی: {e}", 500)
