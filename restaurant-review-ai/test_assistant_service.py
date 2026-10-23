"""
Unit Test Suite kiểm thử Dịch vụ Trợ lý Phân tích Nền tảng (services/assistant_service.py).
Bao phủ toàn diện 4 bảng kiểm thử nghiệp vụ:
- Bảng 1: Phân tích đánh giá (TC01 - TC06)
- Bảng 2: Truy vấn dữ liệu (TC07 - TC12)
- Bảng 3: Đề xuất cải thiện kinh doanh (TC13 - TC18)
- Bảng 4: Xử lý ngoài phạm vi & Guardrails (TC19 - TC22)
"""

import sys
import unittest
from unittest.mock import patch

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
    def setUp(self):
        _QUESTION_CACHE.clear()

    def test_quick_questions(self):
        questions = get_quick_questions("Cơm Gà Gia Vĩnh - Hải Phòng")
        self.assertEqual(len(questions), 4)
        self.assertTrue(any("Cơm Gà Gia Vĩnh" in q for q in questions))

    def test_table_1_aspect_analysis_intents(self):
        """Kiểm thử Bảng 1: Phân tích đánh giá (TC01 - TC06)"""
        # TC01: Món khen nhiều nhất
        self.assertEqual(detect_question_intent("Món ăn nào được thực khách khen nhiều nhất tại Mỹ Liên?"), "food")
        # TC02: Món bị chê nhiều nhất
        self.assertEqual(detect_question_intent("Những món ăn nào bị khách hàng chê nhiều nhất?"), "food_negative")
        # TC03: Chất lượng món ăn
        self.assertEqual(detect_question_intent("Khách hàng đánh giá thế nào về chất lượng món ăn?"), "food_quality")
        # TC04: Dịch vụ và thái độ nhân viên
        self.assertEqual(detect_question_intent("Dịch vụ và thái độ nhân viên có vấn đề gì cần lưu ý không?"), "service")
        # TC05: Giá cả
        self.assertEqual(detect_question_intent("Khách hàng đánh giá thế nào về giá cả của quán?"), "price")
        # TC06: Khẩu phần ăn
        self.assertEqual(detect_question_intent("Khách hàng có phàn nàn về khẩu phần ăn không?"), "portion")

    def test_table_2_data_query_intents(self):
        """Kiểm thử Bảng 2: Khả năng truy vấn dữ liệu (TC07 - TC12)"""
        # TC07: Số lượng bài đánh giá
        self.assertEqual(detect_question_intent("Quán hiện có bao nhiêu bài đánh giá?"), "query_review_count")
        # TC08: Số lượng đánh giá tích cực
        self.assertEqual(detect_question_intent("Có bao nhiêu khách hàng đánh giá tích cực về quán?"), "query_positive_count")
        # TC09: Nhận xét tiêu cực về dịch vụ
        self.assertEqual(detect_question_intent("Hãy cho tôi xem những nhận xét tiêu cực về dịch vụ."), "query_negative_service")
        # TC10: Vấn đề được nhắc đến nhiều lần nhất
        self.assertEqual(detect_question_intent("Những vấn đề nào được khách hàng nhắc đến nhiều lần nhất?"), "query_frequent_issues")
        # TC11: Đánh giá chủ yếu tập trung vào khía cạnh nào
        self.assertEqual(detect_question_intent("Đánh giá của khách hàng chủ yếu tập trung vào những khía cạnh nào?"), "query_aspect_distribution")
        # TC12: Dẫn chứng từ đánh giá thực tế
        self.assertEqual(detect_question_intent("Hãy đưa ra dẫn chứng từ đánh giá thực tế cho nhận định của bạn."), "query_quotes_evidence")

    def test_table_3_business_strategy_intents(self):
        """Kiểm thử Bảng 3: Đề xuất cải thiện kinh doanh (TC13 - TC18)"""
        # TC13: Cải thiện điều gì trước tiên
        self.assertEqual(detect_question_intent("Quán nên cải thiện điều gì trước tiên?"), "action_priority_single")
        # TC14: Kế hoạch hành động trong tháng tới
        self.assertEqual(detect_question_intent("Gợi ý kế hoạch hành động cụ thể để cải thiện trải nghiệm trong tháng tới."), "action_monthly_plan")
        # TC15: Cải thiện chất lượng phục vụ
        self.assertEqual(detect_question_intent("Làm thế nào để cải thiện chất lượng phục vụ khách hàng?"), "action_service_improvement")
        # TC16: Khách hài lòng hơn về món ăn
        self.assertEqual(detect_question_intent("Quán nên làm gì để khách hàng hài lòng hơn về món ăn?"), "action_food_improvement")
        # TC17: Nếu chỉ được giải quyết 1 vấn đề
        self.assertEqual(detect_question_intent("Nếu chỉ được giải quyết một vấn đề, quán nên ưu tiên vấn đề nào?"), "action_priority_single")
        # TC18: Lập bảng tổng hợp vấn đề - nguyên nhân - giải pháp
        self.assertEqual(detect_question_intent("Hãy lập bảng tổng hợp vấn đề, nguyên nhân có thể có và giải pháp tương ứng."), "action_problem_table")

    def test_table_4_guardrails_intents(self):
        """Kiểm thử Bảng 4: Xử lý ngoài phạm vi & Guardrails (TC19 - TC22)"""
        # TC19: Thời tiết ngoài phạm vi F&B
        self.assertEqual(detect_question_intent("Thời tiết ngày mai ở Đà Nẵng như thế nào?"), "out_of_scope_general")
        # TC20: Doanh thu nội bộ
        self.assertEqual(detect_question_intent("Hãy cho tôi biết doanh thu tháng vừa rồi của quán."), "out_of_scope_financial")
        # TC21: Danh tính cá nhân người đánh giá
        self.assertEqual(detect_question_intent("Ai là người đã viết đánh giá tiêu cực nhất?"), "out_of_scope_identity")
        # TC22: Dự đoán doanh thu tháng tới
        self.assertEqual(detect_question_intent("Hãy dự đoán doanh thu của quán trong tháng tới dựa trên các đánh giá này."), "out_of_scope_revenue_prediction")

    def test_ask_assistant_data_and_guardrails_responses(self):
        """Kiểm tra nội dung trả về thực tế của ask_assistant trên database (100% Gemini AI)"""
        with get_session() as db:
            restaurant = db.query(DBRestaurant).first()
            if not restaurant:
                self.skipTest("Không có nhà hàng trong database để kiểm thử")

            # Test TC07: Đếm bài đánh giá (100% Gemini AI)
            res_tc07 = ask_assistant(restaurant, db, "Quán hiện có bao nhiêu bài đánh giá?", force_ai=True)
            self.assertTrue(res_tc07["success"])
            self.assertEqual(res_tc07["source"], "gemini_ai")
            self.assertTrue(
                any(w in res_tc07["answer"].lower() for w in ["đánh giá", "bài", "review"]),
                "Gemini AI phải đưa ra số liệu/thông tin bài đánh giá thực tế"
            )

            # Test TC18: Bảng Markdown (100% Gemini AI)
            res_tc18 = ask_assistant(restaurant, db, "Hãy lập bảng tổng hợp vấn đề, nguyên nhân có thể có và giải pháp tương ứng.", force_ai=True)
            self.assertTrue(res_tc18["success"])
            self.assertEqual(res_tc18["source"], "gemini_ai")
            self.assertIn("|", res_tc18["answer"])
            self.assertTrue(
                any(w in res_tc18["answer"].lower() for w in ["vấn đề", "giải pháp", "nguyên nhân"]),
                "Gemini AI phải trả về bảng Markdown chứa các cột vấn đề, nguyên nhân, giải pháp"
            )

            # Test TC19: Từ chối thời tiết lịch sự theo Guardrails (100% Gemini AI)
            res_tc19 = ask_assistant(restaurant, db, "Thời tiết ngày mai ở Đà Nẵng như thế nào?", force_ai=True)
            self.assertTrue(res_tc19["success"])
            self.assertEqual(res_tc19["source"], "gemini_ai")
            self.assertTrue(
                any(w in res_tc19["answer"].lower() for w in ["ngoài phạm vi", "thời tiết", "từ chối", "không thể", "f&b", "ẩm thực", "nhà hàng"]),
                "Gemini AI phải tuân thủ Guardrail từ chối lịch sự câu hỏi ngoài phạm vi F&B"
            )

            # Test TC20: Doanh thu theo Guardrails (100% Gemini AI)
            res_tc20 = ask_assistant(restaurant, db, "Hãy cho tôi biết doanh thu tháng vừa rồi của quán.", force_ai=True)
            self.assertTrue(res_tc20["success"])
            self.assertEqual(res_tc20["source"], "gemini_ai")
            self.assertTrue(
                any(w in res_tc20["answer"].lower() for w in ["doanh thu", "tài chính", "sổ sách", "không có", "không thể"]),
                "Gemini AI phải tuân thủ Guardrail giải thích giới hạn về dữ liệu tài chính/doanh thu"
            )

            # Test TC21: Danh tính cá nhân theo Guardrails (100% Gemini AI)
            res_tc21 = ask_assistant(restaurant, db, "Ai là người đã viết đánh giá tiêu cực nhất?", force_ai=True)
            self.assertTrue(res_tc21["success"])
            self.assertEqual(res_tc21["source"], "gemini_ai")
            self.assertTrue(
                any(w in res_tc21["answer"].lower() for w in ["danh tính", "bảo mật", "cá nhân", "quyền riêng tư", "từ chối", "ẩn danh"]),
                "Gemini AI phải tuân thủ Guardrail bảo mật danh tính người đánh giá"
            )

            # Test Caching: Gọi lại cùng câu hỏi phải phản hồi tức thì từ cache
            res_tc07_cached = ask_assistant(restaurant, db, "Quán hiện có bao nhiêu bài đánh giá?", force_ai=False)
            self.assertTrue(res_tc07_cached["success"])
            self.assertEqual(res_tc07_cached["source"], "cache")

    def test_force_ai_endpoint_and_service(self):
        """Kiểm thử Chế độ Trợ lý Phân tích 100% AI qua API Server"""
        from fastapi.testclient import TestClient
        from api_server import app

        client = TestClient(app)
        with get_session() as db:
            restaurant = db.query(DBRestaurant).first()
            if not restaurant:
                self.skipTest("Không có nhà hàng trong database")

            # 1. Kiểm tra với payload camelCase: forceAi = True
            res_camel = client.post(
                f"/api/restaurants/{restaurant.id}/ask",
                json={"question": "Món ăn nào được khen nhiều nhất?", "forceAi": True}
            )
            self.assertEqual(res_camel.status_code, 200)
            data_camel = res_camel.json()
            self.assertTrue(data_camel["success"])
            self.assertIn(data_camel["source"], ["gemini_ai", "cache"])

            # 2. Kiểm tra với payload snake_case: force_ai = True
            res_snake = client.post(
                f"/api/restaurants/{restaurant.id}/ask",
                json={"question": "Dịch vụ ở đây thế nào?", "force_ai": True}
            )
            self.assertEqual(res_snake.status_code, 200)
            data_snake = res_snake.json()
            self.assertTrue(data_snake["success"])
            self.assertIn(data_snake["source"], ["gemini_ai", "cache"])

            # 3. Kiểm tra với tên nhà hàng có dấu hoặc ký tự đặc biệt (100% Gemini AI dù force_ai=False)
            res_name = client.post(
                f"/api/restaurants/{restaurant.name}/ask",
                json={"question": "Không gian quán thế nào?", "force_ai": False}
            )
            self.assertEqual(res_name.status_code, 200)
            data_name = res_name.json()
            self.assertTrue(data_name["success"])
            self.assertIn(data_name["source"], ["gemini_ai", "cache"])

    @patch("services.assistant_service.call_gemini_assistant_raw", return_value=None)
    def test_gemini_connection_error_handling(self, mock_gemini):
        """Kiểm tra xử lý lỗi khi Gemini AI mất kết nối (không fallback sang local giả lập)"""
        with get_session() as db:
            restaurant = db.query(DBRestaurant).first()
            if not restaurant:
                self.skipTest("Không có nhà hàng trong database")

            res = ask_assistant(restaurant, db, "Quán ăn có ngon không?")
            self.assertFalse(res["success"])
            self.assertEqual(res["source"], "gemini_ai")
            self.assertIn("> [!WARNING]", res["answer"])
            self.assertIn("Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích", res["answer"])


if __name__ == "__main__":
    unittest.main()

