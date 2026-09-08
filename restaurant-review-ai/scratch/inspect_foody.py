import os
import sys
import time
sys.path.insert(0, ".")
from selenium.webdriver.common.by import By
from crawler.foody_crawler import build_driver

sys.stdout.reconfigure(encoding='utf-8')

driver = build_driver(headless=True)
driver.get("https://www.foody.vn/da-nang/com-chien-gion-gia-vinh")
time.sleep(3)

print("H1 text:", [e.text for e in driver.find_elements(By.TAG_NAME, "h1")])

# find address
addrs = driver.find_elements(By.XPATH, "//*[contains(@class, 'address') or contains(@class, 'pos') or contains(@class, 'location')]")
print("Address candidates:", set([e.text for e in addrs if e.text]))

# find ratings
pts = driver.find_elements(By.XPATH, "//*[contains(@class, 'point') or contains(@class, 'rating') or contains(@class, 'score')]")
print("Rating candidates:", set([e.text for e in pts if e.text][:15]))

# find review block classes
review_els = driver.find_elements(By.XPATH, "//*[contains(@class, 'comment') or contains(@class, 'review') or contains(@class, 'user')]")
classes = set([e.get_attribute("class") for e in review_els if e.get_attribute("class")])
print("Review related classes:", list(classes)[:25])

# print sample text from page
lines = [line.strip() for line in driver.page_source.split("\n") if "comment" in line or "review" in line or "user" in line]
print("Sample lines with comment/review:", lines[:10])

driver.quit()
