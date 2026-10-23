"""
Router xử lý các endpoint truy vấn thông tin nhà hàng, tìm kiếm siêu tốc từ SQLite,
gợi ý tự động và kiểm tra sức khỏe hệ thống (Health Check).
"""

import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from urllib.parse import unquote
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database.models import (
    Restaurant as DBRestaurant,
    Review as DBReview,
    ReviewAnalysis as DBAnalysis
)
from database.db import get_session
from services.bi_service import (
    remove_accents,
    detect_city,
    format_restaurant_full,
    VIETNAM_CITIES
)
from services.assistant_service import get_quick_questions, ask_assistant
from services.reply_service import generate_review_reply

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


import time

# Bộ nhớ đệm trong RAM (In-Memory Cache) cho danh sách nhà hàng đầy đủ
_RESTAURANTS_CACHE = None
_CACHE_TIMESTAMP = 0.0
_CACHE_TTL_SECONDS = 300.0  # 5 phút tự động làm mới nếu không có yêu cầu cập nhật


def invalidate_restaurants_cache():
    """Hủy bộ nhớ đệm khi có quán ăn mới được cào và phân tích thành công"""
    global _RESTAURANTS_CACHE, _CACHE_TIMESTAMP
    _RESTAURANTS_CACHE = None
    _CACHE_TIMESTAMP = 0.0


@router.get("/restaurants")
def get_restaurants():
    """Lấy danh sách toàn bộ nhà hàng và chỉ số ABSA tổng quan từ SQLite (kèm In-Memory Cache)"""
    global _RESTAURANTS_CACHE, _CACHE_TIMESTAMP
    now = time.time()
    if _RESTAURANTS_CACHE is not None and (now - _CACHE_TIMESTAMP) < _CACHE_TTL_SECONDS:
        return _RESTAURANTS_CACHE

    with get_session() as db:
        restaurants = db.query(DBRestaurant).all()
        result = []
        for r in restaurants:
            formatted = format_restaurant_full(r, db)
            result.append(formatted)
        
        _RESTAURANTS_CACHE = result
        _CACHE_TIMESTAMP = now
        return result


# Danh mục các món đặc sản có gắn tên địa danh - không bao giờ tách tên địa phương ra khỏi món nếu không có giới từ chỉ địa điểm
SPECIALTY_DISHES = {
    "bun bo hue", "bun hue", "che hue", "banh bot loc hue", "banh beo hue", "banh nam hue", "com hen hue", "nem hue",
    "mi quang", "mi quang da nang", "cao lau hoi an", "com ga hoi an", "banh trang da nang",
    "bun dau ha noi", "pho ha noi", "cha ca la vong ha noi", "bun cha ha noi",
    "nem nuong nha trang", "bun ca nha trang", "banh can nha trang",
    "com tam sai gon", "banh mi sai gon", "pha lau sai gon",
    "banh xeo mien tay", "lau mam can tho", "banh cong can tho",
    "banh trang tay ninh", "muoi tay ninh",
    "banh cuon phu ly", "banh da cua hai phong", "cha muc quang ninh",
    "che thai", "lau thai", "com lam pleiku", "pho hai to gia lai"
}


def extract_city_from_query(q: str):
    """
    Trích xuất thành phố và từ khóa món ăn từ chuỗi tìm kiếm trên toàn bộ 63 tỉnh thành:
    - Nếu câu tìm kiếm là món đặc sản (ví dụ: 'bún huế', 'mì quảng', 'nem nướng nha trang') -> giữ nguyên từ khóa món, không tách tỉnh thành.
    - Nếu câu chứa giới từ địa điểm (ví dụ: 'bún huế ở đà nẵng', 'quán ngon tại huế') -> tách đúng thành phố và giữ lại từ khóa món.
    - Nếu câu chứa tên thành phố độc lập (ví dụ: 'cơm gà đà nẵng') -> tách thành phố và từ khóa món.
    """
    if not q:
        return None, ""
    raw_q = q.strip()
    norm_q = remove_accents(raw_q)

    # 1. Nếu toàn bộ câu tìm kiếm trùng khớp với tên món đặc sản nổi tiếng -> giữ nguyên từ khóa món ăn
    if norm_q in SPECIALTY_DISHES:
        return None, raw_q

    # Chuẩn bị danh sách alias sắp xếp theo độ dài giảm dần
    flattened = []
    for city_name, aliases in VIETNAM_CITIES:
        for alias in aliases:
            flattened.append((city_name, alias, len(alias)))
    flattened.sort(key=lambda x: x[2], reverse=True)

    # 2. Ưu tiên cao nhất: Có giới từ chỉ địa điểm rõ ràng ("ở", "tại", "khu vực")
    for city_name, alias, _ in flattened:
        escaped = re.escape(alias)
        prep_pattern = r'(?:\b(?:o|tai|khu vuc)\s+)(' + escaped + r')(?:\b|$)'
        match = re.search(prep_pattern, norm_q)
        if match:
            start, end = match.span()
            clean_q = (raw_q[:start] + " " + raw_q[end:]).strip()
            clean_q = re.sub(r'\s+', ' ', clean_q).strip()
            return city_name, clean_q

    # 3. Nếu món ăn chứa tên địa phương nhưng nằm trong cụm đặc sản ở đầu câu (ví dụ: 'bún huế ngon rẻ')
    for spec in SPECIALTY_DISHES:
        if norm_q == spec or norm_q.startswith(spec + " "):
            return None, raw_q

    # 4. Tìm kiếm alias địa phương đứng riêng biệt ở cuối câu hoặc đầu câu
    for city_name, alias, _ in flattened:
        escaped = re.escape(alias)
        pattern = r'(?:^|\s)(' + escaped + r')(?:$|\s)'
        match = re.search(pattern, norm_q)
        if match:
            start, end = match.span(1)
            clean_q = (raw_q[:start] + " " + raw_q[end:]).strip()
            clean_q = re.sub(r'\s+', ' ', clean_q).strip()
            return city_name, clean_q

    return None, raw_q


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
    Tra cứu nhà hàng thông minh từ Database SQLite:
    - Nếu từ khóa chứa thành phố (ví dụ: 'đà nẵng', 'cơm hà nội', 'phú yên', 'lào cai') -> ưu tiên tuyệt đối thành phố từ từ khóa.
    - Nếu từ khóa chỉ chứa món ăn (ví dụ: 'cơm gà', 'bánh tráng') -> tìm kiếm toàn bộ trên mọi địa điểm toàn quốc.
    """
    detected_city, remaining_q = extract_city_from_query(q)
    if detected_city:
        target_city = detected_city
    else:
        target_city = city if (city and city not in ["Tất cả địa điểm", "All Cities"]) else None
    
    norm_city = remove_accents(target_city) if target_city else ""

    norm_rem_q = remove_accents(remaining_q) if remaining_q else ""
    tokens = [t for t in norm_rem_q.split() if len(t) >= 2] if norm_rem_q else []

    with get_session() as db:
        restaurants = db.query(DBRestaurant).all()
        matched = []

        for r in restaurants:
            # 1. Lọc rating tối thiểu
            if min_rating > 0 and (r.overall_rating or 0) < min_rating:
                continue

            # 2. Lọc thành phố: So khớp chính xác
            if norm_city:
                r_city = detect_city(r.address or "", foody_url=r.foody_url, restaurant_name=r.name)
                norm_r_city = remove_accents(r_city)
                if norm_city != norm_r_city:
                    continue

            # 3. Lọc từ khóa món ăn: Khớp trên tên nhà hàng, KHÔNG khớp trên địa chỉ
            if norm_rem_q:
                r_name_raw = r.name.lower()
                r_name_norm = remove_accents(r.name)

                # Phân biệt chặt chẽ phở vs phố
                if norm_rem_q == "pho" or "phở" in remaining_q.lower():
                    if "phở" not in r_name_raw and "pho" not in r_name_norm:
                        continue
                    # Loại trừ "phố" nếu không có "phở"
                    if "phở" not in r_name_raw and any(k in r_name_raw for k in ["hải sản phố", "cà phê phố", "phố cổ"]):
                        continue

                if norm_rem_q not in r_name_norm:
                    if not (tokens and all(t in r_name_norm for t in tokens)):
                        continue

            matched.append(r)

        results = []
        for r in matched[:limit]:
            results.append(format_restaurant_full(r, db))

        return {
            "total": len(matched),
            "results": results,
            "query": q,
            "detected_city": detected_city,
            "remaining_keyword": remaining_q
        }


def find_restaurant(db, identifier: str) -> Optional[DBRestaurant]:
    """Tìm nhà hàng linh hoạt theo id số, res-{id}, foody_url slug, hoặc tên"""
    clean_id = unquote(identifier).strip() if identifier else ""
    if not clean_id:
        return None

    if clean_id.isdigit():
        r = db.query(DBRestaurant).filter_by(id=int(clean_id)).first()
        if r:
            return r

    if clean_id.startswith("res-") and clean_id[4:].isdigit():
        r = db.query(DBRestaurant).filter_by(id=int(clean_id[4:])).first()
        if r:
            return r

    restaurants = db.query(DBRestaurant).all()
    # 1. Khớp chính xác tên hoặc res-{id}
    for r in restaurants:
        if r.name.lower() == clean_id.lower() or f"res-{r.id}" == clean_id:
            return r

    # 2. Khớp theo URL Foody (slug trên url)
    for r in restaurants:
        if r.foody_url and clean_id.lower() in r.foody_url.lower():
            return r

    # 3. Khớp mờ theo tên không dấu
    norm_id = remove_accents(clean_id.lower()).replace("-", " ").strip()
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
    force_ai: bool = Field(True, alias="forceAi")

    model_config = {"populate_by_name": True}


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
    Trợ lý AI Hỏi-Đáp thông minh về nhà hàng (100% Gemini AI Pure Generative Engine).
    Có Semantic Caching tự động để tiết kiệm Quota và tối ưu tốc độ phản hồi.
    """
    q = req.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi.")

    with get_session() as db:
        restaurant = find_restaurant(db, identifier)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng trong cơ sở dữ liệu.")

        return ask_assistant(restaurant, db, q, force_ai=req.force_ai)


class GenerateReplyRequest(BaseModel):
    restaurant_id: Optional[str] = Field(None, alias="restaurantId")
    restaurant_name: Optional[str] = Field(None, alias="restaurantName")
    review_id: Optional[str] = Field(None, alias="reviewId")
    author: str = Field("Thực khách", description="Tên thực khách đăng bài")
    rating: float = Field(5.0, description="Điểm đánh giá")
    overall_sentiment: Optional[str] = Field(None, alias="overallSentiment")
    review_text: str = Field(..., alias="reviewText", description="Toàn văn bài đánh giá")
    aspects: Optional[List[Dict[str, Any]]] = None
    tone: str = Field("apology", description="1 trong 4 tông giọng: apology, voucher, gratitude, clarification")
    include_voucher: bool = Field(False, alias="includeVoucher")
    voucher_discount_percent: int = Field(15, alias="voucherDiscountPercent")
    force_regenerate: bool = Field(False, alias="forceRegenerate")

    model_config = {"populate_by_name": True}


@router.post("/restaurants/{identifier}/reply")
@router.post("/restaurants/{identifier}/generate-reply")
def generate_restaurant_review_reply(identifier: str, req: GenerateReplyRequest):
    """
    Sinh nội dung thư phản hồi thực khách bằng AI (Gemini Pure Generative Engine).
    Hỗ trợ 4 tông giọng chuyên sâu cho ngành F&B, voucher đền bù và In-Memory Cache.
    """
    if not req.review_text or not req.review_text.strip():
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp nội dung đánh giá của khách hàng (reviewText).")

    with get_session() as db:
        restaurant = find_restaurant(db, identifier)
        res_id = req.restaurant_id or (f"res-{restaurant.id}" if restaurant else identifier)
        res_name = req.restaurant_name or (restaurant.name if restaurant else identifier)

        # Nếu không có tên nhà hàng và không tìm thấy trong database
        if not restaurant and not req.restaurant_name:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng trong cơ sở dữ liệu.")

        return generate_review_reply(
            restaurant_id=res_id,
            restaurant_name=res_name,
            review_id=req.review_id or "",
            author=req.author,
            rating=req.rating,
            overall_sentiment=req.overall_sentiment,
            review_text=req.review_text,
            aspects=req.aspects,
            tone=req.tone,
            include_voucher=req.include_voucher,
            voucher_discount_percent=req.voucher_discount_percent,
            force_regenerate=req.force_regenerate
        )
