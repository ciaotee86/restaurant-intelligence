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

# Thiết lập CORS Middleware cho phép kết nối từ Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    return JSONResponse(
        status_code=500,
        content={"detail": f"Lỗi máy chủ nội bộ: {str(exc)}"}
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
        
        file_path = DIST_PATH / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        return FileResponse(DIST_PATH / "index.html")
else:
    print(f"-> [Web Server] Chưa tìm thấy thư mục 'dist/'. Chạy 'npm run build' để tạo bản build React.")


# ==================== ENTRYPOINT CHO LOCAL DEV ====================
def _ensure_port_available(target_port: int):
    """
    Tự động kiểm tra và giải phóng cổng nếu có tiến trình Python mồ côi từ phiên trước đang chiếm giữ.
    Giúp chống triệt để lỗi Errno 10048 (Address already in use) trên Windows khi chạy dev server.
    """
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
            res = subprocess.run(f"netstat -ano | findstr :{target_port}", shell=True, capture_output=True, text=True)
            current_pid = os.getpid()
            for line in res.stdout.strip().splitlines():
                if "LISTENING" in line:
                    parts = line.strip().split()
                    pid = int(parts[-1])
                    if pid != current_pid and pid > 0:
                        print(f"-> [Port Guard] Phát hiện tiến trình cũ (PID {pid}) đang chiếm cổng {target_port}. Đang thu hồi cổng...")
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
            time.sleep(1)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    _ensure_port_available(port)
    print(f"Khởi chạy Restaurant Intelligence Server trên cổng {port}...")
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
