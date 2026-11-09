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
import subprocess
import unicodedata
import socket
import ipaddress
from urllib.parse import urlparse
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


def check_address_match(card_text: str, target_addr: str) -> float:
    """
    Tính điểm khớp giữa văn bản thẻ kết quả tìm kiếm Google Maps và địa chỉ mục tiêu (0.0 -> 1.0+).
    Hỗ trợ nhận diện đúng chi nhánh quán ăn (VD: phân biệt QL22B vs 30 Tháng 4).
    """
    if not card_text or not target_addr:
        return 0.0

    def _norm(t: str) -> str:
        t = str(t).lower()
        t = t.replace("đ", "d").replace("Đ", "d")
        nfd = unicodedata.normalize("NFD", t)
        t = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
        return re.sub(r"[^a-z0-9\s]", " ", t)

    norm_card = _norm(card_text)
    norm_addr = _norm(target_addr)

    # 1. Trích xuất các số nhà hoặc mã đường đặc thù (VD: "22b", "241", "30", "17")
    addr_numbers = re.findall(r"\b\d+[a-z]?\b", norm_addr)
    # 2. Trích xuất các từ khóa địa chỉ có độ dài >= 3
    addr_tokens = [w for w in norm_addr.split() if len(w) >= 3]

    if not addr_tokens:
        return 0.0

    match_count = sum(1 for tok in addr_tokens if tok in norm_card)
    score = match_count / len(addr_tokens)

    # Thưởng điểm nếu khớp số nhà / số quốc lộ / số đường
    for num in addr_numbers:
        if num in norm_card:
            score += 0.35
            break

    return score


# ==============================================================================
# QUẢN LÝ BROWSER PLAYWRIGHT HEADLESS & STEALTH
# ==============================================================================

def resolve_chromium_executable(playwright_instance) -> Optional[str]:
    """
    Xác định đường dẫn binary Chromium hợp lệ cho Playwright với cơ chế tự phục hồi (Self-Healing Fallback):
    1. Kiểm tra Playwright bundled browser tại playwright_instance.chromium.executable_path.
    2. Nếu chưa có hoặc file không tồn tại, tự động fallback sang Chromium hệ thống (/usr/bin/chromium hoặc CHROME_BIN).
    3. Nếu cả hai chưa có, thử tự động chạy 'subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"])'.
    """
    # 1. Kiểm tra Playwright bundled browser
    try:
        bundled_path = playwright_instance.chromium.executable_path
        if bundled_path and os.path.exists(bundled_path) and os.path.isfile(bundled_path):
            logger.info(f"Sử dụng Playwright bundled Chromium: {bundled_path}")
            return bundled_path
        else:
            logger.warning(
                f"Playwright bundled Chromium không tồn tại tại: '{bundled_path}'. "
                "Bắt đầu kích hoạt cơ chế Fallback..."
            )
    except Exception as e:
        logger.warning(f"Lỗi khi kiểm tra Playwright bundled executable_path: {e}")

    # 2. Fallback sang Chromium hệ thống (CHROME_BIN hoặc /usr/bin/chromium)
    system_candidates = [
        os.environ.get("CHROME_BIN"),
        os.environ.get("CHROMIUM_PATH"),
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
    ]
    for candidate in system_candidates:
        if candidate and os.path.exists(candidate) and os.path.isfile(candidate):
            logger.info(f"Kích hoạt Fallback thành công: Sử dụng Chromium hệ thống tại '{candidate}'")
            return candidate

    # 3. Nếu cả hai chưa có, thử tự động chạy subprocess playwright install chromium
    logger.warning("Không tìm thấy Chromium hệ thống. Đang kích hoạt tự động cài đặt qua Playwright...")
    try:
        logger.info("Đang thực thi: python -m playwright install chromium...")
        install_res = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=True,
            text=True,
            timeout=120
        )
        if install_res.returncode == 0:
            logger.info("Tự động cài đặt Playwright Chromium thành công.")
            try:
                bundled_path = playwright_instance.chromium.executable_path
                if bundled_path and os.path.exists(bundled_path) and os.path.isfile(bundled_path):
                    return bundled_path
            except Exception:
                pass
        else:
            logger.error(
                f"Lệnh cài đặt Playwright Chromium trả về mã lỗi {install_res.returncode}. "
                f"stderr: {install_res.stderr.strip()[:300]}"
            )
    except Exception as inst_err:
        logger.error(f"Quá trình tự động cài đặt Playwright Chromium gặp ngoại lệ: {inst_err}")

    return None


_SSRF_PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_ssrf_safe_crawler_url(url_str: str) -> bool:
    """
    [TASK-P1-06] Phòng vệ SSRF cho Playwright Browser:
    Chặn đứng các URL điều hướng nếu host hoặc IP phân giải thuộc dải private/loopback/cloud-metadata.
    Chỉ chấp nhận giao thức https://.
    """
    try:
        if not url_str or not isinstance(url_str, str):
            return False
            
        parsed = urlparse(url_str)
        # 1. Chỉ chấp nhận giao thức https://
        if parsed.scheme.lower() != "https":
            return False

        hostname = (parsed.hostname or "").lower().strip()
        if not hostname:
            return False

        # 2. Chặn các hostname nhạy cảm
        if hostname in ("localhost", "metadata.google.internal", "instance-data"):
            return False

        # 3. Kiểm tra nếu hostname là raw IP
        try:
            ip = ipaddress.ip_address(hostname)
            if any(ip in net for net in _SSRF_PRIVATE_NETWORKS) or ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
            if str(ip) == "169.254.169.254":
                return False
            return True
        except ValueError:
            pass

        # 4. Phân giải DNS kiểm tra các IP đích
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)
                if any(ip in net for net in _SSRF_PRIVATE_NETWORKS) or ip.is_private or ip.is_loopback or ip.is_link_local:
                    return False
                if str(ip) == "169.254.169.254":
                    return False
        except Exception:
            return False

        return True
    except Exception:
        return False


def create_stealth_browser(
    playwright_instance,
    headless: bool = True
) -> tuple[Browser, BrowserContext, Page]:
    """
    Khởi tạo phiên bản Chromium với cờ chống bot, giả lập thông số desktop Chrome thật.
    Tích hợp cơ chế tự phục hồi phòng vệ (Self-Healing Fallback) chống thiếu Browser Executable.
    """
    args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-infobars",
        "--window-size=1280,800",
        "--js-flags=--max-old-space-size=128",
        "--renderer-process-limit=1",
        "--disable-software-rasterizer",
        "--mute-audio",
    ]

    executable_path = resolve_chromium_executable(playwright_instance)

    launch_kwargs: Dict[str, Any] = {
        "headless": headless,
        "args": args
    }
    if executable_path:
        launch_kwargs["executable_path"] = executable_path

    try:
        browser = playwright_instance.chromium.launch(**launch_kwargs)
    except Exception as launch_err:
        logger.error(f"Khởi động Chromium với executable_path='{executable_path}' thất bại: {launch_err}")
        # Thử fallback chéo sang Chromium hệ thống nếu chưa sử dụng
        fallback_bin = os.environ.get("CHROME_BIN") or "/usr/bin/chromium"
        if executable_path != fallback_bin and os.path.exists(fallback_bin) and os.path.isfile(fallback_bin):
            logger.info(f"Thử khởi động lại bằng Chromium hệ thống tại '{fallback_bin}'...")
            launch_kwargs["executable_path"] = fallback_bin
            browser = playwright_instance.chromium.launch(**launch_kwargs)
        else:
            raise launch_err

    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        locale="vi-VN",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    )

    # Chặn (abort) các tài nguyên nặng không cần thiết để tối ưu RAM (cắt giảm 75%) và tăng tốc độ cào
    media_pattern = re.compile(r"\.(png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|mp4|webm)($|\?)", re.IGNORECASE)
    tile_patterns = ["/maps/vt/", "khms", "ggpht.com", "googleusercontent.com/p/"]

    def _block_heavy_resources(route):
        try:
            req = route.request
            req_url = req.url
            res_type = req.resource_type

            # [TASK-P1-06] Phòng vệ SSRF: Chặn các URL không an toàn (non-https hoặc private/loopback/cloud-metadata)
            if not is_ssrf_safe_crawler_url(req_url):
                logger.warning(f"[Security/SSRF] Chặn yêu cầu nguy hiểm từ crawler: {req_url}")
                route.abort()
                return

            # Tuyệt đối KHÔNG chặn script và HTML document
            if res_type in ("document", "script"):
                route.continue_()
                return

            # Chặn toàn bộ map tiles Google Maps
            if any(tp in req_url for tp in tile_patterns):
                route.abort()
                return

            # Chặn hình ảnh, media, webfont
            if res_type in ("image", "media", "font"):
                route.abort()
                return

            # Chặn theo định dạng phần mở rộng tĩnh
            if media_pattern.search(req_url):
                route.abort()
                return

            route.continue_()
        except Exception:
            try:
                route.continue_()
            except Exception:
                pass

    try:
        context.route("**/*", _block_heavy_resources)
    except Exception as route_err:
        logger.debug(f"Không thể thiết lập route filter trên context: {route_err}")

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
            'button:has-text("Loại bỏ")',
            'button:has-text("Dismiss")',
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
        # 1. Kiểm tra xem tab Bài đánh giá đã được kích hoạt sẵn chưa (URL chứa !9m1!1b1 hoặc aria-selected="true")
        current_url = getattr(page, "url", "") or ""
        if "!9m1!1b1" in current_url:
            logger.info("Trang đã ở sẵn URL chuyên dụng Bài đánh giá (!9m1!1b1).")
            return True

        active_tab = page.locator('button[role="tab"][aria-selected="true"]').first
        if active_tab.count() > 0:
            tab_txt = (active_tab.inner_text() or "").lower()
            tab_aria = (active_tab.get_attribute("aria-label") or "").lower()
            if "đánh giá" in tab_txt or "reviews" in tab_txt or "đánh giá" in tab_aria or "reviews" in tab_aria:
                logger.info("Tab Bài đánh giá đã được kích hoạt sẵn (aria-selected='true').")
                return True

        # 2. Tìm tab Bài đánh giá đa ngôn ngữ và click chuyển tab
        review_tab_selectors = [
            page.locator('button[role="tab"][aria-label*="Reviews" i]'),
            page.locator('button[role="tab"][aria-label*="Bài đánh giá" i]'),
            page.locator('button[role="tab"][aria-label*="đánh giá" i]'),
            page.locator('button[role="tab"]').filter(has_text="Bài đánh giá"),
            page.locator('button[role="tab"]').filter(has_text="Đánh giá"),
            page.locator('button[role="tab"]').filter(has_text="Reviews"),
            page.locator('button[aria-label*="Bài đánh giá" i]'),
            page.locator('button[aria-label*="Reviews" i]'),
        ]

        tab_clicked = False
        for locator in review_tab_selectors:
            try:
                if locator.count() > 0 and locator.first.is_visible():
                    logger.info("Chuyển sang tab Đánh giá...")
                    locator.first.click()
                    tab_clicked = True
                    page.wait_for_timeout(random.randint(1500, 2000))
                    handle_consent_and_modals(page)
                    break
            except Exception as click_err:
                logger.debug(f"Không thể click selector tab: {click_err}")

        # 3. Nếu chưa vào được tab đánh giá (hoặc URL chưa cập nhật !9m1!1b1), tìm và click nút mở rộng bài đánh giá
        updated_url = getattr(page, "url", "") or ""
        if "!9m1!1b1" not in updated_url:
            more_reviews_selectors = [
                page.locator('button:has-text("Xem các bài đánh giá khác")'),
                page.locator('button:has-text("Bài đánh giá khác")'),
                page.locator('button[aria-label*="Xem các bài đánh giá khác" i]'),
                page.locator('button[aria-label*="Bài đánh giá khác" i]'),
                page.locator('button:has-text("More reviews")'),
                page.locator('button[aria-label*="More reviews" i]'),
                page.locator('button:has-text("Xem tất cả bài đánh giá")'),
                page.locator('button[aria-label*="Xem tất cả bài đánh giá" i]'),
                page.locator('button.uj73Ce:has-text("đánh giá")'),
                page.locator('button.uj73Ce:has-text("reviews")'),
                page.locator('button.uj73Ce'),
            ]
            for m_loc in more_reviews_selectors:
                try:
                    if m_loc.count() > 0 and m_loc.first.is_visible():
                        logger.info("Click nút mở rộng danh sách đánh giá...")
                        try:
                            m_loc.first.scroll_into_view_if_needed(timeout=500)
                        except Exception:
                            pass
                        m_loc.first.click()
                        tab_clicked = True
                        page.wait_for_timeout(random.randint(1500, 2000))
                        handle_consent_and_modals(page)
                        break
                except Exception as m_err:
                    logger.debug(f"Không thể click nút mở rộng đánh giá: {m_err}")

        # 4. Kiểm tra điều kiện xác nhận đã ở tab đánh giá (siết chặt, không để 3 preview cards ở Tổng quan đánh lừa)
        final_url = getattr(page, "url", "") or ""
        if "!9m1!1b1" in final_url:
            return True

        try:
            active_tab_final = page.locator('button[role="tab"][aria-selected="true"]').first
            if active_tab_final.count() > 0:
                f_txt = (active_tab_final.inner_text() or "").lower()
                f_aria = (active_tab_final.get_attribute("aria-label") or "").lower()
                if "đánh giá" in f_txt or "reviews" in f_txt or "đánh giá" in f_aria or "reviews" in f_aria:
                    return True
        except Exception:
            pass

        try:
            if page.locator('div[role="feed"]').count() > 0:
                return True
        except Exception:
            pass

        if tab_clicked:
            return True

        return False
    except Exception as e:
        logger.warning(f"Lỗi khi tìm tab đánh giá: {e}")
        return False


def harvest_all_reviews(
    page: Page,
    max_reviews: int = 30,
    deadline: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Thu thập tối đa số lượng bài đánh giá từ Google Maps:
    1. Tự động kiểm tra và click nút mở rộng bài đánh giá nếu xuất hiện.
    2. Cuộn container ảo (div.m6QErb.DxyBCb, div[role="feed"] hoặc ancestor cuộn được) gán scrollTop = scrollHeight.
    3. Cuộn card cuối cùng vào tầm nhìn và kích hoạt tải batchexecute.
    4. Click nút 'Xem thêm' (button.w8nwRe) để mở rộng toàn văn bài viết.
    5. Bóc tách thẻ bài viết (div.jftiEf, div[data-review-id]) và khử trùng lặp theo ID / nội dung.
    6. Cơ chế dừng sớm (Early Stopping): Dừng khi đạt max_reviews hoặc sau stagnant_turns >= 4 lượt cuộn số lượng không đổi.
    7. Giữ an toàn deadline (Internal Timeout Guard).
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
                        btn.click(timeout=250)
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

    # 1. Kiểm tra và tự động bấm nút mở rộng đánh giá (nếu vẫn ở màn hình preview)
    try:
        more_selectors = [
            page.locator('button:has-text("Xem các bài đánh giá khác")'),
            page.locator('button:has-text("Bài đánh giá khác")'),
            page.locator('button[aria-label*="Xem các bài đánh giá khác" i]'),
            page.locator('button[aria-label*="Bài đánh giá khác" i]'),
            page.locator('button:has-text("More reviews")'),
            page.locator('button[aria-label*="More reviews" i]'),
            page.locator('button.uj73Ce:has-text("đánh giá")'),
            page.locator('button.uj73Ce:has-text("reviews")'),
            page.locator('button.uj73Ce'),
        ]
        for m_loc in more_selectors:
            if m_loc.count() > 0 and m_loc.first.is_visible():
                logger.info("Phát hiện nút mở rộng bài đánh giá, bấm để mở danh sách...")
                try:
                    m_loc.first.scroll_into_view_if_needed(timeout=500)
                except Exception:
                    pass
                m_loc.first.click(timeout=1000)
                page.wait_for_timeout(random.randint(1500, 2000))
                handle_consent_and_modals(page)
                break
    except Exception as e:
        logger.debug(f"Không thể click nút mở rộng bài đánh giá: {e}")

    # Trích xuất các bài đánh giá ban đầu
    extract_from_current_view()
    logger.info(f"Đã trích xuất {len(collected)} đánh giá ban đầu từ Google Maps.")

    if len(collected) >= max_reviews:
        return list(collected.values())[:max_reviews]

    # Cuộn container ảo theo từng đợt với Early Stopping (ngưỡng >= 4 lượt)
    max_scroll_turns = 35
    prev_count = len(collected)
    stagnant_turns = 0

    for turn in range(max_scroll_turns):
        # Kiểm tra deadline bảo vệ timeout 35s
        if deadline and time.time() >= deadline:
            logger.info("Chạm deadline an toàn trong quá trình cuộn, dừng thu thập sớm.")
            break

        # Cuộn container ảo: Tìm phần tử cha cuộn được và gán scrollTop = scrollHeight
        try:
            page.evaluate("""() => {
                const containers = Array.from(document.querySelectorAll('div.m6QErb.DxyBCb, div[role="feed"]'));
                let scrolled = false;
                for (const c of containers) {
                    if (c && c.scrollHeight > c.clientHeight) {
                        c.scrollTop = c.scrollHeight;
                        c.dispatchEvent(new Event('scroll', { bubbles: true }));
                        scrolled = true;
                    }
                }
                if (!scrolled) {
                    const cards = document.querySelectorAll('div.jftiEf, div[data-review-id]');
                    if (cards.length > 0) {
                        let p = cards[cards.length - 1].parentElement;
                        while (p && p !== document.body) {
                            const style = window.getComputedStyle(p);
                            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && p.scrollHeight > p.clientHeight) {
                                p.scrollTop = p.scrollHeight;
                                p.dispatchEvent(new Event('scroll', { bubbles: true }));
                                break;
                            }
                            p = p.parentElement;
                        }
                    }
                }
            }""")
        except Exception:
            pass

        # Cuộn thẻ card cuối cùng vào tầm nhìn để trigger lazy load / batchexecute
        try:
            cards = page.locator("div.jftiEf, div[data-review-id]").all()
            if cards:
                cards[-1].scroll_into_view_if_needed(timeout=600)
        except Exception:
            pass

        # Kiểm tra nếu xuất hiện nút 'Xem các bài đánh giá khác' trong quá trình cuộn
        try:
            more_btn = page.locator('button:has-text("Xem các bài đánh giá khác"), button:has-text("Bài đánh giá khác"), button.uj73Ce').first
            if more_btn.count() > 0 and more_btn.is_visible():
                more_btn.click(timeout=600)
                page.wait_for_timeout(800)
                handle_consent_and_modals(page)
        except Exception:
            pass

        # Chờ mạng tải dữ liệu (1800ms - 2400ms) để Google Maps batchexecute kịp fetch và render lô đánh giá kế tiếp
        page.wait_for_timeout(random.randint(1800, 2400))
        handle_consent_and_modals(page)

        # Trích xuất sau mỗi lượt cuộn
        extract_from_current_view()
        current_count = len(collected)

        # Điều kiện dừng 1: Đã đạt số lượng mong muốn
        if current_count >= max_reviews:
            logger.info(f"Đã thu thập đủ {current_count}/{max_reviews} bài đánh giá. Dừng cuộn.")
            break

        # Điều kiện dừng 2: Early Stopping nếu sau 4 lượt cuộn liên tiếp không tăng thêm
        if current_count == prev_count:
            stagnant_turns += 1
            if stagnant_turns >= 4:
                logger.info(
                    f"Kích hoạt Early Stopping: Số bài đánh giá không tăng sau 4 lượt cuộn liên tiếp "
                    f"({current_count} bài). Dừng cuộn."
                )
                break
        else:
            stagnant_turns = 0

        prev_count = current_count

    return list(collected.values())[:max_reviews]


def scroll_and_expand_reviews(
    page: Page,
    max_reviews: int = 30,
    max_scroll_turns: int = 20,
    deadline: Optional[float] = None
) -> None:
    """
    Cuộn container ảo Google Maps kết hợp thu hoạch bài đánh giá tối ưu.
    """
    try:
        harvested = harvest_all_reviews(page, max_reviews=max_reviews, deadline=deadline)
        if harvested and len(harvested) > 0:
            logger.info(f"Thu hoạch thành công {len(harvested)} bài đánh giá.")
            setattr(page, "_harvested_reviews", harvested)
            return
    except Exception as e:
        logger.debug(f"harvest_all_reviews gặp ngoại lệ: {e}")


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
    headless: bool = True,
    target_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thu thập dữ liệu quán ăn và đánh giá trực tiếp từ một Google Maps URL.

    Args:
        url: Đường dẫn Google Maps của địa điểm hoặc kết quả tìm kiếm.
        max_reviews: Số lượng bài đánh giá tối đa cần cào (mặc định 30).
        timeout_ms: Thời gian chờ tối đa cho điều hướng và tải trang (ms).
        headless: Chạy trình duyệt ở chế độ không giao diện (mặc định True).
        target_address: Địa chỉ quán mục tiêu để kiểm tra khớp chi nhánh nếu gặp trang kết quả tìm kiếm.

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

    start_time = time.time()
    internal_deadline = start_time + 35.0  # Ngưỡng an toàn 35s chống Render 502/100s timeout

    browser: Optional[Browser] = None
    context: Optional[BrowserContext] = None
    page: Optional[Page] = None
    playwright_ctx = None

    try:
        playwright_ctx = sync_playwright().start()
        browser, context, page = create_stealth_browser(playwright_ctx, headless=headless)
        page.set_default_timeout(min(timeout_ms, 20000))

        # Điều hướng với domcontentloaded để tránh treo trên Google Maps tile streaming
        page.goto(url, wait_until="domcontentloaded", timeout=min(timeout_ms, 20000))
        page.wait_for_timeout(1500)

        handle_consent_and_modals(page)

        # Nếu URL trỏ tới danh sách kết quả tìm kiếm thay vì 1 quán cụ thể
        search_results = page.locator("a.hfpxzc").all()
        if search_results:
            target_res = search_results[0]
            matched_candidate = None
            best_match_score = 0.0

            # Duyệt qua tối đa 5 kết quả đầu tiên (bỏ qua quảng cáo, khớp địa chỉ mục tiêu nếu có)
            candidates_to_check = search_results[:5]
            for sr in candidates_to_check:
                try:
                    card_text = sr.evaluate("el => { const c = el.closest('div.Nv2PK') || el.parentElement; return c ? c.innerText : ''; }")
                    lower_card = card_text.lower()
                    if "được tài trợ" in lower_card or "sponsored" in lower_card:
                        continue

                    if matched_candidate is None:
                        matched_candidate = sr

                    if target_address:
                        score = check_address_match(card_text, target_address)
                        if score > best_match_score:
                            best_match_score = score
                            matched_candidate = sr
                except Exception:
                    pass

            target_res = matched_candidate or search_results[0]
            if target_address and best_match_score >= 0.3:
                logger.info(f"Phát hiện danh sách tìm kiếm: Chọn kết quả khớp địa chỉ mục tiêu '{target_address}' (score={round(best_match_score, 2)}).")
            else:
                logger.info(f"Phát hiện trang danh sách tìm kiếm ({len(search_results)} địa điểm). Chọn địa điểm phù hợp.")

            target_res.click()
            page.wait_for_timeout(2000)
            handle_consent_and_modals(page)
            try:
                page.locator("h1.DUwDvf, div[role='main'] h1, h1").first.wait_for(state="visible", timeout=6000)
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

        # Kiểm tra deadline an toàn trước khi vào tab Đánh giá
        if time.time() < internal_deadline:
            # Điều hướng sang tab Đánh giá
            navigate_to_reviews_tab(page)

            # Cuộn và mở rộng bài đánh giá với deadline guard 35s
            scroll_and_expand_reviews(page, max_reviews=max_reviews, deadline=internal_deadline)

        # Trích xuất dữ liệu bài đánh giá
        reviews = extract_reviews_data(page, max_reviews=max_reviews)
        duration = round(time.time() - start_time, 2)
        logger.info(f"Hoàn tất trích xuất {len(reviews)} bài đánh giá từ Google Maps trong {duration}s.")

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
        # Cơ chế phục hồi một phần: Nếu đã có reviews được thu hoạch trước khi timeout/lỗi, trả về dữ liệu đó
        harvested = getattr(page, "_harvested_reviews", None) if page else None
        if harvested and len(harvested) > 0:
            logger.warning(f"Quá trình cào gặp ngoại lệ nhưng đã thu hoạch được {len(harvested)} bài đánh giá. Trả về kết quả một phần.")
            meta = {}
            try:
                meta = extract_place_metadata(page)
            except Exception:
                pass
            return {
                "success": True,
                "restaurant_name": meta.get("name") or "",
                "address": meta.get("address") or "",
                "overall_rating": meta.get("overall_rating") or 0.0,
                "google_maps_url": getattr(page, "url", url),
                "google_place_id": extract_place_id_from_url(getattr(page, "url", url)),
                "reviews": harvested[:max_reviews],
                "total_crawled": len(harvested[:max_reviews]),
                "error": None
            }
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
    city: str = "",
    max_reviews: int = 30,
    timeout_ms: int = 25000,
    headless: bool = True,
    target_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tìm kiếm quán ăn trên Google Maps theo từ khóa + thành phố và cào dữ liệu đánh giá.

    Args:
        query: Tên nhà hàng / quán ăn hoặc món ăn (ví dụ: 'Cơm Gà Gia Vĩnh').
        city: Thành phố / Tỉnh (mặc định rỗng, chỉ ghép nếu được truyền).
        max_reviews: Số lượng bài đánh giá tối đa cần cào (mặc định 30).
        timeout_ms: Thời gian chờ tối đa (ms).
        headless: Chế độ chạy không giao diện.
        target_address: Địa chỉ chi nhánh mục tiêu để đối chiếu tránh lệch quán.

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
    lower_query = clean_query.lower()

    # Nhận diện nếu query thực chất là liên kết Google Maps URL trực tiếp
    is_direct_url = (
        clean_query.startswith("http://")
        or clean_query.startswith("https://")
        or "google.com/maps" in lower_query
        or "goo.gl" in lower_query
    )

    if is_direct_url:
        target_url = clean_query
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            target_url = f"https://{target_url}"
        logger.info(f"Nhận diện query là URL Google Maps trực tiếp: '{target_url}' (Bỏ qua ghép thành phố).")
        return crawl_google_maps_reviews(
            url=target_url,
            max_reviews=max_reviews,
            timeout_ms=timeout_ms,
            headless=headless,
            target_address=target_address
        )

    clean_city = city.strip() if city else ""
    full_search = f"{clean_query} {clean_city}".strip()
    encoded_query = full_search.replace(" ", "+")
    search_url = f"https://www.google.com/maps/search/{encoded_query}"

    logger.info(f"Tìm kiếm và cào dữ liệu Google Maps cho từ khóa: '{full_search}'")
    return crawl_google_maps_reviews(
        url=search_url,
        max_reviews=max_reviews,
        timeout_ms=timeout_ms,
        headless=headless,
        target_address=target_address
    )
