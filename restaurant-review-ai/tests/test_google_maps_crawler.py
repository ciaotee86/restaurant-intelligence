"""
Test Suite cho Module Google Maps Playwright Headless Crawler.
Dự án: Restaurant Intelligence System
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md (MOD-02)
và kế hoạch: docs/07-multi-source-implementation-plan.md ([TASK-03]).

Kiểm thử:
1. Các hàm tiện ích trích xuất và chuẩn hóa (parse_star_rating, extract_place_id_from_url, clean_address, clean_review_text).
2. Kiểm tra xác thực đầu vào (Validation khi URL hoặc query rỗng).
3. Mocking Playwright DOM & Page để kiểm thử logic cào dữ liệu không phụ thuộc mạng ngoại vi.
4. Xử lý lỗi phòng thủ (Defensive error handling, timeout recovery, không sập process).
5. Kiểm tra định dạng cấu trúc dữ liệu đầu ra (Schema contract conformity).
"""

import os
import re
import sys
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

CURRENT_DIR = Path(__file__).resolve().parent.parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from crawler.google_maps_crawler import (
    parse_star_rating,
    extract_place_id_from_url,
    clean_address,
    clean_review_text,
    crawl_google_maps_reviews,
    search_and_crawl_google_maps,
    extract_place_metadata,
    extract_reviews_data,
)


# ==============================================================================
# 1. TEST TIỆN ÍCH TRÍCH XUẤT & CHUẨN HÓA DỮ LIỆU
# ==============================================================================

class TestGoogleMapsCrawlerUtilities:
    """Kiểm thử các hàm parse chuỗi và trích xuất định danh."""

    def test_parse_star_rating_vietnamese(self):
        """Trích xuất số sao từ chuỗi tiếng Việt."""
        assert parse_star_rating("5 sao") == 5.0
        assert parse_star_rating("4,5 sao") == 4.5
        assert parse_star_rating("3,0 sao") == 3.0
        assert parse_star_rating("1 sao") == 1.0

    def test_parse_star_rating_english(self):
        """Trích xuất số sao từ chuỗi tiếng Anh."""
        assert parse_star_rating("4.8 stars") == 4.8
        assert parse_star_rating("3.5 stars") == 3.5
        assert parse_star_rating("5.0 stars") == 5.0
        assert parse_star_rating("1 star") == 1.0

    def test_parse_star_rating_edge_cases(self):
        """Kiểm tra xử lý các trường hợp biên, chuỗi rỗng và lỗi."""
        assert parse_star_rating(None) == 0.0
        assert parse_star_rating("") == 0.0
        assert parse_star_rating("Chưa có đánh giá") == 0.0
        assert parse_star_rating("invalid_rating") == 0.0
        # Thang điểm 10 quy về thang điểm 5
        assert parse_star_rating("8.4 / 10") == 4.2

    def test_extract_place_id_hex_format(self):
        """Trích xuất Place ID định dạng Hex !1s0x...:0x..."""
        url = "https://www.google.com/maps/place/Com+Ga+Gia+Vinh/@16.071,108.210/data=!4m6!3m5!1s0x31421836d56d5eff:0x3e2f905c0bc12b6!8m2!3d16.071!4d108.210"
        place_id = extract_place_id_from_url(url)
        assert place_id == "0x31421836d56d5eff:0x3e2f905c0bc12b6"

    def test_extract_place_id_chij_format(self):
        """Trích xuất Place ID định dạng ChIJ chuẩn của Google Places."""
        url = "https://www.google.com/maps/place/Banh+Xeo+Ba+Duong/data=!4m2!3m1!19sChIJ_15t1TYYQjERthK8wAX54gM"
        place_id = extract_place_id_from_url(url)
        assert place_id == "ChIJ_15t1TYYQjERthK8wAX54gM"

    def test_extract_place_id_kg_format(self):
        """Trích xuất Place ID định dạng Knowledge Graph /g/..."""
        url = "https://www.google.com/maps/place/Quan+An/data=!16s%2Fg%2F11c52grng5?entry=ttu"
        place_id = extract_place_id_from_url(url)
        assert place_id == "/g/11c52grng5"

    def test_extract_place_id_cid_format(self):
        """Trích xuất Place ID định dạng CID số nguyên."""
        url = "https://maps.google.com/?cid=4480982347891234567"
        place_id = extract_place_id_from_url(url)
        assert place_id == "4480982347891234567"

    def test_extract_place_id_invalid_or_none(self):
        """Kiểm tra xử lý khi URL không chứa Place ID hoặc rỗng."""
        assert extract_place_id_from_url(None) is None
        assert extract_place_id_from_url("") is None
        assert extract_place_id_from_url("https://www.google.com/maps") is None

    def test_clean_address(self):
        """Loại bỏ ký tự icon định vị và khoảng trắng thừa."""
        raw_addr = "\ue0c8 241 Hải Phòng, Thanh Khê, Đà Nẵng 550000, Việt Nam"
        assert clean_address(raw_addr) == "241 Hải Phòng, Thanh Khê, Đà Nẵng 550000, Việt Nam"

        assert clean_address("   129 Lý Tự Trọng, Đà Nẵng   ") == "129 Lý Tự Trọng, Đà Nẵng"
        assert clean_address(None) == ""
        assert clean_address("") == ""

    def test_clean_review_text(self):
        """Chuẩn hóa khoảng trắng và dấu cách trong nội dung đánh giá."""
        raw_text = "   Cơm gà rất ngon,    da giòn rụm.\n\nPhục vụ nhanh!   "
        expected = "Cơm gà rất ngon, da giòn rụm. Phục vụ nhanh!"
        assert clean_review_text(raw_text) == expected
        assert clean_review_text(None) == ""
        assert clean_review_text("") == ""


# ==============================================================================
# 2. TEST VALIDATION ĐẦU VÀO
# ==============================================================================

class TestInputValidation:
    """Kiểm tra phản hồi phòng thủ khi tham số đầu vào không hợp lệ."""

    def test_crawl_empty_url(self):
        """Crawl với URL rỗng trả về kết quả lỗi lịch sự, không crash."""
        result = crawl_google_maps_reviews(url="")
        assert result["success"] is False
        assert result["error"] == "URL Google Maps không được để trống."
        assert result["reviews"] == []
        assert result["total_crawled"] == 0

    def test_crawl_none_url(self):
        """Crawl với URL None trả về kết quả lỗi."""
        result = crawl_google_maps_reviews(url=None)
        assert result["success"] is False
        assert "không được để trống" in result["error"]
        assert result["reviews"] == []

    def test_search_and_crawl_empty_query(self):
        """Search and crawl với query khoảng trắng trả về lỗi rõ ràng."""
        result = search_and_crawl_google_maps(query="   ", city="Đà Nẵng")
        assert result["success"] is False
        assert result["error"] == "Từ khóa tìm kiếm không được để trống."
        assert result["reviews"] == []
        assert result["total_crawled"] == 0


# ==============================================================================
# 3. TEST CRAWLER LOGIC VỚI MOCK PLAYWRIGHT
# ==============================================================================

class TestCrawlerWithMocks:
    """Kiểm thử tương tác DOM, bóc tách và xử lý ngoại lệ bằng Mock."""

    def test_extract_place_metadata_mock(self):
        """Kiểm tra extract_place_metadata trích xuất đúng tên, địa chỉ, rating."""
        mock_page = MagicMock()

        # Mock h1
        mock_h1 = MagicMock()
        mock_h1.inner_text.return_value = "Cơm Gà Gia Vĩnh"
        mock_page.locator.return_value.all.return_value = [mock_h1]

        # Mock address
        mock_addr = MagicMock()
        mock_addr.count.return_value = 1
        mock_addr.is_visible.return_value = True
        mock_addr.inner_text.return_value = "241 Hải Phòng, Đà Nẵng"

        # Mock rating
        mock_rating = MagicMock()
        mock_rating.count.return_value = 1
        mock_rating.is_visible.return_value = True
        mock_rating.inner_text.return_value = "4.2 sao"

        # Thiết lập locator tùy selector
        def locator_side_effect(selector):
            loc = MagicMock()
            if "h1" in selector:
                loc.all.return_value = [mock_h1]
            elif "address" in selector or "Io6YTe" in selector:
                loc.first = mock_addr
                loc.count.return_value = 1
                loc.is_visible.return_value = True
            elif "F7nice" in selector or "ceNzKf" in selector:
                loc.first = mock_rating
                loc.count.return_value = 1
                loc.is_visible.return_value = True
            else:
                loc.count.return_value = 0
                loc.all.return_value = []
            return loc

        mock_page.locator.side_effect = locator_side_effect

        meta = extract_place_metadata(mock_page)
        assert meta["name"] == "Cơm Gà Gia Vĩnh"
        assert meta["address"] == "241 Hải Phòng, Đà Nẵng"
        assert meta["overall_rating"] == 4.2

    def test_extract_reviews_data_mock(self):
        """Kiểm tra extract_reviews_data trích xuất mảng đánh giá theo cấu trúc chuẩn."""
        mock_page = MagicMock()

        # Tạo 2 mock review cards
        card1 = MagicMock()
        card1.get_attribute.side_effect = lambda attr: "rev_id_001" if attr == "data-review-id" else None
        
        # Author 1
        a1 = MagicMock()
        a1.count.return_value = 1
        a1.inner_text.return_value = "Nguyễn Văn A"

        # Star 1
        s1 = MagicMock()
        s1.count.return_value = 1
        s1.get_attribute.return_value = "5 sao"

        # Date 1
        d1 = MagicMock()
        d1.count.return_value = 1
        d1.inner_text.return_value = "2 tuần trước"

        # Text 1
        t1 = MagicMock()
        t1.count.return_value = 1
        t1.inner_text.return_value = "Cơm gà rất ngon, phục vụ nhiệt tình!"

        def card1_loc_side_effect(sel):
            loc = MagicMock()
            if "d4r55" in sel or "alPumb" in sel:
                loc.first = a1
                loc.count.return_value = 1
            elif "kvMYJc" in sel or "img" in sel:
                loc.first = s1
                loc.count.return_value = 1
            elif "rsqaWe" in sel:
                loc.first = d1
                loc.count.return_value = 1
            elif "wiI7pd" in sel or "MyEned" in sel:
                loc.first = t1
                loc.count.return_value = 1
            else:
                loc.count.return_value = 0
            return loc

        card1.locator.side_effect = card1_loc_side_effect

        mock_page.locator.return_value.all.return_value = [card1]

        reviews = extract_reviews_data(mock_page, max_reviews=10)
        assert len(reviews) == 1
        r = reviews[0]
        assert r["author"] == "Nguyễn Văn A"
        assert r["rating"] == 5.0
        assert r["review_date"] == "2 tuần trước"
        assert r["text"] == "Cơm gà rất ngon, phục vụ nhiệt tình!"
        assert r["google_review_id"] == "rev_id_001"

    @patch("crawler.google_maps_crawler.sync_playwright")
    def test_crawl_google_maps_reviews_success_mock(self, mock_sync_playwright):
        """Kiểm tra crawl_google_maps_reviews thành công trọn vẹn với Playwright mocked."""
        # Setup mock Playwright chain
        mock_p = MagicMock()
        mock_sync_playwright.return_value.start.return_value = mock_p

        mock_browser = MagicMock()
        mock_p.chromium.launch.return_value = mock_browser

        mock_context = MagicMock()
        mock_browser.new_context.return_value = mock_context

        mock_page = MagicMock()
        mock_context.new_page.return_value = mock_page
        mock_page.url = "https://www.google.com/maps/place/Foo/data=!1s0x31421836d56d5eff:0x3e2f905c0bc12b6!8m2!3d16.0!4d108.0"

        # Mock metadata
        with patch("crawler.google_maps_crawler.extract_place_metadata") as mock_meta, \
             patch("crawler.google_maps_crawler.extract_reviews_data") as mock_reviews, \
             patch("crawler.google_maps_crawler.scroll_and_expand_reviews") as mock_scroll:

            mock_meta.return_value = {
                "name": "Bánh Xèo Bà Dưỡng",
                "address": "K280/23 Hoàng Diệu, Đà Nẵng",
                "overall_rating": 4.3
            }
            mock_reviews.return_value = [
                {
                    "author": "Trần Thị B",
                    "rating": 5.0,
                    "review_date": "1 tháng trước",
                    "text": "Bánh xèo giòn, nước chấm đậm đà.",
                    "google_review_id": "rev_123"
                }
            ]

            result = crawl_google_maps_reviews(
                url="https://www.google.com/maps/place/Foo",
                max_reviews=5
            )

            assert result["success"] is True
            assert result["restaurant_name"] == "Bánh Xèo Bà Dưỡng"
            assert result["address"] == "K280/23 Hoàng Diệu, Đà Nẵng"
            assert result["overall_rating"] == 4.3
            assert result["google_place_id"] == "0x31421836d56d5eff:0x3e2f905c0bc12b6"
            assert result["total_crawled"] == 1
            assert len(result["reviews"]) == 1
            assert result["error"] is None

            # Đảm bảo context và browser luôn được đóng
            mock_context.close.assert_called_once()
            mock_browser.close.assert_called_once()
            mock_p.stop.assert_called_once()

    @patch("crawler.google_maps_crawler.sync_playwright")
    def test_crawl_defensive_timeout_handling(self, mock_sync_playwright):
        """Kiểm tra xử lý lỗi phòng thủ khi gặp TimeoutError từ Playwright."""
        mock_p = MagicMock()
        mock_sync_playwright.return_value.start.return_value = mock_p

        mock_browser = MagicMock()
        mock_p.chromium.launch.return_value = mock_browser

        mock_context = MagicMock()
        mock_browser.new_context.return_value = mock_context

        mock_page = MagicMock()
        mock_context.new_page.return_value = mock_page

        # Giả lập timeout khi điều hướng trang
        mock_page.goto.side_effect = PlaywrightTimeoutError("Navigation timeout of 25000ms exceeded")

        with patch("crawler.google_maps_crawler.capture_failure_screenshot") as mock_screenshot:
            result = crawl_google_maps_reviews(
                url="https://www.google.com/maps/place/SlowRestaurant",
                timeout_ms=5000
            )

            assert result["success"] is False
            assert "Navigation timeout" in result["error"]
            assert result["reviews"] == []
            assert result["total_crawled"] == 0
            # Chụp ảnh chẩn đoán lỗi khi phát sinh timeout
            mock_screenshot.assert_called_once()

            # Tài nguyên browser vẫn được dọn dẹp an toàn trong khối finally
            mock_context.close.assert_called_once()
            mock_browser.close.assert_called_once()
            mock_p.stop.assert_called_once()

    @patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
    def test_search_and_crawl_delegation(self, mock_crawl):
        """Kiểm tra search_and_crawl_google_maps tạo đúng search URL và ủy thác crawl_google_maps_reviews."""
        mock_crawl.return_value = {
            "success": True,
            "restaurant_name": "Mì Quảng Bà Mua",
            "address": "19 Trần Bình Trọng, Đà Nẵng",
            "overall_rating": 4.1,
            "google_maps_url": "https://www.google.com/maps/...",
            "google_place_id": "0x3142183...",
            "reviews": [],
            "total_crawled": 0,
            "error": None
        }

        res = search_and_crawl_google_maps(
            query="Mì Quảng Bà Mua",
            city="Đà Nẵng",
            max_reviews=15
        )

        assert res["success"] is True
        mock_crawl.assert_called_once()
        call_kwargs = mock_crawl.call_args[1]
        assert "Mì+Quảng+Bà+Mua+Đà+Nẵng" in call_kwargs["url"]
        assert call_kwargs["max_reviews"] == 15


# ==============================================================================
# 4. TEST CẤU TRÚC DỮ LIỆU ĐẦU RA (SCHEMA CONTRACT CONFORMITY)
# ==============================================================================

class TestOutputContractConformity:
    """Đảm bảo định dạng dữ liệu đầu ra tuân thủ 100% đặc tả MOD-02 & TASK-03."""

    def test_output_schema_keys_and_types_on_success(self):
        """Kiểm tra kiểu dữ liệu của các trường trong dictionary trả về khi thành công."""
        sample_success = {
            "success": True,
            "restaurant_name": "Cơm Gà Gia Vĩnh",
            "address": "241 Hải Phòng, Thanh Khê, Đà Nẵng",
            "overall_rating": 4.2,
            "google_maps_url": "https://www.google.com/maps/place/...",
            "google_place_id": "0x31421836d56d5eff:0x3e2f905c0bc12b6",
            "reviews": [
                {
                    "author": "Người dùng",
                    "rating": 5.0,
                    "review_date": "1 ngày trước",
                    "text": "Món ăn tuyệt vời!",
                    "google_review_id": "rev_001"
                }
            ],
            "total_crawled": 1,
            "error": None
        }

        assert isinstance(sample_success["success"], bool)
        assert isinstance(sample_success["restaurant_name"], str)
        assert isinstance(sample_success["address"], str)
        assert isinstance(sample_success["overall_rating"], float)
        assert isinstance(sample_success["google_maps_url"], str)
        assert isinstance(sample_success["google_place_id"], (str, type(None)))
        assert isinstance(sample_success["reviews"], list)
        assert isinstance(sample_success["total_crawled"], int)
        assert sample_success["error"] is None

        for rev in sample_success["reviews"]:
            assert isinstance(rev["author"], str)
            assert isinstance(rev["rating"], float)
            assert 1.0 <= rev["rating"] <= 5.0
            assert isinstance(rev["review_date"], str)
            assert isinstance(rev["text"], str)
            assert isinstance(rev["google_review_id"], (str, type(None)))

    def test_output_schema_keys_and_types_on_failure(self):
        """Kiểm tra kiểu dữ liệu của các trường trong dictionary trả về khi thất bại."""
        sample_failure = {
            "success": False,
            "restaurant_name": "",
            "address": "",
            "overall_rating": 0.0,
            "google_maps_url": "https://invalid-url",
            "google_place_id": None,
            "reviews": [],
            "total_crawled": 0,
            "error": "Lỗi kết nối mạng"
        }

        assert sample_failure["success"] is False
        assert sample_failure["restaurant_name"] == ""
        assert sample_failure["overall_rating"] == 0.0
        assert sample_failure["reviews"] == []
        assert sample_failure["total_crawled"] == 0
        assert isinstance(sample_failure["error"], str)

    def test_live_search_and_crawl_smoke_test(self):
        """Smoke test thực tế với Playwright Chromium và kiểm tra cấu trúc kết quả trả về."""
        result = search_and_crawl_google_maps(
            query="Cơm Gà Gia Vĩnh",
            city="Đà Nẵng",
            max_reviews=3,
            timeout_ms=20000,
            headless=True
        )
        assert isinstance(result, dict)
        assert "success" in result
        assert "restaurant_name" in result
        assert "overall_rating" in result
        assert "reviews" in result
        assert "total_crawled" in result
        assert "error" in result

        if result["success"]:
            assert result["restaurant_name"] != ""
            assert result["overall_rating"] >= 0.0
            assert len(result["reviews"]) >= 1
            assert result["total_crawled"] == len(result["reviews"])
            first_rev = result["reviews"][0]
            assert "author" in first_rev
            assert "rating" in first_rev
            assert "text" in first_rev
        else:
            # Nếu Google chặn hoặc mạng timeout, defensive handling phải giữ đúng schema và error message
            assert isinstance(result["error"], str)
            assert result["reviews"] == []
            assert result["total_crawled"] == 0

