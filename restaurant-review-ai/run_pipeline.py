#!/usr/bin/env python3
"""
CLI Runner điều khiển tiến trình Tự động Cào & Phân tích Đánh giá Hàng loạt.

Ví dụ sử dụng:
  # Cào tự động cho thành phố Đà Nẵng, 2 quán mỗi thể loại:
  python run_pipeline.py --cities da-nang --max-places 2 --max-reviews 20

  # Cào theo các danh mục cụ thể:
  python run_pipeline.py --cities da-nang --categories "cơm gà,bánh tráng cuốn thịt heo,mì quảng"

  # Tự động quét và bù đắp dữ liệu Google Maps cho quán có ít review / độ tin cậy thấp:
  python run_pipeline.py --auto-enrich --max-places 5 --max-reviews 30

  # Chạy ở chế độ Daemon (chạy ngầm lặp lại mỗi 24 tiếng):
  python run_pipeline.py --daemon --interval-hours 24
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from automated_pipeline import run_full_pipeline, process_pending_user_requests
from database.db import get_session
from database.models import (
    Restaurant as DBRestaurant,
    Review as DBReview,
    ReviewAnalysis as DBAnalysis,
)

logger = logging.getLogger("run_pipeline")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [Pipeline] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


def auto_enrich_sparse_restaurants(
    max_restaurants: int = 5,
    max_reviews: int = 30,
    db_session=None
) -> Dict[str, Any]:
    """
    Tự động quét cơ sở dữ liệu SQLite tìm các nhà hàng có số lượng đánh giá mỏng
    (review_count < 10 hoặc credibility_score < 0.65) và bù đắp dữ liệu từ Google Maps.

    Quy trình:
    1. Lấy tối đa `max_restaurants` quán cần bù đắp dữ liệu.
    2. Nếu có sẵn `google_maps_url`: gọi `crawl_google_maps_reviews`.
    3. Nếu chưa có URL: tìm kiếm bằng `search_and_crawl_google_maps(f"{r.name} {r.address or ''}", city=r.city or "Đà Nẵng")`.
    4. Khớp thực thể qua `resolve_or_create_restaurant`.
    5. Lọc bài rác qua `classify_review`.
    6. Khử trùng lặp qua SHA-256 fingerprint `is_duplicate_review`.
    7. Chạy phân tích Aspect-Based Sentiment với Gemini AI và lưu với `source='GoogleMaps'`.
    8. Cập nhật đếm số lượng và `credibility_score` qua `update_restaurant_counts_and_credibility`.
    9. Xử lý an toàn: nếu Gemini API key thiếu hoặc gặp lỗi mạng, log warning và tiếp tục quán tiếp theo mà không crash.
    """
    if db_session is not None:
        return _execute_auto_enrich(db_session, max_restaurants=max_restaurants, max_reviews=max_reviews)

    with get_session() as db:
        return _execute_auto_enrich(db, max_restaurants=max_restaurants, max_reviews=max_reviews)


def _execute_auto_enrich(db, max_restaurants: int, max_reviews: int) -> Dict[str, Any]:
    from sqlalchemy import or_
    from crawler.google_maps_crawler import (
        crawl_google_maps_reviews,
        search_and_crawl_google_maps
    )
    from crawler.review_filter import classify_review
    from services.entity_resolution import (
        resolve_or_create_restaurant,
        compute_review_fingerprint,
        is_duplicate_review,
        update_restaurant_counts_and_credibility
    )

    query = (
        db.query(DBRestaurant)
        .filter(
            or_(
                DBRestaurant.review_count < 10,
                DBRestaurant.review_count.is_(None),
                DBRestaurant.credibility_score < 0.65,
                DBRestaurant.credibility_score.is_(None),
            )
        )
        .order_by(DBRestaurant.review_count.asc(), DBRestaurant.id.asc())
        .limit(max_restaurants)
    )
    sparse_restaurants = query.all()

    summary: Dict[str, Any] = {
        "total_sparse_found": len(sparse_restaurants),
        "processed_count": 0,
        "enriched_restaurants": 0,
        "total_new_reviews": 0,
        "total_duplicates_skipped": 0,
        "details": []
    }

    if not sparse_restaurants:
        print("ℹ️ Không tìm thấy nhà hàng nào có dữ liệu mỏng (<10 review hoặc độ tin cậy < 0.65).")
        return summary

    print(f"📊 Tìm thấy {len(sparse_restaurants)} quán ăn có dữ liệu mỏng cần bù đắp từ Google Maps:")
    for idx, r in enumerate(sparse_restaurants, start=1):
        print(f"  {idx}. [ID {r.id}] {r.name} - Reviews: {r.review_count or 0} | Credibility: {r.credibility_score or 0.0:.2f} | City: {r.city or 'N/A'}")

    for r in sparse_restaurants:
        summary["processed_count"] += 1
        rest_name = r.name
        rest_id = r.id
        rest_city = r.city or "Đà Nẵng"
        rest_addr = r.address or ""
        gmap_url = r.google_maps_url

        print(f"\n🚀 Đang xử lý quán #{rest_id}: '{rest_name}'...")
        crawl_data = None
        try:
            if gmap_url and gmap_url.strip():
                print(f"  -> Cào trực tiếp qua link Google Maps: {gmap_url}")
                crawl_data = crawl_google_maps_reviews(url=gmap_url.strip(), max_reviews=max_reviews, headless=True)
            else:
                search_q = f"{rest_name} {rest_addr}".strip()
                print(f"  -> Chưa có link Google Maps, tìm kiếm: '{search_q}' tại '{rest_city}'")
                crawl_data = search_and_crawl_google_maps(query=search_q, city=rest_city, max_reviews=max_reviews, headless=True)
        except Exception as crawl_err:
            print(f"  ⚠️ [Lỗi Crawler] Không thể cào dữ liệu cho quán '{rest_name}': {crawl_err}")
            summary["details"].append({
                "id": rest_id,
                "name": rest_name,
                "status": "failed",
                "error": str(crawl_err)
            })
            continue

        if not crawl_data or not crawl_data.get("success"):
            err_msg = crawl_data.get("error") if crawl_data else "Không nhận được phản hồi"
            print(f"  ⚠️ [Cào thất bại] Quán '{rest_name}': {err_msg}")
            summary["details"].append({
                "id": rest_id,
                "name": rest_name,
                "status": "failed",
                "error": err_msg
            })
            continue

        # Khớp thực thể (Entity Resolution)
        target_restaurant = r
        try:
            resolved_rest, _ = resolve_or_create_restaurant(
                db_session=db,
                name=crawl_data.get("restaurant_name") or rest_name,
                address=crawl_data.get("address") or rest_addr,
                google_maps_url=crawl_data.get("google_maps_url") or gmap_url,
                foody_url=r.foody_url,
                google_place_id=crawl_data.get("google_place_id") or r.google_place_id
            )
            if resolved_rest:
                target_restaurant = resolved_rest
        except Exception as res_err:
            print(f"  ⚠️ [Entity Resolution Warning] {res_err}")

        # Bổ sung metadata từ kết quả cào nếu quán còn thiếu
        if crawl_data.get("google_maps_url") and not target_restaurant.google_maps_url:
            target_restaurant.google_maps_url = crawl_data["google_maps_url"]
        if crawl_data.get("google_place_id") and not target_restaurant.google_place_id:
            target_restaurant.google_place_id = crawl_data["google_place_id"]
        if crawl_data.get("address") and not target_restaurant.address:
            target_restaurant.address = crawl_data["address"]
        db.flush()

        raw_reviews = crawl_data.get("reviews", [])
        new_reviews_count = 0
        dup_count = 0
        new_reviews_to_analyze = []

        for rv in raw_reviews:
            text = (rv.get("text") or "").strip()
            if not text or len(text) < 3:
                continue

            # Chống chuỗi injection / template anomaly
            if any("{{" in f or "}}" in f for f in [text, rv.get("author", "")]):
                continue

            # Phân loại rác & spam
            f_res = classify_review(
                text,
                author=rv.get("author"),
                restaurant_name=target_restaurant.name
            )
            if f_res.get("is_spam"):
                continue

            # Khử trùng lặp qua fingerprint
            if is_duplicate_review(db, target_restaurant.id, text):
                dup_count += 1
                continue

            fp = compute_review_fingerprint(text)

            rv_rating = rv.get("rating")
            if rv_rating is not None:
                try:
                    rv_rating = float(rv_rating)
                except (ValueError, TypeError):
                    rv_rating = 5.0
            else:
                rv_rating = 5.0

            new_rev = DBReview(
                restaurant_id=target_restaurant.id,
                author=(rv.get("author") or "Người dùng Google").strip(),
                rating=rv_rating,
                text=text,
                review_date=(rv.get("review_date") or "Gần đây").strip(),
                is_analyzed=0,
                is_spam=0,
                spam_score=f_res.get("spam_score", 0.0),
                spam_category=f_res.get("spam_category", "normal"),
                spam_reason=json.dumps(f_res.get("spam_reason", [])),
                fingerprint=fp,
                source="GoogleMaps",
                google_review_id=rv.get("google_review_id"),
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_rev)
            db.flush()
            new_reviews_count += 1

            if f_res.get("spam_category") != "low_information":
                new_reviews_to_analyze.append((new_rev.id, text))
            else:
                new_rev.is_analyzed = 1

        # Chạy phân tích Gemini ABSA an toàn
        if new_reviews_to_analyze:
            try:
                from analysis.gemini_analyzer import analyze_batch
                payload = [{"id": rid, "text": txt} for rid, txt in new_reviews_to_analyze]
                results = analyze_batch(payload)
                for res in results:
                    rid = res.get("review_id")
                    if not res.get("_analysis_succeeded", False) and not res.get("aspects"):
                        continue
                    for aspect_item in res.get("aspects", []):
                        db_analysis = DBAnalysis(
                            review_id=rid,
                            aspect=aspect_item.get("aspect", "món ăn"),
                            sentiment=aspect_item.get("sentiment", "neutral"),
                            confidence=aspect_item.get("confidence", 0.8),
                            is_urgent=1 if res.get("is_urgent", False) else 0
                        )
                        db.add(db_analysis)
                    r_obj = db.query(DBReview).filter_by(id=rid).first()
                    if r_obj:
                        r_obj.is_analyzed = 1
                db.flush()
            except Exception as gemini_err:
                print(f"  ⚠️ [Gemini ABSA Warning] Quán '{target_restaurant.name}': {gemini_err}")

        # Cập nhật số đếm và điểm tin cậy
        update_restaurant_counts_and_credibility(db, target_restaurant.id)
        db.flush()

        summary["enriched_restaurants"] += 1
        summary["total_new_reviews"] += new_reviews_count
        summary["total_duplicates_skipped"] += dup_count
        summary["details"].append({
            "id": target_restaurant.id,
            "name": target_restaurant.name,
            "status": "success",
            "new_reviews": new_reviews_count,
            "duplicates_skipped": dup_count,
            "review_count_now": target_restaurant.review_count,
            "credibility_score_now": target_restaurant.credibility_score
        })
        print(f"  ✅ Quán '{target_restaurant.name}': thêm {new_reviews_count} đánh giá Google Maps (bỏ qua {dup_count} trùng) | Tổng review: {target_restaurant.review_count} | Độ tin cậy: {target_restaurant.credibility_score:.2f}")

    # Xóa cache API nếu có
    try:
        from routers.restaurants import invalidate_restaurants_cache
        invalidate_restaurants_cache()
    except Exception:
        pass

    return summary


def main():
    parser = argparse.ArgumentParser(description="Restaurant Intelligence Batch Ingestion Pipeline")
    parser.add_argument(
        "--cities",
        type=str,
        default="",
        help="Danh sách thành phố phân cách bằng dấu phẩy (vd: da-nang,ho-chi-minh,ha-noi)"
    )
    parser.add_argument(
        "--categories",
        type=str,
        default="",
        help="Danh mục món ăn phân cách bằng dấu phẩy (vd: 'cơm gà,bánh tráng,phở')"
    )
    parser.add_argument(
        "--max-places",
        type=int,
        default=2,
        help="Số lượng quán tối đa cần lấy cho mỗi danh mục (mặc định: 2, hoặc số quán auto-enrich)"
    )
    parser.add_argument(
        "--max-reviews",
        type=int,
        default=25,
        help="Số lượng đánh giá tối đa cào cho mỗi quán (mặc định: 25)"
    )
    parser.add_argument(
        "--rotate-batch-size",
        type=int,
        default=3,
        help="Số lượng tỉnh thành xoay tua trong mỗi lượt chạy định kỳ (mặc định: 3)"
    )
    parser.add_argument(
        "--requests-only",
        action="store_true",
        help="Chỉ xử lý các yêu cầu từ người dùng trong hàng đợi crawl_requests"
    )
    parser.add_argument(
        "--auto-enrich",
        action="store_true",
        help="Tự động quét cơ sở dữ liệu SQLite tìm các nhà hàng có số lượng đánh giá mỏng (<10 review hoặc credibility < 0.65) để bù đắp từ Google Maps"
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Chạy ngầm liên tục theo chu kỳ"
    )
    parser.add_argument(
        "--interval-hours",
        type=float,
        default=24.0,
        help="Khoảng thời gian lặp lại khi chạy daemon (giờ, mặc định: 24)"
    )

    args = parser.parse_args()

    cities = [c.strip() for c in args.cities.split(",") if c.strip()] if args.cities else None
    categories = [c.strip() for c in args.categories.split(",") if c.strip()] if args.categories else None

    if args.requests_only:
        print("-> Đang kiểm tra và xử lý hàng đợi yêu cầu từ người dùng...")
        count = process_pending_user_requests(max_requests=20, max_reviews=args.max_reviews)
        print(f"-> Hoàn tất xử lý {count} yêu cầu!")
        return

    if args.auto_enrich:
        print("-> Đang kiểm tra cơ sở dữ liệu và tự động bù đắp đánh giá từ Google Maps cho các quán mỏng...")
        max_rest = args.max_places if "--max-places" in sys.argv else 5
        max_rev = args.max_reviews if "--max-reviews" in sys.argv else 30
        res = auto_enrich_sparse_restaurants(max_restaurants=max_rest, max_reviews=max_rev)
        print(f"-> Hoàn tất auto-enrich: Đã bù đắp cho {res['enriched_restaurants']} quán ({res['total_new_reviews']} đánh giá mới)!")
        if not args.cities and not args.categories and not args.daemon:
            return

    if args.daemon:
        interval_secs = int(args.interval_hours * 3600)
        print(f"🔄 Khởi động chế độ Daemon ngầm. Sẽ lặp lại mỗi {args.interval_hours} giờ...")
        while True:
            try:
                if args.auto_enrich:
                    auto_enrich_sparse_restaurants(
                        max_restaurants=args.max_places if "--max-places" in sys.argv else 5,
                        max_reviews=args.max_reviews if "--max-reviews" in sys.argv else 30
                    )
                run_full_pipeline(
                    cities=cities,
                    categories=categories,
                    max_places_per_cat=args.max_places,
                    max_reviews_per_place=args.max_reviews,
                    rotate_batch_size=args.rotate_batch_size
                )
            except Exception as e:
                print(f"[Daemon Error] {e}")
            
            print(f"⏳ Nghỉ ngơi {args.interval_hours} giờ trước phiên quét tiếp theo...")
            time.sleep(interval_secs)
    else:
        run_full_pipeline(
            cities=cities,
            categories=categories,
            max_places_per_cat=args.max_places,
            max_reviews_per_place=args.max_reviews,
            rotate_batch_size=args.rotate_batch_size
        )


if __name__ == "__main__":
    main()
