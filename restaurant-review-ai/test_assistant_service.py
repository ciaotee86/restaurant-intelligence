"""
Unit Test Suite kiểm thử Dịch vụ Trợ lý AI Nhà Hàng (services/assistant_service.py).
Kiểm tra khả năng tổng hợp câu trả lời theo dữ liệu thực tế và cơ chế Caching chống cạn Quota.
"""

import sys
import unittest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from services.assistant_service import (
    get_quick_questions,
    detect_question_intent,
    ask_assistant,
    _QUESTION_CACHE
)
from database.db import get_session
from database.models import Restaurant as DBRestaurant


class TestAssistantService(unittest.TestCase):
    def test_quick_questions(self):
        questions = get_quick_questions("Cơm Gà Gia Vĩnh - Hải Phòng")
        self.assertEqual(len(questions), 4)
        self.assertTrue(any("Cơm Gà Gia Vĩnh" in q for q in questions))

    def test_intent_detection(self):
        self.assertEqual(detect_question_intent("Món nào ở đây ngon nhất?"), "food")
        self.assertEqual(detect_question_intent("Nhân viên phục vụ có nhanh không?"), "service")
        self.assertEqual(detect_question_intent("Giá cả có đắt không?"), "price")
        self.assertEqual(detect_question_intent("Không gian quán có sạch sẽ không?"), "space_hygiene")
        self.assertEqual(detect_question_intent("Gợi ý kế hoạch hành động cải thiện?"), "action_plan")

    def test_ask_assistant_with_caching(self):
        with get_session() as db:
            restaurant = db.query(DBRestaurant).first()
            if not restaurant:
                self.skipTest("Không có nhà hàng trong database để kiểm thử")

            # 1. Lần đầu hỏi -> Trả lời bằng Local BI (source='local_bi')
            res1 = ask_assistant(restaurant, db, "Món ăn nào ngon nhất?", force_ai=False)
            self.assertTrue(res1["success"])
            self.assertEqual(res1["source"], "local_bi")
            self.assertIn("Món ăn", res1["answer"])

            # 2. Lần 2 hỏi cùng câu -> Phải lấy từ Cache (source='cache')
            res2 = ask_assistant(restaurant, db, "Món ăn nào ngon nhất?", force_ai=False)
            self.assertTrue(res2["success"])
            self.assertEqual(res2["source"], "cache")
            self.assertEqual(res1["answer"], res2["answer"])


if __name__ == "__main__":
    unittest.main()
