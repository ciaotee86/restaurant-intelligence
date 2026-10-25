"""
Test Suite toàn diện cho API Router Google Maps & ABSA Pipeline ([TASK-04])
và Thống Kê Đa Nguồn & Độ Tin Cậy Mẫu ([TASK-05]).
Dự án: Restaurant Intelligence System
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md & docs/07-multi-source-implementation-plan.md
"""

import os
import json
import socket
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import database.db as db_module
from database.models import Base, Restaurant, Review, ReviewAnalysis
from api_server import app
from routers.crawler import (
    validate_google_maps_url,
    CrawlGoogleMapsRequest,
)
from services.bi_service import format_restaurant_full
from services.entity_resolution import (
    compute_review_fingerprint,
    calculate_credibility_score,
)


# ==============================================================================
# TEST FIXTURES & ISOLATED DATABASE
# ==============================================================================

@pytest.fixture
def test_db_session():
    """Tạo database SQLite in-memory cô lập hoàn toàn cho từng test case."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(bind=test_engine)

    # Monkeypatch db_module.SessionLocal
    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = TestingSessionLocal

    session = TestingSessionLocal()
    yield session

    session.close()
    Base.metadata.drop_all(test_engine)
    db_module.SessionLocal = original_session_local


@pytest.fixture
def client(test_db_session):
    """TestClient kết nối với database in-memory."""
    return TestClient(app)


# ==============================================================================
# 1. TEST URL VALIDATION & SSRF PREVENTION (validate_google_maps_url)
# ==============================================================================

def test_validate_google_maps_url_valid_formats():
    """Chấp nhận tất cả định dạng URL Google Maps chuẩn xác."""
    valid_urls = [
        "https://www.google.com/maps/place/C%C6%A1m+G%C3%A0+Gia+V%C4%A9nh/@16.068,108.216,17z",
        "https://maps.google.com/?cid=1234567890123456",
        "https://goo.gl/maps/abcXYZ123456",
        "https://maps.app.goo.gl/def456UVW789",
        "https://www.google.com.vn/maps/search/com+ga+da+nang/",
        "http://maps.google.com/maps/search/banh+trang",
        "https://google.com/maps/place/Quan+An/@16.0,108.0,15z?hl=vi",
    ]
    for url in valid_urls:
        validated = validate_google_maps_url(url)
        assert validated == url, f"URL hợp lệ bị từ chối: {url}"


def test_validate_google_maps_url_reject_non_google_domains():
    """Từ chối tên miền không thuộc Google Maps (Foody, Facebook, domain lừa đảo)."""
    invalid_domains = [
        "https://facebook.com/maps",
        "https://foody.vn/da-nang/com-ga-gia-vinh",
        "https://google.com.attacker.com/maps",
        "https://attacker-google.com/maps",
        "https://maps.attacker.org/place/123",
        "https://notgoogle.com/maps",
    ]
    for url in invalid_domains:
        with pytest.raises(HTTPException) as exc_info:
            validate_google_maps_url(url)
        assert exc_info.value.status_code == 400
        assert "Google Maps" in exc_info.value.detail


def test_validate_google_maps_url_reject_ssrf_and_ip_addresses():
    """Anti-SSRF: Chặn IP trực tiếp, localhost, IP private, loopback và metadata cloud."""
    ssrf_urls = [
        "http://127.0.0.1:8000/maps",
        "http://127.0.0.1/maps",
        "http://localhost:8000/maps",
        "http://0.0.0.0/maps",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/maps",
        "http://192.168.1.1/maps",
        "http://[::1]/maps",
    ]
    for url in ssrf_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_google_maps_url(url)
        assert exc_info.value.status_code == 400


def test_validate_google_maps_url_reject_invalid_schemes_and_ports():
    """Từ chối giao thức nguy hiểm (file, ftp, javascript) và cổng truy cập bất thường."""
    invalid_schemes = [
        "file:///etc/passwd",
        "ftp://maps.google.com/maps",
        "javascript:alert(1)",
        "gopher://maps.google.com/1",
        "data:text/html;base64,PHNjcmlwdD4=",
    ]
    for url in invalid_schemes:
        with pytest.raises(HTTPException) as exc_info:
            validate_google_maps_url(url)
        assert exc_info.value.status_code == 400
        assert "giao thức" in exc_info.value.detail.lower() or "scheme" in exc_info.value.detail.lower()

    invalid_ports = [
        "http://maps.google.com:22/maps",
        "https://maps.google.com:8080/maps",
        "http://maps.google.com:3306/maps",
    ]
    for url in invalid_ports:
        with pytest.raises(HTTPException) as exc_info:
            validate_google_maps_url(url)
        assert exc_info.value.status_code == 400
        assert "cổng" in exc_info.value.detail.lower() or "port" in exc_info.value.detail.lower()


def test_validate_google_maps_url_reject_userinfo():
    """Từ chối URL chứa thông tin xác thực nhúng (user:pass@host)."""
    url = "https://admin:secret@maps.google.com/maps"
    with pytest.raises(HTTPException) as exc_info:
        validate_google_maps_url(url)
    assert exc_info.value.status_code == 400
    assert "thông tin xác thực" in exc_info.value.detail.lower()


def test_validate_google_maps_url_reject_non_maps_paths():
    """Từ chối trang của Google không liên quan đến bản đồ (Gmail, YouTube, Drive...)."""
    non_maps_urls = [
        "https://www.google.com/gmail",
        "https://www.google.com/docs",
        "https://www.google.com/admin",
    ]
    for url in non_maps_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_google_maps_url(url)
        assert exc_info.value.status_code == 400
        assert "định dạng bản đồ" in exc_info.value.detail.lower()


# ==============================================================================
# 2. TEST REQUEST VALIDATION TRÊN ENDPOINT POST /api/crawler/google-maps
# ==============================================================================

def test_api_crawler_google_maps_missing_all_params(client):
    """Gửi body rỗng không có url, query hay id -> Trả về lỗi 400."""
    response = client.post("/api/crawler/google-maps", json={})
    assert response.status_code == 400
    data = response.json()
    assert "googleMapsUrl" in data["detail"]


def test_api_crawler_google_maps_restaurant_not_found(client):
    """Gửi restaurantId không tồn tại trong DB -> Trả về 404 Not Found."""
    response = client.post("/api/crawler/google-maps", json={
        "restaurantId": "99999"
    })
    assert response.status_code == 404
    data = response.json()
    assert "Không tìm thấy" in data["detail"]


def test_api_crawler_google_maps_ssrf_blocked_at_endpoint(client):
    """Gửi link tấn công SSRF vào endpoint -> Bị chặn 400 ngay lập tức."""
    response = client.post("/api/crawler/google-maps", json={
        "googleMapsUrl": "http://127.0.0.1:8000/api/restaurants"
    })
    assert response.status_code == 400


# ==============================================================================
# 3. TEST CRAWLER GOOGLE MAPS & ABSA PIPELINE INGESTION ([TASK-04])
# ==============================================================================

@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_crawl_google_maps_new_restaurant_success(mock_gemini, mock_crawler, client, test_db_session):
    """
    Cào quán mới từ Google Maps URL:
    - Tạo nhà hàng mới trong DB
    - Lưu reviews với source='GoogleMaps'
    - Chạy ABSA phân tích 5 khía cạnh
    - Cập nhật credibility_score
    - Trả về đúng schema CrawlGoogleMapsResponse
    """
    # Mock crawler trả về thông tin quán và 3 review
    mock_crawler.return_value = {
        "success": True,
        "restaurant_name": "Cơm Gà Gia Vĩnh - Hải Phòng",
        "address": "129 Hải Phòng, Hải Châu, Đà Nẵng",
        "overall_rating": 4.5,
        "google_maps_url": "https://www.google.com/maps/place/Com+Ga+Gia+Vinh/@16.068,108.216,17z",
        "google_place_id": "ChIJtest_gia_vinh_01",
        "reviews": [
            {
                "author": "Trần Văn Bình",
                "rating": 5.0,
                "review_date": "2 tuần trước",
                "text": "Cơm gà chiên xối mỡ rất giòn và thơm ngon, phục vụ nhanh nhẹn.",
                "google_review_id": "g_rev_101"
            },
            {
                "author": "Lê Thị Cúc",
                "rating": 4.0,
                "review_date": "1 tháng trước",
                "text": "Giá cả hợp lý so với chất lượng, nước canh nêm vừa miệng.",
                "google_review_id": "g_rev_102"
            },
            {
                "author": "Hoàng Minh",
                "rating": 2.0,
                "review_date": "3 tuần trước",
                "text": "Nhân viên phục vụ hơi chậm vào giờ cao điểm, phải đợi lâu.",
                "google_review_id": "g_rev_103"
            }
        ],
        "total_crawled": 3,
        "error": None
    }

    # Mock kết quả ABSA từ Gemini AI
    mock_gemini.return_value = [
        {
            "review_id": 1,
            "_analysis_succeeded": True,
            "aspects": [
                {"aspect": "món ăn", "sentiment": "positive", "confidence": 0.95},
                {"aspect": "dịch vụ", "sentiment": "positive", "confidence": 0.90}
            ],
            "is_urgent": False
        },
        {
            "review_id": 2,
            "_analysis_succeeded": True,
            "aspects": [
                {"aspect": "giá cả", "sentiment": "positive", "confidence": 0.88},
                {"aspect": "món ăn", "sentiment": "positive", "confidence": 0.92}
            ],
            "is_urgent": False
        },
        {
            "review_id": 3,
            "_analysis_succeeded": True,
            "aspects": [
                {"aspect": "dịch vụ", "sentiment": "negative", "confidence": 0.91}
            ],
            "is_urgent": False
        }
    ]

    payload = {
        "googleMapsUrl": "https://www.google.com/maps/place/Com+Ga+Gia+Vinh/@16.068,108.216,17z",
        "maxReviews": 10
    }

    response = client.post("/api/crawler/google-maps", json=payload)
    assert response.status_code == 200
    res_data = response.json()

    # Kiểm tra phản hồi JSON
    assert res_data["success"] is True
    assert res_data["source"] == "google_maps"
    assert res_data["newReviewsCount"] == 3
    assert res_data["duplicateReviewsSkipped"] == 0
    assert res_data["totalReviewsNow"] == 3
    assert "restaurantId" in res_data
    assert res_data["restaurantName"] == "Cơm Gà Gia Vĩnh - Hải Phòng"
    assert res_data["credibilityScore"] > 0

    # Kiểm tra trong cơ sở dữ liệu
    rest_id = int(res_data["restaurantId"])
    saved_rest = test_db_session.query(Restaurant).filter_by(id=rest_id).first()
    assert saved_rest is not None
    assert saved_rest.google_maps_url == "https://www.google.com/maps/place/Com+Ga+Gia+Vinh/@16.068,108.216,17z"
    assert saved_rest.google_place_id == "ChIJtest_gia_vinh_01"
    assert saved_rest.google_review_count == 3
    assert saved_rest.foody_review_count == 0
    assert saved_rest.review_count == 3

    # Kiểm tra các reviews đã lưu
    saved_reviews = test_db_session.query(Review).filter_by(restaurant_id=rest_id).all()
    assert len(saved_reviews) == 3
    for r in saved_reviews:
        assert r.source == "GoogleMaps"
        assert r.google_review_id is not None
        assert r.fingerprint is not None
        assert r.is_analyzed == 1

    # Kiểm tra các bản ghi ReviewAnalysis đã được bóc tách
    saved_analyses = test_db_session.query(ReviewAnalysis).all()
    assert len(saved_analyses) == 5


@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_crawl_google_maps_enrich_existing_restaurant(mock_gemini, mock_crawler, client, test_db_session):
    """
    Bổ sung đánh giá Google Maps vào một quán đã có sẵn từ Foody:
    - Khớp đúng restaurantId hiện có (không tạo thêm quán mới)
    - Cập nhật số đếm foody_review_count và google_review_count chính xác
    - Tính lại credibility_score tổng hợp
    """
    # Tạo quán Foody có sẵn trong DB với 2 bài đánh giá
    existing_rest = Restaurant(
        name="Bánh Tráng Thịt Heo Bà Mua",
        foody_url="https://www.foody.vn/da-nang/banh-trang-thit-heo-ba-mua",
        address="19 Trần Bình Trọng, Hải Châu, Đà Nẵng",
        overall_rating=8.0,
        review_count=2,
        foody_review_count=2,
        google_review_count=0,
        credibility_score=calculate_credibility_score(2),
    )
    test_db_session.add(existing_rest)
    test_db_session.commit()

    rev1 = Review(
        restaurant_id=existing_rest.id,
        author="Khách Foody 1",
        rating=8.0,
        text="Bánh tráng cuốn thịt heo rất ngon và đậm đà.",
        source="Foody",
        fingerprint=compute_review_fingerprint("Bánh tráng cuốn thịt heo rất ngon và đậm đà."),
        is_analyzed=1
    )
    rev2 = Review(
        restaurant_id=existing_rest.id,
        author="Khách Foody 2",
        rating=7.0,
        text="Rau sống tươi sạch, mắm nêm thơm lừng.",
        source="Foody",
        fingerprint=compute_review_fingerprint("Rau sống tươi sạch, mắm nêm thơm lừng."),
        is_analyzed=1
    )
    test_db_session.add_all([rev1, rev2])
    test_db_session.commit()

    # Mock crawler trả về 2 review mới từ Google Maps
    mock_crawler.return_value = {
        "success": True,
        "restaurant_name": "Bánh Tráng Cuốn Thịt Heo Bà Mua - Trần Bình Trọng",
        "address": "19 Trần Bình Trọng, Đà Nẵng",
        "overall_rating": 4.4,
        "google_maps_url": "https://maps.google.com/?cid=99887766",
        "google_place_id": "ChIJ_ba_mua_02",
        "reviews": [
            {
                "author": "Du khách Hà Nội",
                "rating": 5.0,
                "review_date": "Hôm qua",
                "text": "Mắm nêm pha cực kỳ chuẩn vị miền Trung, ăn hoài không ngán.",
                "google_review_id": "g_rev_bm_01"
            },
            {
                "author": "Minh Khôi",
                "rating": 4.0,
                "review_date": "5 ngày trước",
                "text": "Thịt ba chỉ luộc mềm ngọt, nhân viên thân thiện.",
                "google_review_id": "g_rev_bm_02"
            }
        ],
        "total_crawled": 2,
        "error": None
    }
    mock_gemini.return_value = []

    payload = {
        "restaurantId": str(existing_rest.id),
        "googleMapsUrl": "https://maps.google.com/?cid=99887766",
        "maxReviews": 10
    }

    response = client.post("/api/crawler/google-maps", json=payload)
    assert response.status_code == 200
    res_data = response.json()

    assert res_data["restaurantId"] == str(existing_rest.id)
    assert res_data["newReviewsCount"] == 2
    assert res_data["totalReviewsNow"] == 4  # 2 Foody + 2 Google Maps

    # Kiểm tra số lượng quán trong DB: chỉ có duy nhất 1 quán, không sinh quán thừa
    total_restaurants = test_db_session.query(Restaurant).count()
    assert total_restaurants == 1

    test_db_session.expire_all()
    updated_rest = test_db_session.query(Restaurant).filter_by(id=existing_rest.id).first()
    assert updated_rest.foody_review_count == 2
    assert updated_rest.google_review_count == 2
    assert updated_rest.review_count == 4
    assert updated_rest.google_maps_url == "https://maps.google.com/?cid=99887766"


@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
def test_crawl_google_maps_entity_mismatch_rejected(mock_crawler, client, test_db_session):
    """
    Kiểm tra phòng vệ Lệch Thực Thể (Entity Mismatch Guard):
    - Đang ở trang quán Chè Ông Cúc (restaurantId)
    - Dán nhầm link Google Maps của Cơm Gà Gia Vĩnh
    - Hệ thống chặn lưu, trả về mã lỗi 400 kèm thông báo chi tiết
    - Database không bị ô nhiễm
    """
    che_rest = Restaurant(
        name="Chè Thái, Chè Đậu & Sinh Tố - Chè Ông Cúc - 918 Trần Cao Vân",
        address="918 Trần Cao Vân, Thanh Khê, Đà Nẵng",
        review_count=10,
        foody_review_count=10,
        google_review_count=0
    )
    test_db_session.add(che_rest)
    test_db_session.commit()

    mock_crawler.return_value = {
        "success": True,
        "restaurant_name": "Cơm Gà Gia Vĩnh - Hải Phòng",
        "address": "241 Hải Phòng, Thanh Khê, Đà Nẵng",
        "overall_rating": 4.2,
        "google_maps_url": "https://maps.google.com/?cid=com_ga_gia_vinh",
        "reviews": [
            {
                "author": "Tester",
                "rating": 5.0,
                "review_date": "1 tuần trước",
                "text": "Cơm gà xối mỡ rất giòn",
                "google_review_id": "cg_1"
            }
        ],
        "total_crawled": 1,
        "error": None
    }

    payload = {
        "restaurantId": str(che_rest.id),
        "googleMapsUrl": "https://maps.google.com/?cid=com_ga_gia_vinh",
        "maxReviews": 10
    }

    response = client.post("/api/crawler/google-maps", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Cơm Gà Gia Vĩnh" in detail
    assert "không khớp" in detail.lower()

    # Xác nhận quán chè không bị thay đổi google_maps_url và không có review Google nào
    test_db_session.expire_all()
    check_rest = test_db_session.query(Restaurant).filter_by(id=che_rest.id).first()
    assert check_rest.google_maps_url is None
    assert check_rest.google_review_count == 0
    assert test_db_session.query(Review).count() == 0


# ==============================================================================
# 4. TEST DEDUPLICATION & SPAM FILTERING
# ==============================================================================

@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_crawl_google_maps_deduplication(mock_gemini, mock_crawler, client, test_db_session):
    """
    Kiểm tra cơ chế khử trùng lặp qua fingerprint:
    - Bài viết trùng nội dung với bài cũ không được lưu lần 2
    - Biến duplicateReviewsSkipped được đếm tăng chính xác
    """
    rest = Restaurant(
        name="Quán Chè Ông Cúc",
        google_maps_url="https://maps.google.com/?cid=11223344",
        review_count=1,
        google_review_count=1,
    )
    test_db_session.add(rest)
    test_db_session.commit()

    existing_text = "Chè thái sầu riêng rất thơm và béo ngậy, ngọt thanh vừa phải."
    existing_rev = Review(
        restaurant_id=rest.id,
        author="Khách cũ",
        rating=5.0,
        text=existing_text,
        fingerprint=compute_review_fingerprint(existing_text),
        source="GoogleMaps",
        is_analyzed=1
    )
    test_db_session.add(existing_rev)
    test_db_session.commit()

    # Crawler trả về 2 bài: 1 bài trùng nội dung cũ, 1 bài mới hoàn toàn
    mock_crawler.return_value = {
        "success": True,
        "restaurant_name": "Quán Chè Ông Cúc",
        "address": "918 Trần Cao Vân, Đà Nẵng",
        "overall_rating": 4.6,
        "google_maps_url": "https://maps.google.com/?cid=11223344",
        "google_place_id": None,
        "reviews": [
            {
                "author": "Người dùng sao chép",
                "rating": 5.0,
                "review_date": "Hôm nay",
                "text": "Chè thái sầu riêng rất thơm và béo ngậy, ngọt thanh vừa phải.",  # TRÙNG NỘI DUNG
                "google_review_id": "g_rev_dup_01"
            },
            {
                "author": "Người dùng mới",
                "rating": 4.0,
                "review_date": "Hôm nay",
                "text": "Món chè bưởi cũng rất giòn ngon, không bị đắng.",  # MỚI
                "google_review_id": "g_rev_new_02"
            }
        ],
        "total_crawled": 2,
        "error": None
    }
    mock_gemini.return_value = []

    payload = {
        "restaurantId": str(rest.id),
        "googleMapsUrl": "https://maps.google.com/?cid=11223344",
    }

    response = client.post("/api/crawler/google-maps", json=payload)
    assert response.status_code == 200
    res_data = response.json()

    assert res_data["newReviewsCount"] == 1
    assert res_data["duplicateReviewsSkipped"] == 1
    assert res_data["totalReviewsNow"] == 2

    # Database chỉ có 2 bài đánh giá, không có bài trùng
    reviews = test_db_session.query(Review).filter_by(restaurant_id=rest.id).all()
    assert len(reviews) == 2


@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_crawl_google_maps_spam_filtering(mock_gemini, mock_crawler, client, test_db_session):
    """
    Kiểm tra cơ chế lọc bài viết spam/quảng cáo qua review_filter:
    - Bài viết quảng cáo thuê xe, số điện thoại lạ bị loại bỏ
    - Chỉ bài đánh giá ẩm thực thực sự mới được lưu vào database
    """
    rest = Restaurant(name="Quán Ăn Thử Nghiệm", review_count=0)
    test_db_session.add(rest)
    test_db_session.commit()

    mock_crawler.return_value = {
        "success": True,
        "restaurant_name": "Quán Ăn Thử Nghiệm",
        "address": "Đà Nẵng",
        "overall_rating": 4.0,
        "google_maps_url": "https://maps.google.com/?cid=123",
        "google_place_id": None,
        "reviews": [
            {
                "author": "Spammer Cho Thuê Xe",
                "rating": 5.0,
                "review_date": "Gần đây",
                "text": "Cho thuê xe du lịch 7 chỗ 16 chỗ giá rẻ đón tiễn sân bay Đà Nẵng liên hệ hotline 0905123456",  # SPAM
                "google_review_id": "g_spam_01"
            },
            {
                "author": "Thực Khách Thật",
                "rating": 5.0,
                "review_date": "Gần đây",
                "text": "Đồ ăn nêm nếm rất vừa vặn, không gian sạch sẽ thoáng mát.",  # HỢP LỆ
                "google_review_id": "g_valid_02"
            }
        ],
        "total_crawled": 2,
        "error": None
    }
    mock_gemini.return_value = []

    response = client.post("/api/crawler/google-maps", json={
        "restaurantId": str(rest.id),
        "googleMapsUrl": "https://maps.google.com/?cid=123"
    })
    assert response.status_code == 200
    res_data = response.json()

    # Chỉ bài hợp lệ được lưu (newReviewsCount == 1)
    assert res_data["newReviewsCount"] == 1

    saved_reviews = test_db_session.query(Review).filter_by(restaurant_id=rest.id).all()
    assert len(saved_reviews) == 1
    assert "Đồ ăn nêm nếm" in saved_reviews[0].text


# ==============================================================================
# 5. TEST THỐNG KÊ ĐA NGUỒN & ĐỘ TIN CẬY MẪU TRÊN BI SERVICE & API ([TASK-05])
# ==============================================================================

def test_format_restaurant_full_multisource_fields_and_sample_warning(test_db_session):
    """
    Kiểm tra hàm format_restaurant_full trả về đầy đủ các trường đa nguồn:
    - sourceBreakdown: { total, foody, googleMaps }
    - credibilityScore, credibilityLevel
    - sampleWarning: Cảnh báo mẫu nhỏ khi N < 10
    - source trên từng review
    - dataSource: 'Foody, Google Maps & Gemini AI'
    """
    rest = Restaurant(
        name="Mì Cay Seoul Hải Châu",
        foody_url="https://www.foody.vn/da-nang/mi-cay-seoul",
        google_maps_url="https://maps.google.com/?cid=778899",
        address="39 Nguyễn Văn Linh, Đà Nẵng",
        overall_rating=8.4,
        review_count=3,
        credibility_score=calculate_credibility_score(3),
    )
    test_db_session.add(rest)
    test_db_session.commit()

    # 1 review từ Foody, 2 review từ Google Maps
    r_foody = Review(
        restaurant_id=rest.id,
        author="Khách Foody",
        rating=8.0,
        text="Mì cay cấp độ 3 ăn rất đã, topping đầy ắp xúc xích tôm mực.",
        source="Foody",
        is_analyzed=1
    )
    r_gmap1 = Review(
        restaurant_id=rest.id,
        author="Khách Google 1",
        rating=5.0,
        text="Nước dùng cay nồng đúng chuẩn Hàn Quốc, quán có máy lạnh mát mẻ.",
        source="GoogleMaps",
        google_review_id="g_seoul_01",
        is_analyzed=1
    )
    r_gmap2 = Review(
        restaurant_id=rest.id,
        author="Khách Google 2",
        rating=4.0,
        text="Giá cả phù hợp cho học sinh sinh viên, nhân viên nhiệt tình.",
        source="GoogleMaps",
        google_review_id="g_seoul_02",
        is_analyzed=1
    )
    test_db_session.add_all([r_foody, r_gmap1, r_gmap2])
    test_db_session.commit()

    formatted = format_restaurant_full(rest, test_db_session)

    # 1. Kiểm tra sourceBreakdown
    assert "sourceBreakdown" in formatted
    sb = formatted["sourceBreakdown"]
    assert sb["total"] == 3
    assert sb["foody"] == 1
    assert sb["googleMaps"] == 2

    # 2. Kiểm tra URLs
    assert formatted["foodyUrl"] == "https://www.foody.vn/da-nang/mi-cay-seoul"
    assert formatted["googleMapsUrl"] == "https://maps.google.com/?cid=778899"

    # 3. Kiểm tra Độ tin cậy mẫu (N=3 < 10)
    assert "credibilityScore" in formatted
    assert "credibilityLevel" in formatted
    assert formatted["credibilityLevel"] == "low"  # C < 65%
    assert formatted["sampleWarning"] is not None
    assert "ít hơn 10 đánh giá" in formatted["sampleWarning"]

    # 4. Kiểm tra nguồn dữ liệu kết hợp
    assert formatted["dataSource"] == "Foody, Google Maps & Gemini AI"

    # 5. Kiểm tra từng review có trường source và googleReviewId
    revs = formatted["reviews"]
    assert len(revs) == 3
    gmap_revs = [r for r in revs if r["source"] == "GoogleMaps"]
    foody_revs = [r for r in revs if r["source"] == "Foody"]
    assert len(gmap_revs) == 2
    assert len(foody_revs) == 1
    assert gmap_revs[0]["googleReviewId"] in ("g_seoul_01", "g_seoul_02")


def test_format_restaurant_full_high_credibility_no_warning(test_db_session):
    r"""
    Khi quán có $N \ge 30$ review:
    - credibilityScore $\ge 90\%$
    - credibilityLevel == 'high'
    - sampleWarning == None (không cảnh báo)
    """
    rest = Restaurant(
        name="Cơm Gà Lớn Đà Nẵng",
        review_count=35,
        credibility_score=calculate_credibility_score(35),
    )
    test_db_session.add(rest)
    test_db_session.commit()

    # Tạo 35 reviews giả lập
    reviews = []
    for i in range(35):
        reviews.append(
            Review(
                restaurant_id=rest.id,
                author=f"Khách hàng {i}",
                rating=4.5,
                text=f"Món ăn rất ngon, phục vụ nhanh số {i}.",
                source="GoogleMaps" if i % 2 == 0 else "Foody",
                is_analyzed=1
            )
        )
    test_db_session.add_all(reviews)
    test_db_session.commit()

    formatted = format_restaurant_full(rest, test_db_session)

    assert formatted["sourceBreakdown"]["total"] == 35
    assert formatted["credibilityScore"] >= 95.0
    assert formatted["credibilityLevel"] == "high"
    assert formatted["sampleWarning"] is None


def test_get_restaurant_detail_api_returns_multisource_data(client, test_db_session):
    """
    Kiểm tra endpoint GET /api/restaurants/{id} trả về đầy đủ các trường đa nguồn mới.
    """
    rest = Restaurant(
        name="Quán Bánh Bèo Cô Mai",
        google_maps_url="https://maps.google.com/?cid=123999",
        review_count=1,
        credibility_score=calculate_credibility_score(1),
    )
    test_db_session.add(rest)
    test_db_session.commit()

    rev = Review(
        restaurant_id=rest.id,
        author="Lê Mai",
        rating=5.0,
        text="Bánh bèo tôm cháy rất dẻo và ngon.",
        source="GoogleMaps",
        google_review_id="g_bm_99",
        is_analyzed=1
    )
    test_db_session.add(rev)
    test_db_session.commit()

    response = client.get(f"/api/restaurants/{rest.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["name"] == "Quán Bánh Bèo Cô Mai"
    assert data["sourceBreakdown"]["total"] == 1
    assert data["sourceBreakdown"]["googleMaps"] == 1
    assert data["sourceBreakdown"]["foody"] == 0
    assert data["googleMapsUrl"] == "https://maps.google.com/?cid=123999"
    assert data["credibilityLevel"] == "low"
    assert data["sampleWarning"] is not None
    assert data["reviews"][0]["source"] == "GoogleMaps"
    assert data["reviews"][0]["googleReviewId"] == "g_bm_99"
