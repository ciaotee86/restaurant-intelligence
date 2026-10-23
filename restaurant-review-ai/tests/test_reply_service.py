"""
Test suite toàn diện cho Dịch vụ AI Soạn Thư Phản Hồi Khách Hàng (AI Review Responder).
Bao gồm:
1. Unit Tests cho các hàm tiện ích và logic nghiệp vụ lõi (services/reply_service.py):
   - Sinh mã voucher chuẩn format CARE-{SHORTNAME}-{DISCOUNT}
   - Trích xuất khía cạnh dịch vụ/ẩm thực (aspectsAddressed)
   - Xây dựng prompt định hướng chuyên sâu cho 4 tông giọng
   - Fallback chuyên gia ẩm thực F&B (100% không crash)
   - Điều phối generate_review_reply (4 tông giọng, voucher, cache in-memory, force regenerate)
2. Integration Tests cho các REST API Endpoints (api_server.py & routers/restaurants.py):
   - POST /api/restaurants/{id}/reply (200 OK, đầy đủ metadata)
   - Alias POST /api/restaurants/{id}/generate-reply
   - Kiểm tra định danh ID số (1), ID tiền tố (res-1), slug Foody (com-chien-gion-gia-vinh), slug không dấu (gia-vinh)
   - Kiểm thử Validation: reviewText rỗng -> 400 Bad Request, thiếu field -> 422 Unprocessable Entity
   - Kiểm thử 404 Not Found khi nhà hàng không tồn tại và không có tên dự phòng
   - Kiểm thử luồng In-Memory Cache và Force Regenerate qua HTTP
"""

import sys
import re
from pathlib import Path
from unittest.mock import patch
import pytest

# Đảm bảo đường dẫn import đúng module trong thư mục restaurant-review-ai
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from api_server import app
from services.reply_service import (
    generate_voucher_code,
    extract_aspects_addressed,
    build_system_prompt,
    synthesize_fallback_reply,
    generate_review_reply,
    make_cache_key,
    _REPLY_CACHE
)


@pytest.fixture(autouse=True)
def reset_reply_cache():
    """Tự động làm sạch In-Memory Cache trước và sau mỗi test case để đảm bảo tính độc lập tuyệt đối."""
    _REPLY_CACHE.clear()
    yield
    _REPLY_CACHE.clear()


@pytest.fixture
def client():
    """Khởi tạo TestClient cho FastAPI app."""
    return TestClient(app)


# ==============================================================================
# PHẦN 1: UNIT TESTS CHO CÁC HÀM TIỆN ÍCH & LOGIC LÕI
# ==============================================================================

class TestReplyServiceHelpers:
    """Kiểm thử các hàm helper sinh voucher, phân tích khía cạnh, prompt và fallback."""

    def test_generate_voucher_code_standard(self):
        """Kiểm tra format mã voucher: CARE-{SHORTNAME}-{DISCOUNT}."""
        code = generate_voucher_code("Bánh xèo Bà Mua", discount_percent=15)
        assert code == "CARE-BAMUA-15"
        assert re.match(r"^CARE-[A-Z0-9]+-\d+$", code)

    def test_generate_voucher_code_stop_words_filtering(self):
        """Kiểm tra loại bỏ stop words (Nhà hàng, Quán, Tiệm, ...) để lấy tên thương hiệu chuẩn."""
        code = generate_voucher_code("Nhà Hàng Ẩm Thực Cơm Gà Gia Vĩnh", discount_percent=20)
        assert code == "CARE-GIAVINH-20"

    def test_generate_voucher_code_clamped_discount(self):
        """Kiểm tra giới hạn discount từ 5% đến 90%."""
        code_min = generate_voucher_code("Quán Ngon", discount_percent=2)
        assert code_min.endswith("-5")

        code_max = generate_voucher_code("Quán Ngon", discount_percent=999)
        assert code_max.endswith("-90")

    def test_generate_voucher_code_empty_fallback(self):
        """Kiểm tra fallback khi tên nhà hàng rỗng."""
        code = generate_voucher_code("", discount_percent=15)
        assert re.match(r"^CARE-[A-Z0-9]+-15$", code)

    def test_extract_aspects_addressed_from_explicit_list(self):
        """Kiểm tra trích xuất khía cạnh từ danh sách aspects có sẵn."""
        aspects_input = [{"aspect": "Dịch vụ"}, {"aspect": "Món ăn"}]
        result = extract_aspects_addressed(aspects_input, "")
        assert "Dịch vụ" in result
        assert "Món ăn" in result

    def test_extract_aspects_addressed_from_text_keywords(self):
        """Kiểm tra tự động phát hiện khía cạnh dựa trên từ khóa trong reviewText."""
        # Món ăn & Vệ sinh
        text1 = "Món ăn dở tệ, nước dùng nhạt nhẽo và bàn ghế bẩn thỉu."
        res1 = extract_aspects_addressed(None, text1)
        assert "Món ăn" in res1
        assert "Vệ sinh" in res1

        # Dịch vụ & Giá cả
        text2 = "Nhân viên phục vụ rất chậm chạp, thái độ tệ mà giá thì đắt đỏ."
        res2 = extract_aspects_addressed(None, text2)
        assert "Dịch vụ" in res2
        assert "Giá cả" in res2

        # Không gian
        text3 = "Không gian quán ngột ngạt và bí bách, điều hòa hỏng."
        res3 = extract_aspects_addressed(None, text3)
        assert "Không gian" in res3

    def test_extract_aspects_addressed_fallback(self):
        """Kiểm tra fallback mặc định khi không tìm thấy khía cạnh nào."""
        res = extract_aspects_addressed([], "")
        assert res == ["Dịch vụ & Món ăn"]

    @pytest.mark.parametrize("tone", ["apology", "voucher", "gratitude", "clarification"])
    def test_synthesize_fallback_reply_all_tones(self, tone):
        """Kiểm tra fallback chuyên gia ẩm thực cho toàn bộ 4 tông giọng không bao giờ crash và có nội dung chuẩn."""
        reply = synthesize_fallback_reply(
            restaurant_name="Cơm Gà Gia Vĩnh",
            author="Minh Quân",
            rating=4.5,
            tone=tone,
            aspects_addressed=["Món ăn", "Dịch vụ"],
            voucher_code="CARE-GIAVINH-15",
            discount_percent=15
        )

        assert isinstance(reply, str)
        assert len(reply) > 80
        assert "Minh Quân" in reply
        assert "Cơm Gà Gia Vĩnh" in reply

        if tone == "apology":
            assert any(word in reply for word in ["xin lỗi", "thực sự", "trải nghiệm"])
        elif tone == "voucher":
            assert "CARE-GIAVINH-15" in reply
            assert "15%" in reply
        elif tone == "gratitude":
            assert any(word in reply for word in ["hạnh phúc", "Cảm ơn", "ấm áp"])
        elif tone == "clarification":
            assert any(word in reply for word in ["cảm ơn", "chia sẻ", "chế biến"])

    def test_build_system_prompt_structure(self):
        """Kiểm tra System Instruction được xây dựng đúng quy chuẩn."""
        prompt = build_system_prompt(
            restaurant_name="Mì Quảng Bà Mua",
            author="Anh Hùng",
            rating=2.0,
            tone="apology",
            aspects_addressed=["Dịch vụ"],
            voucher_code=None
        )
        assert "Mì Quảng Bà Mua" in prompt
        assert "Anh Hùng" in prompt
        assert "TÔNG GIỌNG: CHÂN THÀNH & NHẬN LỖI" in prompt
        assert "QUY TẮC BẮT BUỘC" in prompt


# ==============================================================================
# PHẦN 2: UNIT TESTS CHO LOGIC ĐIỀU PHỐI generate_review_reply
# ==============================================================================

class TestGenerateReviewReplyLogic:
    """Kiểm thử logic hàm generate_review_reply, bao gồm 4 tông giọng, voucher và cache."""

    @pytest.mark.parametrize("tone", ["apology", "voucher", "gratitude", "clarification"])
    def test_generate_review_reply_four_tones(self, tone):
        """Kiểm thử sinh phản hồi đầy đủ cho 4 tông giọng chuẩn F&B."""
        res = generate_review_reply(
            restaurant_id="res-1",
            restaurant_name="Cơm Gà Gia Vĩnh",
            review_id="rev-101",
            author="Thu Hà",
            rating=3.0,
            overall_sentiment="Neutral",
            review_text="Món cơm khá vừa miệng nhưng nhân viên phục vụ hơi lâu.",
            aspects=[{"aspect": "Món ăn"}, {"aspect": "Dịch vụ"}],
            tone=tone
        )

        assert res["toneUsed"] == tone
        assert isinstance(res["replyText"], str)
        assert len(res["replyText"]) > 50
        assert res["engineUsed"] in ["gemini_ai", "gemini_fallback"]
        assert isinstance(res["responseTimeMs"], int)
        assert "Món ăn" in res["aspectsAddressed"] or "Dịch vụ" in res["aspectsAddressed"]

        if tone == "voucher":
            assert res["generatedVoucherCode"] is not None
            assert res["generatedVoucherCode"].startswith("CARE-")
        else:
            assert res["generatedVoucherCode"] is None

    def test_voucher_generation_with_include_voucher_flag(self):
        """Kiểm tra khi tone là apology nhưng include_voucher=True thì vẫn sinh mã voucher hợp lệ."""
        res = generate_review_reply(
            restaurant_id="res-1",
            restaurant_name="Cơm Gà Gia Vĩnh",
            review_id="rev-102",
            author="Ngọc Anh",
            rating=1.0,
            overall_sentiment="Negative",
            review_text="Phục vụ quá tệ, không muốn quay lại.",
            tone="apology",
            include_voucher=True,
            voucher_discount_percent=20
        )

        assert res["toneUsed"] == "apology"
        assert res["generatedVoucherCode"] is not None
        assert res["generatedVoucherCode"] == "CARE-GIAVINH-20"

    def test_in_memory_cache_hit(self):
        """
        Kiểm thử In-Memory Cache:
        - Gọi lần 1: engineUsed là 'gemini_ai' hoặc 'gemini_fallback'.
        - Gọi lần 2 với cùng thông số: engineUsed BẮT BUỘC là 'gemini_cache' và responseTimeMs == 0.
        """
        params = {
            "restaurant_id": "res-1",
            "restaurant_name": "Cơm Gà Gia Vĩnh",
            "review_id": "rev-cache-001",
            "author": "Bảo Nam",
            "rating": 2.0,
            "overall_sentiment": "Negative",
            "review_text": "Cơm gà nguội ngắt và nhân viên lơ đãng.",
            "tone": "apology"
        }

        # Lần 1: Chưa có cache
        first_call = generate_review_reply(**params)
        assert first_call["engineUsed"] in ["gemini_ai", "gemini_fallback"]
        reply_content = first_call["replyText"]

        # Lần 2: Hit In-Memory Cache
        second_call = generate_review_reply(**params)
        assert second_call["engineUsed"] == "gemini_cache"
        assert second_call["responseTimeMs"] == 0
        assert second_call["replyText"] == reply_content

    def test_force_regenerate_bypasses_cache(self):
        """Kiểm thử cờ force_regenerate=True phải bỏ qua cache và tạo lại câu trả lời mới."""
        params = {
            "restaurant_id": "res-1",
            "restaurant_name": "Cơm Gà Gia Vĩnh",
            "review_id": "rev-cache-002",
            "author": "Bảo Nam",
            "rating": 2.0,
            "overall_sentiment": "Negative",
            "review_text": "Cơm gà nguội ngắt.",
            "tone": "apology"
        }

        # Lần 1: Ghi cache
        res1 = generate_review_reply(**params)
        assert res1["engineUsed"] in ["gemini_ai", "gemini_fallback"]

        # Lần 2 với force_regenerate=True: Phải bypass cache
        res2 = generate_review_reply(**params, force_regenerate=True)
        assert res2["engineUsed"] != "gemini_cache"
        assert res2["engineUsed"] in ["gemini_ai", "gemini_fallback"]

    def test_cache_isolation_by_tone(self):
        """Kiểm thử cache phân tách độc lập theo từng tông giọng khác nhau."""
        base_params = {
            "restaurant_id": "res-1",
            "restaurant_name": "Cơm Gà Gia Vĩnh",
            "review_id": "rev-cache-003",
            "author": "Hoàng Nam",
            "rating": 4.0,
            "overall_sentiment": "Positive",
            "review_text": "Món ăn ngon và sạch sẽ.",
        }

        call_gratitude = generate_review_reply(**base_params, tone="gratitude")
        assert call_gratitude["engineUsed"] in ["gemini_ai", "gemini_fallback"]

        # Gọi với tone "clarification" không được ăn cache của "gratitude"
        call_clarification = generate_review_reply(**base_params, tone="clarification")
        assert call_clarification["engineUsed"] in ["gemini_ai", "gemini_fallback"]
        assert call_clarification["toneUsed"] == "clarification"

    def test_gemini_ai_mock_success(self):
        """Kiểm thử khi Gemini AI gọi thành công thì engineUsed là 'gemini_ai'."""
        with patch("services.reply_service.call_gemini_reply") as mock_gemini:
            mock_gemini.return_value = ("Kính gửi quý khách phản hồi tùy chỉnh từ Gemini.", "gemini-2.5-flash")

            res = generate_review_reply(
                restaurant_id="res-mock",
                restaurant_name="Quán Mẫu",
                review_id="rev-mock-1",
                author="Test User",
                rating=5.0,
                overall_sentiment="Positive",
                review_text="Rất tuyệt vời!",
                tone="gratitude"
            )

            assert res["engineUsed"] == "gemini_ai"
            assert res["modelName"] == "gemini-2.5-flash"
            assert res["replyText"] == "Kính gửi quý khách phản hồi tùy chỉnh từ Gemini."


# ==============================================================================
# PHẦN 3: INTEGRATION TESTS CHO REST API ENDPOINT /api/restaurants/{id}/reply
# ==============================================================================

class TestReplyApiEndpoints:
    """Kiểm thử tích hợp endpoint HTTP POST /api/restaurants/{identifier}/reply."""

    def test_post_reply_success_by_numeric_id(self, client):
        """Kiểm thử gọi API thành công với ID số (ví dụ /api/restaurants/1/reply)."""
        payload = {
            "reviewId": "rev-test-api-1",
            "author": "Đỗ Hoàng",
            "rating": 4.0,
            "overallSentiment": "Positive",
            "reviewText": "Cơm gà xối mỡ rất giòn rụm và thơm ngon.",
            "tone": "gratitude"
        }

        response = client.post("/api/restaurants/1/reply", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "replyText" in data
        assert data["toneUsed"] == "gratitude"
        assert data["engineUsed"] in ["gemini_ai", "gemini_fallback", "gemini_cache"]
        assert isinstance(data["aspectsAddressed"], list)
        assert "responseTimeMs" in data

    def test_post_reply_success_by_prefixed_id(self, client):
        """Kiểm thử gọi API thành công với ID định dạng res-1."""
        payload = {
            "reviewId": "rev-test-api-2",
            "author": "Khánh Linh",
            "rating": 2.0,
            "overallSentiment": "Negative",
            "reviewText": "Nước uống quá ngọt, không gian hơi ồn ào.",
            "tone": "apology"
        }

        response = client.post("/api/restaurants/res-1/reply", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["toneUsed"] == "apology"
        assert len(data["replyText"]) > 30

    def test_post_reply_success_by_foody_slug(self, client):
        """Kiểm thử gọi API thành công với slug URL Foody thực tế (ví dụ com-chien-gion-gia-vinh)."""
        payload = {
            "reviewId": "rev-test-api-3",
            "author": "Văn Toàn",
            "rating": 1.0,
            "overallSentiment": "Negative",
            "reviewText": "Thời gian chờ lên món quá lâu, mong quán cải thiện.",
            "tone": "clarification"
        }

        response = client.post("/api/restaurants/com-chien-gion-gia-vinh/reply", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["toneUsed"] == "clarification"

    def test_post_reply_alias_endpoint(self, client):
        """Kiểm thử endpoint alias POST /api/restaurants/{id}/generate-reply."""
        payload = {
            "reviewText": "Món ăn ngon tuyệt vời!",
            "author": "Thanh Thảo",
            "rating": 5.0,
            "tone": "gratitude"
        }

        response = client.post("/api/restaurants/1/generate-reply", json=payload)
        assert response.status_code == 200
        assert response.json()["toneUsed"] == "gratitude"

    def test_post_reply_with_voucher_payload(self, client):
        """Kiểm thử request yêu cầu tặng voucher ưu đãi."""
        payload = {
            "reviewId": "rev-voucher-api",
            "author": "Tuấn Kiệt",
            "rating": 2.0,
            "reviewText": "Trải nghiệm chưa ưng ý lắm.",
            "tone": "voucher",
            "includeVoucher": True,
            "voucherDiscountPercent": 20
        }

        response = client.post("/api/restaurants/1/reply", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["generatedVoucherCode"] is not None
        assert data["generatedVoucherCode"].endswith("-20")

    def test_api_caching_and_force_regenerate_flow(self, client):
        """Kiểm thử luồng In-Memory Cache và Force Regenerate hoàn chỉnh qua HTTP API."""
        payload = {
            "reviewId": "rev-api-cache-unique",
            "author": "Mai Lan",
            "rating": 1.0,
            "reviewText": "Thịt gà hơi khô và phục vụ chậm.",
            "tone": "apology",
            "forceRegenerate": False
        }

        # Request 1: Chưa cache
        res1 = client.post("/api/restaurants/1/reply", json=payload)
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["engineUsed"] in ["gemini_ai", "gemini_fallback"]

        # Request 2: Trúng Cache
        res2 = client.post("/api/restaurants/1/reply", json=payload)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["engineUsed"] == "gemini_cache"
        assert data2["responseTimeMs"] == 0
        assert data2["replyText"] == data1["replyText"]

        # Request 3: Bỏ qua cache với forceRegenerate = True
        payload["forceRegenerate"] = True
        res3 = client.post("/api/restaurants/1/reply", json=payload)
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["engineUsed"] != "gemini_cache"

    def test_validation_empty_review_text_returns_400(self, client):
        """Kiểm thử Validation: reviewText rỗng phải trả về 400 Bad Request."""
        payload = {
            "reviewText": "   ",
            "author": "Test User",
            "tone": "apology"
        }

        response = client.post("/api/restaurants/1/reply", json=payload)
        assert response.status_code == 400
        assert "reviewText" in response.json()["detail"]

    def test_validation_missing_review_text_field_returns_422(self, client):
        """Kiểm thử Validation: Không gửi trường reviewText trong body phải trả về 422 Unprocessable Entity."""
        payload = {
            "author": "Test User",
            "tone": "apology"
        }

        response = client.post("/api/restaurants/1/reply", json=payload)
        assert response.status_code == 422

    def test_restaurant_not_found_returns_404(self, client):
        """Kiểm thử khi nhà hàng không tồn tại và không truyền restaurantName dự phòng -> trả về 404 Not Found."""
        payload = {
            "reviewText": "Món ăn dở tệ.",
            "author": "Khách ẩn danh"
        }

        response = client.post("/api/restaurants/res-999999999/reply", json=payload)
        assert response.status_code == 404
        assert "Không tìm thấy nhà hàng" in response.json()["detail"]

    def test_unregistered_restaurant_with_provided_name_succeeds(self, client):
        """Kiểm thử nếu ID chưa có trong DB nhưng client gửi kèm restaurantName -> Hệ thống vẫn hỗ trợ sinh phản hồi 200 OK."""
        payload = {
            "restaurantName": "Tiệm Mì Cay Mới Mở",
            "reviewText": "Mì cấp độ 3 cay xé lưỡi nhưng rất đậm đà.",
            "author": "Quang Huy",
            "tone": "gratitude"
        }

        response = client.post("/api/restaurants/unregistered-res-slug/reply", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["toneUsed"] == "gratitude"
        assert len(data["replyText"]) > 30
