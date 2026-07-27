import unittest

from helpers.sanitizer import sanitize_html_content


class AiSanitizerTests(unittest.TestCase):
    def test_preserves_safe_html_and_images(self):
        html = '<div class="flex w-full justify-center"><img src="https://example.com/pic.png" alt="برگر" width="100" /><p>سلام</p></div>'

        sanitized = sanitize_html_content(html)

        self.assertIn('<div class="flex w-full justify-center">', sanitized)
        self.assertIn('<img', sanitized)
        self.assertIn('src="https://example.com/pic.png"', sanitized)
        self.assertIn('alt="برگر"', sanitized)
        self.assertIn('<p>سلام</p>', sanitized)

    def test_removes_script_and_javascript_handlers(self):
        html = '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)" /><a href="javascript:alert(1)">link</a>'

        sanitized = sanitize_html_content(html)

        self.assertNotIn('<script', sanitized)
        self.assertNotIn('onerror', sanitized)
        self.assertNotIn('javascript:', sanitized)
        self.assertNotIn('<a', sanitized)
