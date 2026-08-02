from core.database import execute_query
from helpers.dates import to_iso_tehran


class WeeklySummary:
    @staticmethod
    def save_summary(week_start, week_end, summary_founder, summary_admin):
        execute_query(
            """
            INSERT INTO `weekly_report_summaries`
              (`week_start`, `week_end`, `summary_founder`, `summary_admin`)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
              `summary_founder` = VALUES(`summary_founder`),
              `summary_admin` = VALUES(`summary_admin`),
              `generated_at` = CURRENT_TIMESTAMP
            """,
            (week_start, week_end, summary_founder, summary_admin),
            commit=True,
        )

    @staticmethod
    def get_latest_summary():
        row = execute_query(
            """
            SELECT * FROM `weekly_report_summaries`
            ORDER BY `week_start` DESC
            LIMIT 1
            """,
            fetchone=True,
        )
        return WeeklySummary._serialize(row) if row else None

    @staticmethod
    def get_summary_for_week(week_start):
        row = execute_query(
            """
            SELECT * FROM `weekly_report_summaries`
            WHERE `week_start` = %s
            LIMIT 1
            """,
            (week_start,),
            fetchone=True,
        )
        return WeeklySummary._serialize(row) if row else None

    @staticmethod
    def exists_for_week(week_start, week_end):
        row = execute_query(
            """
            SELECT 1 AS ok FROM `weekly_report_summaries`
            WHERE `week_start` = %s AND `week_end` = %s
            LIMIT 1
            """,
            (week_start, week_end),
            fetchone=True,
        )
        return bool(row)

    @staticmethod
    def _serialize(row):
        if not row:
            return None
        return {
            "id": row["id"],
            "week_start": str(row["week_start"]),
            "week_end": str(row["week_end"]),
            "summary_founder": row["summary_founder"],
            "summary_admin": row["summary_admin"],
            "generated_at": to_iso_tehran(row.get("generated_at")),
        }
