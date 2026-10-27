"""
Router xử lý các tác vụ cào dữ liệu (Crawler) bằng Selenium,
hàng đợi cào ngầm (Crawl Queue) và phân tích NLP Aspect-Based Sentiment với Gemini AI.
"""

import ipaddress
import json
import re
import socket
import threading
import time
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Giới hạn tối đa 2 tác vụ crawl headless đồng thời trong backend nhằm chống tràn RAM máy chủ [SEC-04]
CRAWLER_SEMAPHORE = threading.Semaphore(2)

from database.models import (
    Restaurant as DBRestaurant,
    Review as DBReview,
    ReviewAnalysis as DBAnalysis,
    CrawlRequest as DBCrawlRequest
)
from database.db import (
    get_session,
    get_restaurant_existing_fingerprints
)
import crawler.foody_crawler as foody_crawler
import crawler.google_maps_crawler as google_maps_crawler
import analysis.gemini_analyzer as gemini_analyzer
from crawler.foody_crawler import crawl_restaurant, search_foody_places
from crawler.google_maps_crawler import (
    crawl_google_maps_reviews,
    search_and_crawl_google_maps
)
from crawler.review_filter import classify_review
from services.bi_service import remove_accents, format_restaurant_full
from services.pipeline_service import save_and_analyze_reviews
from services.entity_resolution import (
    compute_review_fingerprint,
    is_duplicate_review,
    update_restaurant_counts_and_credibility,
    resolve_or_create_restaurant,
    calculate_name_similarity,
    is_same_location
)
from analysis.gemini_analyzer import analyze_batch
from routers.restaurants import invalidate_restaurants_cache

router = APIRouter(prefix="/api", tags=["crawler"])


class AnalyzeRequest(BaseModel):
    url: str
    max_reviews: Optional[int] = 30


class SearchAndCrawlRequest(BaseModel):
    query: str
    city: Optional[str] = "da-nang"
    max_reviews: Optional[int] = 25
    source: Optional[str] = "auto"


class QueueCrawlRequest(BaseModel):
    query: str
    city: Optional[str] = "da-nang"


class CrawlGoogleMapsRequest(BaseModel):
    restaurantId: Optional[str] = None
    googleMapsUrl: Optional[str] = None
    queryName: Optional[str] = None
    maxReviews: Optional[int] = 30


BLOCKED_SYSTEM_PATHS = {
    "", "/", "/dang-nhap", "/dang-ky", "/login", "/register",
    "/account", "/tai-khoan", "/admin", "/api", "/gioi-thieu",
    "/lien-he", "/quy-dinh", "/tro-giup", "/mobile"
}


def validate_foody_url(url: str) -> str:
    """
    Xác thực nghiêm ngặt URL Foody và phòng chống SSRF / DNS Rebinding:
    1. Kiểm tra chuỗi URL và độ dài hợp lệ.
    2. Chỉ chấp nhận giao thức http:// hoặc https:// (chống file://, gopher://, javascript:...)
    3. Chặn URL có thông tin nhúng userinfo (user:pass@host).
    4. Chỉ chấp nhận các cổng tiêu chuẩn (80, 443 hoặc mặc định).
    5. Kiểm tra domain: Bắt buộc phải là 'foody.vn' hoặc subdomain '*.foody.vn'.
    6. Phòng chống SSRF: Phân giải DNS và cấm toàn bộ dải IP private/loopback/link-local/multicast/reserved.
    7. Kiểm tra cấu trúc path: Chặn trang chủ và các đường dẫn hệ thống/login không phải quán ăn.
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=400,
            detail="URL không được để trống. Vui lòng cung cấp liên kết Foody."
        )

    raw_url = url.strip()
    if len(raw_url) > 2048:
        raise HTTPException(
            status_code=400,
            detail="URL vượt quá độ dài tối đa cho phép (2048 ký tự)."
        )

    try:
        parsed = urlparse(raw_url)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Cấu trúc URL không hợp lệ."
        )

    # 1. Kiểm tra giao thức (Scheme)
    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="Giao thức không hợp lệ. Chỉ chấp nhận liên kết http:// hoặc https://"
        )

    # 2. Chặn userinfo (tránh bypass URL parsing: user:password@attacker.com)
    if parsed.username or parsed.password:
        raise HTTPException(
            status_code=400,
            detail="URL không được chứa thông tin xác thực tài khoản (username/password)."
        )

    # 3. Kiểm tra port
    if parsed.port not in (None, 80, 443):
        raise HTTPException(
            status_code=400,
            detail="Cổng truy cập không hợp lệ. Chỉ chấp nhận cổng HTTP/HTTPS tiêu chuẩn."
        )

    # 4. Kiểm tra Hostname / Domain
    hostname = (parsed.hostname or "").lower().strip()
    if not hostname:
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ. Thiếu tên miền máy chủ."
        )

    # Chặn các ký tự lạ hoặc khoảng trắng trong hostname
    if re.search(r"[^\w\.-]", hostname):
        raise HTTPException(
            status_code=400,
            detail="Tên miền chứa ký tự không hợp lệ."
        )

    # Chặn trực tiếp địa chỉ IP (IPv4 / IPv6) trong hostname (chống SSRF trực tiếp)
    try:
        ipaddress.ip_address(hostname)
        raise HTTPException(
            status_code=400,
            detail="Hệ thống không chấp nhận truy cập trực tiếp qua địa chỉ IP máy chủ."
        )
    except ValueError:
        pass  # Không phải raw IP, là domain hợp lệ

    is_foody = hostname == "foody.vn" or hostname.endswith(".foody.vn")
    if not is_foody:
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ. Hệ thống chỉ chấp nhận liên kết quán ăn từ Foody (foody.vn)."
        )

    # 5. Anti-SSRF: Phân giải DNS và kiểm tra địa chỉ IP đích
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for res in addr_info:
            ip_str = res[4][0]
            resolved_ip = ipaddress.ip_address(ip_str)
            if (
                resolved_ip.is_private
                or resolved_ip.is_loopback
                or resolved_ip.is_link_local
                or resolved_ip.is_multicast
                or resolved_ip.is_reserved
                or resolved_ip.is_unspecified
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Địa chỉ mạng của máy chủ mục tiêu bị chặn vì lý do an toàn (Anti-SSRF)."
                )
    except HTTPException:
        raise
    except socket.gaierror:
        raise HTTPException(
            status_code=400,
            detail="Không thể phân giải tên miền Foody. Vui lòng kiểm tra lại liên kết."
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi kiểm tra an toàn URL: {str(e)}"
        )

    # 6. Kiểm tra Path của quán ăn
    path = parsed.path.strip()
    clean_path = path.lower().rstrip("/")
    if not clean_path or clean_path in BLOCKED_SYSTEM_PATHS:
        raise HTTPException(
            status_code=400,
            detail="Vui lòng cung cấp link chi tiết quán ăn trên Foody (ví dụ: https://www.foody.vn/da-nang/ten-quan)."
        )

    # Đường dẫn hợp lệ của quán phải có cấu trúc tối thiểu 2 phân đoạn (ví dụ: /da-nang/ten-quan)
    path_segments = [seg for seg in clean_path.split("/") if seg]
    if len(path_segments) < 2:
        raise HTTPException(
            status_code=400,
            detail="Đường dẫn Foody không đúng định dạng trang quán ăn (ví dụ: https://www.foody.vn/da-nang/ten-quan)."
        )

    return raw_url


def validate_google_maps_url(url: str) -> str:
    """
    Xác thực nghiêm ngặt liên kết Google Maps và phòng chống SSRF / DNS Rebinding:
    1. Chuỗi URL và độ dài tối đa cho phép (4096 ký tự).
    2. Chỉ chấp nhận giao thức http:// hoặc https://.
    3. Chặn URL có nhúng userinfo (username:password@host).
    4. Chỉ chấp nhận cổng tiêu chuẩn (80, 443 hoặc mặc định).
    5. Kiểm tra domain hợp lệ: google.com, maps.google.com, goo.gl, maps.app.goo.gl, google.com.vn...
    6. Chống SSRF: Cấm IP trực tiếp và phân giải DNS kiểm tra dải IP private/loopback/link-local/multicast/reserved.
    7. Kiểm tra cấu trúc path: Chặn trang ngoài bản đồ nếu là google.com (bắt buộc có /maps, /search, /place...).
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=400,
            detail="URL không được để trống. Vui lòng cung cấp liên kết Google Maps hợp lệ."
        )

    raw_url = url.strip()
    if len(raw_url) > 4096:
        raise HTTPException(
            status_code=400,
            detail="URL vượt quá độ dài tối đa cho phép (4096 ký tự)."
        )

    try:
        parsed = urlparse(raw_url)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Cấu trúc URL không hợp lệ."
        )

    # 1. Scheme check
    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="Giao thức không hợp lệ. Chỉ chấp nhận liên kết http:// hoặc https://"
        )

    # 2. Chặn userinfo (tránh user:pass@attacker.com)
    if parsed.username or parsed.password:
        raise HTTPException(
            status_code=400,
            detail="URL không được chứa thông tin xác thực tài khoản (username/password)."
        )

    # 3. Port check
    if parsed.port not in (None, 80, 443):
        raise HTTPException(
            status_code=400,
            detail="Cổng truy cập không hợp lệ. Chỉ chấp nhận cổng HTTP/HTTPS tiêu chuẩn."
        )

    # 4. Hostname check
    hostname = (parsed.hostname or "").lower().strip()
    if not hostname:
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ. Thiếu tên miền máy chủ."
        )

    if re.search(r"[^\w\.-]", hostname):
        raise HTTPException(
            status_code=400,
            detail="Tên miền chứa ký tự không hợp lệ."
        )

    # Chặn direct IP (IPv4 / IPv6)
    try:
        ipaddress.ip_address(hostname)
        raise HTTPException(
            status_code=400,
            detail="Hệ thống không chấp nhận truy cập trực tiếp qua địa chỉ IP máy chủ."
        )
    except ValueError:
        pass

    # Kiểm tra domain Google Maps
    is_valid_domain = False
    valid_domain_suffixes = (
        "google.com",
        "google.com.vn",
        "google.vn",
        "goo.gl",
    )
    if any(hostname == d or hostname.endswith("." + d) for d in valid_domain_suffixes):
        is_valid_domain = True

    if not is_valid_domain:
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ. Hệ thống chỉ chấp nhận liên kết từ Google Maps (google.com/maps, maps.google.com, goo.gl/maps, maps.app.goo.gl)."
        )

    # 5. Anti-SSRF: Phân giải DNS và kiểm tra địa chỉ IP đích
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for res in addr_info:
            ip_str = res[4][0]
            resolved_ip = ipaddress.ip_address(ip_str)
            if (
                resolved_ip.is_private
                or resolved_ip.is_loopback
                or resolved_ip.is_link_local
                or resolved_ip.is_multicast
                or resolved_ip.is_reserved
                or resolved_ip.is_unspecified
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Địa chỉ mạng của máy chủ mục tiêu bị chặn vì lý do an toàn (Anti-SSRF)."
                )
    except HTTPException:
        raise
    except socket.gaierror:
        raise HTTPException(
            status_code=400,
            detail="Không thể phân giải tên miền Google Maps. Vui lòng kiểm tra lại liên kết."
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi kiểm tra an toàn URL: {str(e)}"
        )

    # 6. Kiểm tra cấu trúc path đối với google.com
    path = parsed.path.lower()
    if ("google.com" in hostname or "google.vn" in hostname) and not hostname.startswith("maps.") and not hostname.startswith("maps.app."):
        if not any(path.startswith(p) for p in ("/maps", "/search", "/place")):
            raise HTTPException(
                status_code=400,
                detail="Đường dẫn Google không đúng định dạng bản đồ Google Maps. Hệ thống chỉ hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps (ví dụ: https://www.google.com/maps/... hoặc https://www.foody.vn/...)."
            )

    return raw_url


def save_and_analyze_google_maps_reviews(
    db,
    crawl_data: Dict[str, Any],
    req_url: Optional[str] = None,
    restaurant: Optional[DBRestaurant] = None,
    default_name: str = "Quán Google Maps"
) -> Tuple[DBRestaurant, int, int]:
    """
    Lưu dữ liệu cào Google Maps và chạy phân tích ABSA:
    1. Xác định hoặc tạo DBRestaurant qua resolve_or_create_restaurant nếu chưa có.
    2. Lọc spam, kiểm tra trùng lặp (SHA-256 fingerprint), tạo DBReview với source='GoogleMaps'.
    3. Phân tích cảm xúc 5 khía cạnh bằng Gemini ABSA (analyze_batch).
    4. Cập nhật số lượng đánh giá và độ tin cậy mẫu (update_restaurant_counts_and_credibility).
    5. Invalidate cache và trả về (restaurant, new_reviews_count, duplicate_count).
    """
    if restaurant is None:
        rest_name = crawl_data.get("restaurant_name") or default_name
        restaurant, _ = resolve_or_create_restaurant(
            db_session=db,
            name=rest_name,
            address=crawl_data.get("address"),
            google_maps_url=crawl_data.get("google_maps_url") or req_url,
            google_place_id=crawl_data.get("google_place_id")
        )
    else:
        if crawl_data.get("google_maps_url") and not restaurant.google_maps_url:
            restaurant.google_maps_url = crawl_data["google_maps_url"]
        elif req_url and not restaurant.google_maps_url:
            restaurant.google_maps_url = req_url
        if crawl_data.get("google_place_id") and not restaurant.google_place_id:
            restaurant.google_place_id = crawl_data["google_place_id"]
        if crawl_data.get("address") and not restaurant.address:
            restaurant.address = crawl_data["address"]
        db.flush()

    raw_reviews = crawl_data.get("reviews", [])
    new_reviews_count = 0
    duplicate_count = 0
    new_reviews_to_analyze = []

    for rv in raw_reviews:
        text = (rv.get("text") or "").strip()
        if not text or len(text) < 3:
            continue

        # Chống chuỗi mẫu bất thường
        if any("{{" in f or "}}" in f for f in [text, rv.get("author", "")]):
            continue

        # Kiểm tra lọc spam
        f_res = classify_review(
            text,
            author=rv.get("author"),
            restaurant_name=restaurant.name
        )
        if f_res.get("is_spam"):
            continue

        # Kiểm tra trùng lặp (Deduplication)
        if is_duplicate_review(db, restaurant.id, text):
            duplicate_count += 1
            continue

        fp = compute_review_fingerprint(text)

        rv_rating = rv.get("rating")
        if rv_rating is not None:
            try:
                rv_rating = float(rv_rating)
            except (ValueError, TypeError):
                rv_rating = 5.0
        else:
            rv_rating = 5.0

        new_rev = DBReview(
            restaurant_id=restaurant.id,
            author=(rv.get("author") or "Người dùng Google").strip(),
            rating=rv_rating,
            text=text,
            review_date=(rv.get("review_date") or "Gần đây").strip(),
            is_analyzed=0,
            is_spam=0,
            spam_score=f_res.get("spam_score", 0.0),
            spam_category=f_res.get("spam_category", "normal"),
            spam_reason=json.dumps(f_res.get("spam_reason", [])),
            fingerprint=fp,
            source="GoogleMaps",
            google_review_id=rv.get("google_review_id"),
            created_at=datetime.utcnow()
        )
        db.add(new_rev)
        db.flush()
        new_reviews_count += 1

        if f_res.get("spam_category") != "low_information":
            new_reviews_to_analyze.append((new_rev.id, text))
        else:
            new_rev.is_analyzed = 1

    # Chạy phân tích Gemini ABSA nếu có review mới
    if new_reviews_to_analyze:
        try:
            payload = [{"id": rid, "text": txt} for rid, txt in new_reviews_to_analyze]
            results = gemini_analyzer.analyze_batch(payload)
            for res in results:
                rid = res.get("review_id")
                if not res.get("_analysis_succeeded", False) and not res.get("aspects"):
                    continue
                for aspect_item in res.get("aspects", []):
                    db_analysis = DBAnalysis(
                        review_id=rid,
                        aspect=aspect_item.get("aspect", "món ăn"),
                        sentiment=aspect_item.get("sentiment", "neutral"),
                        confidence=aspect_item.get("confidence", 0.8),
                        is_urgent=1 if res.get("is_urgent", False) else 0
                    )
                    db.add(db_analysis)
                r_obj = db.query(DBReview).filter_by(id=rid).first()
                if r_obj:
                    r_obj.is_analyzed = 1
        except Exception as e:
            print(f"[Warning] ABSA Analysis encountered an issue: {e}")

    # Cập nhật số đếm và chỉ số tin cậy
    update_restaurant_counts_and_credibility(db, restaurant.id)
    db.commit()
    db.refresh(restaurant)

    invalidate_restaurants_cache()

    return restaurant, new_reviews_count, duplicate_count


@router.post("/analyze-url")
def analyze_restaurant_url(req: AnalyzeRequest):
    """
    Tiếp nhận URL quán ăn mới từ người dùng (Foody hoặc Google Maps):
    1. Nhận diện loại URL (Foody vs Google Maps).
    2. Nếu Foody: Xác thực SSRF, cào dữ liệu qua Fast HTTP / Selenium, lưu DB & phân tích Gemini ABSA.
    3. Nếu Google Maps: Xác thực SSRF, cào dữ liệu qua Playwright, lưu DB với source='GoogleMaps' & phân tích Gemini ABSA.
    4. Trả về cấu trúc đồng nhất: {"success": True, "message": ..., "restaurant": formatted}.
    """
    if not req.url or not isinstance(req.url, str) or not req.url.strip():
        raise HTTPException(
            status_code=400,
            detail="URL không được để trống. Vui lòng cung cấp liên kết Foody hoặc Google Maps."
        )

    raw_url = req.url.strip()
    try:
        parsed = urlparse(raw_url)
        hostname = (parsed.hostname or "").lower().strip()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Cấu trúc URL không hợp lệ."
        )

    is_foody = hostname == "foody.vn" or hostname.endswith(".foody.vn")
    gmaps_suffixes = ("google.com", "google.com.vn", "google.vn", "goo.gl")
    is_gmaps = any(hostname == d or hostname.endswith("." + d) for d in gmaps_suffixes)

    if not is_foody and not is_gmaps:
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps (Ví dụ: https://www.foody.vn/... hoặc https://www.google.com/maps/place/...)"
        )

    if is_foody:
        url = validate_foody_url(raw_url)
        try:
            print(f"=== [API] Bắt đầu cào URL Foody: {url} ===")
            known_fps = set()
            with get_session() as db:
                exist_rest = db.query(DBRestaurant).filter_by(foody_url=url).first()
                if exist_rest:
                    known_fps = get_restaurant_existing_fingerprints(db, exist_rest.id)

            with CRAWLER_SEMAPHORE:
                crawl_data = foody_crawler.crawl_restaurant(
                    url,
                    max_reviews=req.max_reviews or 30,
                    headless=True,
                    known_fingerprints=known_fps,
                    max_consecutive_existing=3
                )

            if not crawl_data or not crawl_data.get("name") or crawl_data.get("not_found"):
                raise HTTPException(
                    status_code=400,
                    detail="Không thể trích xuất thông tin quán ăn từ link Foody này. Vui lòng đảm bảo link quán còn hoạt động."
                )

            with get_session() as db:
                restaurant = save_and_analyze_reviews(
                    db=db,
                    crawl_data=crawl_data,
                    foody_url=url,
                    default_name="Quán mới"
                )
                invalidate_restaurants_cache()
                formatted = format_restaurant_full(restaurant, db)
                rev_count = len(crawl_data.get('reviews', []))
                if rev_count > 0:
                    msg = f"Đã cào và phân tích thành công {rev_count} đánh giá thực tế!"
                else:
                    msg = f"Quán '{restaurant.name}' hiện chưa có bài đánh giá nào trên Foody. Hệ thống đã lưu trữ thông tin quán thành công!"

                return {
                    "success": True,
                    "message": msg,
                    "restaurant": formatted
                }
        except HTTPException:
            raise
        except Exception as e:
            print(f"[API Error] Lỗi khi xử lý link Foody: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi khi cào hoặc phân tích dữ liệu: {str(e)}")

    else:
        url = validate_google_maps_url(raw_url)
        try:
            print(f"=== [API] Bắt đầu cào URL Google Maps: {url} ===")
            max_revs = req.max_reviews or 30
            if max_revs < 1:
                max_revs = 1
            elif max_revs > 100:
                max_revs = 100

            with CRAWLER_SEMAPHORE:
                crawl_data = google_maps_crawler.crawl_google_maps_reviews(url=url, max_reviews=max_revs, headless=True)

            if not crawl_data or not crawl_data.get("success"):
                err_msg = crawl_data.get("error") if crawl_data else "Không nhận được phản hồi từ Google Maps."
                raise HTTPException(
                    status_code=400,
                    detail=f"Thu thập dữ liệu Google Maps thất bại: {err_msg}"
                )

            with get_session() as db:
                restaurant, new_count, dup_count = save_and_analyze_google_maps_reviews(
                    db=db,
                    crawl_data=crawl_data,
                    req_url=url,
                    default_name="Quán mới"
                )
                formatted = format_restaurant_full(restaurant, db)
                rev_count = len(crawl_data.get('reviews', []))
                if rev_count > 0:
                    msg = f"Đã cào và phân tích thành công {rev_count} đánh giá thực tế từ Google Maps!"
                else:
                    msg = f"Quán '{restaurant.name}' hiện chưa có bài đánh giá nào trên Google Maps. Hệ thống đã lưu trữ thông tin quán thành công!"

                return {
                    "success": True,
                    "message": msg,
                    "restaurant": formatted
                }
        except HTTPException:
            raise
        except Exception as e:
            print(f"[API Error] Lỗi khi xử lý link Google Maps: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi khi cào hoặc phân tích dữ liệu: {str(e)}")


analyze_foody_url = analyze_restaurant_url


import re

FOODY_CITY_SLUG_MAP = {
    "thua thien hue": "hue",
    "thua-thien-hue": "hue",
    "hue": "hue",
    "tp. ho chi minh": "ho-chi-minh",
    "ho chi minh": "ho-chi-minh",
    "sai gon": "ho-chi-minh",
    "hcm": "ho-chi-minh",
    "ha noi": "ha-noi",
    "hn": "ha-noi",
    "da nang": "da-nang",
    "hai phong": "hai-phong",
    "can tho": "can-tho",
    "khanh hoa": "khanh-hoa",
    "nha trang": "khanh-hoa",
    "lam dong": "lam-dong",
    "da lat": "lam-dong",
    "ba ria - vung tau": "vung-tau",
    "ba ria vung tau": "vung-tau",
    "vung tau": "vung-tau",
    "quang nam": "quang-nam",
    "hoi an": "quang-nam",
    "kien giang": "kien-giang",
    "phu quoc": "kien-giang",
    "quang ninh": "quang-ninh",
    "ha long": "quang-ninh",
    "binh duong": "binh-duong",
    "dong nai": "dong-nai",
    "gia lai": "gia-lai",
    "pleiku": "gia-lai",
    "dak lak": "dak-lak",
    "buon ma thuot": "dak-lak",
    "phu yen": "phu-yen",
    "tuy hoa": "phu-yen",
    "binh dinh": "binh-dinh",
    "quy nhon": "binh-dinh",
}


def get_foody_city_slug(city_input: str) -> str:
    """Ánh xạ chuẩn xác tên thành phố sang slug URL hợp lệ trên Foody.vn"""
    if not city_input:
        return "da-nang"
    norm = remove_accents(city_input.lower().strip())
    if norm in FOODY_CITY_SLUG_MAP:
        return FOODY_CITY_SLUG_MAP[norm]
    for k, v in FOODY_CITY_SLUG_MAP.items():
        if k in norm or norm in k:
            return v
    return re.sub(r'[^a-z0-9]+', '-', norm).strip('-')


@router.post("/search-and-crawl")
def search_and_crawl_restaurant(req: SearchAndCrawlRequest):
    """
    Quy trình tìm kiếm và cào dữ liệu thông minh theo từ khóa và nguồn:
    1. Nhận từ khóa tìm kiếm (ví dụ: 'bánh tráng', 'bún huế') và tham số source ('auto' | 'foody' | 'google_maps').
    2. Bước 1: Tra cứu cơ sở dữ liệu SQLite trước: nếu quán đã có trong DB, trả về ngay tức thì (< 20ms).
    3. Bước 2:
       - Nếu source == 'google_maps': Tìm kiếm & cào trực tiếp qua Google Maps Playwright Crawler.
       - Nếu source == 'foody': Tìm kiếm trên Foody.vn và cào qua Selenium.
       - Nếu source == 'auto': Tìm kiếm trên Foody.vn trước. Nếu không có kết quả hoặc 0 review, tự động fallback sang Google Maps.
    4. Lưu kết quả, lọc spam, chạy Gemini ABSA và trả về dữ liệu chuẩn hóa.
    """
    try:
        q = req.query.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Vui lòng nhập từ khóa tìm kiếm.")

        # Tự động nhận diện nếu người dùng dán URL thay vì nhập từ khóa tìm kiếm
        lower_q = q.lower()
        if q.startswith("http://") or q.startswith("https://") or "foody.vn" in lower_q or "google.com/maps" in lower_q or "goo.gl" in lower_q:
            target_url = q if (q.startswith("http://") or q.startswith("https://")) else f"https://{q}"
            print(f"-> [Search & Crawl] Nhận diện query là URL ('{target_url}'). Chuyển hướng xử lý qua analyze_restaurant_url...")
            result = analyze_restaurant_url(AnalyzeRequest(url=target_url, max_reviews=req.max_reviews or 30))
            if isinstance(result, dict) and "source" not in result:
                result["source"] = "crawled_and_analyzed"
            return result

        norm_q = remove_accents(q)
        from routers.restaurants import extract_city_from_query
        from services.bi_service import detect_city

        # 1. Xác định thành phố mục tiêu và từ khóa món ăn:
        # Nếu người dùng đã chủ động chọn thành phố trong Modal (req.city), ưu tiên tuyệt đối lựa chọn đó.
        user_selected_city = req.city.strip() if req.city and req.city not in ["Tất cả địa điểm", "All Cities", "all", ""] else None
        detected_city, rem_q = extract_city_from_query(q)

        effective_city = user_selected_city or detected_city or ""
        city_slug = get_foody_city_slug(effective_city) if effective_city else "da-nang"
        norm_eff_city = remove_accents(effective_city).replace("-", " ").strip() if effective_city else ""

        search_keyword = rem_q.strip() if rem_q.strip() else q
        norm_kw = remove_accents(search_keyword)
        tokens = [t for t in norm_kw.split() if len(t) >= 2]

        source = (req.source or "auto").strip().lower().replace("-", "_")
        if source not in ("auto", "foody", "google_maps"):
            source = "auto"

        # Bước 1: Kiểm tra trong cơ sở dữ liệu SQLite trước
        with get_session() as db:
            all_res = db.query(DBRestaurant).all()
            matching_res = None

            # Ưu tiên 1: Khớp nguyên cụm từ trong tên quán hoặc URL Foody / Google Maps
            for r in all_res:
                if norm_eff_city:
                    r_city = detect_city(r.address or "", foody_url=r.foody_url, restaurant_name=r.name)
                    r_norm_city = remove_accents(r_city).replace("-", " ").strip()
                    if norm_eff_city != r_norm_city and norm_eff_city not in r_norm_city:
                        continue
                r_norm = remove_accents(r.name)
                foody_slug = r.foody_url.split("/")[-1] if r.foody_url else ""
                gmaps_slug = r.google_maps_url.split("/")[-1] if r.google_maps_url else ""
                if norm_kw in r_norm or (foody_slug and norm_kw in remove_accents(foody_slug)) or (gmaps_slug and norm_kw in remove_accents(gmaps_slug)):
                    matching_res = r
                    break

            # Ưu tiên 2: Khớp tất cả các token từ khóa trong tên hoặc địa chỉ
            if not matching_res and len(tokens) >= 2:
                for r in all_res:
                    if norm_eff_city:
                        r_city = detect_city(r.address or "", foody_url=r.foody_url, restaurant_name=r.name)
                        r_norm_city = remove_accents(r_city).replace("-", " ").strip()
                        if norm_eff_city != r_norm_city and norm_eff_city not in r_norm_city:
                            continue
                    r_full = remove_accents(f"{r.name} {r.address or ''}")
                    if all(t in r_full for t in tokens):
                        matching_res = r
                        break

            if matching_res:
                print(f"-> [Search & Crawl] Đã tìm thấy quán '{matching_res.name}' trong cơ sở dữ liệu SQLite!")
                formatted = format_restaurant_full(matching_res, db)
                return {
                    "success": True,
                    "source": "database",
                    "message": f"Tìm thấy quán '{matching_res.name}' đã được phân tích sẵn trong cơ sở dữ liệu!",
                    "restaurant": formatted
                }

        # Bước 2: Chưa có trong DB -> Tùy theo source (google_maps | foody | auto)
        def crawl_gmaps():
            gmap_city = effective_city if effective_city else "Đà Nẵng"
            print(f"-> [Search & Crawl] Bắt đầu tìm kiếm & cào Google Maps cho từ khóa '{search_keyword}' (thành phố: {gmap_city})...")
            with CRAWLER_SEMAPHORE:
                gmaps_data = google_maps_crawler.search_and_crawl_google_maps(
                    query=search_keyword,
                    city=gmap_city,
                    max_reviews=req.max_reviews or 25,
                    headless=True
                )
            if not gmaps_data or not gmaps_data.get("success") or not gmaps_data.get("restaurant_name"):
                err_detail = gmaps_data.get("error") if gmaps_data else "Không nhận được phản hồi từ Google Maps."
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy thông tin quán trên Google Maps với từ khóa '{search_keyword}' tại khu vực '{gmap_city}'. Chi tiết: {err_detail}"
                )
            with get_session() as db:
                restaurant, new_count, dup_count = save_and_analyze_google_maps_reviews(
                    db=db,
                    crawl_data=gmaps_data,
                    req_url=gmaps_data.get("google_maps_url"),
                    default_name=search_keyword
                )
                formatted = format_restaurant_full(restaurant, db)
                rev_count = len(gmaps_data.get("reviews", []))
                if rev_count > 0:
                    msg = f"Đã tổng hợp thành công nhận xét từ Google Maps của quán '{restaurant.name}' ({rev_count} nhận xét thực tế)!"
                else:
                    msg = f"Quán '{restaurant.name}' trên Google Maps hiện chưa có bài đánh giá nào. Đã lưu trữ thông tin quán thành công!"
                return {
                    "success": True,
                    "source": "crawled_and_analyzed",
                    "message": msg,
                    "restaurant": formatted
                }

        def crawl_foody():
            city = city_slug
            print(f"-> [Search & Crawl] Chưa có trong DB. Bắt đầu tìm kiếm từ khóa '{search_keyword}' trên Foody (thành phố: {city})...")
            foody_results = foody_crawler.search_foody_places(search_keyword, city_slug=city, max_results=5)

            if not foody_results:
                city_display = effective_city if effective_city else city
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy quán ăn nào trên Foody với từ khóa '{search_keyword}' tại khu vực '{city_display}'. Vui lòng thử từ khóa khác hoặc dán link Foody trực tiếp."
                )

            # Kiểm tra xem có quán nào trong kết quả Foody đã có trong SQLite chưa
            with get_session() as db:
                for place in foody_results:
                    existing_by_url = db.query(DBRestaurant).filter_by(foody_url=place["url"]).first()
                    if existing_by_url:
                        print(f"-> [Search & Crawl] URL '{place['url']}' đã tồn tại trong DB!")
                        formatted = format_restaurant_full(existing_by_url, db)
                        return {
                            "success": True,
                            "source": "database",
                            "message": f"Tìm thấy quán '{existing_by_url.name}' đã được phân tích trong hệ thống!",
                            "restaurant": formatted
                        }

            # Cào đánh giá thực tế từ Foody bằng Selenium (ưu tiên quán có đánh giá thật > 0)
            crawl_data = None
            target_place = None

            for place in foody_results:
                target_url = place["url"]
                print(f"-> [Search & Crawl] Bắt đầu cào thử đánh giá: '{place['name']}' ({target_url})")
                known_fps = set()
                with get_session() as db:
                    exist_p = db.query(DBRestaurant).filter_by(foody_url=target_url).first()
                    if exist_p:
                        known_fps = get_restaurant_existing_fingerprints(db, exist_p.id)

                data = foody_crawler.crawl_restaurant(
                    target_url,
                    max_reviews=req.max_reviews or 25,
                    headless=True,
                    known_fingerprints=known_fps,
                    max_consecutive_existing=3
                )

                if data and data.get("name") and data.get("reviews") and len(data["reviews"]) > 0:
                    crawl_data = data
                    target_place = place
                    break

            if not crawl_data or not crawl_data.get("name") or not crawl_data.get("reviews") or len(crawl_data["reviews"]) == 0:
                city_display = effective_city if effective_city else city
                raise HTTPException(
                    status_code=404,
                    detail=f"Các quán tìm thấy cho từ khóa '{search_keyword}' tại khu vực '{city_display}' chưa có bài nhận xét thực tế nào để tổng hợp. Vui lòng chọn quán khác hoặc dán liên kết quán có nhận xét."
                )

            with get_session() as db:
                restaurant = save_and_analyze_reviews(
                    db=db,
                    crawl_data=crawl_data,
                    foody_url=target_place["url"],
                    default_name=target_place["name"],
                    default_address=target_place.get("address", "")
                )
                invalidate_restaurants_cache()
                formatted = format_restaurant_full(restaurant, db)
                return {
                    "success": True,
                    "source": "crawled_and_analyzed",
                    "message": f"Đã tổng hợp thành công nhận xét thực tế của quán '{restaurant.name}' ({len(crawl_data.get('reviews', []))} nhận xét thực tế)!",
                    "restaurant": formatted
                }

        if source == "google_maps":
            return crawl_gmaps()
        elif source == "foody":
            return crawl_foody()
        else:  # "auto"
            try:
                return crawl_foody()
            except (HTTPException, Exception) as foody_err:
                print(f"-> [Search & Crawl] Foody không có kết quả hoặc gặp lỗi ({foody_err}). Tự động fallback sang Google Maps...")
                try:
                    return crawl_gmaps()
                except Exception as gmaps_err:
                    if isinstance(gmaps_err, HTTPException):
                        raise gmaps_err
                    city_display = effective_city if effective_city else "Đà Nẵng"
                    raise HTTPException(
                        status_code=404,
                        detail=f"Không tìm thấy quán ăn nào trên Foody lẫn Google Maps với từ khóa '{search_keyword}' tại khu vực '{city_display}'."
                    )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API Error] Lỗi khi tìm kiếm & cào dữ liệu: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Không thể tổng hợp nhận xét của quán: {str(e)}")


@router.post("/request-crawl")
def submit_crawl_request(req: QueueCrawlRequest):
    """
    Tiếp nhận yêu cầu cào quán từ người dùng khi tìm không có trong DB.
    Lưu vào hàng đợi crawl_requests (status='pending') để background pipeline cào tự động ngầm.
    Trả về ngay lập tức trong < 10ms.
    """
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Vui lòng nhập từ khóa hoặc tên quán.")

    with get_session() as db:
        existing_req = (
            db.query(DBCrawlRequest)
            .filter_by(query=q, status="pending")
            .first()
        )
        if existing_req:
            return {
                "success": True,
                "status": "already_queued",
                "message": f"Yêu cầu thu thập cho '{q}' đã có trong hàng đợi và sẽ được xử lý trong phiên quét tiếp theo!"
            }

        new_req = DBCrawlRequest(
            query=q,
            city=get_foody_city_slug(req.city) if req.city else "da-nang",
            status="pending",
            requested_at=datetime.utcnow()
        )
        db.add(new_req)
        db.commit()

        return {
            "success": True,
            "status": "queued",
            "message": f"Đã tiếp nhận yêu cầu thu thập quán '{q}'. Hệ thống sẽ tự động tổng hợp đánh giá trong đợt cập nhật tiếp theo!"
        }


@router.get("/crawl-requests")
def list_crawl_requests():
    """Lấy danh sách các yêu cầu cào gần đây từ người dùng"""
    with get_session() as db:
        requests = (
            db.query(DBCrawlRequest)
            .order_by(DBCrawlRequest.requested_at.desc())
            .limit(20)
            .all()
        )
        return [
            {
                "id": r.id,
                "query": r.query,
                "city": r.city,
                "status": r.status,
                "note": r.note,
                "requested_at": r.requested_at.isoformat() if r.requested_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in requests
        ]


@router.post("/crawler/google-maps")
@router.post("/google-maps")
def crawl_google_maps_endpoint(req: CrawlGoogleMapsRequest):
    """
    Endpoint thu thập dữ liệu và đánh giá từ Google Maps:
    1. Xác thực tham số và URL (Anti-SSRF, DNS Rebinding).
    2. Khớp hoặc tìm kiếm nhà hàng hiện có qua entity_resolution.
    3. Cào đánh giá thực tế bằng Playwright Chromium Headless.
    4. Lọc spam (review_filter) và khử trùng lặp qua SHA-256 fingerprint (is_duplicate_review).
    5. Chạy phân tích Aspect-Based Sentiment với Gemini AI (5 khía cạnh).
    6. Lưu vào SQLite database với source='GoogleMaps'.
    7. Cập nhật review_count, foody_review_count, google_review_count, credibility_score.
    8. Invalidate in-memory cache và trả về kết quả thống kê.
    """
    start_time = time.time()

    req_url = req.googleMapsUrl.strip() if req.googleMapsUrl else None
    req_query = req.queryName.strip() if req.queryName else None
    req_rest_id = req.restaurantId.strip() if req.restaurantId else None
    max_revs = req.maxReviews or 30
    if max_revs < 1:
        max_revs = 1
    elif max_revs > 100:
        max_revs = 100

    if not req_url and not req_query and not req_rest_id:
        raise HTTPException(
            status_code=400,
            detail="Vui lòng cung cấp link Google Maps (googleMapsUrl), restaurantId hoặc tên quán (queryName)."
        )

    if req_url:
        req_url = validate_google_maps_url(req_url)

    target_rest_id = None
    target_rest_name = None
    target_rest_addr = None
    target_rest_city = None
    target_rest_gmap_url = None

    with get_session() as db:
        if req_rest_id:
            from routers.restaurants import find_restaurant
            found_rest = find_restaurant(db, req_rest_id)
            if not found_rest:
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy nhà hàng với mã '{req_rest_id}' trong hệ thống."
                )
            target_rest_id = found_rest.id
            target_rest_name = found_rest.name
            target_rest_addr = found_rest.address
            target_rest_city = found_rest.city
            target_rest_gmap_url = found_rest.google_maps_url

    # Tiền kiểm tra URL (Fast Pre-check Entity Mismatch):
    # Nếu URL chứa trực tiếp tên địa điểm trong slug (/place/...) và tên thương hiệu rõ ràng thuộc quán khác, chặn ngay
    if req_url and target_rest_name:
        import urllib.parse
        from services.entity_resolution import validate_restaurant_match
        m = re.search(r"/place/([^/@?]+)", req_url)
        if m:
            slug_name = urllib.parse.unquote_plus(m.group(1)).replace("+", " ").strip()
            # Bỏ qua nếu slug chỉ là tọa độ hoặc mã số
            if slug_name and not re.match(r"^[\d\.,\s\+\-]+$", slug_name):
                pre_match, pre_reason, _ = validate_restaurant_match(
                    current_name=target_rest_name,
                    candidate_name=slug_name,
                    current_addr=target_rest_addr,
                    candidate_addr=""
                )
                if not pre_match and "Thương hiệu khác biệt" in pre_reason:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Đường dẫn Google Maps bạn cung cấp thuộc về quán '{slug_name}', không khớp với quán đang bổ sung là '{target_rest_name}' ({pre_reason}). "
                            f"Hệ thống đã chặn quá trình lưu để tránh làm sai lệch dữ liệu của quán. "
                            f"Nếu bạn muốn phân tích riêng quán này, vui lòng quay lại Trang chủ để dán link."
                        )
                    )

    # Thực hiện cào dữ liệu qua Playwright (Giới hạn tối đa 2 tác vụ crawl đồng thời [SEC-04])
    crawl_data = None
    try:
        with CRAWLER_SEMAPHORE:
            if req_url:
                crawl_data = google_maps_crawler.crawl_google_maps_reviews(url=req_url, max_reviews=max_revs, headless=True)
            elif req_query:
                crawl_data = google_maps_crawler.search_and_crawl_google_maps(query=req_query, city="Đà Nẵng", max_reviews=max_revs, headless=True)
            elif target_rest_id:
                if target_rest_gmap_url:
                    valid_u = validate_google_maps_url(target_rest_gmap_url)
                    crawl_data = google_maps_crawler.crawl_google_maps_reviews(url=valid_u, max_reviews=max_revs, headless=True)
                else:
                    search_q = f"{target_rest_name} {target_rest_addr or ''}".strip()
                    crawl_data = google_maps_crawler.search_and_crawl_google_maps(
                        query=search_q,
                        city=target_rest_city or "Đà Nẵng",
                        max_reviews=max_revs,
                        headless=True
                    )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API Error] Lỗi crawler Google Maps: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi thực thi crawler Google Maps: {str(e)}"
        )

    if not crawl_data or not crawl_data.get("success"):
        err_msg = crawl_data.get("error") if crawl_data else "Không nhận được phản hồi từ Google Maps."
        raise HTTPException(
            status_code=400,
            detail=f"Thu thập dữ liệu Google Maps thất bại: {err_msg}"
        )

    with get_session() as db:
        restaurant = None
        if target_rest_id:
            restaurant = db.query(DBRestaurant).filter_by(id=target_rest_id).first()
            if not restaurant:
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy nhà hàng với mã '{req_rest_id}' trong hệ thống."
                )

            # Phòng vệ Lệch Thực Thể Nghiêm Ngặt (Strict Entity Mismatch Guard):
            # Ngăn chặn tình trạng người dùng dán nhầm link quán khác (VD: đang ở Pizza Take Away dán link King Pizza)
            from services.entity_resolution import validate_restaurant_match

            crawled_name = (crawl_data.get("restaurant_name") or "").strip()
            crawled_addr = (crawl_data.get("address") or "").strip()

            # Nếu tên bị thiếu do DOM rendering, thử lấy từ slug URL Google Maps
            if not crawled_name and req_url:
                import urllib.parse
                m = re.search(r"/place/([^/@]+)", req_url)
                if m:
                    crawled_name = urllib.parse.unquote_plus(m.group(1)).replace("+", " ").strip()

            candidate_label = crawled_name or req_query or "Quán Google Maps"
            is_valid_match, mismatch_reason, match_score = validate_restaurant_match(
                current_name=restaurant.name,
                candidate_name=candidate_label,
                current_addr=restaurant.address,
                candidate_addr=crawled_addr
            )

            if not is_valid_match:
                print(
                    f"[Entity Mismatch Blocked] Quán mục tiêu: '{restaurant.name}' ({restaurant.address}) "
                    f"VS Quán cào từ Google Maps: '{candidate_label}' ({crawled_addr}) - Reason: {mismatch_reason} - Score: {match_score}"
                )
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Liên kết Google Maps thuộc về quán '{candidate_label}', không khớp với quán bạn đang bổ sung đánh giá là '{restaurant.name}' ({mismatch_reason}). "
                        f"Hệ thống đã chặn quá trình lưu để tránh làm sai lệch dữ liệu của quán. "
                        f"Nếu bạn muốn phân tích riêng quán này, vui lòng quay lại Trang chủ để dán link."
                    )
                )

            if crawl_data.get("google_maps_url") and not restaurant.google_maps_url:
                restaurant.google_maps_url = crawl_data["google_maps_url"]
            elif req_url and not restaurant.google_maps_url:
                restaurant.google_maps_url = req_url
            if crawl_data.get("google_place_id") and not restaurant.google_place_id:
                restaurant.google_place_id = crawl_data["google_place_id"]
            if crawl_data.get("address") and not restaurant.address:
                restaurant.address = crawl_data["address"]
            db.flush()
        restaurant, new_reviews_count, duplicate_count = save_and_analyze_google_maps_reviews(
            db=db,
            crawl_data=crawl_data,
            req_url=req_url,
            restaurant=restaurant,
            default_name=req_query or "Quán Google Maps"
        )

        elapsed = time.time() - start_time
        total_count = restaurant.review_count or db.query(DBReview).filter_by(restaurant_id=restaurant.id).count()

        return {
            "success": True,
            "restaurantId": str(restaurant.id),
            "restaurantName": restaurant.name,
            "source": "google_maps",
            "newReviewsCount": new_reviews_count,
            "duplicateReviewsSkipped": duplicate_count,
            "totalReviewsNow": total_count,
            "credibilityScore": restaurant.credibility_score if restaurant.credibility_score is not None else 1.0,
            "elapsedSeconds": round(elapsed, 2),
            "restaurant": format_restaurant_full(restaurant, db)
        }
