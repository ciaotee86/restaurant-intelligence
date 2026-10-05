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
from analysis.gemini_analyzer import analyze_batch


def save_and_analyze_reviews(
    db: Session,
    crawl_data: Dict[str, Any],
    foody_url: str,
    default_name: str = "Quán mới",
    default_address: str = ""
) -> DBRestaurant:
    """
    Tiếp nhận dữ liệu thô từ crawler:
    1. Tạo hoặc lấy bản ghi DBRestaurant
    2. Lưu danh sách review (kèm fingerprint, spam rating)
    3. Gửi các review hợp lệ chưa phân tích sang Gemini ABSA
    4. Lưu kết quả khía cạnh & sentiment vào bảng review_analysis
    5. Commit transaction và trả về restaurant
    """
    restaurant = get_or_create_restaurant(
        db,
        name=crawl_data.get("name", default_name),
        foody_url=foody_url,
        address=crawl_data.get("address", default_address),
        overall_rating=crawl_data.get("overall_rating")
    )

    new_review_ids: List[tuple] = []
    for rv in crawl_data.get("reviews", []):
        saved = save_review(
            db,
            restaurant_id=restaurant.id,
            author=rv.get("author", "Khách hàng"),
            rating=rv.get("rating"),
            text=rv.get("text", ""),
            review_date=rv.get("date", "Gần đây"),
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

    db.commit()
    return restaurant
