"""
Router xử lý các tác vụ cào dữ liệu (Crawler) bằng Selenium,
hàng đợi cào ngầm (Crawl Queue) và phân tích NLP Aspect-Based Sentiment với Gemini AI.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.models import (
    Restaurant as DBRestaurant,
    CrawlRequest as DBCrawlRequest
)
from database.db import (
    get_session,
    get_restaurant_existing_fingerprints
)
from crawler.foody_crawler import crawl_restaurant, search_foody_places
from services.bi_service import remove_accents, format_restaurant_full
from services.pipeline_service import save_and_analyze_reviews
from routers.restaurants import invalidate_restaurants_cache

router = APIRouter(prefix="/api", tags=["crawler"])


class AnalyzeRequest(BaseModel):
    url: str
    max_reviews: Optional[int] = 30


class SearchAndCrawlRequest(BaseModel):
    query: str
    city: Optional[str] = "da-nang"
    max_reviews: Optional[int] = 25


class QueueCrawlRequest(BaseModel):
    query: str
    city: Optional[str] = "da-nang"


@router.post("/analyze-url")
def analyze_foody_url(req: AnalyzeRequest):
    """
    Tiếp nhận URL Foody mới từ người dùng:
    1. Cào review qua Selenium Crawler (headless Chromium)
    2. Lưu nhà hàng & review vào SQLite (kèm fingerprint chống trùng lặp)
    3. Chạy Gemini NLP phân tích ABSA
    4. Trả về kết quả phân tích đầy đủ
    """
    url = req.url.strip()
    if not url.startswith("http"):
        raise HTTPException(
            status_code=400,
            detail="URL không hợp lệ. Vui lòng nhập link Foody (ví dụ: https://www.foody.vn/da-nang/...)"
        )

    try:
        print(f"=== [API] Bắt đầu cào URL: {url} ===")
        known_fps = set()
        with get_session() as db:
            exist_rest = db.query(DBRestaurant).filter_by(foody_url=url).first()
            if exist_rest:
                known_fps = get_restaurant_existing_fingerprints(db, exist_rest.id)

        crawl_data = crawl_restaurant(
            url,
            max_reviews=req.max_reviews or 30,
            headless=True,
            known_fingerprints=known_fps,
            max_consecutive_existing=3
        )
        
        if not crawl_data or not crawl_data.get("name"):
            raise HTTPException(status_code=400, detail="Không thể trích xuất thông tin quán ăn từ link Foody này.")

        with get_session() as db:
            restaurant = save_and_analyze_reviews(
                db=db,
                crawl_data=crawl_data,
                foody_url=url,
                default_name="Quán mới"
            )
            invalidate_restaurants_cache()
            formatted = format_restaurant_full(restaurant, db)
            return {
                "success": True,
                "message": f"Đã cào và phân tích thành công {len(crawl_data.get('reviews', []))} đánh giá thực tế!",
                "restaurant": formatted
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API Error] Lỗi khi xử lý link Foody: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cào hoặc phân tích dữ liệu: {str(e)}")


@router.post("/search-and-crawl")
def search_and_crawl_restaurant(req: SearchAndCrawlRequest):
    """
    Quy trình tìm kiếm và cào dữ liệu thông minh theo từ khóa:
    1. Nhận từ khóa tìm kiếm (ví dụ: 'bánh tráng', 'cơm gà gia vĩnh').
    2. Kiểm tra SQLite DB trước: nếu quán đã có trong DB, trả về ngay tức thì (< 20ms).
    3. Nếu chưa có: Tự động dùng Selenium tìm kiếm từ khóa trên Foody.vn.
    4. Trích xuất link quán ăn phù hợp nhất trên Foody.
    5. Cào review, lọc spam/bot, gọi Gemini ABSA phân tích khía cạnh và lưu SQLite.
    """
    try:
        q = req.query.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Vui lòng nhập từ khóa tìm kiếm.")

        norm_q = remove_accents(q)
        tokens = [t for t in norm_q.split() if len(t) >= 2]

        # Bước 1: Kiểm tra trong cơ sở dữ liệu SQLite trước
        with get_session() as db:
            all_res = db.query(DBRestaurant).all()
            matching_res = None

            # Ưu tiên 1: Khớp nguyên cụm từ trong tên quán hoặc URL Foody
            for r in all_res:
                r_norm = remove_accents(r.name)
                foody_slug = r.foody_url.split("/")[-1] if r.foody_url else ""
                if norm_q in r_norm or (foody_slug and norm_q in remove_accents(foody_slug)):
                    matching_res = r
                    break

            # Ưu tiên 2: Khớp tất cả các token từ khóa trong tên hoặc địa chỉ
            if not matching_res and len(tokens) >= 2:
                for r in all_res:
                    r_full = remove_accents(f"{r.name} {r.address or ''}")
                    if all(t in r_full for t in tokens):
                        matching_res = r
                        break

            if matching_res:
                print(f"-> [Search & Crawl] Đã tìm thấy quán '{matching_res.name}' trong cơ sở dữ liệu SQLite!")
                formatted = format_restaurant_full(matching_res, db)
                return {
                    "success": True,
                    "source": "database",
                    "message": f"Tìm thấy quán '{matching_res.name}' đã được phân tích sẵn trong cơ sở dữ liệu!",
                    "restaurant": formatted
                }

        # Bước 2: Chưa có trong DB -> Tự động tìm kiếm trên Foody.vn
        city = req.city or "da-nang"
        print(f"-> [Search & Crawl] Chưa có trong DB. Bắt đầu tìm kiếm từ khóa '{q}' trên Foody (thành phố: {city})...")
        foody_results = search_foody_places(q, city_slug=city, max_results=3)

        if not foody_results:
            for fallback_city in ["da-nang", "ho-chi-minh", "ha-noi"]:
                if fallback_city != city:
                    print(f"  Thử tìm kiếm mở rộng tại {fallback_city}...")
                    foody_results = search_foody_places(q, city_slug=fallback_city, max_results=3)
                    if foody_results:
                        break

        if not foody_results:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy quán ăn nào trên Foody với từ khóa '{q}'. Vui lòng thử từ khóa khác hoặc dán link Foody trực tiếp."
            )

        # Kiểm tra xem có quán nào trong kết quả Foody đã có trong SQLite chưa
        with get_session() as db:
            for place in foody_results:
                existing_by_url = db.query(DBRestaurant).filter_by(foody_url=place["url"]).first()
                if existing_by_url:
                    print(f"-> [Search & Crawl] URL '{place['url']}' đã tồn tại trong DB!")
                    formatted = format_restaurant_full(existing_by_url, db)
                    return {
                        "success": True,
                        "source": "database",
                        "message": f"Tìm thấy quán '{existing_by_url.name}' đã được phân tích trong hệ thống!",
                        "restaurant": formatted
                    }

        # Bước 3: Cào đánh giá thực tế từ Foody bằng Selenium (ưu tiên quán có đánh giá)
        crawl_data = None
        target_place = None

        for place in foody_results:
            target_url = place["url"]
            print(f"-> [Search & Crawl] Bắt đầu cào thử đánh giá: '{place['name']}' ({target_url})")
            known_fps = set()
            with get_session() as db:
                exist_p = db.query(DBRestaurant).filter_by(foody_url=target_url).first()
                if exist_p:
                    known_fps = get_restaurant_existing_fingerprints(db, exist_p.id)

            data = crawl_restaurant(
                target_url,
                max_reviews=req.max_reviews or 25,
                headless=True,
                known_fingerprints=known_fps,
                max_consecutive_existing=3
            )
            
            if data and data.get("name"):
                crawl_data = data
                target_place = place
                if data.get("reviews") and len(data["reviews"]) > 0:
                    break

        if not crawl_data or not crawl_data.get("name"):
            raise HTTPException(
                status_code=500,
                detail=f"Không thể cào dữ liệu từ quán trên Foody cho từ khóa '{q}'. Vui lòng thử lại sau."
            )

        # Bước 4: Lưu vào SQLite và chạy Gemini AI phân tích ABSA
        with get_session() as db:
            restaurant = save_and_analyze_reviews(
                db=db,
                crawl_data=crawl_data,
                foody_url=target_place["url"],
                default_name=target_place["name"],
                default_address=target_place.get("address", "")
            )
            invalidate_restaurants_cache()
            formatted = format_restaurant_full(restaurant, db)
            return {
                "success": True,
                "source": "crawled_and_analyzed",
                "message": f"Đã tự động tìm kiếm trên Foody, cào và AI phân tích thành công quán '{restaurant.name}' ({len(crawl_data.get('reviews', []))} đánh giá thực tế)!",
                "restaurant": formatted
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API Error] Lỗi khi tìm kiếm & cào dữ liệu: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi khi cào hoặc phân tích dữ liệu: {str(e)}")


@router.post("/request-crawl")
def submit_crawl_request(req: QueueCrawlRequest):
    """
    Tiếp nhận yêu cầu cào quán từ người dùng khi tìm không có trong DB.
    Lưu vào hàng đợi crawl_requests (status='pending') để background pipeline cào tự động ngầm.
    Trả về ngay lập tức trong < 10ms.
    """
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Vui lòng nhập từ khóa hoặc tên quán.")

    with get_session() as db:
        existing_req = (
            db.query(DBCrawlRequest)
            .filter_by(query=q, status="pending")
            .first()
        )
        if existing_req:
            return {
                "success": True,
                "status": "already_queued",
                "message": f"Yêu cầu thu thập cho '{q}' đã có trong hàng đợi và sẽ được xử lý trong phiên quét tiếp theo!"
            }

        new_req = DBCrawlRequest(
            query=q,
            city=req.city or "da-nang",
            status="pending",
            requested_at=datetime.utcnow()
        )
        db.add(new_req)
        db.commit()

        return {
            "success": True,
            "status": "queued",
            "message": f"Đã tiếp nhận yêu cầu thu thập quán '{q}'. Hệ thống sẽ tự động cào và phân tích trong đợt cập nhật tiếp theo!"
        }


@router.get("/crawl-requests")
def list_crawl_requests():
    """Lấy danh sách các yêu cầu cào gần đây từ người dùng"""
    with get_session() as db:
        requests = (
            db.query(DBCrawlRequest)
            .order_by(DBCrawlRequest.requested_at.desc())
            .limit(20)
            .all()
        )
        return [
            {
                "id": r.id,
                "query": r.query,
                "city": r.city,
                "status": r.status,
                "note": r.note,
                "requested_at": r.requested_at.isoformat() if r.requested_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in requests
        ]
