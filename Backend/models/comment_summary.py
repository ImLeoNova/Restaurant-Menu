import json
import re

from openai import OpenAI

from config import settings
from core.database import execute_query
from helpers.dates import to_iso_tehran


class CommentSummary:
    """Handles reading/writing the cached AI-generated summary of a product's reviews."""

    MIN_COMMENTS = 3

    def __init__(self, product_id):
        self.product_id = product_id

    def get_cached(self):
        row = execute_query(
            """
            SELECT `product_ID`, `summary`, `positives`, `negatives`,
                   `comment_count`, `average_rating`, `updated_at`
            FROM `product_comment_summaries`
            WHERE `product_ID` = %s
            """,
            (self.product_id,),
            fetchone=True,
        )
        return self._serialize(row)

    def save(self, summary, positives, negatives, comment_count, average_rating):
        execute_query(
            """
            INSERT INTO `product_comment_summaries`
                (`product_ID`, `summary`, `positives`, `negatives`, `comment_count`, `average_rating`)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `summary` = VALUES(`summary`),
                `positives` = VALUES(`positives`),
                `negatives` = VALUES(`negatives`),
                `comment_count` = VALUES(`comment_count`),
                `average_rating` = VALUES(`average_rating`)
            """,
            (
                self.product_id,
                summary,
                json.dumps(positives, ensure_ascii=False),
                json.dumps(negatives, ensure_ascii=False),
                comment_count,
                average_rating,
            ),
            commit=True,
        )
        return self.get_cached()

    @staticmethod
    def generate_from_comments(product_title, comments):
        """Calls the AI provider to turn a list of comments into a short
        summary plus a handful of positive/negative bullet points.
        Returns (summary, positives, negatives). Raises on failure so the
        caller can decide how to respond to the client.
        """
        if not settings.OPENAI_KEY:
            raise RuntimeError("OPENAI_KEY is not configured.")

        client = OpenAI(base_url=settings.OPENAI_BASEURL, api_key=settings.OPENAI_KEY)

        reviews_text = "\n".join(
            f"- (امتیاز {c['rating']} از ۵): {c['content']}" for c in comments
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "تو یک دستیار تحلیل نظرات مشتری‌ها برای یک رستوران هستی. "
                        "بر اساس نظرات کاربران درباره یک محصول، فقط و فقط یک JSON با این ساختار برگردون:\n"
                        '{"summary": "یک یا دو جمله خلاصه کلی به فارسی روان",'
                        ' "positives": ["نکته مثبت کوتاه ۱", "نکته مثبت کوتاه ۲"],'
                        ' "negatives": ["نکته منفی کوتاه ۱", "نکته منفی کوتاه ۲"]}\n'
                        "حداکثر ۴ نکته مثبت و ۴ نکته منفی بده. هر نکته کوتاه (حداکثر ۶ کلمه) باشه. "
                        "اگر نکته منفی قابل توجهی وجود نداشت، لیست negatives رو خالی بذار. "
                        "فقط بر اساس متن نظرات قضاوت کن، چیزی رو از خودت اضافه نکن. خروجی فقط JSON خام باشه، بدون توضیح اضافه."
                    ),
                },
                {
                    "role": "user",
                    "content": f"نام محصول: {product_title}\n\nنظرات کاربران:\n{reviews_text}",
                },
            ],
        )

        raw = response.choices[0].message.content or "{}"
        raw = re.sub(r"^```json|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(raw)

        summary = str(parsed.get("summary") or "").strip()
        positives = [str(p).strip() for p in (parsed.get("positives") or []) if str(p).strip()][:4]
        negatives = [str(n).strip() for n in (parsed.get("negatives") or []) if str(n).strip()][:4]

        return summary, positives, negatives

    @staticmethod
    def _serialize(row):
        if not row:
            return None

        def _load(value):
            try:
                parsed = json.loads(value) if value else []
                return parsed if isinstance(parsed, list) else []
            except Exception:
                return []

        updated_at = row.get("updated_at")

        return {
            "product_ID": row["product_ID"],
            "summary": row.get("summary") or "",
            "positives": _load(row.get("positives")),
            "negatives": _load(row.get("negatives")),
            "comment_count": int(row.get("comment_count") or 0),
            "average_rating": float(row.get("average_rating") or 0),
            "updated_at": to_iso_tehran(updated_at),
        }