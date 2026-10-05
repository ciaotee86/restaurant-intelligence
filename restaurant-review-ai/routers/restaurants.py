"""
Router xử lý các endpoint truy vấn thông tin nhà hàng, tìm kiếm siêu tốc từ SQLite,
gợi ý tự động và kiểm tra sức khỏe hệ thống (Health Check).
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.models import (
    Restaurant as DBRestaurant,
    Review as DBReview,
    ReviewAnalysis as DBAnalysis
)
from database.db import get_session
from services.bi_service import (
    remove_accents,
    detect_city,
    format_restaurant_full
)
from services.assistant_service import get_quick_questions, ask_assistant

router = APIRouter(prefix="/api", tags=["restaurants"])


@router.get("/health")
def health_check():
    """Kiểm tra tình trạng hoạt động của API và Database"""
    try:
        with get_session() as db:
            res_count = db.query(DBRestaurant).count()
            rev_count = db.query(DBReview).count()
            ana_count = db.query(DBAnalysis).count()
            return {
                "status": "healthy",
                "database": "connected",
                "total_restaurants": res_count,
                "total_reviews": rev_count,
                "total_analyses": ana_count,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/restaurants")
def get_restaurants():
    """Lấy danh sách toàn bộ nhà hàng và chỉ số ABSA tổng quan từ SQLite"""
    with get_session() as db:
        restaurants = db.query(DBRestaurant).all()
        result = []
        for r in restaurants:
            formatted = format_restaurant_full(r, db)
            result.append(formatted)
        return result


@router.get("/restaurants/search")
@router.get("/search")
def search_restaurants_db(
    q: str = "",
    city: str = "",
    cuisine: str = "",
    min_rating: float = 0.0,
    limit: int = 50
):
    """
    Tra cứu nhà hàng thuần túy từ Database SQLite (Tốc độ siêu tốc < 20ms).
    Không chạy Selenium, không gọi Gemini AI trong quá trình người dùng truy vấn.
    """
    norm_q = remove_accents(q)
    tokens = [t for t in norm_q.split() if len(t) >= 2]
    norm_city = remove_accents(city) if city and city != "Tất cả địa điểm" and city != "All Cities" else ""

    with get_session() as db:
        restaurants = db.query(DBRestaurant).all()
        matched = []

        for r in restaurants:
            # 1. Lọc rating tối thiểu
            if min_rating > 0 and (r.overall_rating or 0) < min_rating:
                continue

            r_addr_norm = remove_accents(r.address or "")
            r_name_norm = remove_accents(r.name)
            combined_norm = f"{r_name_norm} {r_addr_norm}"

            # 2. Lọc thành phố
            if norm_city and norm_city not in combined_norm:
                continue

            # 3. Lọc từ khóa query (chính xác hoặc tập hợp tokens)
            if norm_q:
                if norm_q not in combined_norm:
                    if not (tokens and all(t in combined_norm for t in tokens)):
                        continue

            matched.append(r)

        results = []
        for r in matched[:limit]:
            results.append(format_restaurant_full(r, db))

        return {
            "total": len(matched),
            "results": results,
            "query": q
        }


def find_restaurant(db, identifier: str) -> Optional[DBRestaurant]:
    """Tìm nhà hàng linh hoạt theo id số, res-{id}, foody_url slug, hoặc tên"""
    if identifier.isdigit():
        r = db.query(DBRestaurant).filter_by(id=int(identifier)).first()
        if r:
            return r

    if identifier.startswith("res-") and identifier[4:].isdigit():
        r = db.query(DBRestaurant).filter_by(id=int(identifier[4:])).first()
        if r:
            return r

    restaurants = db.query(DBRestaurant).all()
    # 1. Khớp chính xác tên hoặc res-{id}
    for r in restaurants:
        if r.name.lower() == identifier.lower() or f"res-{r.id}" == identifier:
            return r

    # 2. Khớp theo URL Foody (slug trên url)
    for r in restaurants:
        if r.foody_url and identifier.lower() in r.foody_url.lower():
            return r

    # 3. Khớp mờ theo tên không dấu
    norm_id = remove_accents(identifier.lower()).replace("-", " ").strip()
    for r in restaurants:
        norm_name = remove_accents(r.name.lower()).replace("-", " ")
        if norm_id in norm_name or norm_name in norm_id:
            return r

    return None


@router.get("/restaurants/{identifier}")
def get_restaurant_detail(identifier: str):
    """Lấy chi tiết phân tích của một nhà hàng theo ID hoặc Slug"""
    with get_session() as db:
        restaurant = find_restaurant(db, identifier)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng trong cơ sở dữ liệu")

        return format_restaurant_full(restaurant, db)


@router.get("/suggestions")
def get_suggestions(q: str = ""):
    """Gợi ý nhanh các quán ăn đã có trong hệ thống theo từ khóa (hỗ trợ không dấu)"""
    if not q or not q.strip():
        return []
    norm_q = remove_accents(q)
    tokens = [t for t in norm_q.split() if len(t) >= 2]

    with get_session() as db:
        restaurants = db.query(DBRestaurant).all()
        results = []
        for r in restaurants:
            r_norm = remove_accents(f"{r.name} {r.address or ''}")
            is_match = False
            if norm_q in r_norm:
                is_match = True
            elif tokens and all(t in r_norm for t in tokens):
                is_match = True

            if is_match:
                rev_count = db.query(DBReview).filter_by(restaurant_id=r.id).count()
                results.append({
                    "id": f"res-{r.id}",
                    "name": r.name,
                    "address": r.address or "",
                    "city": detect_city(r.address or ""),
                    "rating": r.overall_rating or 8.0,
                    "totalReviews": rev_count
                })
        return results[:8]


class AskAssistantRequest(BaseModel):
    question: str
    force_ai: bool = False


@router.get("/restaurants/{identifier}/quick-questions")
def get_restaurant_quick_questions(identifier: str):
    """Lấy danh sách 4 câu hỏi gợi ý nhanh cho quán"""
    with get_session() as db:
        restaurant = find_restaurant(db, identifier)
        name = restaurant.name if restaurant else "quán ăn"
        return get_quick_questions(name)


@router.post("/restaurants/{identifier}/ask")
def ask_restaurant_ai(identifier: str, req: AskAssistantRequest):
    """
    Trợ lý AI Hỏi-Đáp thông minh về nhà hàng (Hybrid Contextual Synthesis + Gemini AI).
    Có Semantic Caching tự động để tiết kiệm Quota.
    """
    q = req.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi.")

    with get_session() as db:
        restaurant = find_restaurant(db, identifier)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng trong cơ sở dữ liệu.")

        return ask_assistant(restaurant, db, q, force_ai=req.force_ai)


