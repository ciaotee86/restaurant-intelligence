"""
Test Suite cho API Crawler Đa Nguồn (Multi-source Crawler API):
- POST /api/analyze-url: Phân nhánh thông minh Foody.vn vs Google Maps vs URL không hỗ trợ.
- POST /api/search-and-crawl: Hỗ trợ source 'auto' | 'foody' | 'google_maps', tra cứu SQLite DB, và fallback tự động.
- POST /api/crawler/google-maps: Đảm bảo trả về kèm object restaurant đầy đủ cho frontend.
"""

import json
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
    AnalyzeRequest,
    SearchAndCrawlRequest,
    validate_foody_url,
    validate_google_maps_url,
)
from services.bi_service import format_restaurant_full


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

    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = TestingSessionLocal

    session = TestingSessionLocal()
    yield session

    session.close()
    Base.metadata.drop_all(test_engine)
    db_module.SessionLocal = original_session_local


@pytest.fixture
def client(test_db_session):
    """FastAPI TestClient liên kết với DB in-memory."""
    return TestClient(app)


# ==============================================================================
# 1. TEST POST /api/analyze-url (URL ROUTING & MULTI-SOURCE CRAWLER)
# ==============================================================================

def test_analyze_url_empty_or_whitespace(client):
    """Chặn URL rỗng hoặc khoảng trắng."""
    res = client.post("/api/analyze-url", json={"url": "   ", "max_reviews": 10})
    assert res.status_code == 400
    assert "URL không được để trống" in res.json()["detail"]


def test_analyze_url_unsupported_domain_rejected(client):
    """Chặn các URL không thuộc Foody hoặc Google Maps (Facebook, Baemin, web lạ...)."""
    unsupported_urls = [
        "https://www.facebook.com/groups/danangfood",
        "https://shopeefood.vn/da-nang/quan-com-tam",
        "https://tripadvisor.com/Restaurant_Review-g298085-d12345",
        "https://example.com/quan-an-ngon",
        "https://evil-foody.com/da-nang/quan-an",
    ]
    for bad_url in unsupported_urls:
        res = client.post("/api/analyze-url", json={"url": bad_url})
        assert res.status_code == 400
        assert "Chỉ hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps" in res.json()["detail"]


def test_analyze_url_google_maps_non_maps_path_rejected(client):
    """Chặn các link google.com không phải bản đồ (Google Search, Drive...)."""
    bad_g_url = "https://www.google.com/finance/quote/GOOG"
    res = client.post("/api/analyze-url", json={"url": bad_g_url})
    assert res.status_code == 400
    assert "Đường dẫn Google không đúng định dạng bản đồ Google Maps" in res.json()["detail"]


@patch("crawler.foody_crawler.crawl_restaurant")
@patch("routers.crawler.save_and_analyze_reviews")
def test_analyze_url_foody_success(mock_save_analyze, mock_crawl_foody, client, test_db_session):
    """Kiểm tra xử lý thành công link Foody.vn chuẩn xác."""
    foody_url = "https://www.foody.vn/da-nang/com-ga-gia-vinh-hai-phong"

    mock_crawl_foody.return_value = {
        "name": "Cơm Gà Gia Vĩnh",
        "address": "241 Hải Phòng, Hải Châu, Đà Nẵng",
        "overall_rating": 8.4,
        "reviews": [
            {"author": "Minh", "rating": 9.0, "text": "Cơm gà xối mỡ rất giòn ngon, phục vụ nhanh!"}
        ]
    }

    # Giả lập nhà hàng đã lưu vào DB
    rest = Restaurant(
        name="Cơm Gà Gia Vĩnh",
        foody_url=foody_url,
        address="241 Hải Phòng, Hải Châu, Đà Nẵng",
        overall_rating=8.4,
        review_count=1
    )
    test_db_session.add(rest)
    test_db_session.commit()
    test_db_session.refresh(rest)

    mock_save_analyze.return_value = rest

    res = client.post("/api/analyze-url", json={"url": foody_url, "max_reviews": 10})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Đã cào và phân tích thành công 1 đánh giá thực tế!" in data["message"]
    assert data["restaurant"]["name"] == "Cơm Gà Gia Vĩnh"
    assert data["restaurant"]["foodyUrl"] == foody_url

    mock_crawl_foody.assert_called_once()


@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_analyze_url_google_maps_success(mock_analyze_batch, mock_crawl_gmaps, client, test_db_session):
    """Kiểm tra xử lý thành công link Google Maps, lưu DB với source='GoogleMaps' và phân tích ABSA."""
    gmaps_url = "https://www.google.com/maps/place/Com+Ga+Gia+Vinh/@16.068,108.216,17z"

    mock_crawl_gmaps.return_value = {
        "success": True,
        "restaurant_name": "Cơm Gà Gia Vĩnh",
        "address": "241 Hải Phòng, Tam Thuận, Thanh Khê, Đà Nẵng",
        "overall_rating": 4.5,
        "google_maps_url": gmaps_url,
        "google_place_id": "ChIJ_fake_gmaps_123",
        "reviews": [
            {
                "author": "Trần Anh",
                "rating": 5.0,
                "review_date": "2 tuần trước",
                "text": "Gà da giòn rụm, cơm thơm dẻo, nước sốt chấm rất vừa miệng.",
                "google_review_id": "rev_gmap_001"
            },
            {
                "author": "Hoàng Nam",
                "rating": 4.0,
                "review_date": "1 tháng trước",
                "text": "Quán ăn ngon sạch sẽ, giá cả hợp lý, nhân viên thân thiện.",
                "google_review_id": "rev_gmap_002"
            }
        ],
        "total_crawled": 2,
        "error": None
    }

    mock_analyze_batch.return_value = [
        {
            "review_id": 1,
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "món ăn", "sentiment": "positive", "confidence": 0.95}],
            "is_urgent": False
        },
        {
            "review_id": 2,
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "dịch vụ", "sentiment": "positive", "confidence": 0.90}],
            "is_urgent": False
        }
    ]

    res = client.post("/api/analyze-url", json={"url": gmaps_url, "max_reviews": 20})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Đã cào và phân tích thành công 2 đánh giá thực tế từ Google Maps!" in data["message"]
    assert data["restaurant"]["name"] == "Cơm Gà Gia Vĩnh"
    assert data["restaurant"]["googleMapsUrl"] == gmaps_url
    assert data["restaurant"]["sourceBreakdown"]["googleMaps"] == 2

    # Kiểm tra trong DB
    rest_in_db = test_db_session.query(Restaurant).filter_by(google_place_id="ChIJ_fake_gmaps_123").first()
    assert rest_in_db is not None
    assert rest_in_db.name == "Cơm Gà Gia Vĩnh"

    revs_in_db = test_db_session.query(Review).filter_by(restaurant_id=rest_in_db.id).all()
    assert len(revs_in_db) == 2
    for r in revs_in_db:
        assert r.source == "GoogleMaps"
        assert r.is_analyzed == 1


@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
def test_analyze_url_google_maps_crawler_failure(mock_crawl_gmaps, client):
    """Xử lý phòng thủ khi crawler Google Maps báo lỗi không cào được."""
    gmaps_url = "https://maps.app.goo.gl/invalidLink123"
    mock_crawl_gmaps.return_value = {
        "success": False,
        "restaurant_name": "",
        "reviews": [],
        "error": "Timeout điều hướng tới Google Maps."
    }

    res = client.post("/api/analyze-url", json={"url": gmaps_url})
    assert res.status_code == 400
    assert "Thu thập dữ liệu Google Maps thất bại" in res.json()["detail"]


# ==============================================================================
# 2. TEST POST /api/search-and-crawl (SOURCE PARAM & FALLBACK LOGIC)
# ==============================================================================

def test_search_and_crawl_step1_cache_hit_db(client, test_db_session):
    """Bước 1: Quán đã có trong SQLite DB thì trả về ngay tức thì (<20ms) với source='database'."""
    rest = Restaurant(
        name="Bún Chả Cá Bà Lữ",
        address="319 Hùng Vương, Đà Nẵng",
        city="Đà Nẵng",
        foody_url="https://www.foody.vn/da-nang/bun-cha-ca-ba-lu",
        review_count=10
    )
    test_db_session.add(rest)
    test_db_session.commit()

    # Tìm kiếm theo tên
    res = client.post("/api/search-and-crawl", json={"query": "bún chả cá bà lữ", "source": "auto"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["source"] == "database"
    assert "Tìm thấy quán 'Bún Chả Cá Bà Lữ' đã được phân tích sẵn" in data["message"]
    assert data["restaurant"]["name"] == "Bún Chả Cá Bà Lữ"


@patch("crawler.google_maps_crawler.search_and_crawl_google_maps")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_search_and_crawl_source_google_maps(mock_analyze_batch, mock_crawl_gmaps, client, test_db_session):
    """Khi chỉ định source='google_maps': Cào trực tiếp từ Google Maps, bỏ qua Foody."""
    mock_crawl_gmaps.return_value = {
        "success": True,
        "restaurant_name": "Mì Quảng Bà Mua",
        "address": "19 Trần Bình Trọng, Hải Châu, Đà Nẵng",
        "overall_rating": 4.3,
        "google_maps_url": "https://www.google.com/maps/place/Mi+Quang+Ba+Mua/@16.0,108.0,17z",
        "google_place_id": "ChIJ_ba_mua_001",
        "reviews": [
            {
                "author": "Thu Hằng",
                "rating": 5.0,
                "review_date": "3 ngày trước",
                "text": "Mì quảng tôm thịt đậm đà chuẩn vị miền Trung, rau sống tươi rói.",
                "google_review_id": "rev_mua_01"
            }
        ],
        "total_crawled": 1,
        "error": None
    }
    mock_analyze_batch.return_value = [
        {
            "review_id": 1,
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "món ăn", "sentiment": "positive", "confidence": 0.92}],
            "is_urgent": False
        }
    ]

    res = client.post(
        "/api/search-and-crawl",
        json={"query": "mì quảng bà mua", "city": "da-nang", "source": "google_maps"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["source"] == "crawled_and_analyzed"
    assert "Đã tổng hợp thành công nhận xét từ Google Maps" in data["message"]
    assert data["restaurant"]["name"] == "Mì Quảng Bà Mua"
    assert data["restaurant"]["sourceBreakdown"]["googleMaps"] == 1

    mock_crawl_gmaps.assert_called_once()


@patch("crawler.foody_crawler.search_foody_places")
@patch("crawler.google_maps_crawler.search_and_crawl_google_maps")
def test_search_and_crawl_source_foody_only_no_fallback(mock_crawl_gmaps, mock_search_foody, client):
    """Khi source='foody': Nếu Foody không tìm thấy quán thì raise 404, TUYỆT ĐỐI KHÔNG fallback sang Google Maps."""
    mock_search_foody.return_value = []

    res = client.post(
        "/api/search-and-crawl",
        json={"query": "quán ăn hiếm hoi", "city": "da-nang", "source": "foody"}
    )
    assert res.status_code == 404
    assert "Không tìm thấy quán ăn nào trên Foody" in res.json()["detail"]
    mock_crawl_gmaps.assert_not_called()


@patch("crawler.foody_crawler.search_foody_places")
@patch("crawler.google_maps_crawler.search_and_crawl_google_maps")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_search_and_crawl_source_auto_fallback_to_google_maps(
    mock_analyze_batch,
    mock_crawl_gmaps,
    mock_search_foody,
    client,
    test_db_session
):
    """Khi source='auto': Nếu Foody không có kết quả, tự động fallback sang Google Maps thành công."""
    # Foody không tìm thấy kết quả
    mock_search_foody.return_value = []

    # Google Maps tìm thấy quán
    mock_crawl_gmaps.return_value = {
        "success": True,
        "restaurant_name": "Bánh Xèo Tôm Nhảy Năm Hiền",
        "address": "46 Phan Thanh, Thanh Khê, Đà Nẵng",
        "overall_rating": 4.6,
        "google_maps_url": "https://www.google.com/maps/place/Banh+Xeo+Nam+Hien/@16.0,108.0,17z",
        "google_place_id": "ChIJ_nam_hien_999",
        "reviews": [
            {
                "author": "Quốc Huy",
                "rating": 5.0,
                "review_date": "Hôm qua",
                "text": "Bánh xèo giòn tan, tôm tươi rói nhảy tanh tách, nước chấm tương đậu thơm ngậy.",
                "google_review_id": "rev_xeo_01"
            }
        ],
        "total_crawled": 1,
        "error": None
    }
    mock_analyze_batch.return_value = [
        {
            "review_id": 1,
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "món ăn", "sentiment": "positive", "confidence": 0.98}],
            "is_urgent": False
        }
    ]

    res = client.post(
        "/api/search-and-crawl",
        json={"query": "bánh xèo năm hiền", "city": "da-nang", "source": "auto"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["source"] == "crawled_and_analyzed"
    assert "Đã tổng hợp thành công nhận xét từ Google Maps" in data["message"]
    assert data["restaurant"]["name"] == "Bánh Xèo Tôm Nhảy Năm Hiền"

    mock_search_foody.assert_called_once()
    mock_crawl_gmaps.assert_called_once()


@patch("crawler.foody_crawler.search_foody_places")
@patch("crawler.foody_crawler.crawl_restaurant")
@patch("crawler.google_maps_crawler.search_and_crawl_google_maps")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_search_and_crawl_source_auto_foody_zero_reviews_fallback_to_google_maps(
    mock_analyze_batch,
    mock_crawl_gmaps,
    mock_crawl_foody,
    mock_search_foody,
    client,
    test_db_session
):
    """Khi source='auto': Nếu Foody tìm thấy quán nhưng có 0 bài đánh giá -> Fallback sang Google Maps."""
    mock_search_foody.return_value = [
        {"name": "Quán Mới Mở", "url": "https://www.foody.vn/da-nang/quan-moi-mo", "address": "123 Lê Duẩn"}
    ]
    # Foody cào ra 0 bài review
    mock_crawl_foody.return_value = {
        "name": "Quán Mới Mở",
        "reviews": []
    }

    # Google Maps lại có đánh giá thực tế
    mock_crawl_gmaps.return_value = {
        "success": True,
        "restaurant_name": "Quán Mới Mở",
        "address": "123 Lê Duẩn, Đà Nẵng",
        "overall_rating": 4.7,
        "google_maps_url": "https://www.google.com/maps/place/Quan+Moi+Mo/@16.0,108.0,17z",
        "google_place_id": "ChIJ_moi_mo_777",
        "reviews": [
            {
                "author": "Văn Hải",
                "rating": 5.0,
                "review_date": "1 ngày trước",
                "text": "Không gian quán rất ấm cúng, đồ uống pha chế ngon.",
                "google_review_id": "rev_mo_01"
            }
        ],
        "total_crawled": 1,
        "error": None
    }
    mock_analyze_batch.return_value = [
        {
            "review_id": 1,
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "không gian", "sentiment": "positive", "confidence": 0.91}],
            "is_urgent": False
        }
    ]

    res = client.post(
        "/api/search-and-crawl",
        json={"query": "quán mới mở", "city": "da-nang", "source": "auto"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Đã tổng hợp thành công nhận xét từ Google Maps" in data["message"]
    mock_crawl_gmaps.assert_called_once()


# ==============================================================================
# 3. TEST POST /api/crawler/google-maps (RESPONSE INCLUDES RESTAURANT OBJECT)
# ==============================================================================

@patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
@patch("analysis.gemini_analyzer.analyze_batch")
def test_crawler_google_maps_endpoint_returns_formatted_restaurant(
    mock_analyze_batch,
    mock_crawl_gmaps,
    client,
    test_db_session
):
    """POST /api/crawler/google-maps phải trả về field 'restaurant' chứa format_restaurant_full."""
    mock_crawl_gmaps.return_value = {
        "success": True,
        "restaurant_name": "Bún Mắm Nêm Dì Cúc",
        "address": "14 Nguyễn Thị Minh Khai, Đà Nẵng",
        "overall_rating": 4.8,
        "google_maps_url": "https://maps.app.goo.gl/DiCuc123",
        "google_place_id": "ChIJ_di_cuc_888",
        "reviews": [
            {
                "author": "Hà Trang",
                "rating": 5.0,
                "review_date": "5 ngày trước",
                "text": "Mắm nêm thơm lừng, thịt quay giòn rụm ăn kèm tai heo sần sật tuyệt vời.",
                "google_review_id": "rev_cuc_01"
            }
        ],
        "total_crawled": 1,
        "error": None
    }
    mock_analyze_batch.return_value = []

    res = client.post("/api/crawler/google-maps", json={
        "googleMapsUrl": "https://maps.app.goo.gl/DiCuc123",
        "maxReviews": 15
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "restaurant" in data, "Response phải chứa object restaurant đã format đầy đủ!"
    assert data["restaurant"]["name"] == "Bún Mắm Nêm Dì Cúc"
    assert data["restaurant"]["googleMapsUrl"] == "https://maps.app.goo.gl/DiCuc123"
    assert data["restaurant"]["sourceBreakdown"]["googleMaps"] == 1
