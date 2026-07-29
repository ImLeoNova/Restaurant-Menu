import unittest

from helpers.validators import (
    is_valid_address,
    is_valid_national_id,
    is_valid_phone_number,
)


class ProfileValidatorsTests(unittest.TestCase):
    def test_valid_phone_numbers(self):
        self.assertTrue(is_valid_phone_number("09123456789"))
        self.assertTrue(is_valid_phone_number("+989123456789"))
        self.assertFalse(is_valid_phone_number("12345"))
        self.assertFalse(is_valid_phone_number("08123456789"))

    def test_valid_national_ids(self):
        self.assertTrue(is_valid_national_id(None))
        self.assertTrue(is_valid_national_id(""))
        self.assertTrue(is_valid_national_id("1111111111"))
        self.assertFalse(is_valid_national_id("123456789"))
        self.assertFalse(is_valid_national_id("12345678901"))

    def test_valid_address(self):
        self.assertTrue(is_valid_address("خیابان ولیعصر"))
        self.assertFalse(is_valid_address("ok"))
        self.assertFalse(is_valid_address(None))
