"""
Module Crawler Google Maps sử dụng Playwright Chromium Headless.
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md (MOD-02)
và kế hoạch: docs/07-multi-source-implementation-plan.md ([TASK-03]).

Các chức năng chính:
- Khởi tạo Chromium với stealth options & anti-bot evasion.
- Tự động vượt qua màn hình Cookie Consent / Terms ("Chấp nhận tất cả" / "Accept all").
- Tương tác tìm kiếm địa điểm và bóc tách Place ID, Tên, Địa chỉ, Điểm trung bình.
- Điều hướng tab Đánh giá (Reviews), cuộn container ảo (.m6QErb.DxyBCb / role="feed") với human-like jitter.
- Tự động click các nút "Xem thêm" (button.w8nwRe) để mở rộng toàn văn bài đánh giá.
- Bóc tách cấu trúc dữ liệu chuẩn: Tác giả, số sao (1.0 -> 5.0), ngày đánh giá, nội dung, google_review_id.
- Xử lý lỗi phòng thủ (Defensive error handling): Chụp ảnh diagnostic khi lỗi, không sập process.
"""

import os
import re
import sys
import time
import random
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

# Đảm bảo UTF-8 console output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError

# Thiết lập Logger chuyên dụng cho Google Maps Crawler
logger = logging.getLogger("google_maps_crawler")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [G殆MapsCrawler] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Thư mục lưu trữ diagnostic screenshot khi crawler gặp lỗi
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "crawler_failures")


# ==============================================================================
# HÀM BỔ TRỢ (UTILITIES & STRING PARSING)
# ==============================================================================

def parse_star_rating(rating_str: Optional[str]) -> float:
    """
    Trích xuất số sao đánh giá (1.0 - 5.0) từ chuỗi văn bản aria-label hoặc text.
    Hỗ trợ cả tiếng Việt ("4,5 sao", "5 sao") và tiếng Anh ("4.5 stars", "5 stars").
    """
    if not rating_str:
        return 0.0
    rating_str = str(rating_str).strip()
    match = re.search(r"(\d+(?:[.,]\d+)?)", rating_str)
    if match:
        try:
            val = float(match.group(1).replace(",", "."))
            # Chuẩn hóa về thang điểm 1.0 -> 5.0
            if 0.0 <= val <= 5.0:
                return round(val, 1)
            elif val > 5.0 and val <= 10.0:
                return round(val / 2.0, 1)
            return round(val, 1)
        except ValueError:
            return 0.0
    return 0.0


def extract_place_id_from_url(url: Optional[str]) -> Optional[str]:
    """
    Trích xuất định danh Place ID độc nhất từ Google Maps URL.
    Hỗ trợ các định dạng:
    - !1s0x...:0x... (Hex ID phổ biến của địa điểm Google Maps)
    - 19sChIJ... (Place ID chuẩn dạng Base64/Hash)
    - /g/11... (Knowledge Graph Freebase ID)
    - ?cid=... (Customer ID dạng số thập phân)
    """
    if not url:
        return None
    url_str = str(url)

    # 1. Tìm Hex Place ID: !1s0x31421836d56d5eff:0x3e2f905c0bc12b6
    hex_match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", url_str)
    if hex_match:
        return hex_match.group(1)

    # 2. Tìm Place ID ChIJ: 19sChIJ...
    chij_match = re.search(r"[!&?]19s(ChIJ[a-zA-Z0-9_-]+)", url_str)
    if chij_match:
        return chij_match.group(1)

    # 3. Tìm Knowledge Graph / Freebase ID: /g/11...
    g_match = re.search(r"(?:%2Fg%2F|/g/)([a-zA-Z0-9_]+)", url_str)
    if g_match:
        return f"/g/{g_match.group(1)}"

    # 4. Tìm CID số: cid=...
    cid_match = re.search(r"[?&]cid=(\d+)", url_str)
    if cid_match:
        return cid_match.group(1)

    return None


def clean_address(addr: Optional[str]) -> str:
    """Loại bỏ các ký tự icon định vị (\ue0c8, font glyphs) và khoảng trắng thừa từ địa chỉ."""
    if not addr:
        return ""
    cleaned = re.sub(r"^[\ue000-\uf8ff\s·,\-]+", "", str(addr))
    return cleaned.strip()


def clean_review_text(text: Optional[str]) -> str:
    """Làm sạch văn bản review, bỏ khoảng trắng dư và chuẩn hóa ngắt dòng."""
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", str(text)).strip()
    return cleaned


# ==============================================================================
# QUẢN LÝ BROWSER PLAYWRIGHT HEADLESS & STEALTH
# ==============================================================================

def create_stealth_browser(
    playwright_instance,
    headless: bool = True
) -> tuple[Browser, BrowserContext, Page]:
    """
    Khởi tạo phiên bản Chromium với cờ chống bot, giả lập thông số desktop Chrome thật.
    """
    args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-infobars",
        "--window-size=1280,800",
    ]

    browser = playwright_instance.chromium.launch(
        headless=headless,
        args=args
    )

    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        locale="vi-VN",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    )

    # Bổ sung JavaScript chống phát hiện Automation (Stealth Evasion)
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.navigator.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    """)

    page = context.new_page()
    page.set_default_timeout(25000)
    return browser, context, page


def handle_consent_and_modals(page: Page) -> None:
    """Tự động phát hiện và bỏ qua màn hình Cookie Consent hoặc hộp thoại chặn tương tác."""
    try:
        # 1. Màn hình đồng ý điều khoản Google (Consent Screen)
        consent_selectors = [
            'button:has-text("Chấp nhận tất cả")',
            'button:has-text("Accept all")',
            'button:has-text("Tôi đồng ý")',
            'button:has-text("I agree")',
            'form[action*="consent"] button',
            'button[aria-label*="Accept all" i]',
            'button[aria-label*="Chấp nhận" i]',
        ]
        for sel in consent_selectors:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                logger.info(f"Phát hiện màn hình Cookie Consent, bấm chấp nhận: {sel}")
                loc.click()
                page.wait_for_timeout(1000)
                break

        # 2. Hộp thoại gợi ý Đăng nhập (Login Nudge / Sign in modal)
        login_modal_dismiss = [
            'button:has-text("Không, cảm ơn")',
            'button:has-text("Để sau")',
            'button:has-text("Lúc khác")',
            'button:has-text("No thanks")',
            'button:has-text("Not now")',
            'button:has-text("Stay signed out")',
        ]
        for d_sel in login_modal_dismiss:
            d_loc = page.locator(d_sel).first
            if d_loc.count() > 0 and d_loc.is_visible():
                logger.info(f"Phát hiện hộp thoại đăng nhập, bấm bỏ qua: {d_sel}")
                d_loc.click()
                page.wait_for_timeout(1000)
                break

        # Nếu còn dialog che phủ, bấm phím Escape để đóng
        try:
            dialog = page.locator('div[role="dialog"]').first
            if dialog.count() > 0 and dialog.is_visible():
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
        except Exception:
            pass

    except Exception as e:
        logger.debug(f"Không có modal chặn hoặc bỏ qua modal thất bại: {e}")


def capture_failure_screenshot(page: Page, task_name: str) -> Optional[str]:
    """Chụp ảnh màn hình diagnostic khi crawler gặp lỗi (tuân thủ browser-automation-rpa skill)."""
    try:
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        sanitized_name = re.sub(r"[^\w\-]", "_", task_name)
        file_path = os.path.join(SCREENSHOTS_DIR, f"{sanitized_name}_{timestamp}.png")
        page.screenshot(path=file_path, full_page=False)
        logger.info(f"Đã lưu ảnh diagnostic chụp lỗi tại: {file_path}")
        return file_path
    except Exception as err:
        logger.warning(f"Không thể chụp ảnh màn hình lỗi: {err}")
        return None


# ==============================================================================
# CORE LOGIC TRÍCH XUẤT THÔNG TIN ĐỊA ĐIỂM & ĐÁNH GIÁ
# ==============================================================================

def extract_place_metadata(page: Page) -> Dict[str, Any]:
    """Bóc tách tên quán, địa chỉ và điểm đánh giá trung bình từ trang Google Maps."""
    # 1. Tên nhà hàng / quán ăn
    name = ""
    name_selectors = [
        "h1.DUwDvf",
        "h1.fontHeadlineLarge",
        "div[role='main'] h1",
        "h1"
    ]
    for sel in name_selectors:
        for loc in page.locator(sel).all():
            txt = loc.inner_text().strip()
            if not txt:
                continue
            # Bỏ qua các tiêu đề giao diện hoặc nhãn quảng cáo tài trợ
            lower_txt = txt.lower()
            if any(ign in lower_txt for ign in ["kết quả", "results", "google maps", "được tài trợ", "sponsored"]):
                continue
            name = txt
            break
        if name:
            break

    # 2. Địa chỉ
    address = ""
    address_selectors = [
        'button[data-item-id="address"]',
        'div.rogA2c div.Io6YTe',
        '[data-item-id="address"] div.fontBodyMedium',
        '[data-item-id="address"]'
    ]
    for sel in address_selectors:
        loc = page.locator(sel).first
        if loc.count() > 0 and loc.is_visible():
            address = clean_address(loc.inner_text().strip())
            break

    # 3. Điểm đánh giá trung bình (Overall Rating)
    overall_rating = 0.0
    rating_selectors = [
        'div.F7nice span[aria-hidden="true"]',
        'span.ceNzKf',
        'span.fontDisplayLarge',
        'div.F7nice'
    ]
    for sel in rating_selectors:
        loc = page.locator(sel).first
        if loc.count() > 0 and loc.is_visible():
            val = parse_star_rating(loc.inner_text().strip())
            if val > 0.0:
                overall_rating = val
                break

    return {
        "name": name,
        "address": address,
        "overall_rating": overall_rating
    }


def navigate_to_reviews_tab(page: Page) -> bool:
    """Đảm bảo trang đang mở tab 'Bài đánh giá' (Reviews)."""
    try:
        # 1. Kiểm tra xem tab Bài đánh giá đã được kích hoạt sẵn chưa (aria-selected="true")
        active_tab = page.locator('button[role="tab"][aria-selected="true"]').first
        if active_tab.count() > 0:
            tab_txt = active_tab.inner_text().lower()
            if "đánh giá" in tab_txt or "reviews" in tab_txt:
                return True

        # 2. Tìm tab Bài đánh giá và click chuyển tab
        review_tab_selectors = [
            page.locator('button[role="tab"]').filter(has_text="Bài đánh giá"),
            page.locator('button[role="tab"]').filter(has_text="Đánh giá"),
            page.locator('button[role="tab"]').filter(has_text="Reviews"),
            page.locator('button[role="tab"][aria-label*="Bài đánh giá" i]'),
            page.locator('button[role="tab"][aria-label*="Đánh giá" i]'),
            page.locator('button[role="tab"][aria-label*="Reviews" i]'),
        ]

        for locator in review_tab_selectors:
            if locator.count() > 0 and locator.first.is_visible():
                logger.info("Chuyển sang tab Đánh giá...")
                locator.first.click()
                page.wait_for_timeout(2500)
                handle_consent_and_modals(page)
                return True

        # Fallback: Nếu không tìm thấy tab nhưng đã có cards review trên DOM
        if page.locator("div.jftiEf").count() > 0:
            return True

        return False
    except Exception as e:
        logger.warning(f"Lỗi khi tìm tab đánh giá: {e}")
        return False


def harvest_all_reviews(page: Page, max_reviews: int = 30) -> List[Dict[str, Any]]:
    """
    Thu thập tối đa số lượng bài đánh giá từ Google Maps:
    1. Cuộn container ảo trên view hiện tại.
    2. Tự động chuyển qua các tiêu chí sắp xếp (Phù hợp nhất, Mới nhất, Xếp hạng cao nhất, Xếp hạng thấp nhất)
       để gom đầy đủ các luồng đánh giá phong phú (kể cả khi Google áp đặt Sign-In Wall ở phiên chưa đăng nhập).
    3. Mở rộng toàn văn bằng nút 'Xem thêm'.
    4. Khử trùng lặp theo ID và nội dung.
    """
    collected: Dict[str, Dict[str, Any]] = {}

    def extract_from_current_view():
        # Bấm nút 'Xem thêm' để mở rộng toàn văn
        try:
            expand_buttons = page.locator(
                'button.w8nwRe, button[aria-label*="Xem thêm" i], button[aria-label*="More" i]'
            ).all()
            for btn in expand_buttons:
                try:
                    if btn.is_visible():
                        btn.click(timeout=300)
                except Exception:
                    pass
        except Exception:
            pass

        cards = page.locator("div.jftiEf, div[data-review-id]").all()
        for card in cards:
            rev_id = card.get_attribute("data-review-id")

            # 1. Tác giả
            author = "Ẩn danh"
            for a_sel in ["div.d4r55", "button.alPumb", ".WNxzHc .d4r55"]:
                a_loc = card.locator(a_sel).first
                if a_loc.count() > 0:
                    txt = a_loc.inner_text().strip()
                    if txt:
                        author = txt
                        break

            # 2. Điểm đánh giá (1.0 - 5.0)
            rating = 5.0
            star_loc = card.locator("span.kvMYJc, span[role='img'][aria-label*='sao'], span[role='img'][aria-label*='star']").first
            if star_loc.count() > 0:
                rating = parse_star_rating(star_loc.get_attribute("aria-label") or "")

            # 3. Ngày đánh giá
            review_date = ""
            date_loc = card.locator("span.rsqaWe, .xRkPp span").first
            if date_loc.count() > 0:
                review_date = date_loc.inner_text().strip()

            # 4. Nội dung bài viết
            text = ""
            for t_sel in ["span.wiI7pd", "div.MyEned", "span.raw-review-text"]:
                t_loc = card.locator(t_sel).first
                if t_loc.count() > 0:
                    text = clean_review_text(t_loc.inner_text())
                    if text:
                        break

            # Khóa định danh chống trùng
            key = rev_id if rev_id else f"{author}_{text[:40]}"
            if text and len(text) >= 3 and key not in collected:
                collected[key] = {
                    "author": author,
                    "rating": rating,
                    "review_date": review_date,
                    "text": text,
                    "google_review_id": rev_id
                }

    # Bước 1: Trích xuất các bài đánh giá ở chế độ mặc định (Phù hợp nhất)
    extract_from_current_view()
    logger.info(f"Đã trích xuất {len(collected)} đánh giá ban đầu từ Google Maps.")

    # Bước 2: Duyệt qua các tiêu chí sắp xếp để gom thêm đánh giá (Multi-Sort Strategy)
    # 0: Phù hợp nhất, 1: Mới nhất, 2: Xếp hạng cao nhất, 3: Xếp hạng thấp nhất
    sort_labels = {
        1: "Mới nhất",
        2: "Xếp hạng cao nhất",
        3: "Xếp hạng thấp nhất"
    }

    for sort_idx in [1, 2, 3]:
        if len(collected) >= max_reviews:
            break

        sort_name = sort_labels.get(sort_idx, f"Sort {sort_idx}")
        try:
            # Cuộn container lên đỉnh để nút sắp xếp luôn nằm chuẩn xác trong viewport
            page.evaluate("() => { const c = document.querySelector('div.m6QErb.DxyBCb'); if (c) c.scrollTop = 0; }")
            page.wait_for_timeout(500)

            sort_btn = page.locator('button.FNe70d').first
            if sort_btn.count() > 0:
                sort_btn.scroll_into_view_if_needed()
                sort_btn.click(force=True)
                page.wait_for_timeout(1000)

                items = page.locator('div[role="menuitemradio"]').all()
                if len(items) > sort_idx:
                    item_text = items[sort_idx].inner_text().strip()
                    logger.info(f"Áp dụng bộ sắp xếp Google Maps: '{sort_name}' ({item_text})...")
                    items[sort_idx].click(force=True)
                    page.wait_for_timeout(2500)
                    handle_consent_and_modals(page)

                    extract_from_current_view()
                    logger.info(f"Tổng số đánh giá sau '{sort_name}': {len(collected)}")
        except Exception as e:
            logger.warning(f"Không thể đổi bộ sắp xếp '{sort_name}': {e}")

    # Bước 3: Tìm kiếm theo từ khóa chủ đề nếu vẫn chưa đủ max_reviews (Topic Search Strategy)
    if len(collected) < max_reviews:
        topic_keywords = ["ngon", "giá", "quán", "phục vụ", "sạch", "thái độ", "không gian", "đà nẵng"]
        search_input = page.locator('input.yBHhWb, input.tactile-searchbox-input').first

        for kw in topic_keywords:
            if len(collected) >= max_reviews:
                break
            try:
                page.evaluate("""() => {
                    const c = document.querySelector('div.m6QErb.DxyBCb');
                    if (c) c.scrollTop = 0;
                }""")
                page.wait_for_timeout(300)

                if search_input.count() > 0 and search_input.is_visible():
                    search_input.fill(kw)
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(2000)
                    handle_consent_and_modals(page)

                    extract_from_current_view()
                    logger.info(f"Tổng số đánh giá sau từ khóa '{kw}': {len(collected)}")
            except Exception as e:
                logger.debug(f"Lỗi khi tìm kiếm từ khóa '{kw}': {e}")

    return list(collected.values())[:max_reviews]


def scroll_and_expand_reviews(
    page: Page,
    max_reviews: int = 30,
    max_scroll_turns: int = 20
) -> None:
    """
    Cuộn container ảo Google Maps kết hợp thu hoạch đa chiều qua multi-sort.
    """
    try:
        harvested = harvest_all_reviews(page, max_reviews=max_reviews)
        if harvested and len(harvested) > 0:
            logger.info(f"Thu hoạch thành công {len(harvested)} bài đánh giá thông qua multi-sort và topic search.")
            setattr(page, "_harvested_reviews", harvested)
            return
    except Exception as e:
        logger.debug(f"harvest_all_reviews fallback sang scroll thông thường: {e}")

    logger.info(f"Bắt đầu cuộn container để tải tối đa {max_reviews} bài đánh giá...")
    prev_card_count = 0
    stagnant_turns = 0

    for turn in range(max_scroll_turns):
        cards = page.locator("div.jftiEf, div[data-review-id]").all()
        card_count = len(cards)

        if card_count >= max_reviews:
            logger.info(f"Đã đạt {card_count} bài đánh giá (yêu cầu {max_reviews}), dừng cuộn.")
            break

        if card_count == prev_card_count:
            stagnant_turns += 1
            if stagnant_turns >= 4:
                logger.info(f"Không có thêm bài đánh giá mới sau 4 lượt cuộn ({card_count} bài hiện tại). Dừng cuộn.")
                break
        else:
            stagnant_turns = 0
        prev_card_count = card_count

        # Cuộn container ảo thông qua JavaScript
        page.evaluate("""() => {
            const containers = Array.from(document.querySelectorAll('div.m6QErb.DxyBCb, div[role="feed"]'));
            for (const c of containers) {
                if (c.scrollHeight > c.clientHeight) {
                    c.scrollTop = c.scrollHeight;
                }
            }
        }""")

        # Đồng thời cuộn phần tử review cuối cùng vào viewport
        if cards:
            try:
                cards[-1].scroll_into_view_if_needed(timeout=1000)
            except Exception:
                pass

        # Human-like delay với random jitter 300ms - 600ms
        jitter_ms = random.randint(300, 600)
        page.wait_for_timeout(jitter_ms)

        # Kiểm tra nếu xuất hiện nút 'Xem các bài đánh giá khác'
        more_reviews_btn = page.locator('button[aria-label*="Xem các bài đánh giá khác"], button[aria-label*="More reviews"]').first
        if more_reviews_btn.count() > 0 and more_reviews_btn.is_visible():
            try:
                more_reviews_btn.click()
                page.wait_for_timeout(1000)
                handle_consent_and_modals(page)
            except Exception:
                pass

    # Bấm nút 'Xem thêm' / 'More' (button.w8nwRe) để mở rộng các đoạn văn dài bị rút gọn (...)
    try:
        expand_buttons = page.locator(
            'button.w8nwRe, button[aria-label*="Xem thêm" i], button[aria-label*="More" i]'
        ).all()
        for btn in expand_buttons:
            try:
                if btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(50)
            except Exception:
                pass
    except Exception as e:
        logger.debug(f"Lỗi khi mở rộng text review: {e}")


def extract_reviews_data(page: Page, max_reviews: int = 30) -> List[Dict[str, Any]]:
    """Trích xuất danh sách đánh giá có cấu trúc từ các phần tử DOM trên trang."""
    harvested = getattr(page, "_harvested_reviews", None)
    if harvested and isinstance(harvested, list) and len(harvested) > 0:
        return harvested[:max_reviews]

    cards = page.locator("div.jftiEf, div[data-review-id]").all()
    reviews: List[Dict[str, Any]] = []
    seen_ids = set()

    for card in cards:
        rev_id = card.get_attribute("data-review-id")
        if rev_id and rev_id in seen_ids:
            continue
        if rev_id:
            seen_ids.add(rev_id)

        # 1. Tác giả
        author = "Ẩn danh"
        for a_sel in ["div.d4r55", "button.alPumb", ".WNxzHc .d4r55"]:
            a_loc = card.locator(a_sel).first
            if a_loc.count() > 0:
                txt = a_loc.inner_text().strip()
                if txt:
                    author = txt
                    break

        # 2. Số sao đánh giá (1.0 - 5.0)
        rating = 5.0
        star_loc = card.locator("span.kvMYJc, span[role='img'][aria-label*='sao'], span[role='img'][aria-label*='star']").first
        if star_loc.count() > 0:
            rating = parse_star_rating(star_loc.get_attribute("aria-label") or "")

        # 3. Ngày đánh giá (Thời gian tương đối)
        review_date = ""
        date_loc = card.locator("span.rsqaWe, .xRkPp span").first
        if date_loc.count() > 0:
            review_date = date_loc.inner_text().strip()

        # 4. Nội dung đánh giá
        text = ""
        for t_sel in ["span.wiI7pd", "div.MyEned", "span.raw-review-text"]:
            t_loc = card.locator(t_sel).first
            if t_loc.count() > 0:
                text = clean_review_text(t_loc.inner_text())
                if text:
                    break

        reviews.append({
            "author": author,
            "rating": rating,
            "review_date": review_date,
            "text": text,
            "google_review_id": rev_id
        })

        if len(reviews) >= max_reviews:
            break

    return reviews


# ==============================================================================
# HÀM PUBLIC API CỦA MODULE
# ==============================================================================

def crawl_google_maps_reviews(
    url: str,
    max_reviews: int = 30,
    timeout_ms: int = 25000,
    headless: bool = True
) -> Dict[str, Any]:
    """
    Thu thập dữ liệu quán ăn và đánh giá trực tiếp từ một Google Maps URL.

    Args:
        url: Đường dẫn Google Maps của địa điểm hoặc kết quả tìm kiếm.
        max_reviews: Số lượng bài đánh giá tối đa cần cào (mặc định 30).
        timeout_ms: Thời gian chờ tối đa cho điều hướng và tải trang (ms).
        headless: Chạy trình duyệt ở chế độ không giao diện (mặc định True).

    Returns:
        Dict có cấu trúc chuẩn theo đặc tả hệ thống.
    """
    if not url or not isinstance(url, str) or not url.strip():
        return {
            "success": False,
            "restaurant_name": "",
            "address": "",
            "overall_rating": 0.0,
            "google_maps_url": url or "",
            "google_place_id": None,
            "reviews": [],
            "total_crawled": 0,
            "error": "URL Google Maps không được để trống."
        }

    url = url.strip()
    logger.info(f"Bắt đầu cào dữ liệu Google Maps từ URL: {url} (max_reviews={max_reviews})")

    browser: Optional[Browser] = None
    context: Optional[BrowserContext] = None
    page: Optional[Page] = None
    playwright_ctx = None

    try:
        playwright_ctx = sync_playwright().start()
        browser, context, page = create_stealth_browser(playwright_ctx, headless=headless)
        page.set_default_timeout(timeout_ms)

        # Điều hướng với domcontentloaded để tránh treo trên Google Maps tile streaming
        page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        page.wait_for_timeout(3000)

        handle_consent_and_modals(page)

        # Nếu URL trỏ tới danh sách kết quả tìm kiếm thay vì 1 quán cụ thể, chọn kết quả đầu tiên (bỏ qua quảng cáo)
        search_results = page.locator("a.hfpxzc").all()
        if search_results:
            target_res = search_results[0]
            for sr in search_results:
                try:
                    # Kiểm tra toàn bộ thẻ bọc kết quả (div.Nv2PK) xem có phải vị trí được tài trợ (quảng cáo) không
                    card_text = sr.evaluate("el => { const c = el.closest('div.Nv2PK') || el.parentElement; return c ? c.innerText : ''; }")
                    lower_card = card_text.lower()
                    if "được tài trợ" not in lower_card and "sponsored" not in lower_card:
                        target_res = sr
                        break
                except Exception:
                    pass
            logger.info(f"Phát hiện trang danh sách tìm kiếm ({len(search_results)} địa điểm). Chọn địa điểm phù hợp.")
            target_res.click()
            page.wait_for_timeout(3000)
            handle_consent_and_modals(page)
            try:
                page.locator("h1.DUwDvf, div[role='main'] h1, h1").first.wait_for(state="visible", timeout=8000)
            except Exception:
                pass

        final_url = page.url
        place_id = extract_place_id_from_url(final_url) or extract_place_id_from_url(url)

        # Bóc tách thông tin tổng quan quán
        metadata = extract_place_metadata(page)
        name = metadata["name"]
        if not name and search_results:
            try:
                name = target_res.get_attribute("aria-label") or ""
            except Exception:
                pass
        address = metadata["address"]
        overall_rating = metadata["overall_rating"]

        logger.info(f"Đã xác định địa điểm: '{name}' | Điểm: {overall_rating} | Địa chỉ: '{address}'")

        # Điều hướng sang tab Đánh giá
        navigate_to_reviews_tab(page)

        # Cuộn và mở rộng bài đánh giá
        scroll_and_expand_reviews(page, max_reviews=max_reviews)

        # Trích xuất dữ liệu bài đánh giá
        reviews = extract_reviews_data(page, max_reviews=max_reviews)
        logger.info(f"Hoàn tất trích xuất {len(reviews)} bài đánh giá từ Google Maps.")

        return {
            "success": True,
            "restaurant_name": name,
            "address": address,
            "overall_rating": overall_rating,
            "google_maps_url": final_url,
            "google_place_id": place_id,
            "reviews": reviews,
            "total_crawled": len(reviews),
            "error": None
        }

    except Exception as e:
        error_msg = f"Lỗi cào dữ liệu Google Maps: {str(e)}"
        logger.error(error_msg, exc_info=True)
        if page:
            capture_failure_screenshot(page, "crawl_google_maps_error")
        return {
            "success": False,
            "restaurant_name": "",
            "address": "",
            "overall_rating": 0.0,
            "google_maps_url": url,
            "google_place_id": extract_place_id_from_url(url),
            "reviews": [],
            "total_crawled": 0,
            "error": error_msg
        }

    finally:
        # Dọn dẹp tài nguyên triệt để chống memory leak
        if context:
            try:
                context.close()
            except Exception:
                pass
        if browser:
            try:
                browser.close()
            except Exception:
                pass
        if playwright_ctx:
            try:
                playwright_ctx.stop()
            except Exception:
                pass


def search_and_crawl_google_maps(
    query: str,
    city: str = "Đà Nẵng",
    max_reviews: int = 30,
    timeout_ms: int = 25000,
    headless: bool = True
) -> Dict[str, Any]:
    """
    Tìm kiếm quán ăn trên Google Maps theo từ khóa + thành phố và cào dữ liệu đánh giá.

    Args:
        query: Tên nhà hàng / quán ăn hoặc món ăn (ví dụ: 'Cơm Gà Gia Vĩnh').
        city: Thành phố / Tỉnh (mặc định: 'Đà Nẵng').
        max_reviews: Số lượng bài đánh giá tối đa cần cào (mặc định 30).
        timeout_ms: Thời gian chờ tối đa (ms).
        headless: Chế độ chạy không giao diện.

    Returns:
        Dict có cấu trúc chuẩn theo đặc tả hệ thống.
    """
    if not query or not query.strip():
        return {
            "success": False,
            "restaurant_name": "",
            "address": "",
            "overall_rating": 0.0,
            "google_maps_url": "",
            "google_place_id": None,
            "reviews": [],
            "total_crawled": 0,
            "error": "Từ khóa tìm kiếm không được để trống."
        }

    clean_query = query.strip()
    clean_city = city.strip() if city else ""
    full_search = f"{clean_query} {clean_city}".strip()
    encoded_query = full_search.replace(" ", "+")
    search_url = f"https://www.google.com/maps/search/{encoded_query}"

    logger.info(f"Tìm kiếm và cào dữ liệu Google Maps cho từ khóa: '{full_search}'")
    return crawl_google_maps_reviews(
        url=search_url,
        max_reviews=max_reviews,
        timeout_ms=timeout_ms,
        headless=headless
    )
