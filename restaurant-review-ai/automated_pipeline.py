"""
Hệ thống Tự động Cào & Phân tích Đánh giá Hàng loạt (Automated Batch Pipeline)
- Chạy ngầm / offline độc lập hoàn toàn với API phục vụ người dùng.
- Tự động quét theo danh mục hạt giống (ẩm thực vùng miền: Đà Nẵng, TP.HCM, Hà Nội).
- Tự động kiểm tra trùng lặp (nếu quán đã có trong DB thì bỏ qua, không tốn quota).
- Cào toàn bộ đánh giá thực tế và điều phối phân tích Gemini AI có kiểm soát tốc độ (Rate Limiter).
- Tự động xử lý các yêu cầu cào từ người dùng trong hàng đợi (crawl_requests).
"""

import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Đảm bảo UTF-8 console output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from database.models import (
    init_db,
    Restaurant as DBRestaurant,
    Review as DBReview,
    ReviewAnalysis as DBAnalysis,
    CrawlRequest as DBCrawlRequest
)
from database.db import get_session, get_or_create_restaurant, save_review, save_analysis
from crawler.foody_crawler import search_foody_places, crawl_restaurant
from analysis.gemini_analyzer import analyze_batch


# ==================== DANH MỤC HẠT GIỐNG MÓN ĂN & ĐỊA DANH ====================
DEFAULT_SEEDS = {
    "da-nang": [
        "cơm gà",
        "bánh tráng cuốn thịt heo",
        "mì quảng",
        "bún chả cá",
        "hải sản",
        "bánh xèo",
        "chè sầu",
        "cà phê"
    ],
    "ho-chi-minh": [
        "cơm tấm",
        "hủ tiếu",
        "bánh mì chảo",
        "lẩu bò",
        "trà sữa",
        "bún bò huế",
        "pizza"
    ],
    "ha-noi": [
        "phở",
        "bún chả",
        "bún đậu mắm tôm",
        "bánh cuốn",
        "chả cá lã vọng",
        "cà phê trứng"
    ]
}


def crawl_and_analyze_single_place(
    url: str,
    place_name: str = "",
    address: str = "",
    max_reviews: int = 25,
    force_refresh: bool = False
) -> Dict:
    """
    Cào và phân tích 1 quán cụ thể.
    Nếu đã có trong DB và force_refresh=False -> Bỏ qua để tiết kiệm tài nguyên.
    """
    url_clean = url.split("?")[0].strip()
    
    with get_session() as db:
        existing = db.query(DBRestaurant).filter_by(foody_url=url_clean).first()
        if existing and not force_refresh:
            rev_count = db.query(DBReview).filter_by(restaurant_id=existing.id).count()
            ana_count = (
                db.query(DBAnalysis)
                .join(DBReview)
                .filter(DBReview.restaurant_id == existing.id)
                .count()
            )
            if rev_count > 0 and ana_count > 0:
                print(f"  [Đã tồn tại] '{existing.name}' đã có {rev_count} review & {ana_count} phân tích -> Bỏ qua.")
                return {"status": "skipped", "restaurant_id": existing.id, "name": existing.name}

    # Tiến hành cào dữ liệu mới
    print(f"  [Đang cào] Bắt đầu lấy dữ liệu từ Foody: {url_clean}")
    crawl_data = crawl_restaurant(url_clean, max_reviews=max_reviews, headless=True)
    
    if not crawl_data or not crawl_data.get("name"):
        print(f"  [Lỗi cào] Không thể trích xuất dữ liệu từ {url_clean}")
        return {"status": "error", "message": "Crawl failed"}

    final_name = crawl_data.get("name") or place_name or "Quán ăn"
    final_addr = crawl_data.get("address") or address or ""
    overall_rating = crawl_data.get("overall_rating")

    with get_session() as db:
        restaurant = get_or_create_restaurant(
            db,
            name=final_name,
            foody_url=url_clean,
            address=final_addr,
            overall_rating=overall_rating
        )

        new_reviews = []
        for rv in crawl_data.get("reviews", []):
            saved = save_review(
                db,
                restaurant_id=restaurant.id,
                author=rv["author"],
                rating=rv["rating"],
                text=rv["text"],
                review_date=rv["date"]
            )
            if saved.is_analyzed == 0:
                new_reviews.append((saved.id, saved.text))

        # Phân tích AI theo batch
        analyzed_count = 0
        if new_reviews:
            print(f"  [AI ABSA] Đang phân tích {len(new_reviews)} đánh giá bằng Gemini AI...")
            payload = [{"id": rid, "text": txt} for rid, txt in new_reviews]
            results = analyze_batch(payload)

            for res in results:
                rid = res["review_id"]
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
                    analyzed_count += 1
                
                rev_obj = db.query(DBReview).filter_by(id=rid).first()
                if rev_obj:
                    rev_obj.is_analyzed = 1

        db.commit()
        print(f"  [Thành công] '{final_name}': Đã lưu {len(crawl_data.get('reviews', []))} review & {analyzed_count} chỉ số khía cạnh!")
        return {
            "status": "success",
            "restaurant_id": restaurant.id,
            "name": final_name,
            "reviews_count": len(crawl_data.get("reviews", [])),
            "analyses_count": analyzed_count
        }


def process_category(
    keyword: str,
    city_slug: str = "da-nang",
    max_places: int = 3,
    max_reviews: int = 25
) -> List[Dict]:
    """
    Tìm kiếm và cào danh sách các quán ăn theo 1 danh mục/từ khóa tại thành phố cụ thể.
    """
    print(f"\n=======================================================")
    print(f"🚀 [DANH MỤC] '{keyword}' tại '{city_slug}' (Tối đa: {max_places} quán)")
    print(f"=======================================================")

    discovered = search_foody_places(keyword, city_slug=city_slug, max_results=max_places)
    if not discovered:
        print(f"  Không tìm thấy quán nào trên Foody cho từ khóa '{keyword}'.")
        return []

    print(f"  Tìm thấy {len(discovered)} quán tiềm năng trên Foody. Bắt đầu xử lý...")
    results = []

    for i, place in enumerate(discovered, 1):
        print(f"\n[{i}/{len(discovered)}] {place['name']} - {place.get('address', '')}")
        res = crawl_and_analyze_single_place(
            url=place["url"],
            place_name=place["name"],
            address=place.get("address", ""),
            max_reviews=max_reviews
        )
        results.append(res)
        # Nghỉ ngắn giữa các quán để tránh bị Foody chặn IP
        time.sleep(2.0)

    return results


def process_pending_user_requests(max_requests: int = 10, max_reviews: int = 25) -> int:
    """
    Xử lý các yêu cầu cào quán từ người dùng trong hàng đợi `crawl_requests`.
    """
    with get_session() as db:
        pending_list = (
            db.query(DBCrawlRequest)
            .filter_by(status="pending")
            .order_by(DBCrawlRequest.requested_at.asc())
            .limit(max_requests)
            .all()
        )
        
        if not pending_list:
            return 0

        print(f"\n📬 [HÀNG ĐỢI NGƯỜI DÙNG] Phát hiện {len(pending_list)} yêu cầu đang chờ xử lý...")
        requests_data = [(req.id, req.query, req.city) for req in pending_list]

    processed = 0
    for req_id, query, city in requests_data:
        print(f"  -> Xử lý yêu cầu #{req_id}: '{query}' ({city})...")
        
        with get_session() as db:
            req_record = db.query(DBCrawlRequest).filter_by(id=req_id).first()
            if req_record:
                req_record.status = "processing"
                db.commit()

        try:
            # Tìm kiếm quán theo query
            places = search_foody_places(query, city_slug=city or "da-nang", max_results=1)
            if places:
                target = places[0]
                crawl_and_analyze_single_place(
                    url=target["url"],
                    place_name=target["name"],
                    address=target.get("address", ""),
                    max_reviews=max_reviews
                )
                with get_session() as db:
                    req_record = db.query(DBCrawlRequest).filter_by(id=req_id).first()
                    if req_record:
                        req_record.status = "completed"
                        req_record.note = f"Đã cào quán: {target['name']}"
                        req_record.completed_at = datetime.utcnow()
                        db.commit()
                processed += 1
            else:
                with get_session() as db:
                    req_record = db.query(DBCrawlRequest).filter_by(id=req_id).first()
                    if req_record:
                        req_record.status = "failed"
                        req_record.note = "Không tìm thấy quán trên Foody"
                        req_record.completed_at = datetime.utcnow()
                        db.commit()
        except Exception as e:
            print(f"  [Lỗi xử lý yêu cầu #{req_id}]: {e}")
            with get_session() as db:
                req_record = db.query(DBCrawlRequest).filter_by(id=req_id).first()
                if req_record:
                    req_record.status = "failed"
                    req_record.note = str(e)
                    req_record.completed_at = datetime.utcnow()
                    db.commit()

        time.sleep(2.0)

    return processed


def run_full_pipeline(
    cities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    max_places_per_cat: int = 2,
    max_reviews_per_place: int = 25
):
    """
    Khởi chạy toàn bộ quy trình thu thập và phân tích:
    1. Xử lý các yêu cầu đang chờ từ người dùng.
    2. Chạy qua toàn bộ danh mục hạt giống theo từng thành phố.
    """
    init_db()
    
    start_time = datetime.now()
    print("=" * 60)
    print("🌟 BẮT ĐẦU PIPELINE TỰ ĐỘNG CÀO & PHÂN TÍCH AI NGẦM")
    print(f"⏰ Thời gian bắt đầu: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 1. Xử lý yêu cầu người dùng trước
    process_pending_user_requests(max_requests=10, max_reviews=max_reviews_per_place)

    # 2. Xử lý danh mục hạt giống
    target_cities = cities or list(DEFAULT_SEEDS.keys())

    for city in target_cities:
        city_seeds = categories or DEFAULT_SEEDS.get(city, ["cơm", "bún", "phở", "quán ăn"])
        print(f"\n📍 KHU VỰC: {city.upper()} ({len(city_seeds)} danh mục)")
        
        for cat in city_seeds:
            try:
                process_category(
                    keyword=cat,
                    city_slug=city,
                    max_places=max_places_per_cat,
                    max_reviews=max_reviews_per_place
                )
            except Exception as e:
                print(f"  [Lỗi danh mục '{cat}']: {e}")
                time.sleep(3.0)

    end_time = datetime.now()
    duration = end_time - start_time
    print("\n" + "=" * 60)
    print(f"🎉 PIPELINE HOÀN TẤT THÀNH CÔNG!")
    print(f"⏱️ Tổng thời gian thực thi: {duration}")
    print("=" * 60)
