"""
Test Suite cho Phase 1: Database Migration & Khớp Nối Thực Thể (Entity Resolution)
Dự án: Restaurant Intelligence System
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md & docs/07-multi-source-implementation-plan.md
"""

import os
import sqlite3
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Restaurant, Review, init_db
from database.migrate_multisource import (
    calculate_credibility_score as migration_credibility,
    migrate_database,
)
from services.entity_resolution import (
    normalize_vietnamese,
    calculate_name_similarity,
    is_same_location,
    resolve_or_create_restaurant,
    compute_review_fingerprint,
    is_duplicate_review,
    calculate_credibility_score,
    update_restaurant_counts_and_credibility,
)


@pytest.fixture
def memory_db():
    """Tạo SQLAlchemy in-memory database để test cô lập tốc độ cao."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


# ==============================================================================
# 1. TEST SCHEMA MODELS & CỘT MỚI
# ==============================================================================

def test_models_schema_and_columns(memory_db):
    """Kiểm tra ORM models hỗ trợ đầy đủ các cột đa nguồn mới và foody_url nullable."""
    # Tạo quán ăn chỉ có Google Maps, không có foody_url (foody_url=None)
    rest = Restaurant(
        name="Cơm Gà Gia Vĩnh",
        foody_url=None,
        google_maps_url="https://maps.google.com/?cid=123456",
        google_place_id="ChIJtest12345",
        city="Đà Nẵng",
        address="129 Hải Phòng, Hải Châu, Đà Nẵng",
        foody_review_count=0,
        google_review_count=5,
        credibility_score=0.5218,
    )
    memory_db.add(rest)
    memory_db.commit()

    saved = memory_db.query(Restaurant).filter_by(google_place_id="ChIJtest12345").first()
    assert saved is not None
    assert saved.foody_url is None
    assert saved.google_maps_url == "https://maps.google.com/?cid=123456"
    assert saved.google_review_count == 5
    assert saved.credibility_score == 0.5218

    # Tạo review từ nguồn GoogleMaps
    rev = Review(
        restaurant_id=saved.id,
        author="Nguyễn Văn A",
        rating=5.0,
        text="Cơm gà rất ngon, phục vụ nhanh!",
        source="GoogleMaps",
        google_review_id="g_rev_98765",
        fingerprint=compute_review_fingerprint("Cơm gà rất ngon, phục vụ nhanh!"),
    )
    memory_db.add(rev)
    memory_db.commit()

    saved_rev = memory_db.query(Review).filter_by(google_review_id="g_rev_98765").first()
    assert saved_rev is not None
    assert saved_rev.source == "GoogleMaps"
    assert saved_rev.google_review_id == "g_rev_98765"


# ==============================================================================
# 2. TEST CHUẨN HÓA TIẾNG VIỆT (normalize_vietnamese)
# ==============================================================================

def test_normalize_vietnamese():
    """Kiểm tra loại bỏ dấu thanh, mũ, chuyển chữ thường, khử 'đ/Đ' và ký tự đặc biệt."""
    assert normalize_vietnamese("Cơm Gà Gia Vĩnh") == "com ga gia vinh"
    assert normalize_vietnamese("Đà Nẵng & Hội An!") == "da nang hoi an"
    assert normalize_vietnamese("BÁNH TRÁNG CUỐN THỊT HEO") == "banh trang cuon thit heo"
    assert normalize_vietnamese("Quán Ăn (Chi Nhánh 1 - Hải Châu)") == "quan an chi nhanh 1 hai chau"
    assert normalize_vietnamese("   Khoảng   trắng   thừa   ") == "khoang trang thua"
    assert normalize_vietnamese("") == ""
    assert normalize_vietnamese(None) == ""


# ==============================================================================
# 3. TEST TÍNH TƯƠNG ĐỒNG TÊN QUÁN (calculate_name_similarity)
# ==============================================================================

def test_calculate_name_similarity_exact_and_accents():
    """Tên giống hệt nhau hoặc chỉ khác biệt hoa thường / dấu tiếng Việt phải có điểm 1.0"""
    assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "Cơm Gà Gia Vĩnh") == 1.0
    assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "com ga gia vinh") == 1.0
    assert calculate_name_similarity("Com Ga Gia Vinh", "Cơm Gà Gia Vĩnh") == 1.0


def test_calculate_name_similarity_prefix_suffix_branch():
    """Tên có tiền tố 'Quán' hoặc hậu tố chi nhánh Foody phải có điểm >= 0.85"""
    # Thêm tiền tố 'Quán'
    sim_prefix = calculate_name_similarity("Quán Cơm Gà Gia Vĩnh", "Cơm Gà Gia Vĩnh")
    assert sim_prefix >= 0.85, f"Kỳ vọng >= 0.85, nhận được: {sim_prefix}"

    # Hậu tố đường/chi nhánh Foody
    sim_branch = calculate_name_similarity("Cơm Gà Gia Vĩnh - Hải Phòng", "Cơm Gà Gia Vĩnh")
    assert sim_branch >= 0.85, f"Kỳ vọng >= 0.85, nhận được: {sim_branch}"

    # Đảo trật tự từ
    sim_swap = calculate_name_similarity("Bà Hường - Bánh Tráng Cuốn Thịt Heo", "Bánh Tráng Cuốn Thịt Heo Bà Hường")
    assert sim_swap >= 0.85, f"Kỳ vọng >= 0.85, nhận được: {sim_swap}"


def test_calculate_name_similarity_different_brands():
    """Hai quán cùng món ăn nhưng khác thương hiệu phải có điểm < 0.85 (không khớp)"""
    sim_diff = calculate_name_similarity("Cơm Gà Gia Vĩnh", "Cơm Gà Hải Nam")
    assert sim_diff < 0.85, f"Hai quán khác nhau nhưng điểm quá cao: {sim_diff}"

    sim_diff2 = calculate_name_similarity("Bún Chả Cá Bà Lữ", "Bún Chả Cá Hùng Vương")
    assert sim_diff2 < 0.85, f"Hai quán bún chả cá khác nhau bị khớp nhầm: {sim_diff2}"

    sim_totally_diff = calculate_name_similarity("Cơm Gà Gia Vĩnh", "Bánh Tráng Tiến Tiến")
    assert sim_totally_diff < 0.35


# ==============================================================================
# 4. TEST SO KHỚP ĐỊA CHỈ & CHI NHÁNH (is_same_location)
# ==============================================================================

def test_is_same_location_empty_or_matching():
    """Địa chỉ rỗng hoặc cùng quận/địa chỉ phải khớp (True)"""
    assert is_same_location(None, "129 Hải Phòng, Hải Châu, Đà Nẵng") is True
    assert is_same_location("129 Hải Phòng, Hải Châu", None) is True
    assert is_same_location(
        "129 Hải Phòng, P. Thạch Thang, Q. Hải Châu, Đà Nẵng",
        "129 Hải Phòng, Hải Châu, Đà Nẵng"
    ) is True


def test_is_same_location_different_branches():
    """Hai chi nhánh ở hai quận khác nhau hoặc hai số nhà khác nhau phải trả về False"""
    # Khác quận rõ ràng
    assert is_same_location(
        "129 Hải Phòng, Hải Châu, Đà Nẵng",
        "85 Phạm Cự Lượng, Sơn Trà, Đà Nẵng"
    ) is False

    # Cùng tuyến đường nhưng khác số nhà
    assert is_same_location(
        "100 Hải Phòng, Hải Châu",
        "250 Hải Phòng, Hải Châu"
    ) is False


# ==============================================================================
# 5. TEST FINGERPRINT SHA-256 VÀ KHỬ TRÙNG LẶP ĐÁNH GIÁ
# ==============================================================================

def test_compute_review_fingerprint():
    """Fingerprint SHA-256 phải bất biến với chữ hoa/thường, dấu câu, và khoảng trắng thừa."""
    text1 = "Cơm gà ở đây rất ngon! Đậm đà, phục vụ nhiệt tình."
    text2 = "  com ga o day rat ngon dam da phuc vu nhiet tinh   "
    fp1 = compute_review_fingerprint(text1)
    fp2 = compute_review_fingerprint(text2)
    assert fp1 == fp2, "Fingerprint phải giống nhau cho nội dung tương đương"
    assert len(fp1) == 64, "SHA-256 hex digest phải có đúng 64 ký tự"


def test_is_duplicate_review(memory_db):
    """Kiểm tra phát hiện chính xác đánh giá bị sao chép trùng lặp."""
    rest = Restaurant(name="Quán Test Dup", foody_url="https://foody.vn/test-dup")
    memory_db.add(rest)
    memory_db.commit()

    text_sample = "Món ăn ngon tuyệt vời, không gian thoáng đãng sạch sẽ."
    fp = compute_review_fingerprint(text_sample)
    rev = Review(restaurant_id=rest.id, text=text_sample, fingerprint=fp)
    memory_db.add(rev)
    memory_db.commit()

    # Trùng lặp hoàn toàn
    assert is_duplicate_review(memory_db, rest.id, text_sample) is True
    # Trùng lặp nhưng chỉ khác dấu chấm cảm và khoảng trắng
    assert is_duplicate_review(memory_db, rest.id, "  Món ăn ngon tuyệt vời, không gian thoáng đãng sạch sẽ! ") is True
    # Đánh giá khác hoàn toàn -> Không trùng
    assert is_duplicate_review(memory_db, rest.id, "Phục vụ quá tệ, chờ 30 phút không có đồ ăn") is False
    # Cùng nội dung nhưng ở nhà hàng khác -> Không tính là trùng của nhà hàng khác
    assert is_duplicate_review(memory_db, restaurant_id=9999, review_text=text_sample) is False


# ==============================================================================
# 6. TEST THƯỚC ĐO ĐỘ TIN CẬY MẪU (Statistical Credibility Metric)
# ==============================================================================

def test_credibility_score_formula():
    """
    Kiểm tra công thức tiệm cận C = min(1.0, ln(N + 1) / ln(31)):
    - N = 0: C = 0.0
    - N = 5: C ~ 0.5218
    - N = 10: C ~ 0.6983
    - N = 20: C ~ 0.8866
    - N = 30: C = 1.0 (100%)
    - N > 30: C = 1.0 (bị chặn trên tại 1.0)
    """
    assert calculate_credibility_score(0) == 0.0
    assert abs(calculate_credibility_score(5) - 0.5218) < 0.001
    assert abs(calculate_credibility_score(10) - 0.6983) < 0.001
    assert abs(calculate_credibility_score(20) - 0.8866) < 0.001
    assert calculate_credibility_score(30) == 1.0
    assert calculate_credibility_score(100) == 1.0
    assert calculate_credibility_score(-5) == 0.0

    # Kiểm tra tính đồng bộ giữa module service và migration script
    assert migration_credibility(10) == calculate_credibility_score(10)


def test_update_restaurant_counts_and_credibility(memory_db):
    """Kiểm tra hàm cập nhật tự động bộ đếm đa nguồn và chỉ số tin cậy."""
    rest = Restaurant(name="Quán Đa Nguồn", foody_url="https://foody.vn/da-nguon")
    memory_db.add(rest)
    memory_db.commit()

    # Thêm 5 review Foody
    for i in range(5):
        memory_db.add(Review(
            restaurant_id=rest.id,
            author=f"Foody User {i}",
            rating=8.0,
            text=f"Review Foody số {i}",
            source="Foody"
        ))

    # Thêm 5 review Google Maps
    for j in range(5):
        memory_db.add(Review(
            restaurant_id=rest.id,
            author=f"Google User {j}",
            rating=5.0,
            text=f"Review Google số {j}",
            source="GoogleMaps"
        ))

    memory_db.commit()

    # Chạy hàm cập nhật
    updated_rest = update_restaurant_counts_and_credibility(memory_db, rest.id)
    assert updated_rest.review_count == 10
    assert updated_rest.foody_review_count == 5
    assert updated_rest.google_review_count == 5
    assert abs(updated_rest.credibility_score - 0.6983) < 0.001


# ==============================================================================
# 7. TEST KHỚP THỰC THỂ QUÁN ĂN (resolve_or_create_restaurant)
# ==============================================================================

def test_resolve_or_create_by_exact_url_or_place_id(memory_db):
    """Khớp chính xác theo Google Place ID hoặc URL có sẵn mà không tạo mới."""
    rest = Restaurant(
        name="Cơm Gà Gia Vĩnh",
        foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh",
        google_maps_url="https://maps.google.com/?cid=111",
        google_place_id="PLACE_ABC",
    )
    memory_db.add(rest)
    memory_db.commit()

    # Khớp theo Google Place ID
    r1, is_created1 = resolve_or_create_restaurant(
        memory_db,
        name="Quán Cơm Gà Gia Vĩnh",
        google_place_id="PLACE_ABC"
    )
    assert is_created1 is False
    assert r1.id == rest.id

    # Khớp theo Google Maps URL
    r2, is_created2 = resolve_or_create_restaurant(
        memory_db,
        name="Tên Khác",
        google_maps_url="https://maps.google.com/?cid=111"
    )
    assert is_created2 is False
    assert r2.id == rest.id

    # Khớp theo Foody URL
    r3, is_created3 = resolve_or_create_restaurant(
        memory_db,
        name="Tên Bất Kỳ",
        foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh"
    )
    assert is_created3 is False
    assert r3.id == rest.id


def test_resolve_or_create_fuzzy_match_same_branch(memory_db):
    """
    Khi cào từ Google Maps: Tên 'Cơm Gà Gia Vĩnh', địa chỉ 'Hải Phòng, Hải Châu'.
    DB đã có: 'Cơm Gà Gia Vĩnh - Hải Phòng', '129 Hải Phòng, Thạch Thang, Hải Châu'.
    -> Phải khớp vào quán cũ, cập nhật google_maps_url, KHÔNG tạo quán mới.
    """
    existing_rest = Restaurant(
        name="Cơm Gà Gia Vĩnh - Hải Phòng",
        foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh-hai-phong",
        address="129 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng",
    )
    memory_db.add(existing_rest)
    memory_db.commit()
    old_id = existing_rest.id

    gmaps_url = "https://maps.google.com/?cid=998877"
    gmaps_place_id = "ChIJ_GIA_VINH"

    resolved, is_created = resolve_or_create_restaurant(
        memory_db,
        name="Cơm Gà Gia Vĩnh",
        address="129 Hải Phòng, Hải Châu, Đà Nẵng",
        google_maps_url=gmaps_url,
        google_place_id=gmaps_place_id,
    )

    assert is_created is False
    assert resolved.id == old_id
    assert resolved.google_maps_url == gmaps_url
    assert resolved.google_place_id == gmaps_place_id

    # Tổng số quán trong DB vẫn giữ nguyên là 1
    assert memory_db.query(Restaurant).count() == 1


def test_resolve_or_create_distinct_branch_creates_new(memory_db):
    """
    Khi quán cùng tên nhưng khác chi nhánh địa chỉ (Hải Châu vs Sơn Trà):
    -> Phải tạo mới bản ghi chi nhánh riêng biệt.
    """
    branch1 = Restaurant(
        name="Cơm Gà Gia Vĩnh - Hải Phòng",
        foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh-hai-phong",
        address="129 Hải Phòng, Hải Châu, Đà Nẵng",
    )
    memory_db.add(branch1)
    memory_db.commit()

    # Chi nhánh 2 ở Sơn Trà
    resolved_b2, is_created_b2 = resolve_or_create_restaurant(
        memory_db,
        name="Cơm Gà Gia Vĩnh",
        address="85 Phạm Cự Lượng, Sơn Trà, Đà Nẵng",
        google_maps_url="https://maps.google.com/?cid=son-tra",
    )

    assert is_created_b2 is True
    assert resolved_b2.id != branch1.id
    assert memory_db.query(Restaurant).count() == 2


# ==============================================================================
# 8. TEST MIGRATION SCRIPT TRÊN CƠ SỞ DỮ LIỆU THỰC TẾ CÔ LẬP
# ==============================================================================

def test_migration_script_lifecycle(tmp_path):
    """
    Kiểm tra vòng đời migrate_database:
    - Tạo SQLite DB cũ (chưa có các cột mới, reviews có source=None).
    - Chạy migrate_database.
    - Xác minh bản sao lưu (.bak) được tạo tự động.
    - Xác minh tất cả cột mới được thêm và dữ liệu cũ bảo toàn 100%.
    - Xác minh tính idempotent khi chạy lại lần 2 không bị lỗi.
    """
    temp_db_file = str(tmp_path / "test_legacy.db")

    # 1. Tạo database SQLite với schema cũ
    conn = sqlite3.connect(temp_db_file)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE restaurants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            foody_url VARCHAR(500) UNIQUE,
            address VARCHAR(500),
            overall_rating FLOAT,
            review_count INTEGER DEFAULT 0
        );
    """)
    cur.execute("""
        CREATE TABLE reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restaurant_id INTEGER NOT NULL,
            author VARCHAR(255),
            rating FLOAT,
            text TEXT NOT NULL,
            review_date VARCHAR(50),
            is_analyzed INTEGER DEFAULT 0
        );
    """)

    # Nạp 2 nhà hàng và 15 đánh giá cũ
    cur.execute("INSERT INTO restaurants (name, foody_url, address, review_count) VALUES ('Quán A', 'https://foody.vn/a', '10 Trần Phú', 10);")
    rest_a_id = cur.lastrowid
    cur.execute("INSERT INTO restaurants (name, foody_url, address, review_count) VALUES ('Quán B', 'https://foody.vn/b', '20 Bạch Đằng', 5);")
    rest_b_id = cur.lastrowid

    for i in range(10):
        cur.execute("INSERT INTO reviews (restaurant_id, author, rating, text) VALUES (?, ?, ?, ?);",
                    (rest_a_id, f"User {i}", 8.0, f"Đánh giá A {i}"))
    for j in range(5):
        cur.execute("INSERT INTO reviews (restaurant_id, author, rating, text) VALUES (?, ?, ?, ?);",
                    (rest_b_id, f"User {j}", 9.0, f"Đánh giá B {j}"))

    conn.commit()
    conn.close()

    # 2. Thực thi script migration
    result = migrate_database(temp_db_file)
    assert result["status"] == "success"
    assert os.path.exists(result["backup_file"]), "File backup phải được tạo thành công!"

    # 3. Kiểm tra schema sau migration
    conn_migrated = sqlite3.connect(temp_db_file)
    conn_migrated.row_factory = sqlite3.Row
    c = conn_migrated.cursor()

    c.execute("PRAGMA table_info(restaurants);")
    new_rest_cols = {row["name"] for row in c.fetchall()}
    for expected_col in ["google_maps_url", "google_place_id", "foody_review_count", "google_review_count", "credibility_score"]:
        assert expected_col in new_rest_cols, f"Thiếu cột {expected_col} trong bảng restaurants!"

    c.execute("PRAGMA table_info(reviews);")
    new_rev_cols = {row["name"] for row in c.fetchall()}
    for expected_col in ["source", "google_review_id"]:
        assert expected_col in new_rev_cols, f"Thiếu cột {expected_col} trong bảng reviews!"

    # 4. Kiểm tra dữ liệu được bảo toàn và backfill
    c.execute("SELECT COUNT(*) FROM restaurants;")
    assert c.fetchone()[0] == 2, "Số lượng quán phải được bảo toàn 100%!"

    c.execute("SELECT COUNT(*) FROM reviews;")
    assert c.fetchone()[0] == 15, "Số lượng reviews phải được bảo toàn 100%!"

    # Toàn bộ review cũ phải được gán source = 'Foody'
    c.execute("SELECT COUNT(*) FROM reviews WHERE source = 'Foody';")
    assert c.fetchone()[0] == 15

    # Kiểm tra chỉ số tin cậy đã được tính toán cho Quán A (10 review)
    c.execute("SELECT review_count, foody_review_count, google_review_count, credibility_score FROM restaurants WHERE id = ?;", (rest_a_id,))
    row_a = c.fetchone()
    assert row_a["review_count"] == 10
    assert row_a["foody_review_count"] == 10
    assert row_a["google_review_count"] == 0
    assert abs(row_a["credibility_score"] - 0.6983) < 0.001

    conn_migrated.close()

    # 5. Chạy lại lần 2 để kiểm tra tính Idempotent (không được gây lỗi khi cột đã tồn tại)
    result_second = migrate_database(temp_db_file)
    assert result_second["status"] == "success"
    assert len(result_second["added_restaurant_columns"]) == 0
    assert len(result_second["added_review_columns"]) == 0
