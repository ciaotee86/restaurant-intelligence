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


# ==================== DANH MỤC HẠT GIỐNG MÓN ĂN & ĐỊA DANH TOÀN QUỐC ====================
DEFAULT_SEEDS = {
    # --- MIỀN TRUNG & TÂY NGUYÊN ---
    "da-nang": [
        "cơm gà", "bánh tráng cuốn thịt heo", "mì quảng", "bún chả cá",
        "hải sản", "bánh xèo", "chè sầu", "nem lụi", "bún mắm nêm", "bê thui", "cà phê"
    ],
    "thua-thien-hue": [
        "bún bò huế", "bánh bèo", "bánh nậm", "bánh bột lọc",
        "cơm hến", "chè huế", "nem lụi", "bánh khoái", "tré huế"
    ],
    "quang-nam": [
        "cao lầu", "mì quảng", "cơm gà hội an", "bánh mì phượng",
        "bê thui cầu mống", "bánh đập", "chè bắp"
    ],
    "khanh-hoa": [
        "nem nướng nha trang", "bún sứa", "bún chả cá", "bánh căn",
        "hải sản tươi sống", "bò nướng lạc cảnh", "bánh xèo mực"
    ],
    "lam-dong": [
        "bánh tráng nướng", "lẩu gà lá é", "lẩu bò ba toa", "nem nướng đà lạt",
        "bánh mì xíu mại", "kem bơ", "sữa đậu nành nóng"
    ],
    "binh-dinh": [
        "bánh hỏi cháo lòng", "bánh xèo tôm nhảy", "bún chả cá quy nhơn",
        "chả ram tôm đất", "tré bình định", "nem chợ huyện"
    ],
    "nghe-an": [
        "súp lươn", "cháo lươn", "bánh mướt", "miến lươn", "nhút thanh chương"
    ],
    "dak-lak": [
        "bún đỏ buôn ma thuột", "cà phê buôn ma thuột", "gà nướng cơm lam",
        "lẩu lá rừng", "bò nhúng me"
    ],
    "binh-thuan": [
        "bánh căn phan thiết", "lẩu thả", "răng mực", "bánh quai vạc", "hải sản phan thiết"
    ],
    "phu-yen": [
        "mắt cá ngừ đại dương", "bánh hỏi lòng heo", "bánh xèo hải sản", "cháo hàu"
    ],

    # --- MIỀN BẮC ---
    "ha-noi": [
        "phở bò", "phở gà", "bún chả", "bún đậu mắm tôm", "bún thang",
        "bánh cuốn nóng", "chả cá lã vọng", "bún ốc", "bún riêu", "miến lươn", "cà phê trứng"
    ],
    "hai-phong": [
        "bánh đa cua", "bún cá cay", "bánh mì cay", "nem cua bể",
        "dừa dầm", "pate cột đèn", "ốc hải phòng"
    ],
    "quang-ninh": [
        "chả mực hạ long", "bún bề bề", "sá sùng", "sam biển",
        "gà đồi tiên yên", "sữa chua trân châu hạ long"
    ],
    "ninh-binh": [
        "dê núi ninh bình", "cơm cháy", "ốc núi", "miến lươn", "xôi trứng kiến"
    ],
    "lao-cai": [
        "lẩu cá hồi sapa", "cá tầm", "thắng cố", "lợn cắp nách", "đồ nướng sapa", "xôi ngũ sắc"
    ],

    # --- MIỀN NAM & ĐỒNG BẰNG SÔNG CỬU LONG ---
    "ho-chi-minh": [
        "cơm tấm", "hủ tiếu", "bánh mì", "lẩu bò", "bún bò huế",
        "bún thịt nướng", "ốc sài gòn", "phá lấu", "súp cua", "bột chiên",
        "gỏi cuốn", "bánh tráng trộn", "dimsum", "trà sữa"
    ],
    "can-tho": [
        "lẩu mắm", "bánh xèo củ hủ dừa", "nem nướng cái răng",
        "vịt nấu chao", "bún nước lèo", "ốc nướng tiêu"
    ],
    "kien-giang": [
        "bún quậy phú quốc", "gỏi cá trích", "ghẹ hàm ninh", "bún kèn", "hải sản phú quốc"
    ],
    "ba-ria-vung-tau": [
        "bánh khọt vũng tàu", "lẩu cá đuối", "bánh bông lan trứng muối", "gỏi cá mai", "hải sản"
    ],
    "binh-duong": [
        "bánh bèo bì", "gỏi măng cụt", "gà nướng sầu riêng", "lẩu bò"
    ],
    "dong-nai": [
        "gỏi bưởi tân triều", "chả lụi biên hòa", "lẩu tôm năm ri"
    ],
    "an-giang": [
        "bún cá châu đốc", "lẩu mắm cá linh", "bò bảy món núi sam", "bánh bò thốt nốt"
    ],
    "tay-ninh": [
        "bánh tráng phơi sương", "bánh canh trảng bàng", "bò tơ tây ninh"
    ],
    "ca-mau": [
        "cua cà mau", "ba khía rạch gốc", "tôm tích", "lẩu mắm u minh"
    ],
    "soc-trang": [
        "bún nước lèo", "bánh pía", "bánh cóng"
    ]
}

# Bản đồ phân vùng quận / huyện ẩm thực để tự động mở rộng từ khóa, chống nghẽn lặp
CITY_DISTRICTS = {
    "da-nang": ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Cẩm Lệ", "Liên Chiểu"],
    "ho-chi-minh": ["Quận 1", "Quận 3", "Quận 5", "Quận 10", "Bình Thạnh", "Phú Nhuận", "Thủ Đức"],
    "ha-noi": ["Hoàn Kiếm", "Ba Đình", "Đống Đa", "Cầu Giấy", "Tây Hồ", "Hai Bà Trưng"]
}

# Ngưỡng tối thiểu bài đánh giá hợp lệ để được lưu trữ (chặn tuyệt đối thực thể rác 0 review)
MIN_VIABLE_REVIEWS_THRESHOLD = 1


def get_dynamic_seeds_for_city(city: str) -> List[str]:
    """
    Tự động kết hợp danh mục món ăn với quận/huyện để tạo ra bộ từ khóa cào động,
    không bị cứng nhắc và luôn tìm được quán mới ở các khu vực khác nhau.
    """
    base = DEFAULT_SEEDS.get(city, ["cơm", "bún", "phở", "quán ăn", "hải sản", "cà phê"])
    districts = CITY_DISTRICTS.get(city, [])
    if not districts:
        return base

    # Sinh danh sách từ khóa động: món ăn gốc + món ăn kết hợp quận
    import random
    expanded = list(base)
    # Lấy ngẫu nhiên 2-3 món kết hợp với 2-3 quận để cào sâu
    sample_dishes = random.sample(base, min(4, len(base)))
    sample_districts = random.sample(districts, min(3, len(districts)))
    for dish in sample_dishes:
        for dist in sample_districts:
            expanded.append(f"{dish} {dist}")
    return expanded


def crawl_and_analyze_single_place(
    url: str,
    place_name: str = "",
    address: str = "",
    max_reviews: int = 25,
    force_refresh: bool = False
) -> Dict:
    """
    Cào và phân tích 1 quán cụ thể:
    - Nếu đã có trong DB và force_refresh=False: Cào incremental review mới.
    - Chặn thực thể rác: Nếu quán có 0 review từ Foody, thử bù đắp từ Google Maps.
      Nếu cả hai nguồn đều có 0 review hợp lệ -> TUYỆT ĐỐI KHÔNG ĐẨY VÀO DATABASE!
    """
    url_clean = url.split("?")[0].strip()
    
    known_fps = set()
    with get_session() as db:
        existing = db.query(DBRestaurant).filter_by(foody_url=url_clean).first()
        if existing:
            from database.db import get_restaurant_existing_fingerprints
            known_fps = get_restaurant_existing_fingerprints(db, existing.id)
            if known_fps:
                print(f"  [Incremental Crawl] '{existing.name}' đã có {len(known_fps)} review trong DB -> Ưu tiên lấy review mới và dừng sớm nếu gặp review cũ.")

    # Tiến hành cào dữ liệu mới
    print(f"  [Đang cào] Bắt đầu lấy dữ liệu từ Foody: {url_clean}")
    crawl_data = crawl_restaurant(
        url_clean,
        max_reviews=max_reviews,
        headless=True,
        known_fingerprints=known_fps,
        max_consecutive_existing=3
    )
    
    if not crawl_data or not crawl_data.get("name"):
        print(f"  [Lỗi cào] Không thể trích xuất dữ liệu từ {url_clean}")
        return {"status": "error", "message": "Crawl failed"}

    final_name = crawl_data.get("name") or place_name or "Quán ăn"
    final_addr = crawl_data.get("address") or address or ""
    overall_rating = crawl_data.get("overall_rating")

    # Lọc bài đánh giá hợp lệ
    raw_reviews = crawl_data.get("reviews", [])
    valid_reviews = [
        rv for rv in raw_reviews
        if (rv.get("text") or "").strip() and len((rv.get("text") or "").strip()) >= 5
    ]

    # BÙ ĐẮP GOOGLE MAPS NẾU FOODY 0 REVIEW
    gm_crawl_data = None
    if len(valid_reviews) == 0:
        print(f"  [Foody 0 Review] '{final_name}' có 0 review trên Foody. Thử tìm kiếm & bù đắp từ Google Maps...")
        try:
            from crawler.google_maps_crawler import search_and_crawl_google_maps
            search_gm_q = f"{final_name} {final_addr}".strip()
            gm_res = search_and_crawl_google_maps(
                query=search_gm_q,
                city="",
                max_reviews=max_reviews,
                headless=True
            )
            if gm_res and gm_res.get("success") and gm_res.get("reviews"):
                gm_valid = [
                    rv for rv in gm_res["reviews"]
                    if (rv.get("text") or "").strip() and len((rv.get("text") or "").strip()) >= 5
                ]
                if gm_valid:
                    gm_crawl_data = gm_res
                    print(f"  -> Bù đắp thành công {len(gm_valid)} review Google Maps cho '{final_name}'!")
        except Exception as gm_err:
            print(f"  -> [Google Maps Fallback Error]: {gm_err}")

    total_valid = len(valid_reviews) + (len(gm_crawl_data.get("reviews", [])) if gm_crawl_data else 0)

    # CHẶN THỰC THỂ RÁC: Nếu quán không có bất kỳ bài đánh giá nào từ cả hai nguồn -> Không lưu vào DB
    if total_valid < MIN_VIABLE_REVIEWS_THRESHOLD:
        print(f"  ⚠️ [Bỏ qua - Chống rác DB] '{final_name}': 0 bài đánh giá từ cả Foody và Google Maps. Không lưu vào database!")
        return {
            "status": "skipped",
            "reason": "insufficient_reviews",
            "message": f"Quán không có đánh giá nào ({total_valid} < {MIN_VIABLE_REVIEWS_THRESHOLD})"
        }

    with get_session() as db:
        restaurant = get_or_create_restaurant(
            db,
            name=final_name,
            foody_url=url_clean,
            address=final_addr,
            overall_rating=overall_rating
        )

        if gm_crawl_data:
            if gm_crawl_data.get("google_maps_url") and not restaurant.google_maps_url:
                restaurant.google_maps_url = gm_crawl_data["google_maps_url"]
            if gm_crawl_data.get("google_place_id") and not restaurant.google_place_id:
                restaurant.google_place_id = gm_crawl_data["google_place_id"]
            db.flush()

        new_reviews = []
        # Lưu review Foody
        for rv in valid_reviews:
            saved = save_review(
                db,
                restaurant_id=restaurant.id,
                author=rv["author"],
                rating=rv["rating"],
                text=rv["text"],
                review_date=rv["date"],
                is_spam=rv.get("is_spam", 0),
                spam_score=rv.get("spam_score", 0.0),
                spam_category=rv.get("spam_category", "normal"),
                spam_reason=rv.get("spam_reason", "[]"),
                foody_review_id=rv.get("foody_review_id"),
                fingerprint=rv.get("fingerprint")
            )
            if saved.is_analyzed == 0:
                if saved.is_spam == 0 and saved.spam_category != "low_information":
                    new_reviews.append((saved.id, saved.text))
                else:
                    saved.is_analyzed = 1

        # Lưu review Google Maps bù đắp nếu có
        if gm_crawl_data and gm_crawl_data.get("reviews"):
            from crawler.review_filter import classify_review
            from services.entity_resolution import compute_review_fingerprint, is_duplicate_review
            for gm_rv in gm_crawl_data["reviews"]:
                g_txt = (gm_rv.get("text") or "").strip()
                if not g_txt or len(g_txt) < 5 or is_duplicate_review(db, restaurant.id, g_txt):
                    continue
                g_clf = classify_review(g_txt, author=gm_rv.get("author"), restaurant_name=final_name)
                if g_clf.get("is_spam"):
                    continue
                g_fp = compute_review_fingerprint(g_txt)
                g_saved = DBReview(
                    restaurant_id=restaurant.id,
                    author=(gm_rv.get("author") or "Người dùng Google").strip(),
                    rating=float(gm_rv.get("rating") or 5.0),
                    text=g_txt,
                    review_date=(gm_rv.get("review_date") or "Gần đây").strip(),
                    is_analyzed=0,
                    is_spam=0,
                    spam_score=g_clf.get("spam_score", 0.0),
                    spam_category=g_clf.get("spam_category", "normal"),
                    spam_reason=json.dumps(g_clf.get("spam_reason", [])),
                    fingerprint=g_fp,
                    source="GoogleMaps",
                    google_review_id=gm_rv.get("google_review_id"),
                    created_at=datetime.utcnow()
                )
                db.add(g_saved)
                db.flush()
                if g_clf.get("spam_category") != "low_information":
                    new_reviews.append((g_saved.id, g_txt))
                else:
                    g_saved.is_analyzed = 1

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

        from services.entity_resolution import update_restaurant_counts_and_credibility
        update_restaurant_counts_and_credibility(db, restaurant.id)
        db.commit()

        total_saved_reviews = len(valid_reviews) + (len(gm_crawl_data.get("reviews", [])) if gm_crawl_data else 0)
        print(f"  [Thành công] '{final_name}': Đã lưu {total_saved_reviews} review & {analyzed_count} chỉ số khía cạnh!")
        return {
            "status": "success",
            "restaurant_id": restaurant.id,
            "name": final_name,
            "reviews_count": total_saved_reviews,
            "analyses_count": analyzed_count
        }


def process_category(
    keyword: str,
    city_slug: str = "da-nang",
    max_places: int = 3,
    max_reviews: int = 25,
    max_pages_to_search: int = 4
) -> List[Dict]:
    """
    Tìm kiếm và cào danh sách các quán ăn theo 1 danh mục/từ khóa tại thành phố:
    - Cơ chế Discovery Pagination: Tự động lọc bỏ các quán ĐÃ CÓ trong DB.
    - Nếu trang 1 toàn quán đã cào, tự động sang trang 2, 3... để tìm các quán HOÀN TOÀN MỚI.
    - Không bị skip cứng nhắc khi DB đã có 1 quán.
    """
    print(f"\n=======================================================")
    print(f"🚀 [DANH MỤC KHÁM PHÁ] '{keyword}' tại '{city_slug}' (Mục tiêu: {max_places} quán mới)")
    print(f"=======================================================")

    # 1. Lấy danh sách URL đã có trong DB
    existing_urls = set()
    with get_session() as db:
        rows = db.query(DBRestaurant.foody_url).filter(DBRestaurant.foody_url.isnot(None)).all()
        existing_urls = set(r[0] for r in rows)

    new_places_to_crawl = []

    # 2. Quét qua các trang phân trang (page 1, 2, 3...) cho đến khi gom đủ max_places quán MỚI
    for page in range(1, max_pages_to_search + 1):
        needed = max_places - len(new_places_to_crawl)
        if needed <= 0:
            break

        print(f"  🔍 Đang quét trang {page} trên Foody cho '{keyword}'...")
        batch = search_foody_places(
            query=keyword,
            city_slug=city_slug,
            max_results=needed * 3,
            page=page,
            existing_urls=existing_urls
        )
        if not batch:
            print(f"  Trang {page} không còn kết quả mới.")
            break

        for p in batch:
            if p["url"] not in existing_urls and p not in new_places_to_crawl:
                new_places_to_crawl.append(p)
                existing_urls.add(p["url"])
                if len(new_places_to_crawl) >= max_places:
                    break
        time.sleep(1.0)

    if not new_places_to_crawl:
        print(f"  ℹ️ Toàn bộ các quán tìm thấy cho từ khóa '{keyword}' trên Foody đã có trong cơ sở dữ liệu.")
        return []

    print(f"  🎯 Đã phát hiện {len(new_places_to_crawl)} quán HOÀN TOÀN MỚI chưa có trong DB. Bắt đầu cào...")
    results = []

    for i, place in enumerate(new_places_to_crawl, 1):
        print(f"\n[{i}/{len(new_places_to_crawl)}] Cào quán mới: {place['name']} - {place.get('address', '')}")
        res = crawl_and_analyze_single_place(
            url=place["url"],
            place_name=place["name"],
            address=place.get("address", ""),
            max_reviews=max_reviews
        )
        if res.get("status") == "success":
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
    max_reviews_per_place: int = 25,
    rotate_batch_size: int = 3
):
    """
    Khởi chạy toàn bộ quy trình thu thập và phân tích:
    1. Xử lý các yêu cầu đang chờ từ người dùng (crawl_requests) trước tiên.
    2. Quét các danh mục hạt giống theo tỉnh thành:
       - Nếu không truyền cities: Tự động xoay tua thông minh theo giờ (3 tỉnh/chuyến chạy),
         đảm bảo sau 12 chuyến/ngày (mỗi 2 tiếng) sẽ quét sạch toàn bộ 23+ tỉnh thành cả nước
         mà không bị Foody chặn IP hoặc quá tải.
       - Nếu truyền cities = ['all']: Quét toàn bộ 23+ tỉnh thành.
       - Nếu truyền danh sách cụ thể (vd: ['da-nang', 'ha-noi']): Quét các tỉnh được chọn.
    """
    init_db()
    
    start_time = datetime.now()
    print("=" * 60)
    print("🌟 BẮT ĐẦU PIPELINE TỰ ĐỘNG CÀO & PHÂN TÍCH AI NGẦM")
    print(f"⏰ Thời gian bắt đầu: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 1. Xử lý yêu cầu người dùng trước (Ưu tiên số 1)
    pending_count = process_pending_user_requests(max_requests=10, max_reviews=max_reviews_per_place)
    if pending_count > 0:
        print(f"✅ Đã giải quyết {pending_count} yêu cầu cào từ người dùng!")

    # 2. Xử lý danh mục hạt giống
    all_city_keys = list(DEFAULT_SEEDS.keys())

    if not cities:
        # Chế độ tự động xoay tua (Rotating Batch) dựa theo chu kỳ 15 phút
        now = datetime.utcnow()
        slot = (now.hour * 4 + now.minute // 15) % (max(1, len(all_city_keys) // rotate_batch_size))
        start_idx = (slot * rotate_batch_size) % len(all_city_keys)
        target_cities = [
            all_city_keys[(start_idx + i) % len(all_city_keys)]
            for i in range(rotate_batch_size)
        ]
        print(f"🔄 [Chế độ Xoay tua 15 phút] Đợt chạy lúc {now.strftime('%H:%M')} UTC chọn {len(target_cities)} tỉnh thành: {', '.join(target_cities)}")
    elif len(cities) == 1 and cities[0].lower() in ["all", "tat-ca"]:
        target_cities = all_city_keys
        print(f"🌐 [Chế độ Toàn quốc] Quét toàn bộ {len(target_cities)} tỉnh thành!")
    else:
        target_cities = cities

    for city in target_cities:
        city_seeds = categories or get_dynamic_seeds_for_city(city)
        print(f"\n📍 KHU VỰC: {city.upper()} ({len(city_seeds)} danh mục món)")
        
        for cat in city_seeds:
            try:
                process_category(
                    keyword=cat,
                    city_slug=city,
                    max_places=max_places_per_cat,
                    max_reviews=max_reviews_per_place
                )
            except Exception as e:
                print(f"  [Lỗi danh mục '{cat}' tại {city}]: {e}")
                time.sleep(3.0)

    end_time = datetime.now()
    duration = end_time - start_time
    print("\n" + "=" * 60)
    print(f"🎉 PIPELINE HOÀN TẤT THÀNH CÔNG!")
    print(f"⏱️ Tổng thời gian thực thi: {duration}")
    print("=" * 60)
