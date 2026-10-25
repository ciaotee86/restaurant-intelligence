import pytest
from fastapi.testclient import TestClient
from api_server import app
from services.entity_resolution import (
    validate_restaurant_match,
    extract_brand_tokens,
    is_confirmed_same_location
)


def test_extract_brand_tokens():
    b1 = extract_brand_tokens("Pizza Take Away Đà Nẵng")
    assert "take" in b1 or "away" in b1
    assert "pizza" not in b1
    assert "da nang" not in b1

    b2 = extract_brand_tokens("King Pizza - Burger & Gà rán - Đà nẵng")
    assert "king" in b2
    assert "pizza" not in b2
    assert "burger" not in b2


def test_reject_different_brands_sharing_category():
    """Chặn 2 quán khác thương hiệu dù cùng bán Pizza và cùng ở Đà Nẵng."""
    is_match, reason, score = validate_restaurant_match(
        current_name="Pizza Take Away Đà Nẵng",
        candidate_name="King Pizza - Burger & Gà rán - Đà nẵng",
        current_addr="91 Hồ Tùng Mậu, Quận Liên Chiểu, Đà Nẵng",
        candidate_addr=""
    )
    assert is_match is False
    assert "Thương hiệu khác biệt" in reason


def test_reject_different_brands_rice():
    """Chặn Cơm Gà Gia Vĩnh và Cơm Gà Bà Buội."""
    is_match, reason, score = validate_restaurant_match(
        current_name="Cơm Gà Gia Vĩnh",
        candidate_name="Cơm Gà Bà Buội Đà Nẵng",
        current_addr="241 Hải Phòng, Hải Châu, Đà Nẵng",
        candidate_addr="253 Hồ Nghinh, Sơn Trà, Đà Nẵng"
    )
    assert is_match is False


def test_accept_same_brand_branch():
    """Chấp nhận cùng thương hiệu Mỳ Quảng Bà Mua."""
    is_match, reason, score = validate_restaurant_match(
        current_name="Mỳ Quảng Bà Mua",
        candidate_name="Mỳ Quảng Bà Mua - 95A Nguyễn Tri Phương",
        current_addr="95A Nguyễn Tri Phương, Đà Nẵng",
        candidate_addr="95A Nguyễn Tri Phương, Thanh Khê, Đà Nẵng"
    )
    assert is_match is True


def test_api_crawler_google_maps_blocks_mismatch():
    """API /api/crawler/google-maps phải trả về HTTP 400 khi dán link quán khác vào."""
    client = TestClient(app)
    resp = client.post(
        "/api/crawler/google-maps",
        json={
            "restaurantId": "260",
            "googleMapsUrl": "https://www.google.com/maps/place/King+Pizza+-Burger+%26+G%C3%A0+r%C3%A1n+-+%C4%90%C3%A0+n%E1%BA%B5ng/@16.0803799,108.161756,13z/data=!4m10!1m2!2m1!1zUGl6emEgVGFrZSBBd2F5IMSQw6AgTuG6tW5n!3m6!1s0x31421b9f58ec8695:0x4c52218c9c52d356",
            "maxReviews": 10
        }
    )
    assert resp.status_code == 400
    detail = resp.json().get("detail", "")
    assert "King Pizza" in detail
    assert "Pizza Take Away Đà Nẵng" in detail
    assert "không khớp" in detail
