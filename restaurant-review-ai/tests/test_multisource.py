"""
Test Suite Tích Hợp Toàn Diện Cho Tính Năng Mở Rộng Đa Nguồn & Thước Đo Độ Tin Cậy Mẫu
Hệ thống: Restaurant Intelligence System
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md & docs/07-multi-source-implementation-plan.md
Phase 5: Kiểm Thử Toàn Diện [TASK-08]

Bao quát 7 phân hệ cốt lõi:
1. Schema SQLite đa nguồn & tính tương thích ngược (50 nhà hàng, 677 reviews cũ).
2. Entity Resolution: So khớp mờ Fuzzy Token Name (>= 85%) + địa chỉ phân biệt cùng quán vs chi nhánh mới.
3. Khử trùng lặp nội dung review qua SHA-256 fingerprint giữa Foody và Google Maps.
4. Thước đo tiệm cận độ tin cậy mẫu C = min(1.0, ln(N+1)/ln(31)) * 100% & phân cấp High/Medium/Low.
5. End-to-end API POST /api/crawler/google-maps (SSRF, mock crawl, lọc spam 11 ca, ABSA, DB persistence).
6. BI Service format_restaurant_full() & hợp đồng dữ liệu đa nguồn (sourceBreakdown, credibilityScore, sampleWarning).
7. Auto-enrich pipeline trong run_pipeline.py (nhận diện quán mỏng, định tuyến crawler, anti-crash).
"""

import os
import sys
import json
import shutil
import sqlite3
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Đảm bảo đường dẫn import đúng module trong thư mục restaurant-review-ai
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import database.db as db_module
from database.models import Base, Restaurant, Review, ReviewAnalysis
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
from services.bi_service import format_restaurant_full
from routers.crawler import validate_google_maps_url
from api_server import app
from run_pipeline import auto_enrich_sparse_restaurants


# ==============================================================================
# TEST FIXTURES & ISOLATED IN-MEMORY DATABASE
# ==============================================================================

@pytest.fixture
def memory_db():
    """Tạo database SQLite in-memory cô lập hoàn toàn cho unit tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture
def test_db_session():
    """Tạo database SQLite in-memory và monkeypatch db_module.SessionLocal cho FastAPI TestClient."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(bind=test_engine)

    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = TestingSessionLocal

    session = TestingSessionLocal()
    yield session

    session.close()
    Base.metadata.drop_all(test_engine)
    db_module.SessionLocal = original_session_local


@pytest.fixture
def client(test_db_session):
    """FastAPI TestClient kết nối với database test in-memory cô lập."""
    return TestClient(app)


# ==============================================================================
# PHẦN 1: SCHEMA SQLITE ĐA NGUỒN & TÍNH TƯƠNG THÍCH NGƯỢC (50 QUÁN, 677 REVIEWS)
# ==============================================================================

class TestSection1SchemaAndBackwardCompatibility:
    """Kiểm tra tính toàn vẹn schema, di chuyển dữ liệu và tương thích ngược với 50 quán, 677 reviews."""

    def test_schema_backward_compatibility_production_db_replica(self, tmp_path):
        """
        Kiểm tra cơ sở dữ liệu sản phẩm thực tế (50 nhà hàng, 677 reviews):
        - Sao chép sang tmp_path cô lập, tuyệt đối không sửa đổi file data/restaurants.db gốc.
        - Xác minh chính xác 50 nhà hàng và 677 đánh giá được đọc trơn tru qua SQLAlchemy ORM.
        - Tất cả các trường đa nguồn mới đều tồn tại và mang dữ liệu hợp lệ.
        """
        original_db_path = os.path.join(str(BASE_DIR), "data", "restaurants.db")
        assert os.path.exists(original_db_path), f"File database gốc không tồn tại: {original_db_path}"

        temp_db_copy = str(tmp_path / "isolated_restaurants.db")
        shutil.copy2(original_db_path, temp_db_copy)

        # Kết nối tới bản sao cô lập bằng SQLAlchemy
        engine = create_engine(f"sqlite:///{temp_db_copy.replace(os.sep, '/')}", echo=False)
        Session = sessionmaker(bind=engine)
        session = Session()

        try:
            # 1. Xác minh số lượng bản ghi tối thiểu từ seed gốc
            restaurants = session.query(Restaurant).all()
            reviews = session.query(Review).all()
            assert len(restaurants) >= 50, f"Kỳ vọng ít nhất 50 nhà hàng, nhận được {len(restaurants)}"
            assert len(reviews) >= 677, f"Kỳ vọng ít nhất 677 reviews, nhận được {len(reviews)}"

            # 2. Xác minh các cột mới tồn tại và có giá trị hợp lệ trên các nhà hàng
            for r in restaurants:
                assert r.id is not None
                assert r.name and len(r.name.strip()) > 0
                assert hasattr(r, "google_maps_url")
                assert hasattr(r, "google_place_id")
                assert hasattr(r, "foody_review_count")
                assert hasattr(r, "google_review_count")
                assert hasattr(r, "credibility_score")

                # Credibility score phải nằm trong đoạn [0.0, 1.0]
                assert 0.0 <= (r.credibility_score or 0.0) <= 1.0
                # Tổng review theo từng nguồn phải khớp với tổng review_count
                assert (r.foody_review_count or 0) + (r.google_review_count or 0) == (r.review_count or 0)

            # 3. Xác minh các reviews có gắn cột source hợp lệ
            for rev in reviews:
                assert rev.id is not None
                assert rev.text and len(rev.text.strip()) > 0
                assert hasattr(rev, "source")
                assert rev.source in ("Foody", "GoogleMaps", "google_maps", "Google Maps", None)
                assert hasattr(rev, "google_review_id")
                assert hasattr(rev, "fingerprint")
        finally:
            session.close()
            engine.dispose()

    def test_migration_lifecycle_and_idempotency_on_isolated_db(self, tmp_path):
        """
        Kiểm tra vòng đời migrate_database trên database cũ giả lập:
        - Tạo SQLite cũ chưa có cột đa nguồn.
        - Chạy migration script -> tạo backup, thêm cột an toàn, gán source='Foody', tính credibility.
        - Chạy lại lần 2 -> Idempotent, không gây lỗi.
        """
        legacy_db_file = str(tmp_path / "legacy_test.db")
        conn = sqlite3.connect(legacy_db_file)
        cur = conn.cursor()

        # Schema cũ thời kỳ chỉ hỗ trợ Foody
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

        # Thêm 2 nhà hàng và 15 đánh giá cũ
        cur.execute("INSERT INTO restaurants (name, foody_url, address, review_count) VALUES ('Quán Test A', 'https://foody.vn/a', '10 Trần Phú', 10);")
        ra_id = cur.lastrowid
        cur.execute("INSERT INTO restaurants (name, foody_url, address, review_count) VALUES ('Quán Test B', 'https://foody.vn/b', '20 Bạch Đằng', 5);")
        rb_id = cur.lastrowid

        for i in range(10):
            cur.execute("INSERT INTO reviews (restaurant_id, author, rating, text) VALUES (?, ?, ?, ?);",
                        (ra_id, f"Author A{i}", 8.0, f"Món ăn rất ngon A{i}"))
        for j in range(5):
            cur.execute("INSERT INTO reviews (restaurant_id, author, rating, text) VALUES (?, ?, ?, ?);",
                        (rb_id, f"Author B{j}", 9.0, f"Món ăn rất ngon B{j}"))

        conn.commit()
        conn.close()

        # 1. Chạy migration lần 1
        res1 = migrate_database(legacy_db_file)
        assert res1["status"] == "success"
        assert os.path.exists(res1["backup_file"])
        assert res1["restaurants_migrated"] == 2

        # 2. Kiểm tra dữ liệu sau migration
        conn_migrated = sqlite3.connect(legacy_db_file)
        conn_migrated.row_factory = sqlite3.Row
        c = conn_migrated.cursor()

        c.execute("PRAGMA table_info(restaurants);")
        rest_cols = {row["name"] for row in c.fetchall()}
        for col in ["google_maps_url", "google_place_id", "foody_review_count", "google_review_count", "credibility_score"]:
            assert col in rest_cols

        c.execute("SELECT review_count, foody_review_count, google_review_count, credibility_score FROM restaurants WHERE id = ?;", (ra_id,))
        row_a = c.fetchone()
        assert row_a["review_count"] == 10
        assert row_a["foody_review_count"] == 10
        assert row_a["google_review_count"] == 0
        assert abs(row_a["credibility_score"] - calculate_credibility_score(10)) < 0.0001

        # Tất cả review được gắn source = 'Foody'
        c.execute("SELECT COUNT(*) FROM reviews WHERE source = 'Foody';")
        assert c.fetchone()[0] == 15
        conn_migrated.close()

        # 3. Chạy migration lần 2 (Kiểm tra Idempotency)
        res2 = migrate_database(legacy_db_file)
        assert res2["status"] == "success"
        assert len(res2["added_restaurant_columns"]) == 0
        assert len(res2["added_review_columns"]) == 0


# ==============================================================================
# PHẦN 2: THUẬT TOÁN ENTITY RESOLUTION & SO KHỚP MỜ (>= 85%) VÀ ĐỊA CHỈ
# ==============================================================================

class TestSection2EntityResolution:
    """Kiểm tra thuật toán so khớp mờ tên quán, định vị địa chỉ và xử lý trùng/tách chi nhánh."""

    def test_fuzzy_name_matching_threshold_85_percent(self):
        """
        Kiểm tra độ tương đồng tên quán (Fuzzy Token Set Matching):
        - Ngưỡng >= 0.85 (85%) coi là cùng tên thương hiệu.
        - Khác thương hiệu rõ ràng phải < 0.85.
        """
        # 1. Trùng khớp chính xác hoặc chỉ khác dấu / chữ hoa thường
        assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "Cơm Gà Gia Vĩnh") == 1.0
        assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "com ga gia vinh") == 1.0
        assert calculate_name_similarity("Bánh Tráng Cuốn Thịt Heo", "banh trang cuon thit heo") == 1.0

        # 2. Thêm tiền tố loại hình (Quán, Nhà hàng, Tiệm...)
        assert calculate_name_similarity("Quán Cơm Gà Gia Vĩnh", "Cơm Gà Gia Vĩnh") >= 0.85
        assert calculate_name_similarity("Nhà Hàng Cơm Gà Gia Vĩnh", "Cơm Gà Gia Vĩnh") >= 0.85

        # 3. Hậu tố địa chỉ / chi nhánh (Foody thường thêm tên đường)
        assert calculate_name_similarity("Cơm Gà Gia Vĩnh - Hải Phòng", "Cơm Gà Gia Vĩnh") >= 0.85
        assert calculate_name_similarity("Mì Quảng Bà Mua - Trần Bình Trọng", "Mì Quảng Bà Mua") >= 0.85

        # 4. Đảo vị trí từ ngữ
        assert calculate_name_similarity("Bà Hường - Bánh Tráng Cuốn Thịt Heo", "Bánh Tráng Cuốn Thịt Heo Bà Hường") >= 0.85

        # 5. Cùng loại món nhưng khác tên thương hiệu -> Bắt buộc < 0.85 (Không được gộp nhầm)
        assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "Cơm Gà Hải Nam") < 0.85
        assert calculate_name_similarity("Bún Chả Cá Bà Lữ", "Bún Chả Cá Hùng Vương") < 0.85
        assert calculate_name_similarity("Cơm Gà Gia Vĩnh", "Bánh Tráng Tiến Tiến") < 0.40

    def test_location_matching_and_branch_differentiation(self):
        """
        Kiểm tra hàm is_same_location:
        - Địa chỉ rỗng: Không mâu thuẫn -> True
        - Cùng quận/địa chỉ: True
        - Khác quận rõ rệt hoặc khác số nhà trên cùng tuyến đường: False (chi nhánh khác nhau).
        """
        # Cùng địa chỉ hoặc một bên rỗng
        assert is_same_location(None, "129 Hải Phòng, Hải Châu, Đà Nẵng") is True
        assert is_same_location("129 Hải Phòng, Hải Châu, Đà Nẵng", None) is True
        assert is_same_location(
            "129 Hải Phòng, P. Thạch Thang, Q. Hải Châu, Đà Nẵng",
            "129 Hải Phòng, Hải Châu, Đà Nẵng"
        ) is True

        # Khác quận rõ ràng (Hải Châu vs Sơn Trà) -> Khác chi nhánh!
        assert is_same_location(
            "129 Hải Phòng, Hải Châu, Đà Nẵng",
            "85 Phạm Cự Lượng, Sơn Trà, Đà Nẵng"
        ) is False

        # Cùng đường nhưng khác số nhà -> Khác chi nhánh!
        assert is_same_location(
            "100 Hải Phòng, Hải Châu",
            "250 Hải Phòng, Hải Châu"
        ) is False

    def test_resolve_or_create_merges_into_existing_restaurant(self, memory_db):
        """
        Khi cào dữ liệu Google Maps cho quán đã có sẵn trong hệ thống:
        - Tên tương đồng >= 85% và cùng địa chỉ chi nhánh.
        - Phải gộp vào restaurant_id cũ (is_created == False).
        - Cập nhật thông tin Google Maps URL, không tạo thêm quán mới.
        """
        existing = Restaurant(
            name="Cơm Gà Gia Vĩnh - Hải Phòng",
            foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh-hai-phong",
            address="129 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng",
            foody_review_count=10,
            review_count=10
        )
        memory_db.add(existing)
        memory_db.commit()
        original_id = existing.id

        gmap_url = "https://maps.google.com/?cid=12345678"
        place_id = "ChIJ_gia_vinh_hai_phong"

        # Cào từ Google Maps với tên ngắn gọn và địa chỉ tương đương
        resolved, is_created = resolve_or_create_restaurant(
            db_session=memory_db,
            name="Cơm Gà Gia Vĩnh",
            address="129 Hải Phòng, Hải Châu, Đà Nẵng",
            google_maps_url=gmap_url,
            google_place_id=place_id
        )

        assert is_created is False
        assert resolved.id == original_id
        assert resolved.google_maps_url == gmap_url
        assert resolved.google_place_id == place_id
        assert memory_db.query(Restaurant).count() == 1

    def test_resolve_or_create_distinct_branch_creates_new(self, memory_db):
        """
        Khi quán cùng thương hiệu nhưng là chi nhánh tại địa chỉ khác:
        - Bắt buộc tạo mới bản ghi nhà hàng (is_created == True).
        - Số lượng nhà hàng trong DB tăng lên 2.
        """
        branch_hai_chau = Restaurant(
            name="Cơm Gà Gia Vĩnh - Hải Phòng",
            foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh-hai-phong",
            address="129 Hải Phòng, Hải Châu, Đà Nẵng",
        )
        memory_db.add(branch_hai_chau)
        memory_db.commit()

        # Chi nhánh thứ hai ở Sơn Trà
        branch_son_tra, is_created = resolve_or_create_restaurant(
            db_session=memory_db,
            name="Cơm Gà Gia Vĩnh",
            address="85 Phạm Cự Lượng, Sơn Trà, Đà Nẵng",
            google_maps_url="https://maps.google.com/?cid=sontra_99"
        )

        assert is_created is True
        assert branch_son_tra.id != branch_hai_chau.id
        assert memory_db.query(Restaurant).count() == 2

    def test_resolve_or_create_direct_matching(self, memory_db):
        """Khớp trực tiếp qua Google Place ID, Google Maps URL hoặc Foody URL."""
        rest = Restaurant(
            name="Bún Bò Huế Bà Gái",
            foody_url="https://www.foody.vn/hue/bun-bo-ba-gai",
            google_maps_url="https://maps.google.com/?cid=bagai_1",
            google_place_id="PLACE_BAGAI_1"
        )
        memory_db.add(rest)
        memory_db.commit()

        # 1. Khớp theo Place ID
        r1, created1 = resolve_or_create_restaurant(memory_db, name="Bất kỳ", google_place_id="PLACE_BAGAI_1")
        assert created1 is False and r1.id == rest.id

        # 2. Khớp theo Google Maps URL
        r2, created2 = resolve_or_create_restaurant(memory_db, name="Bất kỳ", google_maps_url="https://maps.google.com/?cid=bagai_1")
        assert created2 is False and r2.id == rest.id

        # 3. Khớp theo Foody URL
        r3, created3 = resolve_or_create_restaurant(memory_db, name="Bất kỳ", foody_url="https://www.foody.vn/hue/bun-bo-ba-gai")
        assert created3 is False and r3.id == rest.id


# ==============================================================================
# PHẦN 3: KHỬ TRÙNG LẶP NỘI DUNG QUA SHA-256 FINGERPRINT
# ==============================================================================

class TestSection3FingerprintDeduplication:
    """Kiểm tra mã băm SHA-256 khử trùng lặp nội dung review giữa Foody và Google Maps."""

    def test_sha256_fingerprint_normalization_invariance(self):
        """
        Mã băm SHA-256 phải bất biến trước:
        - Viết hoa / viết thường
        - Dấu câu chấm, phẩy, chấm cảm
        - Khoảng trắng thừa đầu cuối hoặc ở giữa
        - Dấu tiếng Việt (được chuẩn hóa sang không dấu)
        """
        raw_1 = "Cơm gà xối mỡ rất giòn, phục vụ nhiệt tình và chu đáo!"
        raw_2 = "   com ga xoi mo rat gion phuc vu nhiet tinh va chu dao   "
        raw_3 = "CƠM GÀ XỐI MỠ RẤT GIÒN... PHỤC VỤ NHIỆT TÌNH VÀ CHU ĐÁO."

        fp1 = compute_review_fingerprint(raw_1)
        fp2 = compute_review_fingerprint(raw_2)
        fp3 = compute_review_fingerprint(raw_3)

        assert len(fp1) == 64
        assert fp1 == fp2 == fp3

    def test_cross_source_deduplication_foody_vs_google_maps(self, memory_db):
        """
        Kiểm tra phát hiện trùng lặp giữa review Foody đã có và review Google Maps mới cào:
        - Trùng nội dung cho cùng quán -> is_duplicate_review trả về True.
        - Khác nội dung -> False.
        - Cùng nội dung nhưng ở quán khác -> False.
        """
        rest_a = Restaurant(name="Quán Đang Test A")
        rest_b = Restaurant(name="Quán Đang Test B")
        memory_db.add_all([rest_a, rest_b])
        memory_db.commit()

        foody_text = "Món mì quảng tôm thịt đậm vị miền Trung, rau sống tươi ngon."
        foody_fp = compute_review_fingerprint(foody_text)

        rev_foody = Review(
            restaurant_id=rest_a.id,
            author="Người dùng Foody",
            rating=8.0,
            text=foody_text,
            fingerprint=foody_fp,
            source="Foody"
        )
        memory_db.add(rev_foody)
        memory_db.commit()

        # Review từ Google Maps có nội dung giống hệt (chỉ khác khoảng trắng / hoa thường)
        gmap_duplicate_text = "  mon mi quang tom thit dam vi mien trung rau song tuoi ngon! "
        assert is_duplicate_review(memory_db, rest_a.id, gmap_duplicate_text) is True

        # Review khác nội dung
        assert is_duplicate_review(memory_db, rest_a.id, "Nước dùng hơi mặn, cần cải thiện") is False

        # Cùng nội dung nhưng ở Quán B (không tính là trùng lặp của Quán B)
        assert is_duplicate_review(memory_db, rest_b.id, foody_text) is False

    def test_deduplication_legacy_review_fallback(self, memory_db):
        """
        Đối với các review cũ chưa có cột fingerprint trong DB:
        - Hàm is_duplicate_review fallback so khớp chính xác chuỗi text.
        """
        rest = Restaurant(name="Quán Cũ")
        memory_db.add(rest)
        memory_db.commit()

        legacy_text = "Bánh bèo chén dẻo thơm, tôm cháy giòn rụm."
        # Bản ghi review cũ với fingerprint = None
        legacy_rev = Review(
            restaurant_id=rest.id,
            author="Khách cũ",
            rating=5.0,
            text=legacy_text,
            fingerprint=None,
            source="Foody"
        )
        memory_db.add(legacy_rev)
        memory_db.commit()

        assert is_duplicate_review(memory_db, rest.id, legacy_text) is True


# ==============================================================================
# PHẦN 4: THƯỚC ĐO TIỆM CẬN ĐỘ TIN CẬY MẪU C = min(1.0, ln(N+1)/ln(31))
# ==============================================================================

class TestSection4SampleCredibilityMetric:
    """Kiểm tra công thức tiệm cận độ tin cậy mẫu, các mốc toán học và ngưỡng High/Medium/Low."""

    def test_credibility_score_mathematical_milestones(self):
        """
        Kiểm tra độ chính xác của công thức: C = min(1.0, ln(N+1) / ln(31))
        - N = 0: C = 0.0%
        - N = 1: C = ln(2)/ln(31) ~ 20.18%
        - N = 5: C ~ 52.18%
        - N = 10: C ~ 69.83%
        - N = 20: C ~ 88.66%
        - N = 30: C = 100.0% (bão hòa)
        - N = 50: C = 100.0% (chặn trên tại 1.0)
        - N < 0: C = 0.0%
        """
        assert calculate_credibility_score(0) == 0.0
        assert abs(calculate_credibility_score(1) - 0.2018) < 0.001
        assert abs(calculate_credibility_score(5) - 0.5218) < 0.001
        assert abs(calculate_credibility_score(10) - 0.6983) < 0.001
        assert abs(calculate_credibility_score(20) - 0.8866) < 0.001
        assert calculate_credibility_score(30) == 1.0
        assert calculate_credibility_score(50) == 1.0
        assert calculate_credibility_score(100) == 1.0
        assert calculate_credibility_score(-10) == 0.0

        # Kiểm tra tính nhất quán giữa module service và migration script
        assert migration_credibility(10) == calculate_credibility_score(10)

    def test_credibility_level_classification_ranges(self):
        """
        Kiểm tra các ngưỡng phân loại mức độ tin cậy mẫu:
        - High: >= 90%
        - Medium: 65% <= C < 90%
        - Low: < 65%
        """
        def get_level(score_ratio):
            pct = score_ratio * 100
            if pct >= 90:
                return "high"
            if pct >= 65:
                return "medium"
            return "low"

        assert get_level(calculate_credibility_score(25)) == "high"    # N=25 -> ~94.9%
        assert get_level(calculate_credibility_score(30)) == "high"    # N=30 -> 100.0%
        assert get_level(calculate_credibility_score(10)) == "medium"  # N=10 -> ~69.8%
        assert get_level(calculate_credibility_score(15)) == "medium"  # N=15 -> ~80.7%
        assert get_level(calculate_credibility_score(5)) == "low"      # N=5  -> ~52.2%
        assert get_level(calculate_credibility_score(2)) == "low"      # N=2  -> ~32.0%

    def test_update_restaurant_counts_and_credibility(self, memory_db):
        """Kiểm tra cập nhật tự động số lượng review Foody, Google Maps và độ tin cậy."""
        rest = Restaurant(name="Quán Thử Nghiệm", foody_url="https://foody.vn/test")
        memory_db.add(rest)
        memory_db.commit()

        # Thêm 4 bài Foody và 6 bài Google Maps (Tổng N=10)
        for i in range(4):
            memory_db.add(Review(restaurant_id=rest.id, text=f"Foody {i}", rating=8.0, source="Foody"))
        for j in range(6):
            memory_db.add(Review(restaurant_id=rest.id, text=f"Google {j}", rating=5.0, source="GoogleMaps"))
        memory_db.commit()

        updated = update_restaurant_counts_and_credibility(memory_db, rest.id)
        assert updated.review_count == 10
        assert updated.foody_review_count == 4
        assert updated.google_review_count == 6
        assert abs(updated.credibility_score - 0.6983) < 0.001


# ==============================================================================
# PHẦN 5: END-TO-END ENDPOINT API POST /api/crawler/google-maps
# ==============================================================================

class TestSection5GoogleMapsCrawlerEndpoint:
    """Kiểm tra API Router Google Maps: SSRF prevention, mock crawler, ABSA pipeline và lưu trữ."""

    def test_api_crawler_google_maps_ssrf_protection(self, client):
        """Phòng chống SSRF: Chặn toàn bộ IP nội bộ, localhost, AWS metadata và tên miền lạ."""
        forbidden_urls = [
            "http://127.0.0.1:8000/maps",
            "http://localhost:8000/maps",
            "http://169.254.169.254/latest/meta-data/",
            "http://192.168.1.1/maps",
            "https://evil-attacker.com/maps",
            "file:///etc/passwd",
            "ftp://maps.google.com/test",
            "http://maps.google.com:22/maps"
        ]
        for bad_url in forbidden_urls:
            resp = client.post("/api/crawler/google-maps", json={"googleMapsUrl": bad_url})
            assert resp.status_code == 400, f"URL nguy hiểm không bị chặn: {bad_url}"

    @patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
    @patch("analysis.gemini_analyzer.analyze_batch")
    def test_api_crawler_google_maps_new_restaurant_success(self, mock_gemini, mock_crawler, client, test_db_session):
        """
        Cào quán mới hoàn toàn từ Google Maps:
        - Tạo nhà hàng mới trong DB với source='GoogleMaps'
        - Chạy phân tích ABSA
        - Cập nhật credibility_score
        - Trả về response đúng định dạng
        """
        mock_crawler.return_value = {
            "success": True,
            "restaurant_name": "Phở Khô Gia Lai - Đà Nẵng",
            "address": "55 Nguyễn Chí Thanh, Hải Châu, Đà Nẵng",
            "overall_rating": 4.6,
            "google_maps_url": "https://www.google.com/maps/place/Pho+Kho+Gia+Lai/@16.0,108.0,17z",
            "google_place_id": "ChIJ_pho_kho_gl",
            "reviews": [
                {
                    "author": "Đức Anh",
                    "rating": 5.0,
                    "review_date": "1 tuần trước",
                    "text": "Phở khô hai tô chuẩn vị Gia Lai, bánh phở dai ngon nước lèo thanh ngọt.",
                    "google_review_id": "g_rev_pho_01"
                },
                {
                    "author": "Mai Lan",
                    "rating": 4.0,
                    "review_date": "2 tuần trước",
                    "text": "Phục vụ nhanh nhẹn, quán sạch sẽ thoáng mát.",
                    "google_review_id": "g_rev_pho_02"
                }
            ],
            "total_crawled": 2,
            "error": None
        }

        mock_gemini.return_value = [
            {
                "review_id": 1,
                "_analysis_succeeded": True,
                "aspects": [{"aspect": "món ăn", "sentiment": "positive", "confidence": 0.95}],
                "is_urgent": False
            },
            {
                "review_id": 2,
                "_analysis_succeeded": True,
                "aspects": [{"aspect": "dịch vụ", "sentiment": "positive", "confidence": 0.90}],
                "is_urgent": False
            }
        ]

        payload = {
            "googleMapsUrl": "https://www.google.com/maps/place/Pho+Kho+Gia+Lai/@16.0,108.0,17z",
            "maxReviews": 10
        }

        response = client.post("/api/crawler/google-maps", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["source"] == "google_maps"
        assert data["newReviewsCount"] == 2
        assert data["totalReviewsNow"] == 2
        assert data["restaurantName"] == "Phở Khô Gia Lai - Đà Nẵng"

        # Kiểm tra dữ liệu được lưu trong SQLite
        rest = test_db_session.query(Restaurant).filter_by(google_place_id="ChIJ_pho_kho_gl").first()
        assert rest is not None
        assert rest.google_review_count == 2
        assert rest.credibility_score > 0.0

        db_reviews = test_db_session.query(Review).filter_by(restaurant_id=rest.id).all()
        assert len(db_reviews) == 2
        assert all(r.source == "GoogleMaps" for r in db_reviews)
        assert all(r.is_analyzed == 1 for r in db_reviews)

        # Kiểm tra bảng ReviewAnalysis
        analyses = test_db_session.query(ReviewAnalysis).all()
        assert len(analyses) == 2

    @patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
    @patch("analysis.gemini_analyzer.analyze_batch")
    def test_api_crawler_google_maps_enrichment_existing_foody(self, mock_gemini, mock_crawler, client, test_db_session):
        """
        Bổ sung đánh giá Google Maps vào quán Foody có sẵn:
        - Không tạo thêm quán mới trong DB
        - Cập nhật đúng số đếm Foody và Google Maps
        """
        existing = Restaurant(
            name="Mì Quảng Bà Mua",
            foody_url="https://www.foody.vn/da-nang/mi-quang-ba-mua",
            address="19 Trần Bình Trọng, Đà Nẵng",
            review_count=1,
            foody_review_count=1,
            google_review_count=0
        )
        test_db_session.add(existing)
        test_db_session.commit()

        # Review Foody có sẵn
        test_db_session.add(Review(
            restaurant_id=existing.id,
            author="Khách Foody",
            rating=8.0,
            text="Mì quảng rất ngon.",
            source="Foody"
        ))
        test_db_session.commit()

        mock_crawler.return_value = {
            "success": True,
            "restaurant_name": "Mì Quảng Bà Mua - Trần Bình Trọng",
            "address": "19 Trần Bình Trọng, Đà Nẵng",
            "overall_rating": 4.5,
            "google_maps_url": "https://maps.google.com/?cid=bamua_gmap",
            "google_place_id": "ChIJ_bamua",
            "reviews": [
                {
                    "author": "Khách Google",
                    "rating": 5.0,
                    "review_date": "Hôm nay",
                    "text": "Rau sống tươi sạch, tôm rim đậm đà.",
                    "google_review_id": "g_rev_bm_99"
                }
            ],
            "total_crawled": 1,
            "error": None
        }
        mock_gemini.return_value = []

        response = client.post("/api/crawler/google-maps", json={
            "restaurantId": str(existing.id),
            "googleMapsUrl": "https://maps.google.com/?cid=bamua_gmap"
        })
        assert response.status_code == 200
        data = response.json()

        assert data["restaurantId"] == str(existing.id)
        assert data["newReviewsCount"] == 1
        assert data["totalReviewsNow"] == 2

        # Quán trong DB vẫn duy nhất là 1
        assert test_db_session.query(Restaurant).count() == 1
        test_db_session.expire_all()
        updated = test_db_session.query(Restaurant).filter_by(id=existing.id).first()
        assert updated.foody_review_count == 1
        assert updated.google_review_count == 1
        assert updated.review_count == 2

    @patch("crawler.google_maps_crawler.crawl_google_maps_reviews")
    @patch("analysis.gemini_analyzer.analyze_batch")
    def test_api_crawler_google_maps_spam_and_deduplication(self, mock_gemini, mock_crawler, client, test_db_session):
        """
        Kiểm tra cơ chế lọc rác/spam và khử trùng lặp qua endpoint API:
        - 1 review spam quảng cáo số điện thoại
        - 1 review trùng lặp nội dung với bài đã có
        - 1 review hợp lệ
        -> Chỉ 1 bài hợp lệ được lưu, 1 bài trùng bị bỏ qua.
        """
        rest = Restaurant(name="Quán Bún Chả Test", review_count=1)
        test_db_session.add(rest)
        test_db_session.commit()

        existing_text = "Nước mắm chấm nem rất thơm ngon vừa miệng."
        test_db_session.add(Review(
            restaurant_id=rest.id,
            author="Khách cũ",
            rating=5.0,
            text=existing_text,
            fingerprint=compute_review_fingerprint(existing_text),
            source="Foody"
        ))
        test_db_session.commit()

        mock_crawler.return_value = {
            "success": True,
            "restaurant_name": "Quán Bún Chả Test",
            "address": "Đà Nẵng",
            "reviews": [
                {
                    "author": "Spammer",
                    "rating": 5.0,
                    "text": "Cho thuê xe máy tự lái giá rẻ liên hệ 0905111222",  # SPAM
                    "google_review_id": "g_spam"
                },
                {
                    "author": "Copycat",
                    "rating": 5.0,
                    "text": existing_text,  # TRÙNG NỘI DUNG
                    "google_review_id": "g_dup"
                },
                {
                    "author": "Thực khách chân chính",
                    "rating": 5.0,
                    "text": "Chả nướng than hoa thơm lừng, thịt mềm không bị khô.",  # HỢP LỆ
                    "google_review_id": "g_valid"
                }
            ],
            "total_crawled": 3
        }
        mock_gemini.return_value = []

        response = client.post("/api/crawler/google-maps", json={
            "restaurantId": str(rest.id),
            "googleMapsUrl": "https://maps.google.com/?cid=buncha"
        })
        assert response.status_code == 200
        data = response.json()

        assert data["newReviewsCount"] == 1
        assert data["duplicateReviewsSkipped"] == 1
        assert data["totalReviewsNow"] == 2

    def test_api_crawler_google_maps_resilience_and_error_handling(self, client):
        """Kiểm tra xử lý lỗi an toàn: Không tìm thấy quán (404), thiếu tham số (400)."""
        # Thiếu thông tin
        resp_empty = client.post("/api/crawler/google-maps", json={})
        assert resp_empty.status_code == 400

        # ID không tồn tại
        resp_404 = client.post("/api/crawler/google-maps", json={"restaurantId": "999999"})
        assert resp_404.status_code == 404


# ==============================================================================
# PHẦN 6: BI SERVICE format_restaurant_full & HỢP ĐỒNG ĐA NGUỒN
# ==============================================================================

class TestSection6BiServiceFormatRestaurantFull:
    """Kiểm tra hàm format_restaurant_full và endpoint GET /api/restaurants/{id}."""

    def test_format_restaurant_full_multisource_contract(self, test_db_session):
        """
        Kiểm tra hàm format_restaurant_full trả về đúng hợp đồng dữ liệu đa nguồn:
        - sourceBreakdown: { total, foody, googleMaps }
        - credibilityScore & credibilityLevel
        - dataSource: 'Foody, Google Maps & Gemini AI'
        - source trên từng review
        """
        rest = Restaurant(
            name="Cơm Gà Gia Vĩnh",
            foody_url="https://www.foody.vn/da-nang/com-ga-gia-vinh",
            google_maps_url="https://maps.google.com/?cid=giavinh",
            address="129 Hải Phòng, Đà Nẵng",
            overall_rating=8.5,
            review_count=10,
            credibility_score=calculate_credibility_score(10)
        )
        test_db_session.add(rest)
        test_db_session.commit()

        # Tạo 4 review Foody và 6 review Google Maps
        for i in range(4):
            test_db_session.add(Review(
                restaurant_id=rest.id,
                author=f"Foody {i}",
                rating=8.0,
                text=f"Review Foody {i}",
                source="Foody"
            ))
        for j in range(6):
            test_db_session.add(Review(
                restaurant_id=rest.id,
                author=f"Google {j}",
                rating=5.0,
                text=f"Review Google {j}",
                source="GoogleMaps",
                google_review_id=f"g_id_{j}"
            ))
        test_db_session.commit()

        formatted = format_restaurant_full(rest, test_db_session)

        # 1. sourceBreakdown
        sb = formatted["sourceBreakdown"]
        assert sb["total"] == 10
        assert sb["foody"] == 4
        assert sb["googleMaps"] == 6

        # 2. Credibility Score & Level (N=10 -> C ~ 69.8% -> 'medium')
        assert abs(formatted["credibilityScore"] - 69.8) < 1.0
        assert formatted["credibilityLevel"] == "medium"
        assert formatted["sampleWarning"] is None  # N >= 10 không cảnh báo

        # 3. dataSource
        assert formatted["dataSource"] == "Foody, Google Maps & Gemini AI"

        # 4. Từng review có trường source
        assert len(formatted["reviews"]) == 10
        assert any(r["source"] == "Foody" for r in formatted["reviews"])
        assert any(r["source"] == "GoogleMaps" for r in formatted["reviews"])

    def test_format_restaurant_full_sample_warning_rule(self, test_db_session):
        """Khi quán có N < 10 đánh giá -> credibilityLevel là 'low' và hiển thị sampleWarning."""
        rest = Restaurant(
            name="Quán Mới Mở",
            review_count=3,
            credibility_score=calculate_credibility_score(3)
        )
        test_db_session.add(rest)
        test_db_session.commit()

        for i in range(3):
            test_db_session.add(Review(
                restaurant_id=rest.id,
                author=f"Khách {i}",
                rating=5.0,
                text=f"Đánh giá số {i}",
                source="GoogleMaps"
            ))
        test_db_session.commit()

        formatted = format_restaurant_full(rest, test_db_session)
        assert formatted["credibilityLevel"] == "low"
        assert formatted["sampleWarning"] is not None
        assert "ít hơn 10 đánh giá" in formatted["sampleWarning"]
        assert formatted["dataSource"] == "Google Maps & Gemini AI"

    def test_get_restaurant_api_endpoint_integration(self, client, test_db_session):
        """GET /api/restaurants/{id} trả về đầy đủ các trường đa nguồn."""
        rest = Restaurant(
            name="Cao Lầu Phố Hội",
            google_maps_url="https://maps.google.com/?cid=caolau",
            review_count=1,
            credibility_score=calculate_credibility_score(1)
        )
        test_db_session.add(rest)
        test_db_session.commit()

        test_db_session.add(Review(
            restaurant_id=rest.id,
            author="Du khách",
            rating=5.0,
            text="Cao lầu rất thơm ngon chuẩn vị Hội An.",
            source="GoogleMaps",
            google_review_id="g_caolau_01"
        ))
        test_db_session.commit()

        resp = client.get(f"/api/restaurants/{rest.id}")
        assert resp.status_code == 200
        data = resp.json()

        assert data["sourceBreakdown"]["googleMaps"] == 1
        assert data["sourceBreakdown"]["foody"] == 0
        assert data["credibilityLevel"] == "low"
        assert data["sampleWarning"] is not None
        assert data["reviews"][0]["source"] == "GoogleMaps"
        assert data["reviews"][0]["googleReviewId"] == "g_caolau_01"


# ==============================================================================
# PHẦN 7: AUTO-ENRICH SPARSE RESTAURANTS PIPELINE (run_pipeline.py)
# ==============================================================================

class TestSection7AutoEnrichPipeline:
    """Kiểm tra chức năng tự động bù đắp dữ liệu cho quán mỏng trong run_pipeline.py."""

    def test_auto_enrich_identifies_sparse_restaurants(self, memory_db):
        """Chỉ những quán có review_count < 10 hoặc credibility_score < 0.65 mới được chọn để bù đắp."""
        # Quán mỏng
        r_sparse = Restaurant(
            name="Bánh Tráng Kẹp Dì Hoàng",
            review_count=3,
            credibility_score=0.45,
            google_maps_url="https://maps.google.com/?cid=dihoang"
        )
        # Quán đủ mẫu
        r_full = Restaurant(
            name="Cơm Gà Bà Buội",
            review_count=35,
            credibility_score=1.0,
            google_maps_url="https://maps.google.com/?cid=babuoi"
        )
        memory_db.add_all([r_sparse, r_full])
        memory_db.commit()

        fake_crawl = {
            "success": True,
            "restaurant_name": "Bánh Tráng Kẹp Dì Hoàng",
            "reviews": []
        }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl):
            summary = auto_enrich_sparse_restaurants(
                max_restaurants=10,
                max_reviews=20,
                db_session=memory_db
            )

            # Chỉ tìm thấy đúng 1 quán mỏng
            assert summary["total_sparse_found"] == 1
            assert summary["processed_count"] == 1

    def test_auto_enrich_url_routing_direct_vs_search(self, memory_db):
        """
        - Quán có sẵn google_maps_url -> gọi thẳng crawl_google_maps_reviews
        - Quán chưa có URL -> gọi search_and_crawl_google_maps
        """
        r1 = Restaurant(name="Quán Có Link", google_maps_url="https://maps.google.com/?cid=link1", review_count=1)
        r2 = Restaurant(name="Quán Không Link", google_maps_url=None, city="Đà Nẵng", address="10 Trần Phú", review_count=2)
        memory_db.add_all([r1, r2])
        memory_db.commit()

        fake_crawl = {"success": True, "reviews": []}

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl) as mock_crawl:
            with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", return_value=fake_crawl) as mock_search:
                auto_enrich_sparse_restaurants(max_restaurants=5, max_reviews=10, db_session=memory_db)

                mock_crawl.assert_called_once()
                mock_search.assert_called_once()

    def test_auto_enrich_defensive_anti_crash(self, memory_db):
        """Cơ chế phòng vệ: Quán 1 bị lỗi Playwright timeout không làm sập pipeline của quán 2."""
        r1 = Restaurant(name="Quán Lỗi", google_maps_url="https://maps.google.com/?cid=err", review_count=1)
        r2 = Restaurant(name="Quán Tốt", google_maps_url="https://maps.google.com/?cid=ok", review_count=1)
        memory_db.add_all([r1, r2])
        memory_db.commit()

        def mock_crawl_side_effect(url, max_reviews, headless):
            if "err" in url:
                raise RuntimeError("Playwright headless connection timeout!")
            return {
                "success": True,
                "restaurant_name": "Quán Tốt",
                "reviews": [
                    {"author": "Khách Tốt", "rating": 5.0, "text": "Món ăn tuyệt hảo!", "review_date": "Hôm nay"}
                ]
            }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", side_effect=mock_crawl_side_effect):
            with patch("analysis.gemini_analyzer.analyze_batch", return_value=[]):
                summary = auto_enrich_sparse_restaurants(max_restaurants=5, max_reviews=10, db_session=memory_db)

                assert summary["processed_count"] == 2
                assert summary["enriched_restaurants"] == 1
                assert summary["total_new_reviews"] == 1

                failed = next(d for d in summary["details"] if d["name"] == "Quán Lỗi")
                assert failed["status"] == "failed"
                assert "timeout" in failed["error"].lower()
