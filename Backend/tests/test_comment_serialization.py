import unittest
from unittest.mock import patch

from models.comment import Comment


class CommentSerializationTests(unittest.TestCase):
    def test_serialize_uses_display_name_and_drops_username(self):
        row = {
            "comment_ID": 1,
            "product_ID": 2,
            "user_ID": "u1",
            "content": "Nice!",
            "rating": 5,
            "created_at": None,
            "updated_at": None,
            "first_name": "John",
            "last_name": "Doe",
            "avatar": "avatar-key",
        }

        result = Comment._serialize(row)

        self.assertEqual(result["display_name"], "John Doe")
        self.assertEqual(result["avatar"], "avatar-key")
        self.assertNotIn("username", result)

    def test_serialize_falls_back_to_generic_label_when_names_are_empty(self):
        row = {
            "comment_ID": 1,
            "product_ID": 2,
            "user_ID": "u1",
            "content": "Nice!",
            "rating": 5,
            "created_at": None,
            "updated_at": None,
            "first_name": "",
            "last_name": "",
            "avatar": None,
        }

        result = Comment._serialize(row)

        self.assertEqual(result["display_name"], "کاربر")
        self.assertIsNone(result["avatar"])
        self.assertNotIn("username", result)

    @patch("models.comment.execute_query")
    def test_get_by_product_selects_identity_fields(self, mock_execute_query):
        mock_execute_query.return_value = []

        Comment().get_by_product(7, limit=10, offset=0)

        query = mock_execute_query.call_args.args[0]
        self.assertIn("u.`first_name`", query)
        self.assertIn("u.`last_name`", query)
        self.assertIn("u.`avatar`", query)
