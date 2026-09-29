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
import urllib.parse

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
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"[Crawler] Fallback default chrome driver: {e}")
        return webdriver.Chrome(options=options)


def _safe_text(el, selector, default=""):
    try:
        found = el.find_element(By.CSS_SELECTOR, selector)
        return found.text.strip()
    except Exception:
        return default


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
                if t and len(t) > 5:
                    return t
        except Exception:
            continue

    # 3. Fallback tìm tất cả thẻ p hoặc span có nội dung dài
    try:
        paragraphs = block.find_elements(By.TAG_NAME, "p")
        for p in paragraphs:
            t = p.text.strip()
            if len(t) > 15 and not any(skip in t.lower() for skip in ["thích", "thảo luận", "báo lỗi"]):
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


def crawl_restaurant(
    url: str,
    max_reviews: int = 50,
    headless: bool = True,
    known_fingerprints: Optional[Set[str]] = None,
    max_consecutive_existing: int = 3
) -> Dict[str, Any]:
    """
    Cào bài đánh giá của 1 nhà hàng từ URL Foody.
    Hỗ trợ chế độ Incremental Crawl (Ưu tiên review mới nhất & Early-Stopping):
    - Đọc từ review mới nhất ở đầu trang xuống dưới.
    - So sánh với `known_fingerprints` (các review đã lưu trong DB).
    - Khi gặp `max_consecutive_existing` review liên tiếp đã có trong DB,
      tự động DỪNG CÀO SỚM để tiết kiệm thời gian, băng thông và không cào lại review cũ.
    """
    driver = build_driver(headless=headless)
    result = {
        "url": url,
        "reviews": [],
        "skipped_existing_count": 0,
        "stopped_early": False
    }
    known_fps = set(known_fingerprints or [])

    try:
        print(f"-> [Crawler] Đang mở trang: {url}")
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTOR_RESTAURANT_NAME))
        )
        time.sleep(2)

        # Lấy thông tin nhà hàng
        result["name"] = _safe_text(driver, SELECTOR_RESTAURANT_NAME, default="Quán ăn Foody")
        result["address"] = _safe_text(driver, SELECTOR_RESTAURANT_ADDRESS, default="")

        rating_raw = _safe_text(driver, SELECTOR_OVERALL_RATING, default="")
        try:
            match = re.search(r"(\d+[\.,]?\d*)", rating_raw)
            result["overall_rating"] = float(match.group(1).replace(",", ".")) if match else None
        except Exception:
            result["overall_rating"] = None

        print(f"  Tên: {result['name']} | Điểm: {result['overall_rating']} | Địa chỉ: {result['address']}")

        # Kiểm tra nếu trang 404 không tồn tại trên Foody
        if "không tìm thấy dữ liệu" in result["name"].lower() or "hệ thống không tìm thấy" in driver.title.lower():
            print(f"  [Crawler Cảnh báo] Trang quán không tồn tại trên Foody (404): {url}")
            return result

        restaurant_name = result.get("name", "")

        # Cuộn xuống nhẹ để kích hoạt tải các block đánh giá của Foody
        driver.execute_script("window.scrollBy(0, 600);")
        time.sleep(1.0)

        # Thử chọn tab / bộ lọc 'Mới nhất' nếu giao diện Foody có
        try:
            latest_filters = driver.find_elements(
                By.XPATH,
                "//a[contains(text(), 'Mới nhất') or contains(@ng-click, 'latest') or contains(@data-filter, 'latest') or contains(@class, 'filter-latest')]"
            )
            for lf in latest_filters:
                if lf.is_displayed():
                    driver.execute_script("arguments[0].click();", lf)
                    time.sleep(1.2)
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
            new_blocks = current_blocks[processed_block_count:]

            if not new_blocks and processed_block_count > 0:
                # Không còn bài đánh giá mới nào để tải thêm
                break

            early_stopped = False
            for block in new_blocks:
                text = _extract_review_text(block)
                if not text or not text.strip():
                    continue

                foody_id = _extract_foody_review_id(block)
                author = _extract_author(block)
                rating = _extract_rating(block)
                date = _safe_text(block, SELECTOR_REVIEW_DATE, default="Gần đây")

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
                time.sleep(1.8)
            else:
                time.sleep(2.0)
            clicks += 1

        print(f"-> [Crawler Hoàn tất] Thu thập thành công {len(result['reviews'])} đánh giá MỚI từ quán {result['name']} (Bỏ qua {result['skipped_existing_count']} review cũ đã có)!")

    except Exception as e:
        print(f"[Crawler Lỗi] {e}")
    finally:
        driver.quit()

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


def search_foody_places(query: str, city_slug: str = "da-nang", max_results: int = 5):
    """
    Tìm kiếm các quán ăn trên Foody theo từ khóa người dùng nhập vào.
    Trả về danh sách: [{ name, url, address }, ...]
    """
    encoded_q = urllib.parse.quote(query.strip())
    # Thử tìm theo thành phố hoặc toàn quốc
    search_url = f"https://www.foody.vn/{city_slug}/dia-diem?q={encoded_q}"
    print(f"-> [Foody Search] Đang tìm kiếm từ khóa '{query}': {search_url}")

    driver = build_driver(headless=True)
    results = []
    seen_urls = set()

    try:
        driver.get(search_url)
        time.sleep(2.5)

        items = driver.find_elements(By.CSS_SELECTOR, ".filter-result-item, .row-item, .content-item")
        print(f"  Phát hiện {len(items)} kết quả trên Foody.")

        for item in items:
            if len(results) >= max_results:
                break
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

                if name and url and "foody.vn" in url and "/dia-diem" not in url and "/khu-vuc" not in url:
                    clean_url = url.split("?")[0]
                    if clean_url not in seen_urls:
                        seen_urls.add(clean_url)
                        results.append({
                            "name": name,
                            "url": clean_url,
                            "address": addr
                        })
            except Exception:
                continue

    except Exception as e:
        print(f"[Foody Search Error] {e}")
    finally:
        driver.quit()

    return results

