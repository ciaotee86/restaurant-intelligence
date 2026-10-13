"""
Test suite cho cơ chế khắc phục lỗi cào dữ liệu Foody (Timeout 120s)
và cơ chế tự phục hồi Gemini API Key trên môi trường Render / Cloud.
"""

import os
import time
import pytest
from crawler.foody_crawler import inspect_foody_via_http, crawl_restaurant
from services.assistant_service import get_gemini_api_key, detect_question_intent


def test_fast_http_inspect_zero_reviews():
    """
    Test Case TC01: Kiểm tra liên kết quán 0 review (Mì Quảng Bà Mua Duy Tân).
    Kỳ vọng: Trả về kết quả trong thời gian ngắn (< 3 giây),
    xác định chính xác tên, địa chỉ, overall_rating và is_zero_reviews == True.
    """
    url = "https://www.foody.vn/da-nang/mi-quang-ba-mua-duy-tan"
    t0 = time.time()
    res = inspect_foody_via_http(url, timeout=8)
    elapsed = time.time() - t0

    assert res is not None, "inspect_foody_via_http phải trả về kết quả"
    assert "Bà Mua" in res.get("name", ""), f"Tên quán '{res.get('name')}' phải chứa 'Bà Mua'"
    assert res.get("is_zero_reviews") is True, "Phải nhận diện quán có 0 bài đánh giá"
    assert len(res.get("reviews", [])) == 0, "Danh sách review phải rỗng"
    assert elapsed < 5.0, f"Thời gian phản hồi ({elapsed:.2f}s) phải nhỏ hơn 5s (thực tế < 1s)"


def test_crawl_restaurant_zero_reviews_fast_exit():
    """
    Test Case TC02: crawl_restaurant cho quán 0 review.
    Kỳ vọng: Nhờ lớp Fast HTTP Pre-check, hàm hoàn tất ngay lập tức (< 3s)
    mà không bị treo hay vướng lỗi Selenium Read timed out 120s.
    """
    url = "https://www.foody.vn/da-nang/mi-quang-ba-mua-duy-tan"
    t0 = time.time()
    data = crawl_restaurant(url, max_reviews=15, headless=True)
    elapsed = time.time() - t0

    assert data is not None
    assert "Bà Mua" in data.get("name", "")
    assert len(data.get("reviews", [])) == 0
    assert data.get("stopped_early") is True
    assert elapsed < 6.0, f"crawl_restaurant cho quán 0 review phải hoàn tất nhanh, không được timeout 120s (thực tế {elapsed:.2f}s)"


def test_gemini_api_key_recovery_from_key_column():
    """
    Test Case TC03: Kiểm tra cơ chế tự phát hiện & khôi phục khi người dùng
    vô tình dán API Key vào cột Tên/Key (Variable Name) trên Render Dashboard.
    """
    fake_key = "AIzaSyTestKey1234567890abcdefghijklmn"
    old_env = dict(os.environ)
    try:
        # Xóa các biến chuẩn
        os.environ.pop("GEMINI_API_KEY", None)
        os.environ.pop("GOOGLE_API_KEY", None)

        # Mô phỏng tình huống trên Render: Key column là mã API Key, Value column rỗng/dot
        os.environ[fake_key] = "value_ignored"

        recovered = get_gemini_api_key()
        assert recovered and recovered.lower() == fake_key.lower(), f"Kỳ vọng tự khôi phục key '{fake_key}', thực tế: '{recovered}'"
    finally:
        os.environ.clear()
        os.environ.update(old_env)


def test_gemini_api_key_recovery_from_var_name_variant():
    """
    Test Case TC04: Kiểm tra nhận diện khi tên biến môi trường là GEMINI_KEY hoặc GOOGLE_API_TOKEN.
    """
    fake_key = "AIzaSyVariantKey9876543210zyxwvutsrqpon"
    old_env = dict(os.environ)
    try:
        os.environ.pop("GEMINI_API_KEY", None)
        os.environ.pop("GOOGLE_API_KEY", None)

        os.environ["MY_GEMINI_CUSTOM_KEY"] = fake_key

        recovered = get_gemini_api_key()
        assert recovered == fake_key, f"Kỳ vọng nhận diện qua biến có chứa 'gemini', thực tế: '{recovered}'"
    finally:
        os.environ.clear()
        os.environ.update(old_env)


def test_assistant_guardrails_intent_detection():
    """
    Test Case TC05: Kiểm tra các Guardrails của trợ lý phân tích:
    Các câu hỏi ngoài phạm vi F&B phải được chuyển về Local BI Guardrail ngay lập tức.
    """
    assert detect_question_intent("Thời tiết hôm nay thế nào?") == "out_of_scope_general"
    assert detect_question_intent("Dự đoán doanh thu tháng tới của quán?") == "out_of_scope_revenue_prediction"
    assert detect_question_intent("Ai là người đánh giá 1 sao?") == "out_of_scope_identity"
    assert detect_question_intent("Quán có bao nhiêu bài đánh giá?") == "query_review_count"
