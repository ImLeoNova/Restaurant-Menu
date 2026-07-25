from core.database import execute_query


class Comment:
    def __init__(self, comment_id=None):
        self.comment_id = comment_id

    def get_by_product(self, product_id, limit=50, offset=0):
        rows = execute_query(
            """
            SELECT
                c.`comment_ID`,
                c.`product_ID`,
                c.`user_ID`,
                c.`content`,
                c.`rating`,
                c.`created_at`,
                c.`updated_at`,
                u.`username`
            FROM `product_comments` c
            LEFT JOIN `restaurantusers` u ON u.`user_ID` = c.`user_ID`
            WHERE c.`product_ID` = %s
            ORDER BY c.`created_at` DESC
            LIMIT %s OFFSET %s
            """,
            (product_id, int(limit), int(offset)),
            fetchall=True,
        )

        return [self._serialize(row) for row in (rows or [])]

    def get_stats(self, product_id):
        stats = execute_query(
            """
            SELECT
                COUNT(*) AS `total`,
                COALESCE(AVG(`rating`), 0) AS `average_rating`,
                SUM(CASE WHEN `rating` = 5 THEN 1 ELSE 0 END) AS `five_star`,
                SUM(CASE WHEN `rating` = 4 THEN 1 ELSE 0 END) AS `four_star`,
                SUM(CASE WHEN `rating` = 3 THEN 1 ELSE 0 END) AS `three_star`,
                SUM(CASE WHEN `rating` = 2 THEN 1 ELSE 0 END) AS `two_star`,
                SUM(CASE WHEN `rating` = 1 THEN 1 ELSE 0 END) AS `one_star`
            FROM `product_comments`
            WHERE `product_ID` = %s
            """,
            (product_id,),
            fetchone=True,
        )

        if not stats:
            return {
                "total": 0,
                "average_rating": 0,
                "five_star": 0,
                "four_star": 0,
                "three_star": 0,
                "two_star": 0,
                "one_star": 0,
            }

        return {
            "total": int(stats["total"] or 0),
            "average_rating": round(float(stats["average_rating"] or 0), 1),
            "five_star": int(stats["five_star"] or 0),
            "four_star": int(stats["four_star"] or 0),
            "three_star": int(stats["three_star"] or 0),
            "two_star": int(stats["two_star"] or 0),
            "one_star": int(stats["one_star"] or 0),
        }

    def add_comment(self, product_id, user_id, content, rating=5):
        product = execute_query(
            "SELECT `product_ID` FROM `products` WHERE `product_ID` = %s",
            (product_id,),
            fetchone=True,
        )
        if not product:
            return False, "Product not found.", None

        cleaned = (content or "").strip()
        if not cleaned:
            return False, "Comment content is required.", None

        if len(cleaned) < 3:
            return False, "Comment is too short.", None

        if len(cleaned) > 1000:
            return False, "Comment is too long.", None

        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return False, "Invalid rating.", None

        if rating < 1 or rating > 5:
            return False, "Rating must be between 1 and 5.", None

        execute_query(
            """
            INSERT INTO `product_comments` (`product_ID`, `user_ID`, `content`, `rating`)
            VALUES (%s, %s, %s, %s)
            """,
            (product_id, user_id, cleaned, rating),
            commit=True,
        )

        created = execute_query(
            """
            SELECT
                c.`comment_ID`,
                c.`product_ID`,
                c.`user_ID`,
                c.`content`,
                c.`rating`,
                c.`created_at`,
                c.`updated_at`,
                u.`username`
            FROM `product_comments` c
            LEFT JOIN `restaurantusers` u ON u.`user_ID` = c.`user_ID`
            WHERE c.`user_ID` = %s AND c.`product_ID` = %s
            ORDER BY c.`comment_ID` DESC
            LIMIT 1
            """,
            (user_id, product_id),
            fetchone=True,
        )

        return True, "Comment added successfully.", self._serialize(created)

    def update_comment(self, user_id, content=None, rating=None, is_admin=False):
        current = execute_query(
            "SELECT * FROM `product_comments` WHERE `comment_ID` = %s",
            (self.comment_id,),
            fetchone=True,
        )

        if not current:
            return False, "Comment not found.", None

        if not is_admin and current["user_ID"] != user_id:
            return False, "You can only edit your own comments.", None

        fields = {}

        if content is not None:
            cleaned = content.strip()
            if len(cleaned) < 3:
                return False, "Comment is too short.", None
            if len(cleaned) > 1000:
                return False, "Comment is too long.", None
            fields["content"] = cleaned

        if rating is not None:
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return False, "Invalid rating.", None
            if rating < 1 or rating > 5:
                return False, "Rating must be between 1 and 5.", None
            fields["rating"] = rating

        if not fields:
            return False, "No fields provided for update.", None

        set_parts = [f"`{column}` = %s" for column in fields]
        values = list(fields.values())
        values.append(self.comment_id)

        execute_query(
            f"UPDATE `product_comments` SET {', '.join(set_parts)} WHERE `comment_ID` = %s",
            tuple(values),
            commit=True,
        )

        updated = execute_query(
            """
            SELECT
                c.`comment_ID`,
                c.`product_ID`,
                c.`user_ID`,
                c.`content`,
                c.`rating`,
                c.`created_at`,
                c.`updated_at`,
                u.`username`
            FROM `product_comments` c
            LEFT JOIN `restaurantusers` u ON u.`user_ID` = c.`user_ID`
            WHERE c.`comment_ID` = %s
            """,
            (self.comment_id,),
            fetchone=True,
        )

        return True, "Comment updated successfully.", self._serialize(updated)

    def delete_comment(self, user_id, is_admin=False):
        current = execute_query(
            "SELECT * FROM `product_comments` WHERE `comment_ID` = %s",
            (self.comment_id,),
            fetchone=True,
        )

        if not current:
            return False, "Comment not found."

        if not is_admin and current["user_ID"] != user_id:
            return False, "You can only delete your own comments."

        execute_query(
            "DELETE FROM `product_comments` WHERE `comment_ID` = %s",
            (self.comment_id,),
            commit=True,
        )

        return True, "Comment deleted successfully."

    @staticmethod
    def _serialize(row):
        if not row:
            return None

        created_at = row.get("created_at")
        updated_at = row.get("updated_at")

        return {
            "comment_ID": row["comment_ID"],
            "product_ID": row["product_ID"],
            "user_ID": row["user_ID"],
            "username": row.get("username") or "کاربر",
            "content": row["content"],
            "rating": int(row["rating"]),
            "created_at": created_at.isoformat() if created_at else None,
            "updated_at": updated_at.isoformat() if updated_at else None,
        }
