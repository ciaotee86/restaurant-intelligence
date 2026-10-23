"""
Unit test suite kiểm tra bộ lọc xác thực URL Foody chặt chẽ, phòng chống SSRF,
kiểm tra sanity check cấu trúc trang quán ăn Foody, và dọn dẹp dữ liệu rác.
"""

import pytest
from unittest.mock import patch, MagicMock
from bs4 import BeautifulSoup
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api_server import app
from routers.crawler import validate_foody_url
from crawler.foody_crawler import (
    is_foody_domain,
    is_valid_foody_restaurant_page,
    inspect_foody_via_http,
    crawl_restaurant,
    INVALID_RESTAURANT_NAMES
)
from database.db import get_session
from database.models import Restaurant

client = TestClient(app)


# ==============================================================================
# 1. TEST BỘ LỌC XÁC THỰC URL VÀ CHỐNG SSRF (validate_foody_url)
# ==============================================================================

def test_validate_foody_url_valid():
    """URL Foody hợp lệ phải được chấp nhận và trả về nguyên vẹn"""
    valid_urls = [
        "https://www.foody.vn/da-nang/banh-trang-tien-tien",
        "https://foody.vn/ho-chi-minh/com-tam-ba-ghien",
        "https://www.foody.vn/ha-noi/pho-thin-lo-duc",
        "http://www.foody.vn/hue/che-hem",
        "https://www.foody.vn/da-nang/banh-trang-tien-tien?foo=bar#section",
    ]
    for url in valid_urls:
        validated = validate_foody_url(url)
        assert validated == url, f"URL hợp lệ bị từ chối: {url}"


def test_validate_foody_url_reject_non_foody_domains():
    """Từ chối tất cả domain không thuộc foody.vn (Google Mail, Facebook, domain giả mạo)"""
    invalid_domains = [
        "https://mail.google.com/mail/",
        "https://facebook.com/foody.vn",
        "https://google.com",
        "https://foody.vn.attacker.com/da-nang/quan",
        "https://attacker-foody.vn/da-nang/quan",
        "https://notfoody.vn/da-nang/quan",
        "https://foody.com/da-nang/quan",
    ]
    for url in invalid_domains:
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url(url)
        assert exc_info.value.status_code == 400
        assert "foody.vn" in exc_info.value.detail.lower()


def test_validate_foody_url_reject_ssrf_and_ip_addresses():
    """Phòng chống SSRF: Cấm truy cập IP trực tiếp, localhost, IP nội bộ và metadata cloud"""
    ssrf_urls = [
        "http://127.0.0.1:8000/api/restaurants",
        "http://127.0.0.1/da-nang/quan",
        "http://localhost:8000",
        "http://0.0.0.0:8000",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/secret",
        "http://192.168.1.1/router",
        "http://[::1]/da-nang/quan",
    ]
    for url in ssrf_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url(url)
        assert exc_info.value.status_code == 400


def test_validate_foody_url_reject_invalid_schemes_and_ports():
    """Từ chối các scheme nguy hiểm (file, ftp, javascript) và port không hợp lệ"""
    invalid_schemes = [
        "file:///etc/passwd",
        "ftp://foody.vn/da-nang/quan",
        "javascript:alert(1)",
        "gopher://foody.vn/1",
        "data:text/html;base64,PHNjcmlwdD4=",
    ]
    for url in invalid_schemes:
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url(url)
        assert exc_info.value.status_code == 400

    invalid_ports = [
        "http://foody.vn:22/da-nang/quan",
        "https://foody.vn:8080/da-nang/quan",
        "http://foody.vn:3306/da-nang/quan",
    ]
    for url in invalid_ports:
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url(url)
        assert exc_info.value.status_code == 400
        assert "cổng" in exc_info.value.detail.lower() or "port" in exc_info.value.detail.lower()


def test_validate_foody_url_reject_userinfo():
    """Từ chối URL chứa thông tin xác thực nhúng (user:pass@host)"""
    url = "https://admin:secret@www.foody.vn/da-nang/banh-trang"
    with pytest.raises(HTTPException) as exc_info:
        validate_foody_url(url)
    assert exc_info.value.status_code == 400
    assert "thông tin xác thực" in exc_info.value.detail.lower()


def test_validate_foody_url_reject_root_and_system_paths():
    """Từ chối trang chủ, trang đăng nhập và các trang hệ thống Foody không phải quán ăn"""
    system_urls = [
        "https://www.foody.vn",
        "https://www.foody.vn/",
        "https://foody.vn/dang-nhap",
        "https://www.foody.vn/dang-ky",
        "https://www.foody.vn/account",
        "https://www.foody.vn/tai-khoan",
        "https://www.foody.vn/admin",
        "https://www.foody.vn/da-nang",  # Trang danh mục thành phố, chỉ có 1 phân đoạn path
    ]
    for url in system_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url(url)
        assert exc_info.value.status_code == 400


def test_validate_foody_url_dns_rebinding_ssrf():
    """Phòng chống DNS Rebinding: Nếu domain phân giải ra IP nội bộ -> Chặn ngay"""
    fake_dns = [
        (2, 1, 0, '', ('127.0.0.1', 0)),
    ]
    with patch("socket.getaddrinfo", return_value=fake_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_foody_url("https://www.foody.vn/da-nang/quan-test")
        assert exc_info.value.status_code == 400
        assert "ssrf" in exc_info.value.detail.lower() or "an toàn" in exc_info.value.detail.lower()


# ==============================================================================
# 2. TEST SANITY CHECK CẤU TRÚC TRANG FOODY (foody_crawler.py)
# ==============================================================================

def test_is_foody_domain():
    """Kiểm tra nhận diện chính xác domain Foody"""
    assert is_foody_domain("https://foody.vn/da-nang/quan")
    assert is_foody_domain("https://www.foody.vn/da-nang/quan")
    assert is_foody_domain("http://m.foody.vn/ha-noi/pho")
    assert not is_foody_domain("https://mail.google.com/mail/")
    assert not is_foody_domain("https://facebook.com")
    assert not is_foody_domain("https://foody.vn.evil.com")
    assert not is_foody_domain("http://127.0.0.1:8000")
    assert not is_foody_domain("")


def test_is_valid_foody_restaurant_page_blacklisted_names():
    """Từ chối các tên quán rác, login hoặc generic"""
    for bad_name in ["Đăng nhập", "login", "Sign in", "Trang chủ", "404", "error", "tài khoản", ""]:
        assert not is_valid_foody_restaurant_page(
            "https://www.foody.vn/da-nang/quan-test",
            name=bad_name
        )


def test_is_valid_foody_restaurant_page_html_structure():
    """Kiểm tra phát hiện trang HTML giả mạo / không có cấu trúc Foody"""
    # 1. HTML trang đăng nhập Gmail / Google: Không có bất kỳ marker Foody nào
    gmail_html = """
    <html>
        <head><title>Gmail - Đăng nhập</title></head>
        <body>
            <h1>Đăng nhập</h1>
            <input type="email" placeholder="Email hoặc số điện thoại"/>
            <button>Tiếp theo</button>
        </body>
    </html>
    """
    soup_gmail = BeautifulSoup(gmail_html, "html.parser")
    assert not is_valid_foody_restaurant_page(
        "https://www.foody.vn/da-nang/quan-test",
        soup=soup_gmail,
        name="Đăng nhập"
    )

    # 2. HTML quán ăn Foody chuẩn: có .main-info-title, .res-common-pos, .microsite-top-points
    foody_html = """
    <html>
        <head><title>Bánh Tráng Tiến Tiến - Foody.vn</title></head>
        <body>
            <div class="main-info-title"><h1>Bánh Tráng Tiến Tiến</h1></div>
            <div class="res-common-pos">K334/18 Đống Đa, Hải Châu, Đà Nẵng</div>
            <div class="microsite-top-points">8.5</div>
            <div class="foody-box-review"></div>
        </body>
    </html>
    """
    soup_foody = BeautifulSoup(foody_html, "html.parser")
    assert is_valid_foody_restaurant_page(
        "https://www.foody.vn/da-nang/banh-trang-tien-tien",
        soup=soup_foody,
        name="Bánh Tráng Tiến Tiến"
    )


def test_crawl_restaurant_rejects_external_urls():
    """crawl_restaurant từ chối URL ngoài Foody ngay lập tức (trả về None)"""
    assert crawl_restaurant("https://mail.google.com/mail/") is None
    assert crawl_restaurant("http://127.0.0.1:8000") is None
    assert crawl_restaurant("https://facebook.com") is None
    assert inspect_foody_via_http("https://mail.google.com/mail/") is None


# ==============================================================================
# 3. TEST FASTAPI ENDPOINT /api/analyze-url QUA TESTCLIENT
# ==============================================================================

def test_api_analyze_url_rejects_mail_google():
    """Request /api/analyze-url với URL https://mail.google.com/mail/ phải trả về HTTP 400"""
    response = client.post("/api/analyze-url", json={"url": "https://mail.google.com/mail/"})
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "foody" in data["detail"].lower()


def test_api_analyze_url_rejects_localhost_and_ssrf():
    """Request /api/analyze-url với IP local hoặc metadata cloud phải trả về HTTP 400"""
    for bad_url in ["http://127.0.0.1:8000", "http://localhost:8000", "http://169.254.169.254"]:
        response = client.post("/api/analyze-url", json={"url": bad_url})
        assert response.status_code == 400, f"URL {bad_url} không bị chặn 400!"


def test_api_analyze_url_rejects_facebook():
    """Request /api/analyze-url với https://facebook.com phải trả về HTTP 400"""
    response = client.post("/api/analyze-url", json={"url": "https://facebook.com"})
    assert response.status_code == 400
    assert "foody" in response.json()["detail"].lower()


def test_api_analyze_url_rejects_foody_login_page():
    """Request /api/analyze-url với link đăng nhập Foody phải trả về HTTP 400"""
    response = client.post("/api/analyze-url", json={"url": "https://www.foody.vn/dang-nhap"})
    assert response.status_code == 400


def test_api_analyze_url_valid_foody_mock():
    """Request /api/analyze-url với URL Foody hợp lệ phải vượt qua validation và tiến hành xử lý"""
    valid_url = "https://www.foody.vn/da-nang/banh-trang-tien-tien"
    mock_crawl_data = {
        "url": valid_url,
        "name": "Bánh Tráng Tiến Tiến",
        "address": "K334/18 Đống Đa, Đà Nẵng",
        "overall_rating": 8.5,
        "reviews": [
            {
                "foody_review_id": "9999",
                "fingerprint": "mock_fp_test_12345",
                "author": "Thực Khách A",
                "rating": 9.0,
                "text": "Bánh tráng ở đây rất ngon và đậm đà!",
                "date": "2026-10-20",
                "is_spam": 0,
                "spam_score": 0.0,
                "spam_category": "normal",
                "spam_reason": "[]"
            }
        ]
    }

    with patch("routers.crawler.crawl_restaurant", return_value=mock_crawl_data):
        with patch("routers.crawler.save_and_analyze_reviews") as mock_save:
            mock_rest = MagicMock()
            mock_rest.name = "Bánh Tráng Tiến Tiến"
            mock_save.return_value = mock_rest
            with patch("routers.crawler.format_restaurant_full", return_value={"id": 999, "name": "Bánh Tráng Tiến Tiến"}):
                response = client.post("/api/analyze-url", json={"url": valid_url})
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert "Bánh Tráng Tiến Tiến" in data["restaurant"]["name"]


# ==============================================================================
# 4. TEST XÁC MINH DỮ LIỆU RÁC (ID 247) ĐÃ ĐƯỢC DỌN DẸP SẠCH
# ==============================================================================

def test_database_cleaned_up_restaurant_247():
    """Xác nhận bản ghi quán rác ID 247 (Đăng nhập / mail.google.com) đã bị xóa vĩnh viễn khỏi SQLite"""
    with get_session() as db:
        r247 = db.query(Restaurant).filter_by(id=247).first()
        assert r247 is None, "Bản ghi quán rác ID 247 vẫn còn tồn tại trong SQLite database!"

        # Đảm bảo không còn bất kỳ quán ăn nào trong DB có URL không thuộc foody.vn
        non_foody_rests = db.query(Restaurant).filter(~Restaurant.foody_url.like("%foody.vn%")).all()
        assert len(non_foody_rests) == 0, f"Vẫn còn quán có URL không phải Foody: {[(r.id, r.name, r.foody_url) for r in non_foody_rests]}"
