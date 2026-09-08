import sys
import time
sys.path.insert(0, ".")
from selenium.webdriver.common.by import By
from crawler.foody_crawler import build_driver, _safe_text

sys.stdout.reconfigure(encoding='utf-8')

driver = build_driver(headless=True)
url = "https://www.foody.vn/da-nang/com-chien-gion-gia-vinh"
driver.get(url)
time.sleep(3)

name = _safe_text(driver, "h1, h1.res-name")
address = _safe_text(driver, ".res-common-pos, .res-common-add, [itemprop='address']")
rating = _safe_text(driver, ".microsite-top-points, .points, .archive-points")

print(f"Name: {name}")
print(f"Address: {address}")
print(f"Overall Rating: {rating}")

blocks = driver.find_elements(By.CSS_SELECTOR, ".review-item, .content-review-item, .foody-box-review li")
print(f"Found {len(blocks)} review blocks.")

for i, block in enumerate(blocks[:5], 1):
    author = _safe_text(block, ".ru-username, .fc-username, .review-user a")
    rv_rating = _safe_text(block, ".review-points, .pre-review-points")
    text = _safe_text(block, ".fc-user-comment, .rd-des, .microsite-review-text")
    date = _safe_text(block, ".ru-time, .time-ago, .fc-time")
    print(f"\n--- Review #{i} ---")
    print(f"Author: {author}")
    print(f"Rating: {rv_rating}")
    print(f"Date: {date}")
    print(f"Text: {text[:100]}...")

driver.quit()
