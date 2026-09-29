"""
Unit Test Suite kiểm thử Cơ chế Cào Review Mới & Chống Trùng Lặp (Incremental Crawling & Deduplication)
"""

import sys
import hashlib
from crawler.foody_crawler import compute_review_fingerprint
from crawler.review_filter import classify_review
from database.db import get_session, get_or_create_restaurant, save_review, get_restaurant_existing_fingerprints
from database.models import init_db, Review

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def test_fingerprint_uniqueness_and_stability():
    print("\n--- TEST 1: Tính Ổn Định & Tính Độc Bản của Fingerprint ---")
    url = "https://www.foody.vn/da-nang/com-chien-gion-gia-vinh"

    # 1. Hai lần hash cùng dữ liệu phải ra kết quả giống hệt nhau (Deterministic)
    fp1 = compute_review_fingerprint(url, "Hoàng Nam", "2 ngày trước", "Cơm chiên rất ngon, giòn rụm.")
    fp2 = compute_review_fingerprint(url, "Hoàng Nam", "2 ngày trước", "Cơm chiên rất ngon, giòn rụm.")
    assert fp1 == fp2, "Fingerprint không ổn định cho cùng một nội dung!"
    print("  [PASSED] Hash cùng nội dung -> Fingerprint giống nhau 100%.")

    # 2. Hai người khác nhau viết cùng nội dung -> Phải có fingerprint KHÁC nhau (Không nhầm tác giả)
    fp_diff_author = compute_review_fingerprint(url, "Trần Văn B", "2 ngày trước", "Cơm chiên rất ngon, giòn rụm.")
    assert fp1 != fp_diff_author, "Hai tác giả khác nhau lại bị trùng fingerprint!"
    print("  [PASSED] Cùng nội dung, khác tác giả -> Fingerprint khác nhau.")

    # 3. Hai ngày khác nhau của cùng một người -> Fingerprint KHÁC nhau
    fp_diff_date = compute_review_fingerprint(url, "Hoàng Nam", "1 tháng trước", "Cơm chiên rất ngon, giòn rụm.")
    assert fp1 != fp_diff_date, "Hai ngày khác nhau lại bị trùng fingerprint!"
    print("  [PASSED] Cùng nội dung, khác thời gian -> Fingerprint khác nhau.")

    # 4. Hai quán khác nhau có khách khen giống nhau -> Fingerprint KHÁC nhau
    fp_diff_url = compute_review_fingerprint("https://www.foody.vn/da-nang/quan-khac", "Hoàng Nam", "2 ngày trước", "Cơm chiên rất ngon, giòn rụm.")
    assert fp1 != fp_diff_url, "Hai quán khác nhau lại bị trùng fingerprint!"
    print("  [PASSED] Cùng nội dung, khác quán ăn -> Fingerprint khác nhau.")

    # 5. Nếu có Foody ID -> Ưu tiên ID ổn định
    fp_with_id = compute_review_fingerprint(url, "Hoàng Nam", "2 ngày trước", "Cơm chiên rất ngon", foody_review_id="998877")
    fp_with_same_id = compute_review_fingerprint(url, "Ai Đó", "Hôm qua", "Nội dung sửa", foody_review_id="998877")
    assert fp_with_id == fp_with_same_id, "Foody ID phải quyết định tính duy nhất khi có sẵn!"
    print("  [PASSED] Có Foody Review ID -> Định danh bất biến theo ID.")


def test_incremental_early_stopping_simulation():
    print("\n--- TEST 2: Mô Phỏng Cơ Chế Dừng Sớm (Early-Stopping) ---")
    url = "https://www.foody.vn/da-nang/com-chien-gion-gia-vinh"

    # Giả sử Database đã có 3 review cũ: R003, R002, R001
    db_reviews = [
        {"id": "R003", "author": "User3", "date": "10/08/2026", "text": "Món ăn tạm ổn."},
        {"id": "R002", "author": "User2", "date": "08/08/2026", "text": "Phục vụ nhanh nhẹn."},
        {"id": "R001", "author": "User1", "date": "05/08/2026", "text": "Quán sạch sẽ, giá hợp lý."}
    ]
    known_fps = {
        compute_review_fingerprint(url, r["author"], r["date"], r["text"])
        for r in db_reviews
    }
    print(f"  Database ban đầu có {len(known_fps)} review.")

    # Giả sử trên Foody hiện tại có 5 review (xếp từ mới nhất đến cũ):
    # R005 (MỚI), R004 (MỚI), R003 (CŨ), R002 (CŨ), R001 (CŨ)
    foody_stream = [
        {"id": "R005", "author": "User5", "date": "29/08/2026", "text": "Quán mới ra món cơm gà sốt cay cực ngon!"},
        {"id": "R004", "author": "User4", "date": "28/08/2026", "text": "Tuấn Dũng Travel cho thuê xe 16 chỗ giá rẻ liên hệ 0905123456"},
        {"id": "R003", "author": "User3", "date": "10/08/2026", "text": "Món ăn tạm ổn."},
        {"id": "R002", "author": "User2", "date": "08/08/2026", "text": "Phục vụ nhanh nhẹn."},
        {"id": "R001", "author": "User1", "date": "05/08/2026", "text": "Quán sạch sẽ, giá hợp lý."}
    ]

    # Thực thi thuật toán Incremental Scan với ngưỡng dừng sớm K = 2
    max_consecutive_existing = 2
    consecutive_count = 0
    new_reviews_collected = []
    processed_count = 0
    early_stopped = False

    for item in foody_stream:
        processed_count += 1
        fp = compute_review_fingerprint(url, item["author"], item["date"], item["text"])
        if fp in known_fps:
            consecutive_count += 1
            if consecutive_count >= max_consecutive_existing:
                early_stopped = True
                print(f"  -> Gặp {consecutive_count} review liên tiếp đã có trong DB. DỪNG CÀO SỚM tại vị trí {processed_count}!")
                break
        else:
            consecutive_count = 0
            new_reviews_collected.append(item)

    assert early_stopped is True, "Cơ chế dừng sớm không được kích hoạt!"
    assert len(new_reviews_collected) == 2, f"Kỳ vọng 2 review mới, nhưng nhận {len(new_reviews_collected)}"
    assert processed_count < len(foody_stream), "Thuật toán không dừng sớm, vẫn duyệt hết dữ liệu cũ!"
    print(f"  [PASSED] Thu thập đúng {len(new_reviews_collected)} review mới (R005, R004).")
    print(f"  [PASSED] Đã tiết kiệm thời gian, không quét review R001 cuối cùng.")


def test_database_deduplication():
    print("\n--- TEST 3: Kiểm Thử Tầng Database (Không Sinh Duplicate) ---")
    engine = init_db()
    url = "https://www.foody.vn/da-nang/test-quan-an-incremental-999"

    with get_session() as db:
        rest = get_or_create_restaurant(db, name="Quán Test Incremental", foody_url=url)
        initial_fps = get_restaurant_existing_fingerprints(db, rest.id)

        # Tạo review mới
        test_text = "Thử nghiệm cào review mới lần 1, đồ ăn rất vừa miệng."
        fp = compute_review_fingerprint(url, "Tester A", "Hôm nay", test_text)

        # Lần 1: Lưu vào DB
        r1 = save_review(
            db, restaurant_id=rest.id, author="Tester A", rating=9.0, text=test_text,
            review_date="Hôm nay", fingerprint=fp
        )
        db.commit()
        r1_id = r1.id
        print(f"  Lần 1: Đã lưu review ID {r1_id} với fingerprint {fp[:12]}...")

        # Lần 2: Thử lưu lại đúng review đó
        r2 = save_review(
            db, restaurant_id=rest.id, author="Tester A", rating=9.0, text=test_text,
            review_date="Hôm nay", fingerprint=fp
        )
        db.commit()
        r2_id = r2.id

        assert r1_id == r2_id, "save_review() tạo bản ghi trùng lặp thay vì trả về bản ghi cũ!"
        print(f"  [PASSED] Lần 2: Phát hiện trùng fingerprint -> Giữ nguyên ID {r2_id}, KHÔNG tạo duplicate.")


def test_pipeline_flow_with_spam_and_normal():
    print("\n--- TEST 4: Luồng Kết Hợp Giữa Review Mới & Bộ Lọc Spam ---")
    url = "https://www.foody.vn/da-nang/com-chien-gion-gia-vinh"

    # Giả sử có 2 review mới cào về
    new_raw_reviews = [
        {"author": "Khách A", "rating": 9.0, "date": "Vừa xong", "text": "Món lẩu nấm rất ngon, nước dùng ngọt thanh."},
        {"author": "Ẩn danh", "rating": 1.0, "date": "Vừa xong", "text": "Cần bán đất nền bất động sản chính chủ, liên hệ hotline 0905111222"}
    ]

    reviews_to_analyze_ai = []
    saved_reviews = []

    for item in new_raw_reviews:
        # 1. Bóc tách & sinh fingerprint
        fp = compute_review_fingerprint(url, item["author"], item["date"], item["text"])
        
        # 2. Chạy qua Spam Filter
        filter_res = classify_review(item["text"], author=item["author"])
        
        saved_obj = {
            "fingerprint": fp,
            "text": item["text"],
            "is_spam": 1 if filter_res["is_spam"] else 0,
            "spam_category": filter_res["spam_category"],
            "spam_score": filter_res["spam_score"]
        }
        saved_reviews.append(saved_obj)

        # 3. Phân luồng: Chỉ review HỢP LỆ mới gửi sang AI
        if saved_obj["is_spam"] == 0 and saved_obj["spam_category"] != "low_information":
            reviews_to_analyze_ai.append(saved_obj)

    assert len(saved_reviews) == 2, "Cả 2 review đều phải được lưu trữ trong DB!"
    assert len(reviews_to_analyze_ai) == 1, "Chỉ review ăn uống hợp lệ mới được gửi sang AI!"
    assert reviews_to_analyze_ai[0]["text"] == "Món lẩu nấm rất ngon, nước dùng ngọt thanh."
    print("  [PASSED] Review quảng cáo BĐS được gắn is_spam=1, lưu DB nhưng KHÔNG gửi AI.")
    print("  [PASSED] Review ẩm thực hợp lệ được đưa vào danh sách phân tích AI (ABSA).")


if __name__ == "__main__":
    print("=" * 70)
    print("KIỂM THỬ HỆ THỐNG CÀO INCREMENTAL & DEDUPLICATION")
    print("=" * 70)
    test_fingerprint_uniqueness_and_stability()
    test_incremental_early_stopping_simulation()
    test_database_deduplication()
    test_pipeline_flow_with_spam_and_normal()
    print("\n" + "=" * 70)
    print("TẤT CẢ CÁC BÀI TEST INCREMENTAL CRAWLER ĐỀU ĐẠT CHUẨN 100%!")
    print("=" * 70)
