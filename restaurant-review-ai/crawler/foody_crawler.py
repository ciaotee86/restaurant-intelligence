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


def is_spam_review(text: str) -> bool:
    """Loại bỏ các bài review quảng cáo không liên quan đến ẩm thực"""
    t = text.lower()
    spam_keywords = [
        "thuê xe", "xe du lịch", "tour du lịch", "vé máy bay", "khách sạn",
        "cho thuê", "liên hệ ngay", "zalo:", "hotline:", "bất động sản"
    ]
    return any(kw in t for kw in spam_keywords)


def crawl_restaurant(url: str, max_reviews: int = 50, headless: bool = True):
    """
    Cào toàn bộ bài đánh giá của 1 nhà hàng từ URL Foody.
    Bấm xem thêm liên tục để gom đủ số lượng yêu cầu.
    """
    driver = build_driver(headless=headless)
    result = {"url": url, "reviews": []}

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

        # Bấm nút 'Xem thêm bình luận' để tải thêm review
        clicks = 0
        max_clicks = max(5, (max_reviews // 10) + 3)
        no_new_count = 0
        last_block_count = 0

        while clicks < max_clicks:
            current_blocks = driver.find_elements(By.CSS_SELECTOR, SELECTOR_REVIEW_ITEMS)
            current_count = len(current_blocks)

            if current_count >= max_reviews:
                print(f"  Đã tải đủ {current_count} bài đánh giá (mục tiêu {max_reviews}).")
                break

            if current_count == last_block_count:
                no_new_count += 1
                if no_new_count >= 3:
                    print("  Không còn bài đánh giá mới để tải thêm.")
                    break
            else:
                no_new_count = 0
            last_block_count = current_count

            # Tìm và click nút Xem thêm
            clicked = False
            for sel in SELECTOR_LOAD_MORE_BTNS:
                try:
                    btns = driver.find_elements(By.CSS_SELECTOR, sel)
                    for btn in btns:
                        if btn.is_displayed():
                            driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", btn)
                            time.sleep(0.5)
                            driver.execute_script("arguments[0].click();", btn)
                            clicked = True
                            clicks += 1
                            time.sleep(2.0)
                            break
                    if clicked:
                        break
                except Exception:
                    continue

            if not clicked:
                # Nếu không bấm được nút, thử cuộn trang xuống đáy
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                clicks += 1
                time.sleep(1.8)

        # Trích xuất dữ liệu chi tiết từng review
        review_blocks = driver.find_elements(By.CSS_SELECTOR, SELECTOR_REVIEW_ITEMS)
        print(f"  Bắt đầu bóc tách {len(review_blocks)} phần tử đánh giá...")

        seen_texts = set()
        for idx, block in enumerate(review_blocks):
            if len(result["reviews"]) >= max_reviews:
                break

            text = _extract_review_text(block)
            if not text or len(text) < 10:
                continue

            # Bỏ qua trùng lặp hoặc spam
            text_norm = " ".join(text.split()[:15])
            if text_norm in seen_texts or is_spam_review(text):
                continue
            seen_texts.add(text_norm)

            author_raw = _safe_text(block, SELECTOR_REVIEW_AUTHOR, default="Khách Foody")
            author = "Khách Foody"
            if author_raw:
                lines = [l.strip() for l in author_raw.split("\n") if l.strip()]
                # Bỏ các dòng là điểm số (vd: 10, 8.4) hoặc timestamp (vd: via iPhone 20/12/2020)
                clean_lines = [l for l in lines if not re.match(r"^(\d+[\.,]?\d*)$", l) and "via " not in l and l.lower() not in ["thích", "thảo luận", "báo lỗi"]]
                if clean_lines:
                    author = clean_lines[0]
                elif lines:
                    author = lines[0]

            rating_raw = _safe_text(block, SELECTOR_REVIEW_RATING, default="")
            try:
                match = re.search(r"(\d+[\.,]?\d*)", rating_raw)
                rating = float(match.group(1).replace(",", ".")) if match else None
            except Exception:
                rating = None

            date = _safe_text(block, SELECTOR_REVIEW_DATE, default="Gần đây")

            result["reviews"].append({
                "author": author,
                "rating": rating,
                "text": text,
                "date": date
            })

        print(f"-> [Crawler Hoàn tất] Thu thập thành công {len(result['reviews'])} đánh giá thực tế từ quán {result['name']}!")

    except Exception as e:
        print(f"[Crawler Lỗi] {e}")
    finally:
        driver.quit()

    return result


def crawl_multiple(urls: list, max_reviews_per_place: int = 50, out_csv: str = None):
    all_results = []
    for i, url in enumerate(urls, 1):
        try:
            data = crawl_restaurant(url, max_reviews=max_reviews_per_place)
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

