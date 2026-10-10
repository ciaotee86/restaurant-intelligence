import os
import sys
from pathlib import Path
import pytest

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from routers.crawler import search_and_crawl_restaurant, SearchAndCrawlRequest
from routers.restaurants import search_restaurants_db, extract_city_from_query
from database.db import get_session
from database.models import Restaurant as DBRestaurant


def test_search_and_crawl_matching_existing_restaurant():
    """Kiểm tra tìm kiếm từ khóa khớp với quán đã có trong SQLite mà không bị AttributeError r.slug / r.cuisine"""
    with get_session() as db:
        first_r = db.query(DBRestaurant).first()
        assert first_r is not None

        req = SearchAndCrawlRequest(query=first_r.name, city="da-nang", max_reviews=5)
        res = search_and_crawl_restaurant(req)

        assert res["success"] is True
        assert res["source"] == "database"
        assert res["restaurant"]["name"] == first_r.name


def test_search_and_crawl_empty_query():
    """Kiểm tra validation khi từ khóa rỗng"""
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        search_and_crawl_restaurant(SearchAndCrawlRequest(query="   ", city="da-nang"))
    assert exc_info.value.status_code == 400


def test_city_filter_pure_city():
    """Kiểm tra gõ 'đà nẵng' chỉ trả về 100% quán tại Đà Nẵng, không lọt quán ở thành phố khác"""
    res = search_restaurants_db(q="đà nẵng")
    assert res["detected_city"] == "Đà Nẵng"
    assert res["remaining_keyword"] == ""
    assert res["total"] > 0
    for r in res["results"]:
        assert r["city"] == "Đà Nẵng", f"Quán {r['name']} ở {r['city']} không phải Đà Nẵng!"


def test_city_filter_dish_with_city():
    """Kiểm tra gõ 'cơm hà nội' trích xuất đúng thành phố Hà Nội và từ khóa món ăn 'cơm'"""
    city_name, rem_q = extract_city_from_query("cơm hà nội")
    assert city_name == "Hà Nội"
    assert rem_q == "com"


def test_city_filter_dish_only():
    """Kiểm tra chỉ gõ món ăn (ví dụ 'cơm gà') thì không ép thành phố, hiển thị trên toàn bộ địa điểm"""
    res = search_restaurants_db(q="cơm gà")
    assert res["detected_city"] is None
    cities = set(r["city"] for r in res["results"])
    assert len(cities) > 1, f"Chỉ gõ món ăn phải tìm thấy trên nhiều thành phố, kết quả thực tế: {cities}"
