"""
Module Crawler Google Maps qua SerpApi (Tầng 1 trong Kiến trúc Hybrid 3 tầng).

Kiến trúc Hybrid 3 tầng:
- Tầng 1: SerpApi Google Maps (`google_maps` & `google_maps_reviews`) — nhanh (~1-5s), ổn định trên cloud/Render, không tốn RAM trình duyệt.
- Tầng 2: Playwright Chromium Headless với `google_maps_auth.json` (khi chưa cấu hình SERPAPI_KEY hoặc Tầng 1 lỗi/hết quota).
- Tầng 3: Playwright Chromium Headless chế độ khách (Guest mode).

Bảo mật & Phòng thủ:
- Đọc SERPAPI_KEY từ biến môi trường `os.environ` (không hardcode, không ghi log giá trị key).
- Giải mã short link (`maps.app.goo.gl`, `goo.gl`, `g.page`) theo cơ chế kiểm tra hop-by-hop
  (`allow_redirects=False`, tối đa 5 redirect), chặn SSRF IP nội bộ/userinfo/port lạ và xác thực thuộc Google.
- Trả về `None` khi Tầng 1 thất bại / hết quota / 0 reviews để `google_maps_crawler.py` tự động fallback sang Tầng 2/3.
"""

import ipaddress
import logging
import os
import re
import sys
import time
import unicodedata
import urllib.parse
from typing import Any, Dict, List, Optional

import requests

# Thiết lập Logger chuyên dụng cho Tầng 1 (SerpApi)
logger = logging.getLogger("serpapi_google_maps")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [SerpApiGMaps] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"
SHORT_LINK_HOSTS = frozenset({"maps.app.goo.gl", "goo.gl", "g.page"})
GOOGLE_ROOT_DOMAINS = ("google.com", "google.com.vn", "google.vn")
ALLOWED_PORTS = frozenset({None, 80, 443})
MAX_REDIRECT_HOPS = 5
DEFAULT_REQUEST_TIMEOUT_S = 15.0
SHORT_LINK_TIMEOUT_S = 8.0
MAX_REVIEW_PAGES = 6
REVIEWS_PER_NEXT_PAGE = 20


def _get_serpapi_key() -> str:
    """Đọc SERPAPI_KEY từ os.environ một cách an toàn."""
    return os.environ.get("SERPAPI_KEY", "").strip()


def is_serpapi_configured() -> bool:
    """Kiểm tra SERPAPI_KEY đã được cấu hình trong os.environ hay chưa."""
    return bool(_get_serpapi_key())


def _mask_secret(text: Any, secret: str = "") -> str:
    """Che giấu giá trị api_key trước khi ghi log lỗi."""
    msg = str(text or "")
    msg = re.sub(r"(api_key=)[^&\s\"']+", r"\1***", msg, flags=re.IGNORECASE)
    if secret:
        msg = msg.replace(secret, "***")
    return msg


def clean_review_text(text: Any) -> str:
    """Làm sạch văn bản review, bỏ khoảng trắng dư và chuẩn hóa ngắt dòng."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def clean_address(addr: Any) -> str:
    """Loại bỏ các ký tự icon định vị (\ue0c8, font glyphs) và khoảng trắng thừa từ địa chỉ."""
    if not addr:
        return ""
    cleaned = re.sub(r"^[\ue000-\uf8ff\s·,\-]+", "", str(addr))
    return cleaned.strip()


# Alias nội bộ để tương thích gọn nhẹ
_clean_text = clean_review_text
_clean_address = clean_address


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Chuyển đổi an toàn giá trị sang float."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _is_ip_literal(host: str) -> bool:
    """Kiểm tra hostname có phải IP literal (IPv4/IPv6, đặc biệt loopback/private/link-local/reserved)."""
    if not host:
        return False
    clean_host = host.strip("[]")
    try:
        ip_obj = ipaddress.ip_address(clean_host)
        return bool(
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
            or isinstance(ip_obj, (ipaddress.IPv4Address, ipaddress.IPv6Address))
        )
    except ValueError:
        return False


def _is_google_hostname(host: str) -> bool:
    """Kiểm tra hostname thuộc các domain Google hợp lệ (google.com, google.com.vn, google.vn)."""
    if not host:
        return False
    clean_host = host.lower().rstrip(".")
    return any(
        clean_host == root or clean_host.endswith(f".{root}")
        for root in GOOGLE_ROOT_DOMAINS
    )


def _validate_safe_url(url_str: str, allow_short_hosts: bool = False) -> Optional[urllib.parse.ParseResult]:
    """
    Xác thực URL an toàn chống SSRF:
    - Chỉ chấp nhận scheme http/https.
    - Từ chối username/password (userinfo) và port lạ (chỉ None, 80, 443).
    - Từ chối IP literal (loopback/private/link-local/reserved).
    - Hostname phải thuộc Google domain hoặc SHORT_LINK_HOSTS (nếu allow_short_hosts=True).
    """
    if not url_str or not isinstance(url_str, str):
        return None
    try:
        parsed = urllib.parse.urlparse(url_str.strip())
    except Exception:
        return None

    if parsed.scheme not in ("http", "https"):
        return None
    if parsed.username is not None or parsed.password is not None:
        return None
    try:
        port = parsed.port
    except ValueError:
        return None
    if port not in ALLOWED_PORTS:
        return None

    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or _is_ip_literal(host):
        return None

    if _is_google_hostname(host):
        return parsed
    if allow_short_hosts and host in SHORT_LINK_HOSTS:
        if host == "goo.gl" and not (parsed.path or "").startswith("/maps"):
            return None
        return parsed
    return None


def _is_google_domain(url_str: str) -> bool:
    """Xác thực URL thuộc tên miền Google hợp lệ và vượt qua toàn bộ kiểm tra SSRF."""
    return _validate_safe_url(url_str, allow_short_hosts=False) is not None


def is_valid_google_maps_url(url_str: str, allow_short_hosts: bool = True) -> bool:
    """Xác thực URL Google Maps/short link hợp lệ (dùng chung cho Tầng 1 và Tầng 2/3)."""
    return _validate_safe_url(url_str, allow_short_hosts=allow_short_hosts) is not None


def _is_coordinate_only(text: str) -> bool:
    """Kiểm tra chuỗi có phải chỉ là tọa độ lat,lng hay không."""
    if not text:
        return False
    return bool(re.match(r"^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$", text.strip()))


def check_address_match(card_text: str, target_addr: str) -> float:
    """
    Tính điểm khớp giữa văn bản thẻ kết quả tìm kiếm Google Maps và địa chỉ mục tiêu (0.0 -> 1.0+).
    Hỗ trợ nhận diện đúng chi nhánh quán ăn (VD: phân biệt QL22B vs 30 Tháng 4).
    """
    if not card_text or not target_addr:
        return 0.0

    def _norm(t: str) -> str:
        t = str(t).lower().replace("đ", "d")
        nfd = unicodedata.normalize("NFD", t)
        t = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
        return re.sub(r"[^a-z0-9\s]", " ", t)

    norm_card = _norm(card_text)
    norm_addr = _norm(target_addr)

    addr_numbers = re.findall(r"\b\d+[a-z]?\b", norm_addr)
    addr_tokens = [w for w in norm_addr.split() if len(w) >= 3]
    if not addr_tokens:
        return 0.0

    match_count = sum(1 for tok in addr_tokens if tok in norm_card)
    score = match_count / len(addr_tokens)

    for num in addr_numbers:
        if num in norm_card:
            score += 0.35
            break

    return score


_score_address_match = check_address_match


def _resolve_short_link(url: str) -> Optional[str]:
    """
    Giải mã HTTP redirect hop-by-hop cho các short link trong allowlist
    (`maps.app.goo.gl`, `goo.gl/maps`, `g.page`), dùng `allow_redirects=False`
    (tối đa 5 hop), kiểm tra an toàn SSRF trên từng hop và xác thực final URL thuộc Google.
    """
    if not url or not isinstance(url, str):
        return None

    current_url = url.strip()
    parsed_init = _validate_safe_url(current_url, allow_short_hosts=True)
    if parsed_init is None:
        logger.warning("[Hybrid Layer 1 - SerpApi] Short link không hợp lệ hoặc bị chặn SSRF.")
        return None

    init_host = (parsed_init.hostname or "").lower().rstrip(".")
    if init_host not in SHORT_LINK_HOSTS:
        return None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
    }

    final_url: Optional[str] = None

    for hop in range(MAX_REDIRECT_HOPS + 1):
        if _validate_safe_url(current_url, allow_short_hosts=True) is None:
            logger.warning("[Hybrid Layer 1 - SerpApi] Từ chối redirect hop không hợp lệ.")
            return None

        status_code: int = 0
        location: Optional[str] = None
        resp_url: Optional[str] = None

        head_resp = None
        try:
            head_resp = requests.head(
                current_url,
                allow_redirects=False,
                timeout=SHORT_LINK_TIMEOUT_S,
                headers=headers,
            )
            if head_resp.status_code in (405, 501):
                head_resp = None
        except requests.RequestException:
            head_resp = None

        if head_resp is not None:
            status_code = int(head_resp.status_code)
            raw_headers = getattr(head_resp, "headers", None)
            if isinstance(raw_headers, dict):
                location = raw_headers.get("Location") or raw_headers.get("location")
            elif raw_headers is not None and hasattr(raw_headers, "get"):
                loc_val = raw_headers.get("Location")
                location = loc_val if isinstance(loc_val, str) else None
            resp_url = head_resp.url if isinstance(getattr(head_resp, "url", None), str) else None
        else:
            try:
                with requests.get(
                    current_url,
                    allow_redirects=False,
                    timeout=SHORT_LINK_TIMEOUT_S,
                    stream=True,
                    headers=headers,
                ) as get_resp:
                    status_code = int(get_resp.status_code)
                    raw_headers = getattr(get_resp, "headers", None)
                    if isinstance(raw_headers, dict):
                        location = raw_headers.get("Location") or raw_headers.get("location")
                    elif raw_headers is not None and hasattr(raw_headers, "get"):
                        loc_val = raw_headers.get("Location")
                        location = loc_val if isinstance(loc_val, str) else None
                    resp_url = get_resp.url if isinstance(getattr(get_resp, "url", None), str) else None
            except requests.RequestException as err:
                logger.warning(f"[Hybrid Layer 1 - SerpApi] Không thể giải mã short link: {_mask_secret(err)}")
                return None

        if status_code in (301, 302, 303, 307, 308):
            if hop >= MAX_REDIRECT_HOPS:
                logger.warning("[Hybrid Layer 1 - SerpApi] Vượt quá số lượng redirect tối đa (%d hops).", MAX_REDIRECT_HOPS)
                return None
            if not isinstance(location, str) or not location.strip():
                return None
            next_url = urllib.parse.urljoin(current_url, location.strip())
            if _validate_safe_url(next_url, allow_short_hosts=True) is None:
                logger.warning("[Hybrid Layer 1 - SerpApi] Redirect hop trỏ tới host/IP/port không hợp lệ, từ chối.")
                return None
            current_url = next_url
            continue

        candidate_url = resp_url or current_url
        if status_code < 400 and _is_google_domain(candidate_url):
            final_url = candidate_url
        break

    if not final_url or not _is_google_domain(final_url):
        logger.warning("[Hybrid Layer 1 - SerpApi] Final URL sau redirect không thuộc google.com, từ chối.")
        return None

    # Nếu Google chuyển qua consent.google.com?continue=..., bóc tách continue nếu hợp lệ
    try:
        final_parsed = urllib.parse.urlparse(final_url)
        if (final_parsed.hostname or "").lower() == "consent.google.com":
            qs = urllib.parse.parse_qs(final_parsed.query)
            cont_list = qs.get("continue") or []
            if cont_list and _is_google_domain(cont_list[0]):
                final_url = cont_list[0]
    except Exception:
        pass

    return final_url


def extract_serpapi_identifiers(url: str) -> Dict[str, Optional[str]]:
    """
    Trích xuất định danh Google Maps phục vụ SerpApi từ URL:
    - `data_id`: dạng hex `0x[0-9a-fA-F]+:0x[0-9a-fA-F]+` (từ `!1s0x...:0x...` hoặc URL).
    - `place_id`: dạng `ChIJ...` (từ `query_place_id=`, `place_id=`, `!1sChIJ...`, `!19sChIJ...`).
    - `place_name`: tên quán từ `/maps/place/<slug>/` (unquote & `+` -> space).
    - `search_query`: từ khóa từ `/maps/search/<slug>` hoặc `?q=...`.
    - `resolved_url`: URL sau giải mã redirect (nếu là short link) hoặc URL gốc.
    """
    empty: Dict[str, Optional[str]] = {
        "data_id": None,
        "place_id": None,
        "place_name": None,
        "search_query": None,
        "resolved_url": None,
    }
    if not url or not isinstance(url, str) or not url.strip():
        return empty

    raw_url = url.strip()
    effective_url = raw_url

    parsed_initial = urllib.parse.urlparse(raw_url)
    initial_host = (parsed_initial.hostname or "").lower().rstrip(".")
    if initial_host in SHORT_LINK_HOSTS:
        resolved = _resolve_short_link(raw_url)
        if not resolved:
            return empty
        effective_url = resolved

    decoded_url = urllib.parse.unquote(effective_url)

    # 1. Trích xuất data_id dạng hex 0x...:0x...
    data_id: Optional[str] = None
    hex_match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", decoded_url)
    if hex_match:
        data_id = hex_match.group(1)
    else:
        data_id_param = re.search(r"[?&]data_id=(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", decoded_url)
        if data_id_param:
            data_id = data_id_param.group(1)
        else:
            generic_hex = re.search(r"\b(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", decoded_url)
            if generic_hex:
                data_id = generic_hex.group(1)

    # 2. Trích xuất place_id dạng ChIJ...
    place_id: Optional[str] = None
    chij_patterns = [
        r"[?&](?:query_place_id|place_id)=(ChIJ[a-zA-Z0-9_-]+)",
        r"place_id:(ChIJ[a-zA-Z0-9_-]+)",
        r"!1s(ChIJ[a-zA-Z0-9_-]+)",
        r"[!&?]19s(ChIJ[a-zA-Z0-9_-]+)",
    ]
    for pat in chij_patterns:
        m = re.search(pat, decoded_url)
        if m:
            place_id = m.group(1)
            break

    # 3. Trích xuất tên quán từ /maps/place/<slug>/
    place_name: Optional[str] = None
    place_slug_match = re.search(r"/maps/place/([^/@?#]+)", effective_url)
    if place_slug_match:
        candidate_name = urllib.parse.unquote_plus(place_slug_match.group(1)).replace("+", " ").strip()
        if candidate_name and not _is_coordinate_only(candidate_name):
            place_name = candidate_name

    # 4. Trích xuất từ khóa tìm kiếm từ /maps/search/<slug> hoặc ?q= / ?query=
    search_query: Optional[str] = None
    search_slug_match = re.search(r"/maps/search/([^/@?#]+)", effective_url)
    if search_slug_match:
        candidate_q = urllib.parse.unquote_plus(search_slug_match.group(1)).replace("+", " ").strip()
        if candidate_q and not _is_coordinate_only(candidate_q):
            search_query = candidate_q
    else:
        try:
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(effective_url).query)
            q_vals = qs.get("q") or qs.get("query") or []
            if q_vals:
                candidate_q = urllib.parse.unquote_plus(q_vals[0]).replace("+", " ").strip()
                if candidate_q and not _is_coordinate_only(candidate_q):
                    search_query = candidate_q
        except Exception:
            pass

    return {
        "data_id": data_id,
        "place_id": place_id,
        "place_name": place_name,
        "search_query": search_query,
        "resolved_url": effective_url,
    }


def _update_task_progress(
    task_id: Optional[str],
    progress: int,
    message: str,
    reviews_count: Optional[int] = None,
) -> None:
    """Cập nhật tiến trình TaskManager an toàn (không làm gián đoạn crawler nếu lỗi)."""
    if not task_id:
        return
    try:
        from services.task_manager import task_manager
        task_manager.update_task(
            task_id,
            status="crawling",
            progress=progress,
            message=message,
            reviews_count=reviews_count,
        )
    except Exception:
        pass


def fetch_serpapi_reviews(
    data_id: Optional[str] = None,
    place_id: Optional[str] = None,
    max_reviews: int = 30,
    deadline: Optional[float] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Gọi SerpApi `engine="google_maps_reviews"` (có phân trang `next_page_token` + `num=20` từ trang 2+)
    và chuẩn hóa danh sách bài đánh giá theo contract của `google_maps_crawler.py`.
    """
    api_key = _get_serpapi_key()
    if not api_key:
        return {
            "success": False,
            "place_info": {"title": "", "address": "", "rating": 0.0},
            "reviews": [],
            "total_crawled": 0,
            "error": "SERPAPI_KEY chưa được cấu hình.",
        }

    if not data_id and not place_id:
        return {
            "success": False,
            "place_info": {"title": "", "address": "", "rating": 0.0},
            "reviews": [],
            "total_crawled": 0,
            "error": "Thiếu cả data_id lẫn place_id để truy vấn SerpApi reviews.",
        }

    target_max = 30 if max_reviews is None else int(max_reviews)
    if target_max <= 0:
        return {
            "success": False,
            "place_info": {"title": "", "address": "", "rating": 0.0},
            "reviews": [],
            "total_crawled": 0,
            "error": "max_reviews phải lớn hơn 0.",
        }

    collected_reviews: List[Dict[str, Any]] = []
    seen_keys = set()
    seen_tokens = set()
    place_info_out: Dict[str, Any] = {"title": "", "address": "", "rating": 0.0}
    next_page_token: Optional[str] = None

    for page_num in range(1, MAX_REVIEW_PAGES + 1):
        if deadline is not None and time.time() >= deadline:
            logger.info("[Hybrid Layer 1 - SerpApi] Chạm deadline an toàn, dừng phân trang reviews.")
            break

        params: Dict[str, Any] = {
            "engine": "google_maps_reviews",
            "hl": "vi",
            "api_key": api_key,
        }
        # Ưu tiên data_id hơn place_id theo đặc tả SerpApi
        if data_id:
            params["data_id"] = data_id
        else:
            params["place_id"] = place_id

        # Chỉ truyền next_page_token và num=20 từ trang 2+
        if page_num >= 2 and next_page_token:
            params["next_page_token"] = next_page_token
            params["num"] = REVIEWS_PER_NEXT_PAGE

        req_timeout = DEFAULT_REQUEST_TIMEOUT_S
        if deadline is not None:
            remaining = deadline - time.time()
            if remaining <= 0.5:
                break
            req_timeout = min(DEFAULT_REQUEST_TIMEOUT_S, max(2.0, remaining))

        try:
            resp = requests.get(SERPAPI_SEARCH_URL, params=params, timeout=req_timeout)
        except requests.RequestException as req_err:
            logger.warning(
                "[Hybrid Layer 1 - SerpApi] Lỗi kết nối ở trang %d: %s",
                page_num,
                _mask_secret(req_err, api_key),
            )
            break

        if resp.status_code in (401, 403, 429) or resp.status_code >= 400:
            logger.warning(
                "[Hybrid Layer 1 - SerpApi] HTTP %d khi gọi google_maps_reviews (trang %d).",
                resp.status_code,
                page_num,
            )
            if not collected_reviews:
                return {
                    "success": False,
                    "place_info": place_info_out,
                    "reviews": [],
                    "total_crawled": 0,
                    "error": f"SerpApi trả về mã lỗi HTTP {resp.status_code}.",
                }
            break

        try:
            payload = resp.json()
        except ValueError as json_err:
            logger.warning("[Hybrid Layer 1 - SerpApi] Phản hồi JSON không hợp lệ: %s", json_err)
            break

        if payload.get("error"):
            err_detail = _mask_secret(payload.get("error"), api_key)
            logger.warning("[Hybrid Layer 1 - SerpApi] SerpApi báo lỗi: %s", err_detail)
            if not collected_reviews:
                return {
                    "success": False,
                    "place_info": place_info_out,
                    "reviews": [],
                    "total_crawled": 0,
                    "error": err_detail,
                }
            break

        raw_place_info = payload.get("place_info")
        if isinstance(raw_place_info, dict):
            if not place_info_out["title"] and raw_place_info.get("title"):
                place_info_out["title"] = str(raw_place_info.get("title") or "").strip()
            if not place_info_out["address"] and raw_place_info.get("address"):
                place_info_out["address"] = clean_address(raw_place_info.get("address"))
            if not place_info_out["rating"] and raw_place_info.get("rating") is not None:
                place_info_out["rating"] = _safe_float(raw_place_info.get("rating"), 0.0)

        raw_reviews = payload.get("reviews") or []
        if not isinstance(raw_reviews, list):
            raw_reviews = []

        for r in raw_reviews:
            if not isinstance(r, dict):
                continue

            user_obj = r.get("user") if isinstance(r.get("user"), dict) else {}
            author = str(user_obj.get("name") or "").strip() or "Ẩn danh"
            rating = _safe_float(r.get("rating"), 5.0)
            if rating <= 0.0:
                rating = 5.0
            else:
                rating = min(5.0, max(1.0, rating))
            review_date = str(r.get("date") or r.get("iso_date") or "").strip()

            extracted_snippet = r.get("extracted_snippet")
            if isinstance(extracted_snippet, dict) and extracted_snippet.get("original"):
                raw_text = extracted_snippet.get("original")
            else:
                raw_text = r.get("snippet") or ""

            text = clean_review_text(raw_text)
            if len(text) < 3:
                continue

            google_review_id = r.get("review_id")
            if google_review_id is not None:
                google_review_id = str(google_review_id).strip() or None

            dedup_key = google_review_id if google_review_id else (author, text[:40])
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            collected_reviews.append({
                "author": author,
                "rating": rating,
                "review_date": review_date,
                "text": text,
                "google_review_id": google_review_id,
            })

            if len(collected_reviews) >= target_max:
                break

        progress_pct = min(55, 25 + page_num * 5)
        _update_task_progress(
            task_id,
            progress=progress_pct,
            message=f"SerpApi đang thu thập đánh giá ({len(collected_reviews)}/{target_max})...",
            reviews_count=len(collected_reviews),
        )

        if len(collected_reviews) >= target_max:
            break

        pagination = payload.get("serpapi_pagination")
        candidate_token = pagination.get("next_page_token") if isinstance(pagination, dict) else None
        if not candidate_token:
            break
        if candidate_token in seen_tokens:
            logger.warning("[Hybrid Layer 1 - SerpApi] Phát hiện next_page_token lặp lại, dừng phân trang.")
            break
        seen_tokens.add(candidate_token)
        next_page_token = candidate_token

    final_reviews = collected_reviews[:target_max]
    return {
        "success": len(final_reviews) > 0,
        "place_info": place_info_out,
        "reviews": final_reviews,
        "total_crawled": len(final_reviews),
        "error": None if final_reviews else "SerpApi không trả về bài đánh giá hợp lệ nào.",
    }


def crawl_google_maps_via_serpapi_query(
    query: str,
    city: str = "",
    max_reviews: int = 30,
    target_address: Optional[str] = None,
    task_id: Optional[str] = None,
    deadline: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """
    Tìm kiếm địa điểm qua SerpApi `engine="google_maps"` rồi lấy reviews qua `fetch_serpapi_reviews()`.
    Trả về dict đúng contract của `google_maps_crawler.py`, hoặc `None` nếu thất bại/0 reviews để fallback.
    """
    api_key = _get_serpapi_key()
    if not api_key or not query or not isinstance(query, str) or not query.strip():
        return None

    clean_query = query.strip()
    clean_city = city.strip() if isinstance(city, str) else ""
    full_q = f"{clean_query} {clean_city}".strip()

    start_time = time.time()
    effective_deadline = deadline if deadline is not None else (start_time + 45.0)
    remaining = effective_deadline - time.time()
    if remaining <= 0.5:
        logger.warning("[Hybrid Layer 1 - SerpApi] Hết thời gian deadline trước khi gọi search query.")
        return None

    logger.info("[Hybrid Layer 1 - SerpApi] Tìm kiếm Google Maps với query='%s'", full_q)
    _update_task_progress(task_id, progress=20, message=f"Đang tìm kiếm '{full_q}' qua SerpApi...")

    params: Dict[str, Any] = {
        "engine": "google_maps",
        "q": full_q,
        "hl": "vi",
        "gl": "vn",
        "type": "search",
        "api_key": api_key,
    }

    req_timeout = min(DEFAULT_REQUEST_TIMEOUT_S, max(2.0, remaining))
    try:
        resp = requests.get(SERPAPI_SEARCH_URL, params=params, timeout=req_timeout)
    except requests.RequestException as req_err:
        logger.warning(
            "[Hybrid Layer 1 - SerpApi] Lỗi kết nối khi tìm kiếm query: %s",
            _mask_secret(req_err, api_key),
        )
        return None

    if resp.status_code in (401, 403, 429) or resp.status_code >= 400:
        logger.warning(
            "[Hybrid Layer 1 - SerpApi] HTTP %d khi gọi engine=google_maps.",
            resp.status_code,
        )
        return None

    try:
        data = resp.json()
    except ValueError as json_err:
        logger.warning("[Hybrid Layer 1 - SerpApi] JSON tìm kiếm không hợp lệ: %s", json_err)
        return None

    if data.get("error"):
        logger.warning(
            "[Hybrid Layer 1 - SerpApi] SerpApi search báo lỗi: %s",
            _mask_secret(data.get("error"), api_key),
        )
        return None

    selected: Optional[Dict[str, Any]] = None
    place_results = data.get("place_results")
    if isinstance(place_results, dict) and (place_results.get("data_id") or place_results.get("place_id")):
        selected = place_results
    else:
        local_results = data.get("local_results") or []
        valid_candidates = [
            cand for cand in local_results
            if isinstance(cand, dict) and (cand.get("data_id") or cand.get("place_id"))
        ]
        if valid_candidates:
            if target_address and target_address.strip():
                best_cand = valid_candidates[0]
                best_score = -1.0
                for cand in valid_candidates[:5]:
                    cand_text = f"{cand.get('title', '')} {cand.get('address', '')}"
                    score = check_address_match(cand_text, target_address)
                    if score > best_score:
                        best_score = score
                        best_cand = cand
                selected = best_cand
            else:
                selected = valid_candidates[0]

    if not selected:
        logger.warning("[Hybrid Layer 1 - SerpApi] Không tìm thấy địa điểm có data_id/place_id cho '%s'.", full_q)
        return None

    data_id = selected.get("data_id")
    place_id = selected.get("place_id")
    cand_title = str(selected.get("title") or "").strip()
    cand_address = clean_address(selected.get("address") or "")
    cand_rating = _safe_float(selected.get("rating"), 0.0)
    cand_url = str(selected.get("link") or selected.get("google_maps_url") or "").strip()

    rev_res = fetch_serpapi_reviews(
        data_id=data_id,
        place_id=place_id,
        max_reviews=max_reviews,
        deadline=effective_deadline,
        task_id=task_id,
    )
    if not rev_res.get("success") or not rev_res.get("reviews"):
        logger.warning("[Hybrid Layer 1 - SerpApi] Không thu được bài đánh giá nào cho '%s'.", cand_title or full_q)
        return None

    place_info = rev_res.get("place_info") or {}
    restaurant_name = place_info.get("title") or cand_title or clean_query
    address = place_info.get("address") or cand_address or ""
    pi_rating = _safe_float(place_info.get("rating"), 0.0)
    overall_rating = pi_rating if pi_rating > 0.0 else cand_rating
    reviews = rev_res["reviews"]
    google_place_id = data_id or place_id

    if not cand_url:
        if place_id:
            cand_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
        else:
            cand_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(restaurant_name)}"

    duration = round(time.time() - start_time, 2)
    logger.info(
        "[Hybrid Layer 1 - SerpApi] Thành công '%s' (%d reviews) trong %.2fs.",
        restaurant_name,
        len(reviews),
        duration,
    )

    return {
        "success": True,
        "restaurant_name": restaurant_name,
        "address": address,
        "overall_rating": overall_rating,
        "google_maps_url": cand_url,
        "google_place_id": google_place_id,
        "reviews": reviews,
        "total_crawled": len(reviews),
        "error": None,
    }


def crawl_google_maps_via_serpapi_url(
    url: str,
    max_reviews: int = 30,
    target_address: Optional[str] = None,
    task_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Thu thập đánh giá từ Google Maps URL qua SerpApi:
    - Nếu URL có `data_id` hoặc `place_id` -> gọi thẳng `fetch_serpapi_reviews()`.
    - Nếu không có ID nhưng có tên địa điểm hoặc `/maps/search/...` -> gọi `crawl_google_maps_via_serpapi_query()`.
    - Trả về `None` nếu thất bại / 0 reviews để hệ thống tự động fallback sang Tầng 2 (Playwright).
    """
    if not is_serpapi_configured() or not url or not isinstance(url, str) or not url.strip():
        return None

    start_time = time.time()
    deadline = start_time + 45.0

    identifiers = extract_serpapi_identifiers(url)
    data_id = identifiers.get("data_id")
    place_id = identifiers.get("place_id")
    place_name = identifiers.get("place_name")
    search_query = identifiers.get("search_query")
    effective_url = identifiers.get("resolved_url") or url.strip()

    if data_id or place_id:
        logger.info(
            "[Hybrid Layer 1 - SerpApi] Trích xuất được định danh trực tiếp (data_id=%s, place_id=%s).",
            data_id,
            place_id,
        )
        rev_res = fetch_serpapi_reviews(
            data_id=data_id,
            place_id=place_id,
            max_reviews=max_reviews,
            deadline=deadline,
            task_id=task_id,
        )
        if not rev_res.get("success") or not rev_res.get("reviews"):
            logger.warning("[Hybrid Layer 1 - SerpApi] fetch_serpapi_reviews không trả về review cho URL.")
            return None

        place_info = rev_res.get("place_info") or {}
        restaurant_name = place_info.get("title") or place_name or ""
        address = place_info.get("address") or ""
        overall_rating = _safe_float(place_info.get("rating"), 0.0)
        reviews = rev_res["reviews"]
        google_place_id = data_id or place_id

        duration = round(time.time() - start_time, 2)
        logger.info(
            "[Hybrid Layer 1 - SerpApi] Thành công URL '%s' (%d reviews) trong %.2fs.",
            restaurant_name or google_place_id,
            len(reviews),
            duration,
        )

        return {
            "success": True,
            "restaurant_name": restaurant_name,
            "address": address,
            "overall_rating": overall_rating,
            "google_maps_url": effective_url,
            "google_place_id": google_place_id,
            "reviews": reviews,
            "total_crawled": len(reviews),
            "error": None,
        }

    fallback_query = place_name or search_query
    if fallback_query:
        logger.info(
            "[Hybrid Layer 1 - SerpApi] URL không có ID, chuyển sang tìm kiếm query='%s'.",
            fallback_query,
        )
        return crawl_google_maps_via_serpapi_query(
            query=fallback_query,
            city="",
            max_reviews=max_reviews,
            target_address=target_address,
            task_id=task_id,
            deadline=deadline,
        )

    logger.warning("[Hybrid Layer 1 - SerpApi] Không thể trích xuất định danh hay tên quán từ URL.")
    return None
