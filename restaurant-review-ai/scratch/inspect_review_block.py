import sys
import time
sys.path.insert(0, ".")
from selenium.webdriver.common.by import By
from crawler.foody_crawler import build_driver

sys.stdout.reconfigure(encoding='utf-8')

driver = build_driver(headless=True)
driver.get("https://www.foody.vn/da-nang/com-chien-gion-gia-vinh")
time.sleep(3)

# Find review blocks
blocks = driver.find_elements(By.CSS_SELECTOR, ".foody-box-review, .row-item, div[ng-repeat*='review']")
print("Found review blocks:", len(blocks))

if blocks:
    b = blocks[0]
    print("Block HTML snippet:", b.get_attribute("outerHTML")[:800])

# Address details
addr_els = driver.find_elements(By.CSS_SELECTOR, ".res-common-pos, .res-common-add, div[class*='address'], [itemprop='address']")
print("Address elements:", [e.text for e in addr_els if e.text])

# Points
pts_els = driver.find_elements(By.CSS_SELECTOR, ".microsite-top-points, .points, .archive-points")
print("Points elements:", [e.text for e in pts_els if e.text])

driver.quit()
