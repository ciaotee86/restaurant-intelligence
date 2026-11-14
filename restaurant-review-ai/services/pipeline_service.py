"""
Pipeline Service: Điều phối quy trình Cào dữ liệu (Selenium Crawler),
lưu trữ SQLite và Phân tích khía cạnh (Gemini ABSA).
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from database.models import (
    Restaurant as DBRestaurant,
    Review as DBReview
)
from database.db import get_or_create_restaurant, save_review, save_analysis
from services.entity_resolution import update_restaurant_counts_and_credibility
from analysis.gemini_analyzer import analyze_batch


def save_and_analyze_reviews(
    db: Session,
    crawl_data: Dict[str, Any],
    foody_url: str,
    default_name: str = "Quán mới",
    default_address: str = "",
    min_viable_reviews: int = 1
) -> Optional[DBRestaurant]:
    """
    Tiếp nhận dữ liệu thô từ crawler:
    1. Kiểm tra số lượng đánh giá hợp lệ. Nếu 0 review hoặc ít hơn min_viable_reviews -> KHÔNG LƯU DB để tránh rác.
    2. Tạo hoặc lấy bản ghi DBRestaurant khi đã có đủ đánh giá hợp lệ.
    3. Lưu danh sách review (kèm fingerprint, spam rating)
    4. Gửi các review hợp lệ chưa phân tích sang Gemini ABSA
    5. Lưu kết quả khía cạnh & sentiment vào bảng review_analysis
    6. Commit transaction và trả về restaurant
    """
    raw_reviews = crawl_data.get("reviews", [])
    valid_raw_reviews = []
    for rv in raw_reviews:
        author = (rv.get("author") or "Khách hàng").strip()
        text = (rv.get("text") or "").strip()
        review_date = (rv.get("date") or "Gần đây").strip()

        # KIỂM TRA PHÒNG THỦ: Tuyệt đối KHÔNG chấp nhận review có author/text/date chứa {{ hoặc common_delete hoặc text rỗng
        if not text or len(text) < 5:
            continue

        fields_to_check = [text, author, review_date]
        if any("{{" in f or "}}" in f or "model." in f.lower() for f in fields_to_check):
            continue
        if any("common_delete" in f.lower() or "sửacommon_delete" in f.lower() or "suacommon_delete" in f.lower() for f in fields_to_check):
            continue

        valid_raw_reviews.append(rv)

    # Chặn thực thể rác: Nếu không có bất kỳ bài đánh giá nào hoặc không đủ số lượng tối thiểu để phân tích -> Không đẩy vào DB
    if len(valid_raw_reviews) < min_viable_reviews:
        place_name = crawl_data.get("name") or default_name
        print(f"⚠️ [Pipeline Guard] Bỏ qua quán '{place_name}': Chỉ có {len(valid_raw_reviews)} đánh giá hợp lệ (yêu cầu tối thiểu >= {min_viable_reviews}). Không lưu thực thể rác vào DB.")
        return None

    restaurant = get_or_create_restaurant(
        db,
        name=crawl_data.get("name", default_name),
        foody_url=foody_url,
        address=crawl_data.get("address", default_address),
        overall_rating=crawl_data.get("overall_rating")
    )

    new_review_ids: List[tuple] = []
    for rv in valid_raw_reviews:
        author = (rv.get("author") or "Khách hàng").strip()
        text = (rv.get("text") or "").strip()
        review_date = (rv.get("date") or "Gần đây").strip()

        saved = save_review(
            db,
            restaurant_id=restaurant.id,
            author=author or "Khách hàng",
            rating=rv.get("rating"),
            text=text,
            review_date=review_date or "Gần đây",
            is_spam=rv.get("is_spam", 0),
            spam_score=rv.get("spam_score", 0.0),
            spam_category=rv.get("spam_category", "normal"),
            spam_reason=rv.get("spam_reason", "[]"),
            foody_review_id=rv.get("foody_review_id"),
            fingerprint=rv.get("fingerprint")
        )
        if saved.is_analyzed == 0:
            if saved.is_spam == 0 and saved.spam_category != "low_information":
                new_review_ids.append((saved.id, saved.text))
            else:
                saved.is_analyzed = 1

    # Chạy phân tích Gemini theo batch nếu có review mới
    if new_review_ids:
        print(f"=== [Pipeline] Gọi Gemini ABSA phân tích {len(new_review_ids)} review mới ===")
        payload = [{"id": rid, "text": txt} for rid, txt in new_review_ids]
        results = analyze_batch(payload)

        for res in results:
            rid = res.get("review_id")
            if not res.pop("_analysis_succeeded", False):
                continue
            for aspect_item in res.get("aspects", []):
                save_analysis(
                    db,
                    review_id=rid,
                    aspect=aspect_item.get("aspect", "món ăn"),
                    sentiment=aspect_item.get("sentiment", "neutral"),
                    confidence=aspect_item.get("confidence", 0.8),
                    is_urgent=res.get("is_urgent", False)
                )
            rev_obj = db.query(DBReview).filter_by(id=rid).first()
            if rev_obj:
                rev_obj.is_analyzed = 1

    # Cập nhật số lượng review thực tế và tính toán lại credibility_score chuẩn xác
    update_restaurant_counts_and_credibility(db, restaurant.id)
    db.commit()
    db.refresh(restaurant)
    return restaurant
