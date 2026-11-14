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
    default_name: str = "Quán Google Maps",
    min_viable_reviews: int = 0
) -> Tuple[Optional[DBRestaurant], int, int]:
    """
    Lưu dữ liệu cào Google Maps và chạy phân tích ABSA:
    1. Kiểm tra số lượng đánh giá hợp lệ. Nếu là quán mới (restaurant is None) và số đánh giá < min_viable_reviews,
       tuyệt đối không tạo DBRestaurant trong DB để tránh thực thể rác.
    2. Xác định hoặc tạo DBRestaurant qua resolve_or_create_restaurant nếu hợp lệ.
    3. Lọc spam, kiểm tra trùng lặp (SHA-256 fingerprint), tạo DBReview với source='GoogleMaps'.
    4. Phân tích cảm xúc 5 khía cạnh bằng Gemini ABSA (analyze_batch).
    5. Cập nhật số lượng đánh giá và độ tin cậy mẫu (update_restaurant_counts_and_credibility).
    6. Invalidate cache và trả về (restaurant, new_reviews_count, duplicate_count).
    """
    raw_reviews = crawl_data.get("reviews", [])
    valid_raw_reviews = []
    for rv in raw_reviews:
        text = (rv.get("text") or "").strip()
        if not text or len(text) < 5:
            continue
        # Chống chuỗi mẫu bất thường
        if any("{{" in f or "}}" in f for f in [text, rv.get("author", "")]):
            continue
        valid_raw_reviews.append(rv)

    # Chặn thực thể rác: Nếu là quán mới và không có đủ đánh giá hợp lệ -> Không lưu vào DB
    if restaurant is None and len(valid_raw_reviews) < min_viable_reviews:
        place_name = crawl_data.get("restaurant_name") or default_name
        print(f"⚠️ [Crawler Guard] Bỏ qua quán '{place_name}': Chỉ có {len(valid_raw_reviews)} đánh giá hợp lệ trên Google Maps (yêu cầu tối thiểu >= {min_viable_reviews}). Không lưu thực thể rác vào DB.")
        return None, 0, 0

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

    new_reviews_count = 0
    duplicate_count = 0
    new_reviews_to_analyze = []

    for rv in valid_raw_reviews:
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
                if not restaurant:
                    raise HTTPException(
                        status_code=400,
                        detail="Quán ăn này không có bài đánh giá thực tế nào từ thực khách trên Foody. Hệ thống từ chối lưu thực thể rác vào cơ sở dữ liệu."
                    )
                invalidate_restaurants_cache()
                formatted = format_restaurant_full(restaurant, db)
                rev_count = len(crawl_data.get('reviews', []))
                msg = f"Đã cào và phân tích thành công {rev_count} đánh giá thực tế!"

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
                if not restaurant:
                    raise HTTPException(
                        status_code=400,
                        detail="Quán ăn này không có bài đánh giá thực tế nào từ thực khách trên Google Maps. Hệ thống từ chối lưu thực thể rác vào cơ sở dữ liệu."
                    )
                formatted = format_restaurant_full(restaurant, db)
                rev_count = len(crawl_data.get('reviews', []))
                msg = f"Đã cào và phân tích thành công {rev_count} đánh giá thực tế từ Google Maps!"

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

GOOGLE_MAPS_CITY_LOCATION_MAP = {
    # 16 đô thị trực thuộc & điểm du lịch nổi tiếng
    "hoi an": "Hội An, Quảng Nam",
    "hoi-an": "Hội An, Quảng Nam",
    "tam ky": "Tam Kỳ, Quảng Nam",
    "tam-ky": "Tam Kỳ, Quảng Nam",
    "nha trang": "Nha Trang, Khánh Hòa",
    "nha-trang": "Nha Trang, Khánh Hòa",
    "cam ranh": "Cam Ranh, Khánh Hòa",
    "cam-ranh": "Cam Ranh, Khánh Hòa",
    "da lat": "Đà Lạt, Lâm Đồng",
    "da-lat": "Đà Lạt, Lâm Đồng",
    "bao loc": "Bảo Lộc, Lâm Đồng",
    "bao-loc": "Bảo Lộc, Lâm Đồng",
    "phu quoc": "Phú Quốc, Kiên Giang",
    "phu-quoc": "Phú Quốc, Kiên Giang",
    "rach gia": "Rạch Giá, Kiên Giang",
    "rach-gia": "Rạch Giá, Kiên Giang",
    "vung tau": "Vũng Tàu, Bà Rịa - Vũng Tàu",
    "vung-tau": "Vũng Tàu, Bà Rịa - Vũng Tàu",
    "con dao": "Côn Đảo, Bà Rịa - Vũng Tàu",
    "con-dao": "Côn Đảo, Bà Rịa - Vũng Tàu",
    "ha long": "Hạ Long, Quảng Ninh",
    "ha-long": "Hạ Long, Quảng Ninh",
    "cam pha": "Cẩm Phả, Quảng Ninh",
    "cam-pha": "Cẩm Phả, Quảng Ninh",
    "phan thiet": "Phan Thiết, Bình Thuận",
    "phan-thiet": "Phan Thiết, Bình Thuận",
    "mui ne": "Mũi Né, Bình Thuận",
    "mui-ne": "Mũi Né, Bình Thuận",
    "sa pa": "Sa Pa, Lào Cai",
    "sapa": "Sa Pa, Lào Cai",
    "sa-pa": "Sa Pa, Lào Cai",
    "buon ma thuot": "Buôn Ma Thuột, Đắk Lắk",
    "buon-ma-thuot": "Buôn Ma Thuột, Đắk Lắk",

    # Các thành phố trực thuộc Trung ương & tỉnh thành chính
    "da nang": "Đà Nẵng",
    "da-nang": "Đà Nẵng",
    "ha noi": "Hà Nội",
    "ha-noi": "Hà Nội",
    "tp. ho chi minh": "TP. Hồ Chí Minh",
    "ho chi minh": "TP. Hồ Chí Minh",
    "ho-chi-minh": "TP. Hồ Chí Minh",
    "sai gon": "TP. Hồ Chí Minh",
    "hai phong": "Hải Phòng",
    "hai-phong": "Hải Phòng",
    "can tho": "Cần Thơ",
    "can-tho": "Cần Thơ",
    "hue": "Huế",
    "thua thien hue": "Thừa Thiên Huế",
    "thua-thien-hue": "Thừa Thiên Huế",
    "quang nam": "Quảng Nam",
    "quang-nam": "Quảng Nam",
    "khanh hoa": "Khánh Hòa",
    "khanh-hoa": "Khánh Hòa",
    "lam dong": "Lâm Đồng",
    "lam-dong": "Lâm Đồng",
    "kien giang": "Kiên Giang",
    "kien-giang": "Kiên Giang",
    "quang ninh": "Quảng Ninh",
    "quang-ninh": "Quảng Ninh",
    "binh thuan": "Bình Thuận",
    "binh-thuan": "Bình Thuận",
    "lao cai": "Lào Cai",
    "lao-cai": "Lào Cai",
    "dak lak": "Đắk Lắk",
    "dak-lak": "Đắk Lắk",
    "ba ria - vung tau": "Bà Rịa - Vũng Tàu",
    "ba ria vung tau": "Bà Rịa - Vũng Tàu",
    "ba-ria-vung-tau": "Bà Rịa - Vũng Tàu",
    "binh dinh": "Bình Định",
    "binh-dinh": "Bình Định",
    "quy nhon": "Quy Nhơn, Bình Định",
    "quy-nhon": "Quy Nhơn, Bình Định",
    "phu yen": "Phú Yên",
    "phu-yen": "Phú Yên",
    "tuy hoa": "Tuy Hòa, Phú Yên",
    "tuy-hoa": "Tuy Hòa, Phú Yên",
    "gia lai": "Gia Lai",
    "gia-lai": "Gia Lai",
    "pleiku": "Pleiku, Gia Lai",
    "dong nai": "Đồng Nai",
    "dong-nai": "Đồng Nai",
    "binh duong": "Bình Dương",
    "binh-duong": "Bình Dương",
}


def get_google_maps_location(city_input: str) -> str:
    """Ánh xạ city input (slug hoặc tên) sang địa danh chi tiết cho tìm kiếm Google Maps."""
    if not city_input:
        return ""
    raw = city_input.lower().strip()
    if raw in GOOGLE_MAPS_CITY_LOCATION_MAP:
        return GOOGLE_MAPS_CITY_LOCATION_MAP[raw]
    norm = remove_accents(raw)
    if norm in GOOGLE_MAPS_CITY_LOCATION_MAP:
        return GOOGLE_MAPS_CITY_LOCATION_MAP[norm]
    norm_hyphen = norm.replace(" ", "-")
    norm_space = norm.replace("-", " ")
    if norm_hyphen in GOOGLE_MAPS_CITY_LOCATION_MAP:
        return GOOGLE_MAPS_CITY_LOCATION_MAP[norm_hyphen]
    if norm_space in GOOGLE_MAPS_CITY_LOCATION_MAP:
        return GOOGLE_MAPS_CITY_LOCATION_MAP[norm_space]
    return city_input


FOODY_CITY_SLUG_MAP = {
    "thua thien hue": "hue",
    "thua-thien-hue": "hue",
    "hue": "hue",
    "tp. ho chi minh": "ho-chi-minh",
    "ho chi minh": "ho-chi-minh",
    "ho-chi-minh": "ho-chi-minh",
    "sai gon": "ho-chi-minh",
    "hcm": "ho-chi-minh",
    "ha noi": "ha-noi",
    "ha-noi": "ha-noi",
    "hn": "ha-noi",
    "da nang": "da-nang",
    "da-nang": "da-nang",
    "hai phong": "hai-phong",
    "hai-phong": "hai-phong",
    "can tho": "can-tho",
    "can-tho": "can-tho",
    # Khánh Hòa / Nha Trang / Cam Ranh
    "khanh hoa": "khanh-hoa",
    "khanh-hoa": "khanh-hoa",
    "nha trang": "khanh-hoa",
    "nha-trang": "khanh-hoa",
    "cam ranh": "khanh-hoa",
    "cam-ranh": "khanh-hoa",
    # Lâm Đồng / Đà Lạt / Bảo Lộc
    "lam dong": "lam-dong",
    "lam-dong": "lam-dong",
    "da lat": "lam-dong",
    "da-lat": "lam-dong",
    "bao loc": "lam-dong",
    "bao-loc": "lam-dong",
    # Bà Rịa - Vũng Tàu / Vũng Tàu / Côn Đảo
    "ba ria - vung tau": "vung-tau",
    "ba ria vung tau": "vung-tau",
    "ba-ria-vung-tau": "vung-tau",
    "vung tau": "vung-tau",
    "vung-tau": "vung-tau",
    "con dao": "vung-tau",
    "con-dao": "vung-tau",
    # Quảng Nam / Hội An / Tam Kỳ
    "quang nam": "quang-nam",
    "quang-nam": "quang-nam",
    "hoi an": "quang-nam",
    "hoi-an": "quang-nam",
    "tam ky": "quang-nam",
    "tam-ky": "quang-nam",
    # Kiên Giang / Phú Quốc / Rạch Giá
    "kien giang": "kien-giang",
    "kien-giang": "kien-giang",
    "phu quoc": "kien-giang",
    "phu-quoc": "kien-giang",
    "rach gia": "kien-giang",
    "rach-gia": "kien-giang",
    # Quảng Ninh / Hạ Long / Cẩm Phả
    "quang ninh": "quang-ninh",
    "quang-ninh": "quang-ninh",
    "ha long": "quang-ninh",
    "ha-long": "quang-ninh",
    "cam pha": "quang-ninh",
    "cam-pha": "quang-ninh",
    # Bình Thuận / Phan Thiết / Mũi Né
    "binh thuan": "binh-thuan",
    "binh-thuan": "binh-thuan",
    "phan thiet": "binh-thuan",
    "phan-thiet": "binh-thuan",
    "mui ne": "binh-thuan",
    "mui-ne": "binh-thuan",
    # Lào Cai / Sa Pa
    "lao cai": "lao-cai",
    "lao-cai": "lao-cai",
    "sa pa": "lao-cai",
    "sapa": "lao-cai",
    "sa-pa": "lao-cai",
    # Đắk Lắk / Buôn Ma Thuột
    "dak lak": "dak-lak",
    "dak-lak": "dak-lak",
    "buon ma thuot": "dak-lak",
    "buon-ma-thuot": "dak-lak",
    # Khác
    "binh duong": "binh-duong",
    "binh-duong": "binh-duong",
    "dong nai": "dong-nai",
    "dong-nai": "dong-nai",
    "gia lai": "gia-lai",
    "gia-lai": "gia-lai",
    "pleiku": "gia-lai",
    "phu yen": "phu-yen",
    "phu-yen": "phu-yen",
    "tuy hoa": "phu-yen",
    "tuy-hoa": "phu-yen",
    "binh dinh": "binh-dinh",
    "binh-dinh": "binh-dinh",
    "quy nhon": "binh-dinh",
    "quy-nhon": "binh-dinh",
}


def get_foody_city_slug(city_input: str) -> str:
    """Ánh xạ chuẩn xác tên thành phố / slug sang slug URL hợp lệ trên Foody.vn"""
    if not city_input:
        return "da-nang"
    raw = city_input.lower().strip()
    if raw in FOODY_CITY_SLUG_MAP:
        return FOODY_CITY_SLUG_MAP[raw]
    norm = remove_accents(raw)
    if norm in FOODY_CITY_SLUG_MAP:
        return FOODY_CITY_SLUG_MAP[norm]
    norm_space = norm.replace("-", " ")
    if norm_space in FOODY_CITY_SLUG_MAP:
        return FOODY_CITY_SLUG_MAP[norm_space]
    for k, v in FOODY_CITY_SLUG_MAP.items():
        if k in norm or norm in k:
            return v
    return re.sub(r'[^a-z0-9]+', '-', norm).strip('-')


COMMON_FOOD_CATEGORIES = {
    # Mì, bún, phở, hủ tiếu, bánh canh
    "mi quang", "my quang", "pho", "bun bo", "bun bo hue", "bun cha", "bun dau", "bun rieu",
    "bun mam", "bun cha ca", "bun thit nuong", "bun ca", "bun moc", "bun oc", "bun quay",
    "hu tieu", "hu tieu nam vang", "banh canh", "banh canh cua", "banh canh ca loc",
    "cao lau", "mi vit tiem", "mi van than", "mi cay", "ramen", "udon",
    # Cơm, xôi, cháo
    "com tam", "com ga", "com nieu", "com rang", "com chien", "com binh dan", "com van phong",
    "xoi", "xoi ga", "xoi xeo", "chao", "chao long", "chao vit", "chao ech",
    # Bánh, nem, cuốn
    "banh mi", "banh mi pate", "banh mi chao", "banh xeo", "banh khot", "banh cuon",
    "banh beo", "banh nam", "banh loc", "banh trang", "banh trang cuon", "banh trang cuon thit heo",
    "banh trang kep", "banh trang tron", "nem lui", "nem chua ran", "ram cuon cai",
    # Lẩu, nướng, hải sản, quán nhậu, ốc
    "hai san", "lau", "lau nuong", "lau bo", "lau de", "lau nam", "lau thai", "lau ca", "lau mam",
    "nuong", "bbq", "do nuong", "quan nhau", "bia", "oc", "quan oc", "hai san tuoi song",
    # Thịt, gia cầm, đặc sản
    "ga nuong", "ga luoc", "vit quay", "vit co", "bo le", "bo ne", "be thui", "be thui cau mong",
    "de nui", "de tuoi", "heo quay", "thit cho",
    # Đồ uống, tráng miệng, cafe
    "ca phe", "cafe", "tra sua", "tra dao", "tra trai cay", "sinh to", "nuoc ep",
    "che", "che thai", "tau hu", "kem", "bingsu",
    # Món Tây, Á, ăn nhanh
    "pizza", "burger", "hamburger", "pasta", "mi y", "steak", "bit tet",
    "sushi", "sashimi", "dimsum", "tokbokki", "kimbap", "ga ran", "buffet", "an vat",
    # Cụm từ chung chung
    "quan an", "nha hang", "dac san", "am thuc", "an sang", "an trua", "an toi",
    "do an ngon", "quan ngon", "mon ngon", "ship do an"
}


def is_category_or_dish_query(query: str) -> bool:
    """
    Xác định xem câu truy vấn là danh mục món ăn / loại hình quán ăn
    thay vì tìm kiếm đích danh một thương hiệu / quán ăn cụ thể.
    """
    if not query:
        return False
    norm = remove_accents(query).lower().strip()
    norm = re.sub(r"[^\w\s]", " ", norm)
    norm = re.sub(r"\s+", " ", norm).strip()

    words = norm.split()
    if not words:
        return False

    stop_words = {
        "quan", "tiem", "cho", "ngon", "re", "nhat", "gan", "day", "o", "tai",
        "khu", "pho", "da", "nang", "ha", "noi", "sai", "gon", "hcm", "tp",
        "dia", "chi", "doc", "duong", "nha", "trang", "hue", "hoi", "an", "da",
        "lat", "vung", "tau", "quang", "nam", "binh", "dinh", "can", "tho",
        "hai", "phong", "bien", "hoa", "phan", "thiet", "quy", "nhon", "phu", "quoc"
    }

    for cat in COMMON_FOOD_CATEGORIES:
        if norm == cat or norm.startswith(cat + " ") or norm.endswith(" " + cat) or f" {cat} " in f" {norm} ":
            rem = norm.replace(cat, " ").strip()
            rem_tokens = [w for w in rem.split() if w not in stop_words and w not in COMMON_FOOD_CATEGORIES]
            if len(rem_tokens) == 0:
                return True

    return False


@router.post("/search-and-crawl")
def search_and_crawl_restaurant(req: SearchAndCrawlRequest):
    """
    Quy trình tìm kiếm và cào dữ liệu thông minh theo từ khóa và nguồn:
    1. Nhận từ khóa tìm kiếm (ví dụ: 'bánh tráng', 'bún huế') và tham số source ('auto' | 'foody' | 'google_maps').
    2. Phân loại từ khóa:
       - Nếu là tên đích danh quán ăn (VD: 'Pizza 4P's', 'Bún chả cá Bà Lữ'): Tra cứu nhanh DB trước (< 20ms).
       - Nếu là thể loại món ăn (VD: 'mì quảng', 'hải sản đà nẵng'): Kích hoạt cơ chế Discovery Pagination
         để tìm và cào các quán MỚI chưa từng có trong DB, không bị kẹt hay skip cứng nhắc khi DB đã có 1 quán.
    3. Chặn thực thể rác: Nếu quán cào về không có bất kỳ đánh giá nào hợp lệ từ cả hai nguồn -> Không lưu vào DB.
    """
    try:
        q = req.query.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Vui lòng nhập từ khóa tìm kiếm.")

        # Tự động nhận diện nếu người dùng dán URL thay vì nhập từ khóa tìm kiếm (Defensive URL Guard)
        lower_q = q.lower()
        is_direct_url = (
            q.startswith("http://")
            or q.startswith("https://")
            or q.startswith("www.")
            or "foody.vn" in lower_q
            or "google.com/maps" in lower_q
            or "maps.google.com" in lower_q
            or "goo.gl" in lower_q
            or "maps.app.goo.gl" in lower_q
        )
        if is_direct_url:
            target_url = q if (q.startswith("http://") or q.startswith("https://")) else f"https://{q}"
            print(f"-> [Search & Crawl] [Defensive Guard] Nhận diện query là URL ('{target_url}'). Chuyển hướng xử lý qua analyze_restaurant_url...")
            result = analyze_restaurant_url(AnalyzeRequest(url=target_url, max_reviews=req.max_reviews or 30))
            if isinstance(result, dict):
                if "source" not in result:
                    result["source"] = "crawled_and_analyzed"
                if "success" not in result:
                    result["success"] = True
            return result

        norm_q = remove_accents(q)
        from routers.restaurants import extract_city_from_query
        from services.bi_service import detect_city

        # 1. Xác định thành phố mục tiêu và từ khóa món ăn:
        user_selected_city = req.city.strip() if req.city and req.city not in ["Tất cả địa điểm", "All Cities", "all", ""] else None
        detected_city, rem_q = extract_city_from_query(q)

        effective_city = user_selected_city or detected_city or ""
        city_slug = get_foody_city_slug(effective_city) if effective_city else "da-nang"
        gmaps_city = get_google_maps_location(effective_city) if effective_city else ""
        norm_eff_city = remove_accents(effective_city).replace("-", " ").strip() if effective_city else ""

        search_keyword = rem_q.strip() if rem_q.strip() else q
        norm_kw = remove_accents(search_keyword)
        tokens = [t for t in norm_kw.split() if len(t) >= 2]

        source = (req.source or "auto").strip().lower().replace("-", "_")
        if source not in ("auto", "foody", "google_maps"):
            source = "auto"

        is_category = is_category_or_dish_query(search_keyword)

        # Bước 1: Kiểm tra trong cơ sở dữ liệu SQLite trước
        # Chỉ kiểm tra nhanh trong DB nếu:
        # 1. Tìm kiếm đích danh quán ăn (not is_category)
        # 2. Hoặc người dùng chỉ định rõ nguồn là "database"
        matching_res = None
        if not is_category or source == "database":
            with get_session() as db:
                all_res = db.query(DBRestaurant).all()

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
                    has_gmaps = (
                        db.query(DBReview)
                        .filter(
                            DBReview.restaurant_id == matching_res.id,
                            DBReview.source.in_(["GoogleMaps", "google_maps", "Google Maps"])
                        )
                        .count() > 0
                    )

                    # 1. Người dùng chỉ định rõ nguồn Foody: Trả về luôn từ DB
                    if source == "foody":
                        formatted = format_restaurant_full(matching_res, db)
                        return {
                            "success": True,
                            "source": "database",
                            "message": f"Tìm thấy quán '{matching_res.name}' đã được phân tích sẵn trong cơ sở dữ liệu!",
                            "restaurant": formatted
                        }

                    # 2. Người dùng chọn google_maps và quán đã có dữ liệu Google Maps
                    if source == "google_maps" and has_gmaps:
                        formatted = format_restaurant_full(matching_res, db)
                        return {
                            "success": True,
                            "source": "database",
                            "message": f"Tìm thấy quán '{matching_res.name}' đã có dữ liệu Google Maps trong cơ sở dữ liệu!",
                            "restaurant": formatted
                        }

                    # 3. Người dùng chọn auto và quán đã có đủ dữ liệu từ Google Maps: Trả về luôn từ DB
                    if source == "auto" and has_gmaps:
                        formatted = format_restaurant_full(matching_res, db)
                        return {
                            "success": True,
                            "source": "database",
                            "message": f"Tìm thấy quán '{matching_res.name}' đã được phân tích sẵn trong cơ sở dữ liệu!",
                            "restaurant": formatted
                        }

                    # 4. Khi source == "auto" mà quán chưa có review Google Maps: Tự động chạy cào bổ sung Google Maps
                    if source == "auto" and not has_gmaps:
                        gmap_query = f"{matching_res.name} {matching_res.address or ''}".strip()
                        gmap_city = gmaps_city or get_google_maps_location(matching_res.city or "")
                        print(f"-> [Search & Crawl] [Dual-Source] Quán '{matching_res.name}' trong DB chưa có review Google Maps. Bắt đầu cào bổ sung từ Google Maps cho '{gmap_query}'...")
                        gmaps_crawled_ok = False
                        try:
                            with CRAWLER_SEMAPHORE:
                                gmaps_data = google_maps_crawler.search_and_crawl_google_maps(
                                    query=gmap_query,
                                    city=gmap_city,
                                    max_reviews=15,
                                    headless=True
                                )
                            if gmaps_data and gmaps_data.get("success") and gmaps_data.get("restaurant_name"):
                                matching_res, new_count, dup_count = save_and_analyze_google_maps_reviews(
                                    db=db,
                                    crawl_data=gmaps_data,
                                    req_url=gmaps_data.get("google_maps_url"),
                                    restaurant=matching_res,
                                    default_name=matching_res.name
                                )
                                gmaps_crawled_ok = True
                                print(f"-> [Search & Crawl] [Dual-Source] Đã bổ sung thành công {new_count} review Google Maps cho quán '{matching_res.name}'.")
                        except Exception as gm_err:
                            print(f"-> [Search & Crawl] [Dual-Source] Cào bổ sung Google Maps cho '{matching_res.name}' gặp lỗi: {gm_err}")

                        formatted = format_restaurant_full(matching_res, db)
                        if gmaps_crawled_ok:
                            return {
                                "success": True,
                                "source": "crawled_and_analyzed",
                                "message": f"Tìm thấy quán '{matching_res.name}' trong cơ sở dữ liệu và đã bổ sung thành công nhận xét từ Google Maps!",
                                "restaurant": formatted
                            }
                        else:
                            return {
                                "success": True,
                                "source": "database",
                                "message": f"Đã tổng hợp từ Foody; Google Maps không tìm thấy chi nhánh khớp.",
                                "restaurant": formatted
                            }

        # Bước 2: Chưa có trong DB hoặc là từ khóa thể loại -> Cào khám phá quán mới
        def crawl_gmaps(min_viable_reviews: int = 0):
            gmap_city = gmaps_city
            print(f"-> [Search & Crawl] Bắt đầu tìm kiếm & cào Google Maps cho từ khóa '{search_keyword}' (thành phố: {gmap_city or 'Toàn quốc'})...")
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

            # Chặn thực thể rác khi tổng hợp từ 2 nguồn (source='auto'): nếu cả 2 nguồn đều 0 review
            raw_gm_revs = gmaps_data.get("reviews", [])
            valid_gm_revs = [rv for rv in raw_gm_revs if (rv.get("text") or "").strip() and len((rv.get("text") or "").strip()) >= 5]
            if len(valid_gm_revs) < min_viable_reviews:
                city_display = effective_city if effective_city else "Đà Nẵng"
                raise HTTPException(
                    status_code=404,
                    detail=f"Quán '{gmaps_data.get('restaurant_name', search_keyword)}' không có bất kỳ bài đánh giá thực tế nào từ cả Foody lẫn Google Maps. Hệ thống từ chối lưu thực thể rác vào cơ sở dữ liệu."
                )

            with get_session() as db:
                restaurant, new_count, dup_count = save_and_analyze_google_maps_reviews(
                    db=db,
                    crawl_data=gmaps_data,
                    req_url=gmaps_data.get("google_maps_url"),
                    default_name=search_keyword,
                    min_viable_reviews=min_viable_reviews
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
            print(f"-> [Search & Crawl] Bắt đầu tìm kiếm từ khóa '{search_keyword}' trên Foody (thành phố: {city})...")

            # 1. Thu thập URL đã tồn tại trong DB để lọc quán mới
            existing_urls = set()
            with get_session() as db:
                rows = db.query(DBRestaurant.foody_url).filter(DBRestaurant.foody_url.isnot(None)).all()
                existing_urls = set(r[0] for r in rows)

            # 2. Cơ chế Discovery Pagination: Tìm quán MỚI chưa có trong DB (quét đến 3 trang nếu là category)
            unseen_places = []
            max_search_pages = 3 if is_category else 1

            for page_idx in range(1, max_search_pages + 1):
                page_results = foody_crawler.search_foody_places(
                    search_keyword,
                    city_slug=city,
                    max_results=6,
                    page=page_idx,
                    existing_urls=existing_urls
                )
                if not page_results:
                    break
                for p in page_results:
                    if p["url"] not in existing_urls and p not in unseen_places:
                        unseen_places.append(p)
                if unseen_places:
                    break

            crawl_data = None
            target_place = None

            # 3. Cào thử các quán mới tìm được (chọn quán có đánh giá thực tế >= 1)
            if unseen_places:
                for place in unseen_places:
                    target_url = place["url"]
                    print(f"-> [Search & Crawl] Bắt đầu cào thử đánh giá quán mới: '{place['name']}' ({target_url})")
                    data = foody_crawler.crawl_restaurant(
                        target_url,
                        max_reviews=req.max_reviews or 25,
                        headless=True,
                        known_fingerprints=set(),
                        max_consecutive_existing=3
                    )
                    if data and data.get("name") and data.get("reviews"):
                        valid_revs = [
                            rv for rv in data["reviews"]
                            if (rv.get("text") or "").strip() and len((rv.get("text") or "").strip()) >= 5
                        ]
                        if len(valid_revs) > 0:
                            crawl_data = data
                            target_place = place
                            break

            # 4. Nếu không có quán mới nào trên Foody:
            if not crawl_data:
                # Kiểm tra xem trong DB đã có quán nào khớp với từ khóa chưa
                with get_session() as db:
                    all_db = db.query(DBRestaurant).all()
                    db_matches = []
                    for r in all_db:
                        if norm_eff_city:
                            r_city = detect_city(r.address or "", foody_url=r.foody_url, restaurant_name=r.name)
                            r_norm_city = remove_accents(r_city).replace("-", " ").strip()
                            if norm_eff_city != r_norm_city and norm_eff_city not in r_norm_city:
                                continue
                        r_full = remove_accents(f"{r.name} {r.address or ''}")
                        if norm_kw in r_full or all(t in r_full for t in tokens):
                            db_matches.append(r)

                    if db_matches:
                        db_matches.sort(key=lambda x: (x.credibility_score or 0.0, x.review_count or 0), reverse=True)
                        best_match = db_matches[0]

                        # Nếu source == 'auto' và quán này chưa có Google Maps, cào bổ sung
                        has_gm = (
                            db.query(DBReview)
                            .filter(
                                DBReview.restaurant_id == best_match.id,
                                DBReview.source.in_(["GoogleMaps", "google_maps", "Google Maps"])
                            )
                            .count() > 0
                        )
                        if source == "auto" and not has_gm:
                            gm_query = f"{best_match.name} {best_match.address or ''}".strip()
                            gm_city = gmaps_city or get_google_maps_location(best_match.city or "")
                            try:
                                with CRAWLER_SEMAPHORE:
                                    gm_data = google_maps_crawler.search_and_crawl_google_maps(
                                        query=gm_query,
                                        city=gm_city,
                                        max_reviews=15,
                                        headless=True
                                    )
                                if gm_data and gm_data.get("success") and gm_data.get("restaurant_name"):
                                    best_match, _, _ = save_and_analyze_google_maps_reviews(
                                        db=db,
                                        crawl_data=gm_data,
                                        req_url=gm_data.get("google_maps_url"),
                                        restaurant=best_match,
                                        default_name=best_match.name
                                    )
                            except Exception as gm_err:
                                print(f"-> [Search & Crawl] Bổ sung Google Maps cho '{best_match.name}' thất bại: {gm_err}")

                        formatted = format_restaurant_full(best_match, db)
                        return {
                            "success": True,
                            "source": "database",
                            "message": f"Tất cả các quán hàng đầu theo từ khóa '{search_keyword}' đã được thu thập trong hệ thống. Đang hiển thị quán uy tín nhất: {best_match.name}",
                            "restaurant": formatted
                        }

                city_display = effective_city if effective_city else city
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy quán ăn nào trên Foody với từ khóa '{search_keyword}' tại khu vực '{city_display}'. Vui lòng thử từ khóa khác hoặc dán link Foody trực tiếp."
                )

            # 5. Lưu và phân tích quán mới tìm được (Chặn thực thể rác)
            with get_session() as db:
                restaurant = save_and_analyze_reviews(
                    db=db,
                    crawl_data=crawl_data,
                    foody_url=target_place["url"],
                    default_name=target_place["name"],
                    default_address=target_place.get("address", "")
                )
                if not restaurant:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Quán '{target_place['name']}' không có bài đánh giá hợp lệ nào. Hệ thống từ chối lưu thực thể rác."
                    )
                foody_rev_count = len(crawl_data.get("reviews", []))

                # NÂNG CẤP DUAL-SOURCE: Khi source == "auto", gọi tiếp Google Maps crawler
                if source == "auto":
                    gmaps_merged = False
                    gmaps_rev_count = 0
                    gm_query = f"{target_place['name']} {target_place.get('address', '')}".strip()
                    print(f"-> [Search & Crawl] [Dual-Source] Đã cào Foody xong ({foody_rev_count} nhận xét). Tiếp tục cào Google Maps cho '{gm_query}'...")
                    try:
                        with CRAWLER_SEMAPHORE:
                            gm_data = google_maps_crawler.search_and_crawl_google_maps(
                                query=gm_query,
                                city=gmaps_city,
                                max_reviews=15,
                                headless=True
                            )
                        if gm_data and gm_data.get("success") and gm_data.get("restaurant_name"):
                            restaurant, new_gmaps_cnt, _ = save_and_analyze_google_maps_reviews(
                                db=db,
                                crawl_data=gm_data,
                                req_url=gm_data.get("google_maps_url"),
                                restaurant=restaurant,
                                default_name=target_place["name"]
                            )
                            gmaps_rev_count = len(gm_data.get("reviews", []))
                            gmaps_merged = True
                            print(f"-> [Search & Crawl] [Dual-Source] Gộp thành công {new_gmaps_cnt} review Google Maps vào quán '{restaurant.name}'.")
                    except Exception as gm_err:
                        print(f"-> [Search & Crawl] [Dual-Source] Cào Google Maps thất bại/timeout ({gm_err}). Graceful degradation tiếp tục với dữ liệu Foody.")

                    invalidate_restaurants_cache()
                    formatted = format_restaurant_full(restaurant, db)

                    if gmaps_merged:
                        msg = f"Đã tổng hợp thành công nhận xét từ cả 2 nguồn Foody & Google Maps cho quán '{restaurant.name}' ({foody_rev_count} Foody, {gmaps_rev_count} Google Maps)!"
                    else:
                        msg = "Đã tổng hợp từ Foody; Google Maps không tìm thấy chi nhánh khớp."

                    return {
                        "success": True,
                        "source": "crawled_and_analyzed",
                        "message": msg,
                        "restaurant": formatted
                    }

                # Nếu source == "foody":
                invalidate_restaurants_cache()
                formatted = format_restaurant_full(restaurant, db)
                return {
                    "success": True,
                    "source": "crawled_and_analyzed",
                    "message": f"Đã tổng hợp thành công nhận xét thực tế của quán '{restaurant.name}' ({foody_rev_count} nhận xét thực tế)!",
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
                    return crawl_gmaps(min_viable_reviews=1)
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
            # Xác định thành phố mục tiêu cho tìm kiếm: ưu tiên target_rest_city, rồi bóc tách từ target_rest_addr, fallback ""
            resolved_city = target_rest_city or ""
            if not resolved_city and target_rest_addr:
                try:
                    from services.bi_service import detect_city
                    d_city = detect_city(target_rest_addr)
                    if d_city and d_city != "Toàn quốc":
                        resolved_city = d_city
                    else:
                        parts = [p.strip() for p in target_rest_addr.split(",") if p.strip()]
                        if parts:
                            clean_last = re.sub(r"^(tp\.?|thành phố|tỉnh)\s+", "", parts[-1], flags=re.IGNORECASE).strip()
                            resolved_city = clean_last or parts[-1]
                except Exception:
                    resolved_city = ""

            if resolved_city:
                resolved_city = get_google_maps_location(resolved_city)

            target_address = target_rest_addr or ""

            if req_url:
                crawl_data = google_maps_crawler.crawl_google_maps_reviews(
                    url=req_url,
                    max_reviews=max_revs,
                    headless=True,
                    target_address=target_address
                )
            elif req_query:
                crawl_data = google_maps_crawler.search_and_crawl_google_maps(
                    query=req_query,
                    city=resolved_city,
                    max_reviews=max_revs,
                    headless=True,
                    target_address=target_address
                )
            elif target_rest_id:
                if target_rest_gmap_url:
                    valid_u = validate_google_maps_url(target_rest_gmap_url)
                    crawl_data = google_maps_crawler.crawl_google_maps_reviews(
                        url=valid_u,
                        max_reviews=max_revs,
                        headless=True,
                        target_address=target_address
                    )
                else:
                    search_q = f"{target_rest_name} {target_rest_addr or ''}".strip()
                    crawl_data = google_maps_crawler.search_and_crawl_google_maps(
                        query=search_q,
                        city=resolved_city,
                        max_reviews=max_revs,
                        headless=True,
                        target_address=target_address
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
                from services.entity_resolution import calculate_name_similarity, extract_brand_tokens
                brand1 = extract_brand_tokens(restaurant.name)
                brand2 = extract_brand_tokens(candidate_label)
                brand_overlap = brand1 & brand2
                name_sim = calculate_name_similarity(restaurant.name, candidate_label)

                # Phân biệt trường hợp khác chi nhánh: Bắt buộc phải có cùng thương hiệu / tên tương đồng (>= 0.6) nhưng khác địa chỉ
                is_branch_mismatch = (
                    (bool(brand_overlap) or name_sim >= 0.6)
                    and (
                        "Địa chỉ chi nhánh" in mismatch_reason
                        or "quận/huyện xung đột" in mismatch_reason
                        or (crawled_addr and restaurant.address and crawled_addr != restaurant.address)
                    )
                )

                if is_branch_mismatch:
                    error_detail = (
                        f"Tìm thấy quán '{candidate_label}' tại địa chỉ '{crawled_addr}', "
                        f"không trùng khớp với địa chỉ chi nhánh '{restaurant.name}' ({restaurant.address}). "
                        f"Để đảm bảo chính xác dữ liệu của chi nhánh này, bạn vui lòng chuyển sang tab 'Dán đường dẫn Google Maps' và dán liên kết cụ thể của chi nhánh."
                    )
                elif req_url:
                    error_detail = (
                        f"Liên kết Google Maps thuộc về quán '{candidate_label}', không khớp với quán bạn đang bổ sung đánh giá là '{restaurant.name}' ({mismatch_reason}). "
                        f"Hệ thống đã chặn quá trình lưu để tránh làm sai lệch dữ liệu của quán. "
                        f"Nếu bạn muốn phân tích riêng quán này, vui lòng quay lại Trang chủ để dán link."
                    )
                else:
                    error_detail = (
                        f"Kết quả tìm kiếm trên Google Maps trả về quán '{candidate_label}', không khớp với quán bạn đang bổ sung đánh giá là '{restaurant.name}' ({mismatch_reason}). "
                        f"Hệ thống đã chặn quá trình lưu để tránh làm sai lệch dữ liệu của quán. "
                        f"Để đảm bảo chính xác dữ liệu của chi nhánh này, bạn vui lòng chuyển sang tab 'Dán đường dẫn Google Maps' và dán liên kết cụ thể của chi nhánh."
                    )

                raise HTTPException(
                    status_code=400,
                    detail=error_detail
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

        if not restaurant:
            raise HTTPException(
                status_code=400,
                detail="Quán ăn này không có bài đánh giá thực tế nào từ thực khách trên Google Maps. Hệ thống từ chối lưu thực thể rác vào cơ sở dữ liệu."
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
