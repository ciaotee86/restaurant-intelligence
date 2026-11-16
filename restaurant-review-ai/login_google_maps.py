"""
Tiện ích đăng nhập Google Maps 1 lần để lưu phiên làm việc (Playwright storage_state.json).
Giúp crawler thoát khỏi chế độ 'Limited View' (giới hạn 5 đánh giá) khi demo trên máy Local.

Cách dùng:
    python restaurant-review-ai/login_google_maps.py
"""

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from crawler.google_maps_crawler import DEFAULT_AUTH_STATE_PATH


def save_google_maps_login_session(auth_path: str = DEFAULT_AUTH_STATE_PATH) -> bool:
    """Mở trình duyệt thật để người dùng tự đăng nhập Google và lưu storage_state."""
    target_path = Path(auth_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  ĐĂNG NHẬP GOOGLE MAPS ĐỂ MỞ KHÓA CÀO 50+ ĐÁNH GIÁ (LOCAL DEMO)")
    print("=" * 70)
    print(f"File lưu phiên (đã ẩn khỏi Git): {target_path}\n")
    print("Hướng dẫn từng bước:")
    print("  1. Chờ cửa sổ Chrome mở trang Google Maps.")
    print("  2. Bấm nút 'Đăng nhập' (Sign in) ở góc trên bên phải.")
    print("  3. Đăng nhập bằng tài khoản Google (khuyên dùng 1 Gmail phụ).")
    print("  4. Khi thấy ảnh đại diện Google ở góc phải trên Google Maps,")
    print("     HÃY GIỮ NGUYÊN CỬA SỔ TRÌNH DUYỆT ĐÓ, quay lại đây và nhấn [Enter].\n")

    with sync_playwright() as p:
        launch_kwargs = {
            "headless": False,
            "ignore_default_args": ["--enable-automation"],
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--start-maximized",
            ],
        }

        browser = None
        try:
            # Ưu tiên Chrome cài sẵn trên máy vì Google cho phép đăng nhập mượt hơn Chromium test
            browser = p.chromium.launch(channel="chrome", **launch_kwargs)
            print("-> Đã mở Google Chrome hệ thống.")
        except Exception:
            print("-> Không tìm thấy Chrome hệ thống, chuyển sang Playwright Chromium...")
            browser = p.chromium.launch(**launch_kwargs)

        context_kwargs = {"viewport": None, "locale": "vi-VN"}
        if target_path.exists():
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                if isinstance(existing, dict) and existing.get("cookies"):
                    context_kwargs["storage_state"] = str(target_path)
                    print("-> Đã nạp phiên đăng nhập cũ để kiểm tra/gia hạn.")
            except Exception:
                pass

        context = None
        try:
            context = browser.new_context(**context_kwargs)
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )
            page = context.new_page()
            page.goto("https://www.google.com/maps?hl=vi", wait_until="domcontentloaded", timeout=30000)

            try:
                input(">>> Sau khi đăng nhập Google Maps XONG trên Chrome, hãy nhấn phím [Enter] tại đây để lưu phiên: ")
            except (EOFError, KeyboardInterrupt):
                print("\n⚠️ Đã hủy thao tác lưu phiên (không ghi đè file cũ).")
                return False

            state = context.storage_state(path=str(target_path))
            cookies_count = len(state.get("cookies", []))
            google_cookies = [c for c in state.get("cookies", []) if "google" in c.get("domain", "")]
            auth_cookies = [
                c["name"] for c in google_cookies
                if c.get("name") in ("SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-1PSID", "__Secure-3PSID")
            ]

            print(f"\n✅ Đã lưu tổng cộng {cookies_count} cookies vào: {target_path}")
            if auth_cookies:
                print(f"✅ Xác nhận phát hiện cookie đăng nhập hợp lệ ({len(auth_cookies)} key xác thực).")
                print("🚀 Bây giờ bạn có thể quay lại web bấm 'Bắt đầu thu thập' (50 đánh giá)!")
                return True
            else:
                print("⚠️ Cảnh báo: Chưa thấy cookie đăng nhập Google (SID/SAPISID).")
                print("   Nếu vẫn bị giới hạn 5 bài, hãy chạy lại script và chắc chắn bạn đã đăng nhập xong trước khi nhấn Enter.")
                return False
        finally:
            try:
                if context is not None:
                    context.close()
                browser.close()
            except Exception:
                pass


if __name__ == "__main__":
    os.makedirs(os.path.dirname(DEFAULT_AUTH_STATE_PATH), exist_ok=True)
    save_google_maps_login_session()
