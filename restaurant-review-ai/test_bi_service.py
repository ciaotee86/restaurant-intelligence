"""
Unit test kiểm thử module Business Intelligence (services/bi_service.py).
"""

import sys
import unittest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from services.bi_service import (
    remove_accents,
    detect_city,
    map_aspect_vietnamese,
    extract_keywords_from_texts,
    format_restaurant_full
)
from database.db import get_session
from database.models import Restaurant as DBRestaurant


class TestBIService(unittest.TestCase):
    def test_remove_accents(self):
        self.assertEqual(remove_accents("Đà Nẵng"), "da nang")
        self.assertEqual(remove_accents("Bánh xèo"), "banh xeo")
        self.assertEqual(remove_accents("Phở Thìn"), "pho thin")

    def test_detect_city(self):
        self.assertEqual(detect_city("241 Hải Phòng, Quận Thanh Khê, Đà Nẵng"), "Đà Nẵng")
        self.assertEqual(detect_city("123 Hoàn Kiếm, Hà Nội"), "Hà Nội")
        self.assertEqual(detect_city("456 Quận 1, TP Hồ Chí Minh"), "TP. Hồ Chí Minh")
        self.assertEqual(detect_city("Chưa rõ địa chỉ"), "Toàn quốc")

    def test_map_aspect_vietnamese(self):
        self.assertEqual(map_aspect_vietnamese("món ăn ngon"), "Món ăn")
        self.assertEqual(map_aspect_vietnamese("price / giá cả"), "Giá cả")
        self.assertEqual(map_aspect_vietnamese("phục vụ / nhân viên"), "Dịch vụ")
        self.assertEqual(map_aspect_vietnamese("không gian quán"), "Không gian")
        self.assertEqual(map_aspect_vietnamese("vệ sinh / sạch sẽ"), "Vệ sinh")

    def test_extract_keywords(self):
        texts = [
            "Bún bò ở đây rất ngon và đậm đà",
            "Nước dùng đậm đà, thịt bò mềm"
        ]
        kw = extract_keywords_from_texts(texts, max_keywords=3)
        self.assertTrue(len(kw) > 0)
        self.assertIn("đậm", kw)

    def test_format_restaurant_full_with_db(self):
        with get_session() as db:
            first_rest = db.query(DBRestaurant).first()
            if first_rest:
                data = format_restaurant_full(first_rest, db)
                self.assertIn("id", data)
                self.assertIn("name", data)
                self.assertIn("sentimentDistribution", data)
                self.assertIn("aspects", data)
                self.assertIn("strengths", data)
                self.assertIn("attentionAreas", data)
                self.assertIn("operationalChecklist", data)
                self.assertEqual(len(data["aspects"]), 5)
                self.assertTrue(data["sentimentDistribution"]["positive"] >= 0)


if __name__ == "__main__":
    unittest.main()
