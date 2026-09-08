"""
Crawler cào review quán ăn từ Foody.vn bằng Selenium.
Hỗ trợ cả môi trường Local (Windows/Mac) và Môi trường Cloud / Docker / Linux (Headless).
"""

import time
import csv
import os
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ----- Selectors Foody -----
SELECTOR_RESTAURANT_NAME = "h1, h1.res-name"
SELECTOR_RESTAURANT_ADDRESS = ".res-common-pos, .res-common-add, .res-address, [itemprop='address']"
SELECTOR_OVERALL_RATING = ".microsite-top-points, .archive-points, .points"
SELECTOR_REVIEW_BLOCK = ".review-item, .content-review-item, .foody-box-review li"
SELECTOR_REVIEW_AUTHOR = ".ru-username, .fc-username, .review-owner-name, .review-user a"
SELECTOR_REVIEW_RATING = ".review-points, .pre-review-points"
SELECTOR_REVIEW_TEXT = ".fc-user-comment, .rd-des, .microsite-review-text"
SELECTOR_REVIEW_DATE = ".ru-time, .time-ago, .fc-time"
SELECTOR_LOAD_MORE_BTN = ".vip-see-more, .btn-load-more, .btn-see-more"


def build_driver(headless: bool = True):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    
    # Các cờ chuẩn bắt buộc để chạy ổn định trên Linux / Docker / Cloud (Render, Railway, VPS)
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1366,900")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
    
    # Kiểm tra nếu đường dẫn chromium-browser hoặc chromedriver tùy biến được chỉ định qua ENV
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
        print(f"[Crawler Warning] Khởi tạo ChromeDriverManager thất bại, thử dùng mặc định hệ thống: {e}")
        return webdriver.Chrome(options=options)


def _safe_text(driver_or_el, selector, by=By.CSS_SELECTOR, default=""):
    try:
        return driver_or_el.find_element(by, selector).text.strip()
    except Exception:
        return default


def crawl_restaurant(url: str, max_reviews: int = 50, headless: bool = True):
    """
    Cào 1 quán từ URL trang chi tiết Foody, trả về dict:
    {name, address, overall_rating, url, reviews: [ {author, rating, text, date}, ... ]}
    """
    driver = build_driver(headless=headless)
    result = {"url": url, "reviews": []}

    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTOR_RESTAURANT_NAME))
        )

        result["name"] = _safe_text(driver, SELECTOR_RESTAURANT_NAME)
        result["address"] = _safe_text(driver, SELECTOR_RESTAURANT_ADDRESS)
        rating_text = _safe_text(driver, SELECTOR_OVERALL_RATING)
        try:
            match = re.search(r"(\d+[\.,]?\d*)", rating_text)
            result["overall_rating"] = float(match.group(1).replace(",", ".")) if match else None
        except Exception:
            result["overall_rating"] = None

        clicks = 0
        max_clicks = max_reviews // 10 + 1
        while clicks < max_clicks:
            try:
                btn = driver.find_element(By.CSS_SELECTOR, SELECTOR_LOAD_MORE_BTN)
                driver.execute_script("arguments[0].click();", btn)
                clicks += 1
                time.sleep(1.5)
            except Exception:
                break

        review_blocks = driver.find_elements(By.CSS_SELECTOR, SELECTOR_REVIEW_BLOCK)
        for block in review_blocks[:max_reviews]:
            author = _safe_text(block, SELECTOR_REVIEW_AUTHOR)
            rating_raw = _safe_text(block, SELECTOR_REVIEW_RATING)
            text = _safe_text(block, SELECTOR_REVIEW_TEXT)
            date = _safe_text(block, SELECTOR_REVIEW_DATE)

            if not text:
                continue

            try:
                match = re.search(r"(\d+[\.,]?\d*)", rating_raw)
                rating = float(match.group(1).replace(",", ".")) if match else None
            except Exception:
                rating = None

            result["reviews"].append({
                "author": author or "Khách ẩn danh",
                "rating": rating,
                "text": text,
                "date": date or "Gần đây",
            })

    finally:
        driver.quit()

    return result


def crawl_multiple(urls: list, max_reviews_per_place: int = 50, out_csv: str = None):
    all_results = []
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Đang cào dữ liệu Foody: {url}")
        try:
            data = crawl_restaurant(url, max_reviews=max_reviews_per_place)
            print(f"  -> {data.get('name')}: {len(data['reviews'])} đánh giá")
            all_results.append(data)
        except Exception as e:
            print(f"  Lỗi khi cào {url}: {e}")
        time.sleep(3)

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
