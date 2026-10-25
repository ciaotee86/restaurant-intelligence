"""
Migration Script: Nâng cấp cơ sở dữ liệu SQLite hỗ trợ đa nguồn (Multi-Source Data Ingestion).

Thực hiện an toàn, tương thích ngược:
1. Sao lưu tự động database hiện tại (restaurants.db.bak_multisource_<timestamp>).
2. Bổ sung các cột mới cho bảng restaurants và reviews bằng ALTER TABLE an toàn.
3. Tạo các chỉ mục tối ưu hóa truy vấn (Google Maps URL, Place ID, Source).
4. Khớp và chuẩn hóa dữ liệu cũ:
   - Gán source = 'Foody' cho toàn bộ review hiện có chưa có nguồn.
   - Tính toán lại foody_review_count, google_review_count và credibility_score cho toàn bộ nhà hàng.
"""

import os
import sys
import shutil
import sqlite3
import math
from datetime import datetime

# Đảm bảo in tiếng Việt an toàn trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def calculate_credibility_score(review_count: int) -> float:
    """
    Tính chỉ số độ tin cậy mẫu C (0.0 -> 1.0):
    C = min(1.0, ln(N + 1) / ln(31))
    """
    if review_count <= 0:
        return 0.0
    score = math.log(review_count + 1) / math.log(31)
    return round(min(1.0, max(0.0, score)), 4)


def get_default_db_path() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data", "restaurants.db")


def create_db_backup(db_path: str) -> str:
    """Tạo bản sao lưu an toàn trước khi thực hiện migration."""
    if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
        return ""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.bak_multisource_{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"-> [Migration Backup] Đã sao lưu database gốc tới: {backup_path}")
    return backup_path


def migrate_database(db_path: str = None) -> dict:
    """
    Thực hiện migration an toàn trên file SQLite database.
    Trả về dict tổng kết kết quả migration.
    """
    if not db_path:
        db_path = get_default_db_path()

    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Không tìm thấy file database tại: {db_path}")

    # 1. Tạo bản sao lưu an toàn
    backup_file = create_db_backup(db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Bật WAL mode và busy timeout
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")

        # 2. Kiểm tra cấu trúc hiện có của bảng restaurants
        cursor.execute("PRAGMA table_info(restaurants);")
        rest_info = cursor.fetchall()
        rest_cols = {row["name"] for row in rest_info}

        # 2b. Đảm bảo foody_url cho phép NULL (chuẩn SQLite 12-step table rebuild)
        foody_col = next((row for row in rest_info if row["name"] == "foody_url"), None)
        if foody_col and foody_col["notnull"] == 1:
            conn.close()
            from database.fix_foody_url_nullable import rebuild_restaurants_table
            rebuild_restaurants_table(db_path)
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(restaurants);")
            rest_info = cursor.fetchall()
            rest_cols = {row["name"] for row in rest_info}

        # 3. Thêm cột mới vào bảng restaurants
        new_rest_columns = [
            ("city", "VARCHAR(100)"),
            ("google_maps_url", "VARCHAR(1000)"),
            ("google_place_id", "VARCHAR(255)"),
            ("foody_review_count", "INTEGER DEFAULT 0"),
            ("google_review_count", "INTEGER DEFAULT 0"),
            ("credibility_score", "FLOAT DEFAULT 1.0"),
        ]
        added_rest_cols = []
        for col_name, col_type in new_rest_columns:
            if col_name not in rest_cols:
                cursor.execute(f"ALTER TABLE restaurants ADD COLUMN {col_name} {col_type};")
                added_rest_cols.append(col_name)

        # 4. Kiểm tra cột hiện có của bảng reviews
        cursor.execute("PRAGMA table_info(reviews);")
        review_cols = {row["name"] for row in cursor.fetchall()}

        # 5. Thêm cột mới vào bảng reviews
        new_review_columns = [
            ("source", "VARCHAR(50) DEFAULT 'Foody'"),
            ("google_review_id", "VARCHAR(255)"),
        ]
        added_review_cols = []
        for col_name, col_type in new_review_columns:
            if col_name not in review_cols:
                cursor.execute(f"ALTER TABLE reviews ADD COLUMN {col_name} {col_type};")
                added_review_cols.append(col_name)

        # 6. Tạo các chỉ mục tối ưu truy vấn
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_maps_url ON restaurants(google_maps_url) WHERE google_maps_url IS NOT NULL;")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_google_review_id ON reviews(google_review_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);")

        # 7. Khớp và chuẩn hóa dữ liệu reviews cũ
        cursor.execute("UPDATE reviews SET source = 'Foody' WHERE source IS NULL OR source = '';")
        updated_reviews = cursor.rowcount

        # 8. Đồng bộ số liệu đếm review và credibility_score cho bảng restaurants
        cursor.execute("SELECT id FROM restaurants;")
        restaurants = cursor.fetchall()
        migrated_restaurants_count = len(restaurants)

        for r in restaurants:
            r_id = r["id"]
            # Đếm tổng review
            cursor.execute("SELECT COUNT(*) FROM reviews WHERE restaurant_id = ?;", (r_id,))
            total_n = cursor.fetchone()[0]

            # Đếm foody review
            cursor.execute("SELECT COUNT(*) FROM reviews WHERE restaurant_id = ? AND (source = 'Foody' OR source IS NULL);", (r_id,))
            foody_n = cursor.fetchone()[0]

            # Đếm google review
            cursor.execute("SELECT COUNT(*) FROM reviews WHERE restaurant_id = ? AND source IN ('GoogleMaps', 'google_maps', 'Google Maps');", (r_id,))
            google_n = cursor.fetchone()[0]

            credibility = calculate_credibility_score(total_n)

            cursor.execute("""
                UPDATE restaurants
                SET review_count = ?,
                    foody_review_count = ?,
                    google_review_count = ?,
                    credibility_score = ?
                WHERE id = ?;
            """, (total_n, foody_n, google_n, credibility, r_id))

        conn.commit()

        summary = {
            "status": "success",
            "db_path": db_path,
            "backup_file": backup_file,
            "added_restaurant_columns": added_rest_cols,
            "added_review_columns": added_review_cols,
            "restaurants_migrated": migrated_restaurants_count,
            "reviews_updated": updated_reviews,
        }
        print(f"-> [Migration Complete] Thành công! {migrated_restaurants_count} nhà hàng, {updated_reviews} đánh giá.")
        return summary

    except Exception as e:
        conn.rollback()
        print(f"-> [Migration Error] Thất bại khi migration: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    target_db = sys.argv[1] if len(sys.argv) > 1 else None
    result = migrate_database(target_db)
    print(result)
