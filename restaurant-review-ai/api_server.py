"""
FastAPI Server phục vụ REST API và giao diện Web tĩnh React (Production-Ready).
Kiến trúc tinh gọn, module hóa (Routers & Services).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Đảm bảo UTF-8 console output trên Windows và Linux
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Đảm bảo đường dẫn import đúng module trong thư mục restaurant-review-ai
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Nạp biến môi trường từ các file .env khả dĩ ngay khi khởi chạy server
load_dotenv(dotenv_path=CURRENT_DIR / ".env")
load_dotenv(dotenv_path=CURRENT_DIR.parent / ".env")
load_dotenv()

if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
    print("-> [Environment] GEMINI_API_KEY đã được nạp thành công.")
else:
    print("-> [Environment Cảnh báo] Chưa tìm thấy GEMINI_API_KEY. Hệ thống sẽ tự động dùng Local BI Fallback khi cần.")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import các router chức năng
from routers.restaurants import router as restaurants_router
from routers.crawler import (
    router as crawler_router,
    AnalyzeRequest,
    SearchAndCrawlRequest,
    QueueCrawlRequest
)

# Re-export các hàm BI tiện ích cho backward compatibility nếu có script ngoài gọi
from services.bi_service import (
    format_restaurant_full,
    remove_accents,
    detect_city,
    map_aspect_vietnamese
)

# ==================== KHỞI TẠO FASTAPI APP ====================
app = FastAPI(
    title="Restaurant Intelligence API",
    description="Backend API & Web Server phục vụ phân tích đánh giá nhà hàng từ Foody và Gemini AI",
    version="1.3.0"
)

# Cấu hình danh sách Allowed Origins an toàn cho CORS [SEC-05]
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:10000",
    "http://127.0.0.1:10000",
]

env_allowed_origins = os.getenv("ALLOWED_ORIGINS")
if env_allowed_origins:
    allowed_origins = [o.strip() for o in env_allowed_origins.split(",") if o.strip()]
else:
    allowed_origins = DEFAULT_ALLOWED_ORIGINS

# Tuyệt đối không sử dụng allow_origins=["*"] đi kèm allow_credentials=True [SEC-05]
allow_credentials = "*" not in allowed_origins

# Thiết lập CORS Middleware cho phép kết nối từ Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các router API chuyên biệt
app.include_router(restaurants_router)
app.include_router(crawler_router)

@app.get("/healthz")
@app.get("/health")
def healthz():
    """Health check endpoint cho Render và Docker health probes"""
    return {"status": "ok", "service": "restaurant-intelligence"}


from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Global Server Error] {request.method} {request.url}: {exc}")
    import traceback
    traceback.print_exc()
    # Ẩn chi tiết exception khỏi client để chống rò rỉ thông tin máy chủ [SEC-08]
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau."}
    )



# ==================== PHỤC VỤ STATIC FILES REACT (SPA) ====================
DIST_PATH = CURRENT_DIR.parent / "dist"
if not DIST_PATH.exists():
    DIST_PATH = CURRENT_DIR / "dist"

if DIST_PATH.exists():
    print(f"-> [Web Server] Phát hiện thư mục build React tĩnh tại: {DIST_PATH}")
    assets_path = DIST_PATH / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint không tồn tại")
        
        resolved_dist = DIST_PATH.resolve()
        resolved_file = (resolved_dist / full_path).resolve()

        # Kiểm tra nghiêm ngặt chống Path Traversal (chỉ cho phép truy cập file nằm trong dist/) [SEC-03]
        try:
            is_safe = resolved_file.is_relative_to(resolved_dist)
        except (ValueError, AttributeError):
            is_safe = resolved_dist in resolved_file.parents or resolved_file == resolved_dist

        if is_safe and resolved_file.is_file():
            return FileResponse(resolved_file)
        
        index_file = resolved_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Trang không tồn tại")
else:
    print(f"-> [Web Server] Chưa tìm thấy thư mục 'dist/'. Chạy 'npm run build' để tạo bản build React.")


# ==================== ENTRYPOINT CHO LOCAL DEV ====================
def _ensure_port_available(target_port: int):
    """
    Tự động kiểm tra và giải phóng cổng nếu có tiến trình Python mồ côi từ phiên trước đang chiếm giữ.
    Giúp chống triệt để lỗi Errno 10048 (Address already in use) trên Windows khi chạy dev server.
    Sử dụng danh sách tham số trực tiếp không qua shell để chống command injection [SEC-13].
    """
    if not isinstance(target_port, int) or not (1 <= target_port <= 65535):
        return

    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(('0.0.0.0', target_port))
            return
        except OSError:
            pass

    # Nếu cổng đang bị chiếm, tự động tìm và thu hồi tiến trình mồ côi
    if sys.platform == "win32":
        try:
            import subprocess
            import time
            res = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=False)
            current_pid = os.getpid()
            target_suffix = f":{target_port}"
            for line in res.stdout.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    local_address = parts[1]
                    if local_address.endswith(target_suffix):
                        try:
                            pid = int(parts[-1])
                            if pid != current_pid and pid > 0:
                                print(f"-> [Port Guard] Phát hiện tiến trình cũ (PID {pid}) đang chiếm cổng {target_port}. Đang thu hồi cổng...")
                                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, check=False)
                        except (ValueError, IndexError):
                            pass
            time.sleep(1)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    _ensure_port_available(port)
    print(f"Khởi chạy Restaurant Intelligence Server trên cổng {port}...")
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
