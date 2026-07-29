import unittest

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
