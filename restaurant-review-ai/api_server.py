"""
FastAPI Server phục vụ REST API và giao diện Web tĩnh React (Production-Ready).
Kiến trúc tinh gọn, module hóa (Routers & Services).
"""

import os
import sys
from pathlib import Path

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
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Khởi chạy Restaurant Intelligence Server trên cổng {port}...")
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
