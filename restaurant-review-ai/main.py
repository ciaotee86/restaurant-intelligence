"""
Chạy toàn bộ pipeline theo thứ tự:
1. Cào review từ danh sách URL Foody
2. Lưu review thô vào SQLite
3. Gọi Gemini phân tích các review chưa được phân tích (chạy theo batch, tránh vượt free quota)
4. Lưu kết quả phân tích vào bảng review_analysis

Chạy: python main.py
Có thể chạy lại nhiều lần - review đã lưu/đã phân tích sẽ không bị xử lý lại.
"""

from crawler.foody_crawler import crawl_multiple
from analysis.gemini_analyzer import analyze_batch
from database.db import (
    get_session, get_or_create_restaurant, save_review,
    get_unanalyzed_reviews, save_analysis,
)

# URL các quán muốn cào - điền URL thật vào đây
RESTAURANT_URLS = [
     
     "https://www.foody.vn/da-nang/com-chien-gion-gia-vinh",
     "https://www.foody.vn/da-nang/che-thai-che-dau-sinh-to-che-ong-cuc-918-tran-cao-van",
     "https://www.foody.vn/da-nang/quan-307-banh-xeo-bun-thit-nuong-nem-lui",
     "https://www.foody.vn/da-nang/mi-cay-seoul-hai-chau",
]

MAX_REVIEWS_PER_PLACE = 100
BATCH_SIZE_ANALYSIS = 30  # số review phân tích mỗi lần chạy, tăng dần để không vượt free quota/ngày


def step_1_crawl_and_save():
    if not RESTAURANT_URLS:
        print("Chưa có URL nào trong RESTAURANT_URLS - bỏ qua bước crawl.")
        return

    print("=== BƯỚC 1: Cào dữ liệu từ Foody ===")
    results = crawl_multiple(RESTAURANT_URLS, max_reviews_per_place=MAX_REVIEWS_PER_PLACE,
                              out_csv="data/raw_reviews_backup.csv")

    print("=== BƯỚC 2: Lưu vào database ===")
    with get_session() as db:
        for r in results:
            restaurant = get_or_create_restaurant(
                db, name=r.get("name", "Chưa rõ tên"), foody_url=r["url"],
                address=r.get("address", ""), overall_rating=r.get("overall_rating"),
            )
            for rv in r["reviews"]:
                save_review(
                    db, restaurant_id=restaurant.id, author=rv["author"],
                    rating=rv["rating"], text=rv["text"], review_date=rv["date"],
                )
    print("Đã lưu xong review vào database.\n")


def step_2_analyze_with_gemini():
    print("=== BƯỚC 3: Phân tích bằng Gemini API ===")
    with get_session() as db:
        pending = get_unanalyzed_reviews(db, limit=BATCH_SIZE_ANALYSIS)
        if not pending:
            print("Không còn review nào cần phân tích.")
            return

        review_payload = [{"id": r.id, "text": r.text} for r in pending]
        analysis_results = analyze_batch(review_payload)

        for res in analysis_results:
            review_id = res["review_id"]
            if not res.pop("_analysis_succeeded", False):
                continue

            for aspect_item in res.get("aspects", []):
                save_analysis(
                    db, review_id=review_id,
                    aspect=aspect_item.get("aspect", ""),
                    sentiment=aspect_item.get("sentiment", "neutral"),
                    confidence=aspect_item.get("confidence", 0.5),
                    is_urgent=res.get("is_urgent", False),
                )
            # đánh dấu đã phân tích để lần chạy sau không xử lý lại
            review_obj = db.get(type(pending[0]), review_id)
            if review_obj:
                review_obj.is_analyzed = 1

    print(f"Đã phân tích xong {len(pending)} review.\n")


if __name__ == "__main__":
    step_1_crawl_and_save()
    step_2_analyze_with_gemini()
    print("Hoàn tất. Chạy `streamlit run dashboard/app.py` để xem kết quả.")
