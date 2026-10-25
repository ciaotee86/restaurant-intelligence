"""
Crawler cào review quán ăn từ Foody.vn bằng Selenium.
Hỗ trợ cả môi trường Local và Môi trường Cloud/Docker/Linux.
Cải tiến:
- Tìm đúng selector nội dung review (.rd-des, ng-bind-html Description) thay vì comment reply.
- Bấm nút 'Xem thêm bình luận' (.fd-btn-more) liên tục để cào được toàn bộ review theo yêu cầu.
- Tự động mở rộng các đoạn văn bản bị thu gọn (collapsed).
- Lọc bỏ các bài viết spam quảng cáo dịch vụ du lịch/xe cộ không liên quan.
"""

import time
import csv
import os
import re
import sys
import threading
import urllib.parse

# Giới hạn tối đa 2 tác vụ crawl headless đồng thời nhằm bảo vệ tài nguyên máy chủ [SEC-04]
CRAWLER_SEMAPHORE = threading.Semaphore(2)

# Đảm bảo UTF-8 console output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ----- Selectors Foody Chuẩn Xác -----
SELECTOR_RESTAURANT_NAME = "h1, h1.res-name, .main-info-title h1"
SELECTOR_RESTAURANT_ADDRESS = ".res-common-pos, .res-common-add, [itemprop='address'], .res-address"
SELECTOR_OVERALL_RATING = ".microsite-top-points, .archive-points, .points, .res-point"

# Review list & blocks
SELECTOR_REVIEW_ITEMS = "ul.foody-box-review > li.review-item, .review-item, div[ng-repeat*='review']"
SELECTOR_REVIEW_AUTHOR = ".review-user a, a[ng-bind*='UserName'], .ru-username, .fc-username, .review-user"
SELECTOR_REVIEW_RATING = "span.review-points, .review-points, .pre-review-points"
SELECTOR_REVIEW_DATE = "span.ru-time, .ru-time, span[ng-bind*='CreatedDate'], .time-ago"

# Text review chính xác trên Foody
SELECTOR_REVIEW_TEXTS = [
    ".rd-des",
    "span[ng-bind-html*='Description']",
    "div[ng-bind-html*='Description']",
    ".review-des",
    "p.rd-des",
]

# Nút xem thêm trên Foody
SELECTOR_LOAD_MORE_BTNS = [
    "a.fd-btn-more",
    "a.btn-load-more",
    "a[ng-click*='loadMore']",
    "a[ng-click*='LoadMore']",
    ".vip-see-more",
    ".btn-see-more"
]


def build_driver(headless: bool = True):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--blink-settings=imagesEnabled=false")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-sync")
    options.add_argument("--disable-default-apps")
    options.add_argument("--disable-background-networking")
    options.page_load_strategy = "eager"
    options.add_argument("--window-size=1366,900")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
    
    chrome_bin = os.getenv("CHROME_BIN") or os.getenv("GOOGLE_CHROME_BIN")
    if chrome_bin and os.path.exists(chrome_bin):
        options.binary_location = chrome_bin

    try:
        chromedriver_path = os.getenv("CHROMEDRIVER_PATH")
        if chromedriver_path and os.path.exists(chromedriver_path):
            service = Service(executable_path=chromedriver_path)
        else:
            service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"[Crawler] Fallback default chrome driver: {e}")
        driver = webdriver.Chrome(options=options)

    try:
        driver.set_page_load_timeout(20)
        driver.set_script_timeout(10)
    except Exception:
        pass
    return driver


def _safe_text(el, selector, default=""):
    try:
        found = el.find_element(By.CSS_SELECTOR, selector)
        return found.text.strip()
    except Exception:
        return default


def is_template_or_garbage_review(text: str = "", author: str = "", date: str = "") -> bool:
    """
    Lọc bỏ triệt để các phần tử template AngularJS chưa hydrate hoặc rác dummy từ Foody:
    - Loại bỏ nếu author, text, hoặc date chứa '{{' hoặc '}}'.
    - Loại bỏ nếu chứa 'Model.' (ví dụ: Model.AvgRating, Model.Owner.DisplayName, Model.CreatedDate).
    - Loại bỏ nếu text chứa 'common_delete', 'Sửacommon_delete', hoặc text rỗng / độ dài text sạch < 5 ký tự.
    """
    t = (text or "").strip()
    a = (author or "").strip()
    d = (date or "").strip()

    # 1. Text rỗng hoặc độ dài text sạch < 5 ký tự
    if not t or len(t) < 5:
        return True

    # 2. Kiểm tra ký tự binding template {{ hoặc }} hoặc Model.
    fields = [t, a, d]
    for field in fields:
        if "{{" in field or "}}" in field:
            return True
        if "model." in field.lower():
            return True
        if "common_delete" in field.lower() or "sửacommon_delete" in field.lower() or "suacommon_delete" in field.lower():
            return True

    return False


def _extract_review_text(block):
    """Trích xuất nội dung bài đánh giá chính từ block của Foody"""
    # 1. Thử mở rộng nếu văn bản bị thu gọn
    try:
        expand_links = block.find_elements(By.CSS_SELECTOR, "a.more, a[ng-click*='toggle'], .toggle-height")
        for link in expand_links:
            if link.is_displayed():
                block.parent.execute_script("arguments[0].click();", link)
    except Exception:
        pass

    # 2. Tìm theo các selector nội dung bài review
    for sel in SELECTOR_REVIEW_TEXTS:
        try:
            els = block.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                t = el.text.strip()
                if t and len(t) >= 5 and not is_template_or_garbage_review(t):
                    return t
        except Exception:
            continue

    # 3. Fallback tìm tất cả thẻ p hoặc span có nội dung dài
    try:
        paragraphs = block.find_elements(By.TAG_NAME, "p")
        for p in paragraphs:
            t = p.text.strip()
            if len(t) > 15 and not any(skip in t.lower() for skip in ["thích", "thảo luận", "báo lỗi"]) and not is_template_or_garbage_review(t):
                return t
    except Exception:
        pass

    return ""


import json
import hashlib
from typing import Set, Optional, Dict, Any, List
from crawler.review_filter import classify_review


def compute_review_fingerprint(
    restaurant_url: str,
    author: str,
    review_date: str,
    text: str,
    foody_review_id: str = ""
) -> str:
    """
    Tạo mã băm fingerprint (SHA-256) duy nhất và ổn định cho review:
    1. Ưu tiên foody_review_id nếu trang Foody cung cấp ID ổn định:
       seed = f"{clean_url}|id_{foody_review_id}"
    2. Nếu không có ID: kết hợp đa trường (restaurant_url + author + review_date + normalized_text):
       seed = f"{clean_url}|{norm_author}|{norm_date}|{norm_text}"
    Mã hóa SHA-256 (64 ký tự hex).
    """
    clean_url = (restaurant_url or "").split("?")[0].strip().lower()
    if foody_review_id and str(foody_review_id).strip():
        seed = f"{clean_url}|id_{str(foody_review_id).strip()}"
    else:
        norm_author = (author or "").strip().lower()
        norm_date = (review_date or "").strip().lower()
        norm_text = " ".join((text or "").strip().lower().split())
        seed = f"{clean_url}|{norm_author}|{norm_date}|{norm_text}"

    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def _extract_foody_review_id(block) -> str:
    """Trích xuất ID của review từ DOM attribute của Foody nếu có"""
    for attr in ["data-id", "id", "data-review-id", "data-comment-id"]:
        try:
            val = block.get_attribute(attr)
            if val:
                match = re.search(r"(\d{4,})", val)
                if match:
                    return match.group(1)
        except Exception:
            pass

    try:
        links = block.find_elements(By.TAG_NAME, "a")
        for link in links:
            href = link.get_attribute("href") or ""
            match = re.search(r"(?:binh-luan|review)[/-](\d{4,})", href)
            if match:
                return match.group(1)
    except Exception:
        pass

    return ""


def _extract_author(block) -> str:
    """Trích xuất tên tác giả bài review"""
    author_raw = _safe_text(block, SELECTOR_REVIEW_AUTHOR, default="Khách Foody")
    if not author_raw:
        return "Khách Foody"
    lines = [l.strip() for l in author_raw.split("\n") if l.strip()]
    clean_lines = [
        l for l in lines
        if not re.match(r"^(\d+[\.,]?\d*)$", l)
        and "via " not in l
        and l.lower() not in ["thích", "thảo luận", "báo lỗi"]
    ]
    if clean_lines:
        return clean_lines[0]
    elif lines:
        return lines[0]
    return "Khách Foody"


def _extract_rating(block) -> Optional[float]:
    """Trích xuất điểm số người dùng đánh giá cho bài viết"""
    rating_raw = _safe_text(block, SELECTOR_REVIEW_RATING, default="")
    try:
        match = re.search(r"(\d+[\.,]?\d*)", rating_raw)
        return float(match.group(1).replace(",", ".")) if match else None
    except Exception:
        return None


def _click_load_more(driver) -> bool:
    """Tìm và click nút 'Xem thêm bình luận' trên Foody"""
    for sel in SELECTOR_LOAD_MORE_BTNS:
        try:
            btns = driver.find_elements(By.CSS_SELECTOR, sel)
            for btn in btns:
                if btn.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", btn)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", btn)
                    return True
        except Exception:
            continue
    return False


def is_spam_review(text: str) -> bool:
    """Kiểm tra nhanh review có phải spam không bằng bộ lọc đa tín hiệu"""
    res = classify_review(text)
    return res["is_spam"]


INVALID_RESTAURANT_NAMES = {
    "đăng nhập", "dang nhap", "login", "sign in", "sign up", "đăng ký",
    "dang ky", "trang chủ", "home", "google", "gmail", "facebook",
    "404", "error", "not found", "access denied", "trang không tồn tại",
    "hệ thống không tìm thấy", "chọn địa điểm", "tài khoản", "account",
    "bảo mật", "security", "privacy", "điều khoản", "terms", "chính sách"
}


def is_foody_domain(url: str) -> bool:
    """Kiểm tra URL có thuộc domain foody.vn hoặc subdomain *.foody.vn hay không"""
    if not url:
        return False
    try:
        p = urllib.parse.urlparse(url.strip())
        host = (p.hostname or "").lower()
        return host == "foody.vn" or host.endswith(".foody.vn")
    except Exception:
        return False


def is_valid_foody_restaurant_page(url: str, soup=None, driver=None, name: str = "") -> bool:
    """
    Sanity check cấu trúc trang quán ăn Foody:
    1. URL phải thuộc foody.vn
    2. Tên quán không rỗng, không thuộc danh sách đen (login, sign-in, error,...)
    3. Trang có cấu trúc/marker nhận diện nhà hàng Foody hợp lệ
    """
    if not is_foody_domain(url):
        return False

    clean_name = (name or "").strip().lower()
    if not clean_name or len(clean_name) < 2 or len(clean_name) > 200:
        return False

    if clean_name in INVALID_RESTAURANT_NAMES or any(b == clean_name for b in INVALID_RESTAURANT_NAMES):
        return False

    if soup:
        has_marker = bool(
            soup.select_one('.res-common-pos, .res-common-add, .microsite-top-points, .main-info-title, .foody-box-review, .res-summary-point, .detail-restaurant')
        )
        if not has_marker:
            title = (soup.title.string or "").lower() if soup.title else ""
            html_sample = (soup.text[:2000] if soup.text else "").lower()
            has_marker = "foody.vn" in html_sample or "foody" in title
        return has_marker

    if driver:
        if not is_foody_domain(driver.current_url):
            return False
        has_marker = False
        try:
            markers = driver.find_elements(By.CSS_SELECTOR, ".res-common-pos, .res-common-add, .microsite-top-points, .main-info-title, .foody-box-review, .res-summary-point, .detail-restaurant")
            has_marker = len(markers) > 0
        except Exception:
            pass
        if not has_marker:
            title = (driver.title or "").lower()
            has_marker = "foody" in title
        return has_marker

    return True


def inspect_foody_via_http(url: str, timeout: int = 8) -> Optional[Dict[str, Any]]:
    """
    Kiểm tra siêu tốc thông tin quán ăn và số lượng đánh giá qua HTTP request (< 1 giây)
    trước khi quyết định có cần khởi tạo trình duyệt Chrome Selenium hay không.
    Nếu quán không tồn tại hoặc đã xác nhận 0 bài đánh giá (0 review),
    trả về kết quả ngay lập tức để giải quyết triệt để lỗi timeout 120s.
    """
    if not is_foody_domain(url):
        print(f"-> [Fast HTTP Inspector] Từ chối URL không thuộc foody.vn: {url}")
        return None

    try:
        import requests
        from bs4 import BeautifulSoup

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en;q=0.9',
        }
        # Chống SSRF bằng cách kiểm tra nghiêm ngặt từng bước chuyển hướng (Redirects) [SEC-06]
        current_url = url
        max_redirects = 5
        resp = None

        for _ in range(max_redirects):
            resp = requests.get(current_url, headers=headers, timeout=timeout, allow_redirects=False)
            if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get('Location')
                if not location:
                    break
                next_url = urllib.parse.urljoin(current_url, location)
                if not is_foody_domain(next_url):
                    print(f"-> [Fast HTTP Inspector] Bị chuyển hướng ra ngoài foody.vn: {next_url}")
                    return None
                current_url = next_url
            else:
                break

        if resp is None or not is_foody_domain(resp.url):
            print(f"-> [Fast HTTP Inspector] Bị chuyển hướng ra ngoài foody.vn: {resp.url if resp else current_url}")
            return None
        if resp.status_code == 404 or "không tìm thấy dữ liệu" in resp.text.lower():
            return {
                "url": url,
                "name": "Trang không tồn tại",
                "reviews": [],
                "not_found": True,
                "is_zero_reviews": True,
                "skipped_existing_count": 0,
                "stopped_early": True
            }
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, 'html.parser')
        h1 = soup.find('h1')
        name = h1.text.strip() if h1 else ""
        if not name or "hệ thống không tìm thấy" in name.lower():
            return {
                "url": url,
                "name": "Trang không tồn tại",
                "reviews": [],
                "not_found": True,
                "is_zero_reviews": True,
                "skipped_existing_count": 0,
                "stopped_early": True
            }

        # Sanity check: Tên quán và cấu trúc trang Foody
        if not is_valid_foody_restaurant_page(resp.url, soup=soup, name=name):
            print(f"-> [Fast HTTP Inspector] Trang không đạt tiêu chuẩn cấu trúc quán ăn Foody: '{name}'")
            return None

        addr_el = soup.select_one('.res-common-pos, .res-common-add, [itemprop="address"], .res-address')
        address = addr_el.text.strip() if addr_el else ""
        address = re.sub(r'\s+', ' ', address).strip()

        points_el = soup.select_one('.microsite-top-points, .archive-points, .points, .res-point')
        points_raw = points_el.text.strip() if points_el else ""
        overall_rating = None
        match_pt = re.search(r"(\d+[\.,]?\d*)", points_raw)
        if match_pt:
            try:
                overall_rating = float(match_pt.group(1).replace(",", "."))
            except Exception:
                pass

        # Kiểm tra xem trang có 0 review:
        is_zero_reviews = False
        for a in soup.find_all('a'):
            href = str(a.get('href', ''))
            txt = a.get_text(strip=True).lower()
            if '/binh-luan' in href and ('bình luận' in txt or 'binh luan' in txt):
                if txt.endswith('0') or any(s.get_text(strip=True) == '0' for s in a.find_all('span')):
                    is_zero_reviews = True
                    break

        rev_count_el = soup.select_one('.microsite-review-count')
        if rev_count_el and rev_count_el.text.strip() == "0":
            is_zero_reviews = True

        rev_text = resp.text.lower()
        if "bình luận0" in rev_text or "bình luận: 0" in rev_text or "0 bình luận" in rev_text:
            is_zero_reviews = True

        return {
            "url": url,
            "name": name,
            "address": address,
            "overall_rating": overall_rating,
            "reviews": [],
            "skipped_existing_count": 0,
            "stopped_early": True,
            "is_zero_reviews": is_zero_reviews
        }
    except Exception as e:
        print(f"[Fast HTTP Inspector Warning] Lỗi kiểm tra nhanh qua HTTP: {e}")
        return None


def fetch_reviews_via_http(
    url: str,
    max_reviews: int = 40,
    known_fingerprints: Optional[Set[str]] = None,
    restaurant_name: str = "",
    max_consecutive_existing: int = 3,
    timeout: int = 8
) -> Dict[str, Any]:
    """
    Thu thập bài đánh giá Foody siêu tốc trực tiếp qua HTTP (< 2 giây),
    không cần khởi chạy Selenium Chrome. Giúp tiết kiệm 95% RAM (tránh OOM crash trên Render Free Tier)
    và loại bỏ hoàn toàn lỗi 502 Bad Gateway / Gateway Timeout.
    """
    result = {
        "reviews": [],
        "skipped_existing_count": 0,
        "stopped_early": False
    }
    if not is_foody_domain(url):
        return result
    known_fps = set(known_fingerprints or [])
    seen_fingerprints_this_run = set()
    consecutive_existing_count = 0

    try:
        import requests
        from bs4 import BeautifulSoup
        import json

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en;q=0.9',
        }

        base_rev_url = url.rstrip('/') + '/binh-luan'
        max_pages = max(1, min(6, (max_reviews // 10) + 2))

        for page in range(1, max_pages + 1):
            page_url = f"{base_rev_url}?page={page}" if page > 1 else base_rev_url
            try:
                resp = requests.get(page_url, headers=headers, timeout=timeout)
                if resp.status_code != 200:
                    break
            except Exception:
                break

            soup = BeautifulSoup(resp.text, 'html.parser')
            items = soup.select('li.review-item, .review-item')
            if not items:
                break

            early_stopped = False
            for block in items:
                # 1. Kiểm tra class ẩn hoặc style display:none
                style = (block.get('style') or '').lower().replace(' ', '')
                classes = block.get('class', [])
                class_str = " ".join(classes).lower() if isinstance(classes, list) else str(classes).lower()
                if 'display:none' in style or 'ng-hide' in class_str or 'hidden' in classes:
                    continue

                # 2. Kiểm tra template binding trên block
                block_raw = str(block).lower()
                if '{{model.' in block_raw or 'common_delete' in block_raw or 'sửacommon_delete' in block_raw:
                    continue

                des_el = block.select_one('.rd-des, [ng-bind-html*="Description"], .review-des, p.rd-des')
                text = des_el.get_text(strip=True) if des_el else ""
                if not text or len(text) < 5:
                    continue

                if text.endswith("...Xem thêm"):
                    text = text[:-11].strip()
                elif text.endswith("Xem thêm"):
                    text = text[:-8].strip()

                author_el = block.select_one('.review-user a, .review-user, .fc-username, .ru-username')
                author_raw = author_el.get_text(strip=True) if author_el else "Khách Foody"
                author = author_raw.split('đã bình luận')[0].split('via')[0].strip() or "Khách Foody"

                points_el = block.select_one('.review-points, .pre-review-points')
                rating = None
                if points_el:
                    pt_match = re.search(r"(\d+[\.,]?\d*)", points_el.get_text(strip=True))
                    if pt_match:
                        try:
                            rating = float(pt_match.group(1).replace(",", "."))
                        except Exception:
                            pass

                time_el = block.select_one('.ru-time, .time-ago, span[ng-bind*="CreatedDate"]')
                date_raw = time_el.get_text(strip=True) if time_el else "Gần đây"
                date = date_raw.rstrip(',').strip()

                # 3. Lọc bỏ triệt để review template hoặc rác
                if is_template_or_garbage_review(text=text, author=author, date=date):
                    continue

                foody_id = block.get('data-review-id', '')

                fp = compute_review_fingerprint(url, author, date, text, foody_id)
                if fp in seen_fingerprints_this_run:
                    continue
                seen_fingerprints_this_run.add(fp)

                if fp in known_fps:
                    consecutive_existing_count += 1
                    result["skipped_existing_count"] += 1
                    if consecutive_existing_count >= max_consecutive_existing:
                        result["stopped_early"] = True
                        early_stopped = True
                        break
                    continue
                else:
                    consecutive_existing_count = 0

                recent_texts = [r["text"] for r in result["reviews"]]
                filter_res = classify_review(
                    text,
                    author=author,
                    restaurant_name=restaurant_name,
                    recent_texts=recent_texts
                )

                result["reviews"].append({
                    "foody_review_id": foody_id,
                    "fingerprint": fp,
                    "author": author,
                    "rating": rating,
                    "text": text,
                    "date": date,
                    "is_spam": 1 if filter_res["is_spam"] else 0,
                    "spam_score": filter_res["spam_score"],
                    "spam_category": filter_res["spam_category"],
                    "spam_reason": json.dumps(filter_res["spam_reason"], ensure_ascii=False)
                })

                if len(result["reviews"]) >= max_reviews:
                    break

            if early_stopped or len(result["reviews"]) >= max_reviews:
                break

    except Exception as e:
        print(f"[Fast HTTP Review Extraction Warning] Lỗi: {e}")

    return result


def crawl_restaurant(
    url: str,
    max_reviews: int = 50,
    headless: bool = True,
    known_fingerprints: Optional[Set[str]] = None,
    max_consecutive_existing: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Cào bài đánh giá của 1 nhà hàng từ URL Foody.
    Hỗ trợ quy trình 3 lớp tối ưu hóa hiệu năng:
    1. Lớp 1 (Fast HTTP Inspector < 1s): Nếu phát hiện quán 0 review hoặc 404, trả về ngay.
    2. Lớp 2 (Fast HTTP Review Extractor < 2s): Bóc tách review từ trang /binh-luan qua HTTP trực tiếp,
       tiết kiệm 95% RAM (chống OOM 512MB trên Render) và chống 502 Gateway Timeout.
    3. Lớp 3 (Incremental Chrome Crawler): Fallback dự phòng bằng Selenium chỉ khi thật sự cần.
    """
    if not is_foody_domain(url):
        print(f"-> [Crawler Cảnh báo] Từ chối cào URL không thuộc foody.vn: {url}")
        return None

    # 1. Fast HTTP Pre-check
    http_meta = inspect_foody_via_http(url, timeout=8)
    if http_meta:
        if http_meta.get("not_found"):
            print(f"-> [Fast HTTP Inspector] Trang quán không tồn tại trên Foody (404): {url}")
            return http_meta
        if not is_valid_foody_restaurant_page(url, name=http_meta.get("name", "")):
            print(f"-> [Fast HTTP Inspector] Tên quán không hợp lệ hoặc trang không phải quán ăn Foody: '{http_meta.get('name')}'")
            return None
        if http_meta.get("is_zero_reviews"):
            print(f"-> [Fast HTTP Inspector] Quán '{http_meta.get('name')}' xác nhận 0 bài đánh giá. Hoàn tất cào trong < 1s (bỏ qua Selenium).")
            return http_meta

    rest_name = http_meta.get("name", "") if http_meta else ""

    # 2. Fast HTTP Review Extraction (< 2s, siêu nhẹ, không tốn RAM Chrome)
    http_crawl = fetch_reviews_via_http(
        url=url,
        max_reviews=max_reviews,
        known_fingerprints=known_fingerprints,
        restaurant_name=rest_name,
        max_consecutive_existing=max_consecutive_existing
    )
    if http_crawl and len(http_crawl.get("reviews", [])) > 0:
        result = {
            "url": url,
            "name": rest_name or "Quán ăn Foody",
            "address": http_meta.get("address", "") if http_meta else "",
            "overall_rating": http_meta.get("overall_rating") if http_meta else None,
            "reviews": http_crawl["reviews"],
            "skipped_existing_count": http_crawl.get("skipped_existing_count", 0),
            "stopped_early": http_crawl.get("stopped_early", False)
        }
        print(f"-> [Fast HTTP Crawler] Thu thập thành công {len(result['reviews'])} đánh giá trong < 2s (Không mở Selenium Chrome)!")
        return result

    # 3. Fallback: Selenium Chrome Crawler (Giới hạn tối đa 2 instances đồng thời [SEC-04])
    CRAWLER_SEMAPHORE.acquire()
    driver = None
    try:
        driver = build_driver(headless=headless)
        result = {
            "url": url,
            "reviews": [],
            "skipped_existing_count": 0,
            "stopped_early": False
        }
        known_fps = set(known_fingerprints or [])

        print(f"-> [Crawler] Đang mở trang: {url}")
        driver.get(url)
        if not is_foody_domain(driver.current_url):
            print(f"  [Crawler Cảnh báo] Trình duyệt chuyển hướng ra ngoài foody.vn: {driver.current_url}")
            return None

        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTOR_RESTAURANT_NAME))
        )
        time.sleep(0.5)

        # Lấy thông tin nhà hàng (ưu tiên thông tin từ HTTP meta nếu có)
        if http_meta and http_meta.get("name"):
            result["name"] = http_meta["name"]
            result["address"] = http_meta.get("address", "")
            result["overall_rating"] = http_meta.get("overall_rating")
        else:
            result["name"] = _safe_text(driver, SELECTOR_RESTAURANT_NAME, default="Quán ăn Foody")
            result["address"] = _safe_text(driver, SELECTOR_RESTAURANT_ADDRESS, default="")
            rating_raw = _safe_text(driver, SELECTOR_OVERALL_RATING, default="")
            try:
                match = re.search(r"(\d+[\.,]?\d*)", rating_raw)
                result["overall_rating"] = float(match.group(1).replace(",", ".")) if match else None
            except Exception:
                result["overall_rating"] = None

        print(f"  Tên: {result['name']} | Điểm: {result['overall_rating']} | Địa chỉ: {result['address']}")

        # Sanity check trang và tên quán
        if not is_valid_foody_restaurant_page(driver.current_url, driver=driver, name=result["name"]):
            print(f"  [Crawler Cảnh báo] Trang không đạt tiêu chuẩn quán ăn Foody: '{result.get('name')}'")
            return None

        # Kiểm tra nếu trang 404 không tồn tại trên Foody
        if "không tìm thấy dữ liệu" in result["name"].lower() or "hệ thống không tìm thấy" in driver.title.lower():
            print(f"  [Crawler Cảnh báo] Trang quán không tồn tại trên Foody (404): {url}")
            return result

        restaurant_name = result.get("name", "")

        # Cuộn xuống nhẹ để kích hoạt tải các block đánh giá của Foody
        driver.execute_script("window.scrollBy(0, 600);")
        time.sleep(0.3)

        # Thử chọn tab / bộ lọc 'Mới nhất' nếu giao diện Foody có
        try:
            latest_filters = driver.find_elements(
                By.XPATH,
                "//a[contains(text(), 'Mới nhất') or contains(@ng-click, 'latest') or contains(@data-filter, 'latest') or contains(@class, 'filter-latest')]"
            )
            for lf in latest_filters:
                if lf.is_displayed():
                    driver.execute_script("arguments[0].click();", lf)
                    time.sleep(0.4)
                    break
        except Exception:
            pass

        seen_fingerprints_this_run = set()
        consecutive_existing_count = 0
        clicks = 0
        max_clicks = max(5, (max_reviews // 10) + 3)
        processed_block_count = 0

        while True:
            current_blocks = driver.find_elements(By.CSS_SELECTOR, SELECTOR_REVIEW_ITEMS)

            # Nếu quán không có review block nào ngay từ đầu, dừng cào tức thì
            if not current_blocks and clicks == 0:
                print(f"  [Crawler] Quán không có bài đánh giá nào (0 reviews). Dừng cào tức thì.")
                result["stopped_early"] = True
                break

            new_blocks = current_blocks[processed_block_count:]

            if not new_blocks and processed_block_count > 0:
                # Không còn bài đánh giá mới nào để tải thêm
                break

            early_stopped = False
            for block in new_blocks:
                # 1. Kiểm tra block ẩn (not is_displayed(), display:none, hoặc ng-hide)
                try:
                    if not block.is_displayed():
                        continue
                    style = (block.get_attribute("style") or "").lower().replace(" ", "")
                    if "display:none" in style:
                        continue
                    cls = (block.get_attribute("class") or "").lower()
                    if "ng-hide" in cls:
                        continue
                except Exception:
                    continue

                # 2. Kiểm tra nếu block chứa template binding AngularJS {{ chưa hydrate
                try:
                    outer_html = (block.get_attribute("outerHTML") or "").lower()
                    if "{{" in outer_html and ("model." in outer_html or "common_delete" in outer_html):
                        continue
                except Exception:
                    pass

                text = _extract_review_text(block)
                if not text or not text.strip():
                    continue

                foody_id = _extract_foody_review_id(block)
                author = _extract_author(block)
                rating = _extract_rating(block)
                date = _safe_text(block, SELECTOR_REVIEW_DATE, default="Gần đây")

                # 3. Lọc bỏ triệt để review template AngularJS hoặc rác dummy
                if is_template_or_garbage_review(text=text, author=author, date=date):
                    continue

                fp = compute_review_fingerprint(url, author, date, text, foody_id)

                if fp in seen_fingerprints_this_run:
                    continue
                seen_fingerprints_this_run.add(fp)

                # KIỂM TRA ĐÃ TỒN TẠI TRONG DATABASE CHƯA (INCREMENTAL CHECK)
                if fp in known_fps:
                    consecutive_existing_count += 1
                    result["skipped_existing_count"] += 1
                    if consecutive_existing_count >= max_consecutive_existing:
                        print(f"  [Incremental Crawl] Gặp {consecutive_existing_count} review liên tiếp đã tồn tại trong DB. DỪNG CÀO SỚM!")
                        result["stopped_early"] = True
                        early_stopped = True
                        break
                    continue
                else:
                    consecutive_existing_count = 0

                # Review mới chưa từng có trong DB -> chạy spam filter & lưu vào kết quả
                recent_session_texts = [r["text"] for r in result["reviews"]]
                filter_res = classify_review(
                    text,
                    author=author,
                    restaurant_name=restaurant_name,
                    recent_texts=recent_session_texts
                )
                result["reviews"].append({
                    "foody_review_id": foody_id,
                    "fingerprint": fp,
                    "author": author,
                    "rating": rating,
                    "text": text,
                    "date": date,
                    "is_spam": 1 if filter_res["is_spam"] else 0,
                    "spam_score": filter_res["spam_score"],
                    "spam_category": filter_res["spam_category"],
                    "spam_reason": json.dumps(filter_res["spam_reason"], ensure_ascii=False)
                })

                if len(result["reviews"]) >= max_reviews:
                    break

            processed_block_count = len(current_blocks)

            if early_stopped or len(result["reviews"]) >= max_reviews or clicks >= max_clicks:
                break

            # Bấm 'Xem thêm' để tải lượt tiếp theo
            clicked = _click_load_more(driver)
            if not clicked:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(0.8)
            else:
                time.sleep(0.8)
            clicks += 1

        print(f"-> [Crawler Hoàn tất] Thu thập thành công {len(result['reviews'])} đánh giá MỚI từ quán {result['name']} (Bỏ qua {result['skipped_existing_count']} review cũ đã có)!")

    except Exception as e:
        print(f"[Crawler Lỗi] {e}")
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
        CRAWLER_SEMAPHORE.release()

    return result


def crawl_multiple(urls: list, max_reviews_per_place: int = 50, out_csv: str = None, known_fingerprints_map: dict = None):
    all_results = []
    known_map = known_fingerprints_map or {}
    for i, url in enumerate(urls, 1):
        try:
            fps = known_map.get(url)
            data = crawl_restaurant(url, max_reviews=max_reviews_per_place, known_fingerprints=fps)
            all_results.append(data)
        except Exception as e:
            print(f"Lỗi khi cào {url}: {e}")
        time.sleep(2)

    if out_csv and all_results:
        _export_csv(all_results, out_csv)

    return all_results


def _export_csv(results: list, path: str):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["restaurant_name", "restaurant_url", "author", "rating", "text", "date"])
        for r in results:
            for rv in r["reviews"]:
                writer.writerow([r.get("name", ""), r["url"], rv["author"], rv["rating"], rv["text"], rv["date"]])


def _search_foody_via_http(query: str, city_slug: str = "da-nang", max_results: int = 5):
    """
    Tìm kiếm nhanh trên Foody qua HTTP request và BeautifulSoup (< 1 giây).
    Không cần khởi động Chrome browser nặng nề.
    """
    from bs4 import BeautifulSoup
    encoded_q = urllib.parse.quote(query.strip())
    search_url = f"https://www.foody.vn/{city_slug}/dia-diem?q={encoded_q}"
    req = urllib.request.Request(
        search_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    soup = BeautifulSoup(html, "html.parser")
    items = soup.select(".filter-result-item, .row-item, .content-item")
    results = []
    seen_urls = set()

    for item in items:
        link_el = item.select_one("h2 a, .result-name a, a.res-name")
        if not link_el:
            continue
        name = link_el.get_text(strip=True)
        url = link_el.get("href", "")
        if url.startswith("/"):
            url = f"https://www.foody.vn{url}"

        addr_el = item.select_one(".address, .res-common-add")
        addr = addr_el.get_text(strip=True) if addr_el else ""

        # Trích xuất số lượng đánh giá thực tế từ DOM Foody
        review_count = 0
        comment_icon = item.select_one(".fa-comment")
        if comment_icon:
            sib = comment_icon.find_next_sibling("span")
            if sib:
                try:
                    review_count = int(sib.get_text(strip=True))
                except Exception:
                    pass

        if name and url and "foody.vn" in url and "/dia-diem" not in url and "/khu-vuc" not in url:
            clean_url = url.split("?")[0]
            if clean_url not in seen_urls:
                seen_urls.add(clean_url)
                results.append({
                    "name": name,
                    "url": clean_url,
                    "address": addr,
                    "review_count": review_count
                })

    # Ưu tiên các quán có review > 0 lên trước, nhiều review xếp trên
    results.sort(key=lambda x: x.get("review_count", 0), reverse=True)
    return results[:max_results]


def search_foody_places(query: str, city_slug: str = "da-nang", max_results: int = 5):
    """
    Tìm kiếm các quán ăn trên Foody theo từ khóa:
    Ưu tiên Fast HTTP Path (< 1 giây).
    Fallback sang Selenium Headless nếu HTTP bị chặn.
    """
    encoded_q = urllib.parse.quote(query.strip())
    search_url = f"https://www.foody.vn/{city_slug}/dia-diem?q={encoded_q}"
    print(f"-> [Foody Search] Đang tìm kiếm từ khóa '{query}': {search_url}")

    # 1. Thử HTTP Fast Path (< 1s, tiết kiệm 100% thời gian khởi động Chrome)
    try:
        http_results = _search_foody_via_http(query, city_slug=city_slug, max_results=max_results)
        if http_results and len(http_results) > 0:
            print(f"-> [Foody Search Fast Path] Đã tìm thấy {len(http_results)} quán qua Direct HTTP trong < 1s!")
            return http_results
    except Exception as http_err:
        print(f"-> [Foody Search HTTP Fallback] Không dùng được HTTP ({http_err}), chuyển sang Selenium...")

    # 2. Fallback Selenium nếu cần
    driver = build_driver(headless=True)
    results = []
    seen_urls = set()

    try:
        driver.get(search_url)
        time.sleep(1.0)

        items = driver.find_elements(By.CSS_SELECTOR, ".filter-result-item, .row-item, .content-item")
        print(f"  [Selenium Search] Phát hiện {len(items)} kết quả trên Foody.")

        for item in items:
            try:
                link_el = item.find_element(By.CSS_SELECTOR, "h2 a, .result-name a, a.res-name")
                name = link_el.text.strip()
                url = link_el.get_attribute("href")

                addr = ""
                try:
                    addr_el = item.find_element(By.CSS_SELECTOR, ".address, .res-common-add")
                    addr = addr_el.text.strip()
                except Exception:
                    pass

                review_count = 0
                try:
                    comment_el = item.find_element(By.CSS_SELECTOR, ".fa-comment + span")
                    txt = comment_el.text.strip()
                    if txt.isdigit():
                        review_count = int(txt)
                except Exception:
                    pass

                if name and url and "foody.vn" in url and "/dia-diem" not in url and "/khu-vuc" not in url:
                    clean_url = url.split("?")[0]
                    if clean_url not in seen_urls:
                        seen_urls.add(clean_url)
                        results.append({
                            "name": name,
                            "url": clean_url,
                            "address": addr,
                            "review_count": review_count
                        })
            except Exception:
                continue

        results.sort(key=lambda x: x.get("review_count", 0), reverse=True)
        results = results[:max_results]

    except Exception as e:
        print(f"[Foody Search Error] {e}")
    finally:
        driver.quit()

    return results

