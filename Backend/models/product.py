import os
import uuid
from werkzeug.utils import secure_filename
from core.database import execute_query
from helpers.validators import allowed_file
from config.settings import UPLOAD_FOLDER, SERVER_IP, SERVER_PORT

class Product:
    def __init__(self, product_id=None):
        self.product_id = product_id

    def add_product(self, image_file, title, description, category, price):
        if not title or not description or not category or price is None:
            return False, "All product fields are required."

        try:
            price = float(price)
            if price < 0:
                return False, "Price cannot be negative."
        except ValueError:
            return False, "Invalid price format."

        if not image_file or image_file.filename == "":
            return False, "Product image is required."

        if not allowed_file(image_file.filename):
            return False, "Invalid image file type."

        safe_name = secure_filename(image_file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{safe_name}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        image_file.save(file_path)

        execute_query(
            """
            INSERT INTO `products` (`image`, `title`, `description`, `category`, `price`)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (unique_filename, title, description, category, price),
            commit=True
        )

        return True, "Product added successfully."

    def get_all_products(self, category=None, search=None):
        query = "SELECT * FROM `products` WHERE 1=1"
        params = []

        if category:
            query += " AND `category` = %s"
            params.append(category)

        if search:
            query += " AND (`title` LIKE %s OR `description` LIKE %s)"
            params.append(f"%{search}%")
            params.append(f"%{search}%")

        query += " ORDER BY `product_ID` DESC"

        products = execute_query(query, tuple(params), fetchall=True)

        result = []
        for item in products or []:
            result.append({
                "product_ID": item["product_ID"],
                "image": f"http://{SERVER_IP}:{SERVER_PORT}/api/product/image/{item['product_ID']}",
                "image_name": item["image"],
                "title": item["title"],
                "description": item["description"],
                "category": item["category"],
                "price": float(item["price"])
            })

        return result

    def get_single_product(self):
        item = execute_query(
            "SELECT * FROM `products` WHERE `product_ID` = %s",
            (self.product_id,),
            fetchone=True
        )

        if not item:
            return None

        stats = None
        try:
            from models.comment import Comment
            stats = Comment().get_stats(self.product_id)
        except Exception:
            stats = {
                "total": 0,
                "average_rating": 0,
            }

        return {
            "product_ID": item["product_ID"],
            "image": f"http://{SERVER_IP}:{SERVER_PORT}/api/product/image/{item['product_ID']}",
            "image_name": item["image"],
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "price": float(item["price"]),
            "comment_stats": stats,
        }

    def get_product_image_name(self):
        item = execute_query(
            "SELECT `image` FROM `products` WHERE `product_ID` = %s",
            (self.product_id,),
            fetchone=True
        )

        if not item:
            return None

        return item["image"]

    def update_product(self, title=None, description=None, category=None, price=None, image_file=None):
        current_product = execute_query(
            "SELECT * FROM `products` WHERE `product_ID` = %s",
            (self.product_id,),
            fetchone=True
        )

        if not current_product:
            return False, "Product not found."

        fields = {}
        old_image_name = current_product["image"]

        if title is not None:
            fields["title"] = title

        if description is not None:
            fields["description"] = description

        if category is not None:
            fields["category"] = category

        if price is not None:
            try:
                price = float(price)
                if price < 0:
                    return False, "Price cannot be negative."
                fields["price"] = price
            except ValueError:
                return False, "Invalid price format."

        if image_file:
            if not allowed_file(image_file.filename):
                return False, "Invalid image file type."

            safe_name = secure_filename(image_file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{safe_name}"
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            image_file.save(file_path)
            fields["image"] = unique_filename

            old_file_path = os.path.join(UPLOAD_FOLDER, old_image_name)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass

        if not fields:
            return False, "No fields provided for update."

        set_parts = []
        values = []

        for column, value in fields.items():
            set_parts.append(f"`{column}` = %s")
            values.append(value)

        values.append(self.product_id)

        query = f"UPDATE `products` SET {', '.join(set_parts)} WHERE `product_ID` = %s"
        execute_query(query, tuple(values), commit=True)

        return True, "Product updated successfully."

    def delete_product(self):
        current_product = execute_query(
            "SELECT * FROM `products` WHERE `product_ID` = %s",
            (self.product_id,),
            fetchone=True
        )

        if not current_product:
            return False, "Product not found."

        image_name = current_product["image"]

        execute_query(
            "DELETE FROM `product_comments` WHERE `product_ID` = %s",
            (self.product_id,),
            commit=True
        )

        execute_query(
            "DELETE FROM `products` WHERE `product_ID` = %s",
            (self.product_id,),
            commit=True
        )

        file_path = os.path.join(UPLOAD_FOLDER, image_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        return True, "Product deleted successfully."

    @staticmethod
    def list_categories():
        rows = execute_query(
            "SELECT DISTINCT `category` FROM `products` ORDER BY `category` ASC",
            fetchall=True
        )

        return [row["category"] for row in rows] if rows else []
