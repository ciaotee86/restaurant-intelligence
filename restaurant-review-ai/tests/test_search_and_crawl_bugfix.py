"""
Regression test suite cho lỗi tìm kiếm sai món ăn và sai thành phố trên Search & Crawl:
- Lỗi cắt mất từ khóa món đặc sản (bún huế -> bún).
- Lỗi ánh xạ slug thành phố Foody (Thừa Thiên Huế -> thua-thien-hue thay vì hue).
- Lỗi silent fallback sang Đà Nẵng (dẫn tới quán Phở Bụt ở Đà Nẵng).
- Lỗi cào và lưu quán 0 review vào database.
"""

import pytest
from routers.restaurants import extract_city_from_query
from routers.crawler import get_foody_city_slug
from crawler.foody_crawler import _search_foody_via_http


def test_extract_city_from_query_specialties():
    """Kiểm tra không bị cắt mất chữ của các món ăn đặc sản truyền thống"""
    # Các món không có giới từ chỉ địa điểm: Phải giữ nguyên vẹn từ khóa món ăn
    cases_preserve = [
        ("bún huế", None, "bún huế"),
        ("bún bò huế", None, "bún bò huế"),
        ("mì quảng", None, "mì quảng"),
        ("nem nướng nha trang", None, "nem nướng nha trang"),
        ("bún đậu hà nội", None, "bún đậu hà nội"),
        ("cơm tấm sài gòn", None, "cơm tấm sài gòn"),
        ("bánh bèo huế", None, "bánh bèo huế"),
        ("chè huế", None, "chè huế"),
    ]
    for raw, exp_city, exp_dish in cases_preserve:
        city, dish = extract_city_from_query(raw)
        assert city == exp_city, f"Lỗi city với '{raw}': nhận '{city}', kỳ vọng '{exp_city}'"
        assert dish.lower() == exp_dish.lower(), f"Lỗi dish với '{raw}': nhận '{dish}', kỳ vọng '{exp_dish}'"


def test_extract_city_from_query_with_preposition():
    """Kiểm tra bóc tách thành phố khi có giới từ địa điểm (ở, tại, khu vực)"""
    cases_with_prep = [
        ("bún huế ở đà nẵng", "Đà Nẵng", "bún huế"),
        ("bún bò huế tại hà nội", "Hà Nội", "bún bò huế"),
        ("quán cà phê ở huế", "Thừa Thiên Huế", "quán cà phê"),
        ("cơm gà tại nha trang", "Khánh Hòa", "cơm gà"),
    ]
    for raw, exp_city, exp_dish in cases_with_prep:
        city, dish = extract_city_from_query(raw)
        assert city == exp_city, f"Lỗi city với '{raw}': nhận '{city}', kỳ vọng '{exp_city}'"
        assert dish.lower() == exp_dish.lower(), f"Lỗi dish với '{raw}': nhận '{dish}', kỳ vọng '{exp_dish}'"


def test_foody_city_slug_mapping():
    """Kiểm tra chuẩn hóa slug tương thích 100% với URL cấu trúc của Foody.vn"""
    slug_checks = [
        ("Thừa Thiên Huế", "hue"),
        ("thua-thien-hue", "hue"),
        ("hue", "hue"),
        ("Huế", "hue"),
        ("TP. Hồ Chí Minh", "ho-chi-minh"),
        ("Sài Gòn", "ho-chi-minh"),
        ("Hà Nội", "ha-noi"),
        ("Đà Nẵng", "da-nang"),
        ("Khánh Hòa", "khanh-hoa"),
        ("Nha Trang", "khanh-hoa"),
        ("Lâm Đồng", "lam-dong"),
        ("Đà Lạt", "lam-dong"),
        ("Bà Rịa - Vũng Tàu", "vung-tau"),
        ("Quảng Nam", "quang-nam"),
        ("Hội An", "quang-nam"),
    ]
    for input_name, expected_slug in slug_checks:
        actual_slug = get_foody_city_slug(input_name)
        assert actual_slug == expected_slug, f"City '{input_name}' bị map sai thành '{actual_slug}', mong muốn '{expected_slug}'"


def test_foody_search_city_accuracy():
    """Kiểm tra kết quả tìm kiếm thực tế trên Foody đúng chuẩn thành phố Huế và ưu tiên quán có review"""
    results = _search_foody_via_http("bún huế", city_slug="hue", max_results=5)
    assert len(results) > 0, "Phải tìm thấy ít nhất 1 quán tại Huế cho từ khóa 'bún huế'"
    
    # 1. Đảm bảo tất cả các quán đều ở Huế (/hue/), tuyệt đối không có quán ở Đà Nẵng (/da-nang/)
    for r in results:
        assert "/hue/" in r["url"], f"Quán '{r['name']}' có URL '{r['url']}' không thuộc tỉnh Huế!"
        assert "/da-nang/" not in r["url"], f"Quán '{r['name']}' bị lọt sang Đà Nẵng!"

    # 2. Đảm bảo quán đầu tiên có review_count > 0 (nếu có quán có review)
    first = results[0]
    has_any_with_reviews = any(x.get("review_count", 0) > 0 for x in results)
    if has_any_with_reviews:
        assert first.get("review_count", 0) > 0, f"Quán đầu tiên '{first['name']}' phải có review > 0"


def test_foody_search_bun_bo_hue():
    """Kiểm tra tìm kiếm 'bún bò huế' tại Huế trả về các quán bún bò nổi tiếng tại Huế"""
    results = _search_foody_via_http("bún bò huế", city_slug="hue", max_results=5)
    assert len(results) > 0
    names = [r["name"].lower() for r in results]
    # Phải có ít nhất 1 quán bún bò huế thực thụ
    assert any("bún" in n or "huế" in n for n in names)
    for r in results:
        assert "/hue/" in r["url"]
