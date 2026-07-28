import re
from pathlib import Path

from werkzeug.utils import secure_filename

from core.database import execute_query
from helpers.validators import allowed_file, is_valid_image
from storage.s3_client import s3_client


SEED_CATEGORIES = [
    ("burger", "همبرگر", "burger_landing2.png"),
    ("pizza", "پیتزا", "pizza_landing.png"),
    ("pasta", "پاستا", "pasta_landing.png"),
    ("steak", "استیک", "steak_landing.png"),
    ("taco", "تاکو", "taco_landing.png"),
    ("shawarma", "شاورما", "kebab_landing.png"),
    ("snack", "اسنک", "snack_landing.png"),
    ("appetizer", "پیش غذا", "appetizer_landing.png"),
]


class Category:
    def __init__(self, category_id=None):
        self.category_id = category_id

    @staticmethod
    def _image_url(category_id):
        return f"/api/category/image/{category_id}"

    @staticmethod
    def _normalize_slug(slug):
        if not slug:
            return ""
        slug = slug.strip().lower()
        slug = re.sub(r"\s+", "-", slug)
        slug = re.sub(r"[^a-z0-9\-_]", "", slug)
        return slug

    @staticmethod
    def _serialize(row, product_count=None):
        if product_count is None:
            count_row = execute_query(
                "SELECT COUNT(*) AS total FROM `products` WHERE `category` = %s",
                (row["slug"],),
                fetchone=True,
            )
            product_count = int(count_row["total"]) if count_row else 0

        image_value = row.get("image") or ""
        return {
            "category_ID": row["category_ID"],
            "title": row["title"],
            "category": row["slug"],
            "slug": row["slug"],
            "image": _signed_url(image_value),
            "image_name": image_value,
            "product_count": product_count,
        }

    def add_category(self, image_file, title, slug):
        title = (title or "").strip()
        slug = self._normalize_slug(slug)

        if not title or not slug:
            return False, "عنوان و شناسه دسته‌بندی الزامی است."

        if not re.match(r"^[a-z0-9][a-z0-9\-_]*$", slug):
            return False, "شناسه دسته‌بندی فقط می‌تواند شامل حروف انگلیسی، عدد و - باشد."

        existing = execute_query(
            "SELECT `category_ID` FROM `categories` WHERE `slug` = %s",
            (slug,),
            fetchone=True,
        )
        if existing:
            return False, "این شناسه دسته‌بندی از قبل وجود دارد."

        if not image_file or image_file.filename == "":
            return False, "تصویر دسته‌بندی الزامی است."

        if not allowed_file(image_file.filename):
            return False, "فرمت تصویر معتبر نیست."

        if not is_valid_image(image_file):
            return False, "محتوای تصویر نامعتبر است."

        safe_name = secure_filename(image_file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{safe_name}"
        image_file.stream.seek(0)
        object_key = f"images/categories/{unique_filename}"

        content_type = _guess_content_type(safe_name)
        s3_client.upload_image(image_file.stream, object_key, content_type=content_type)

        execute_query(
            """
            INSERT INTO `categories` (`slug`, `title`, `image`)
            VALUES (%s, %s, %s)
            """,
            (slug, title, object_key),
            commit=True,
        )

        return True, "دسته‌بندی با موفقیت اضافه شد."

    def get_all_categories(self):
        rows = execute_query(
            """
            SELECT
              c.`category_ID`,
              c.`slug`,
              c.`title`,
              c.`image`,
              COUNT(p.`product_ID`) AS product_count
            FROM `categories` c
            LEFT JOIN `products` p ON p.`category` = c.`slug`
            GROUP BY c.`category_ID`, c.`slug`, c.`title`, c.`image`
            ORDER BY c.`category_ID` ASC
            """,
            fetchall=True,
        )

        result = []
        for row in rows or []:
            result.append(
                self._serialize(
                    row,
                    product_count=int(row.get("product_count") or 0),
                )
            )
        return result

    def get_single_category(self):
        row = execute_query(
            "SELECT * FROM `categories` WHERE `category_ID` = %s",
            (self.category_id,),
            fetchone=True,
        )
        if not row:
            return None
        return self._serialize(row)

    def get_by_slug(self, slug):
        row = execute_query(
            "SELECT * FROM `categories` WHERE `slug` = %s",
            (self._normalize_slug(slug),),
            fetchone=True,
        )
        if not row:
            return None
        return self._serialize(row)

    def get_category_image_name(self):
        row = execute_query(
            "SELECT `image` FROM `categories` WHERE `category_ID` = %s",
            (self.category_id,),
            fetchone=True,
        )
        if not row:
            return None
        return row.get("image")

    def get_products(self):
        category = self.get_single_category()
        if not category:
            return None, []

        from models.product import Product

        products = Product().get_all_products(category=category["slug"])
        return category, products

    def update_category(self, title=None, slug=None, image_file=None):
        current = execute_query(
            "SELECT * FROM `categories` WHERE `category_ID` = %s",
            (self.category_id,),
            fetchone=True,
        )
        if not current:
            return False, "دسته‌بندی پیدا نشد."

        fields = {}
        old_slug = current["slug"]
        old_image_key = current.get("image") or ""

        if title is not None:
            title = title.strip()
            if not title:
                return False, "عنوان دسته‌بندی نمی‌تواند خالی باشد."
            fields["title"] = title

        if slug is not None:
            slug = self._normalize_slug(slug)
            if not slug:
                return False, "شناسه دسته‌بندی نمی‌تواند خالی باشد."
            if not re.match(r"^[a-z0-9][a-z0-9\-_]*$", slug):
                return False, "شناسه دسته‌بندی فقط می‌تواند شامل حروف انگلیسی، عدد و - باشد."

            duplicate = execute_query(
                """
                SELECT `category_ID` FROM `categories`
                WHERE `slug` = %s AND `category_ID` <> %s
                """,
                (slug, self.category_id),
                fetchone=True,
            )
            if duplicate:
                return False, "این شناسه دسته‌بندی از قبل وجود دارد."
            fields["slug"] = slug

        if image_file and image_file.filename:
            if not allowed_file(image_file.filename):
                return False, "فرمت تصویر معتبر نیست."

            if not is_valid_image(image_file):
                return False, "محتوای تصویر نامعتبر است."

            safe_name = secure_filename(image_file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{safe_name}"
            image_file.stream.seek(0)
            object_key = f"images/categories/{unique_filename}"

            content_type = _guess_content_type(safe_name)
            s3_client.upload_image(image_file.stream, object_key, content_type=content_type)
            fields["image"] = object_key

            if old_image_key:
                try:
                    s3_client.delete_image(old_image_key)
                except Exception:
                    pass

        if not fields:
            return False, "هیچ فیلدی برای بروزرسانی ارسال نشده است."

        set_parts = []
        values = []
        for column, value in fields.items():
            set_parts.append(f"`{column}` = %s")
            values.append(value)

        values.append(self.category_id)
        execute_query(
            f"UPDATE `categories` SET {', '.join(set_parts)} WHERE `category_ID` = %s",
            tuple(values),
            commit=True,
        )

        if "slug" in fields and fields["slug"] != old_slug:
            execute_query(
                "UPDATE `products` SET `category` = %s WHERE `category` = %s",
                (fields["slug"], old_slug),
                commit=True,
            )

        return True, "دسته‌بندی با موفقیت بروزرسانی شد."

    def delete_category(self):
        current = execute_query(
            "SELECT * FROM `categories` WHERE `category_ID` = %s",
            (self.category_id,),
            fetchone=True,
        )
        if not current:
            return False, "دسته‌بندی پیدا نشد."

        count_row = execute_query(
            "SELECT COUNT(*) AS total FROM `products` WHERE `category` = %s",
            (current["slug"],),
            fetchone=True,
        )
        product_count = int(count_row["total"]) if count_row else 0
        if product_count > 0:
            return (
                False,
                f"این دسته‌بندی دارای {product_count} محصول است. ابتدا محصولات را حذف یا جابه‌جا کنید.",
            )

        image_key = current.get("image") or ""

        execute_query(
            "DELETE FROM `categories` WHERE `category_ID` = %s",
            (self.category_id,),
            commit=True,
        )

        if image_key:
            try:
                s3_client.delete_image(image_key)
            except Exception:
                pass

        return True, "دسته‌بندی با موفقیت حذف شد."

    @staticmethod
    def seed_defaults():
        """Seed default categories once if table is empty."""
        existing = execute_query(
            "SELECT COUNT(*) AS total FROM `categories`",
            fetchone=True,
        )
        if existing and int(existing.get("total") or 0) > 0:
            return

        assets_dir = Path(__file__).resolve().parent.parent / "categories"

        for slug, title, asset_name in SEED_CATEGORIES:
            object_key = ""
            source = assets_dir / asset_name
            if source.exists():
                ext = source.suffix.lower() or ".png"
                object_key = f"images/categories/seed_{slug}{ext}"
                with open(source, "rb") as f:
                    s3_client.upload_image(
                        f,
                        object_key,
                        content_type=_guess_content_type(asset_name),
                    )

            execute_query(
                """
                INSERT INTO `categories` (`slug`, `title`, `image`)
                VALUES (%s, %s, %s)
                """,
                (slug, title, object_key),
                commit=True,
            )


def _guess_content_type(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return mapping.get(ext, "application/octet-stream")


def _signed_url(object_key):
    if not object_key:
        return ""
    try:
        if object_key.startswith("images/"):
            return s3_client.get_public_url(object_key)
        return s3_client.get_signed_url(object_key, expiry_seconds=3600)
    except Exception:
        return ""
