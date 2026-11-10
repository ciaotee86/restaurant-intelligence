"""
Migration Script: Tái tạo bảng restaurants chuẩn SQLite 12-step table rebuild
nhằm chuyển ràng buộc của cột foody_url sang nullable=True (notnull = 0).

Bối cảnh:
- Trong SQLite, ALTER TABLE không hỗ trợ sửa đổi trực tiếp ràng buộc NOT NULL của cột hiện có.
- Cần thực hiện quy trình chuẩn 12 bước của SQLite (SQLite Table Rebuild):
  1. Tạo bản sao lưu dự phòng an toàn (.bak_fix_foody_nullable_<timestamp>).
  2. Tắt kiểm tra khóa ngoại (PRAGMA foreign_keys=OFF).
  3. Bắt đầu transaction (BEGIN TRANSACTION).
  4. Tạo bảng tạm restaurants_new với đầy đủ các cột và foody_url cho phép NULL.
  5. Di chuyển toàn bộ dữ liệu từ restaurants sang restaurants_new.
  6. Xóa bảng restaurants cũ.
  7. Đổi tên restaurants_new thành restaurants.
  8. Tái tạo tất cả các chỉ mục (indexes).
  9. Kiểm tra toàn vẹn khóa ngoại (PRAGMA foreign_key_check).
  10. Commit transaction.
  11. Bật lại kiểm tra khóa ngoại (PRAGMA foreign_keys=ON).
  12. Xác thực cấu trúc bảng (PRAGMA table_info) và số lượng bản ghi.
"""

import os
import sys
import shutil
import sqlite3
from datetime import datetime
from typing import Dict, Any, Optional

# Đảm bảo in tiếng Việt an toàn trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def create_db_backup(db_path: str) -> str:
    """Tạo bản sao lưu dự phòng an toàn trước khi thực hiện migration."""
    if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
        return ""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.bak_fix_foody_nullable_{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"-> [Backup] Đã tạo bản sao lưu an toàn tại: {backup_path}")
    return backup_path


def rebuild_restaurants_table(db_path: str) -> Dict[str, Any]:
    """
    Thực hiện quy trình 12 bước tái tạo bảng restaurants chuẩn SQLite.
    Hỗ trợ xử lý cho cả file database chính và database seed.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Không tìm thấy file database tại: {db_path}")

    # 1. Tạo bản sao lưu dự phòng an toàn
    backup_file = create_db_backup(db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Bật WAL mode và busy timeout
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")

        # Kiểm tra bảng restaurants có tồn tại không
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurants';")
        if not cursor.fetchone():
            print(f"-> [Skip] Bảng restaurants không tồn tại trong database: {db_path}")
            return {"status": "skipped", "reason": "restaurants table not found"}

        # Kiểm tra trạng thái hiện tại của cột foody_url
        cursor.execute("PRAGMA table_info(restaurants);")
        old_cols_info = cursor.fetchall()
        old_col_names = [row["name"] for row in old_cols_info]
        foody_col_info = next((row for row in old_cols_info if row["name"] == "foody_url"), None)

        # Đếm số bản ghi trước khi rebuild
        cursor.execute("SELECT COUNT(*) FROM restaurants;")
        restaurants_count_before = cursor.fetchone()[0]

        reviews_count_before = 0
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews';")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) FROM reviews;")
            reviews_count_before = cursor.fetchone()[0]

        # Kiểm tra nếu foody_url đã là nullable (notnull == 0) và bảng đã có đủ cột
        already_nullable = (foody_col_info is not None and foody_col_info["notnull"] == 0)

        # 2. Tắt foreign keys trước khi mở transaction
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # 3. Bắt đầu transaction
        cursor.execute("BEGIN TRANSACTION;")

        # 4. Định nghĩa bảng mới với foody_url nullable (notnull = 0) và đầy đủ các cột chuẩn
        create_new_table_sql = """
        CREATE TABLE restaurants_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            foody_url VARCHAR(500) UNIQUE,
            google_maps_url VARCHAR(1000) UNIQUE,
            google_place_id VARCHAR(255),
            address VARCHAR(500),
            city VARCHAR(100),
            overall_rating FLOAT,
            review_count INTEGER DEFAULT 0,
            foody_review_count INTEGER DEFAULT 0,
            google_review_count INTEGER DEFAULT 0,
            credibility_score FLOAT DEFAULT 0.0,
            crawled_at DATETIME
        );
        """
        cursor.execute(create_new_table_sql)

        # 5. Xây dựng câu lệnh chuyển dữ liệu an toàn tương thích mọi phiên bản schema cũ
        target_columns = [
            "id", "name", "foody_url", "google_maps_url", "google_place_id",
            "address", "city", "overall_rating", "review_count",
            "foody_review_count", "google_review_count", "credibility_score", "crawled_at"
        ]

        select_expressions = []
        for col in target_columns:
            if col in old_col_names:
                select_expressions.append(f'"{col}"')
            else:
                # Giá trị mặc định tương ứng cho các cột mới nếu bảng cũ chưa có
                if col == "foody_review_count":
                    select_expressions.append('COALESCE("review_count", 0) AS foody_review_count' if "review_count" in old_col_names else '0 AS foody_review_count')
                elif col == "google_review_count":
                    select_expressions.append('0 AS google_review_count')
                elif col == "credibility_score":
                    select_expressions.append('0.0 AS credibility_score')
                else:
                    select_expressions.append(f'NULL AS "{col}"')

        copy_data_sql = f"""
        INSERT INTO restaurants_new ({", ".join(target_columns)})
        SELECT {", ".join(select_expressions)}
        FROM restaurants;
        """
        cursor.execute(copy_data_sql)

        # 6. Xóa bảng restaurants cũ
        cursor.execute("DROP TABLE restaurants;")

        # 7. Đổi tên bảng restaurants_new thành restaurants
        cursor.execute("ALTER TABLE restaurants_new RENAME TO restaurants;")

        # 8. Tái tạo các chỉ mục cần thiết
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_maps_url ON restaurants(google_maps_url) WHERE google_maps_url IS NOT NULL;")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);")

        # 9. Kiểm tra toàn vẹn khóa ngoại (Foreign key integrity check)
        cursor.execute("PRAGMA foreign_key_check;")
        fk_violations = cursor.fetchall()
        if fk_violations:
            raise RuntimeError(f"Vi phạm ràng buộc khóa ngoại sau khi rebuild bảng: {fk_violations}")

        # 10. Commit transaction
        conn.commit()

        # 11. Bật lại kiểm tra foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")

        # 12. Xác thực kết quả sau migration
        cursor.execute("PRAGMA table_info(restaurants);")
        new_cols_info = cursor.fetchall()
        new_foody_info = next((row for row in new_cols_info if row["name"] == "foody_url"), None)

        if not new_foody_info or new_foody_info["notnull"] != 0:
            raise RuntimeError(f"Xác thực thất bại: cột foody_url vẫn chưa ở trạng thái nullable=True ({new_foody_info})")

        cursor.execute("SELECT COUNT(*) FROM restaurants;")
        restaurants_count_after = cursor.fetchone()[0]

        if restaurants_count_before != restaurants_count_after:
            raise RuntimeError(f"Lệch số lượng bản ghi: Trước = {restaurants_count_before}, Sau = {restaurants_count_after}")

        if reviews_count_before > 0:
            cursor.execute("SELECT COUNT(*) FROM reviews;")
            reviews_count_after = cursor.fetchone()[0]
            if reviews_count_before != reviews_count_after:
                raise RuntimeError(f"Lệch số lượng reviews: Trước = {reviews_count_before}, Sau = {reviews_count_after}")

        # Thử nghiệm chèn thử một bản ghi test với foody_url = None
        test_gmap_url = "https://maps.google.com/?cid=test_migration_probe_99999"
        cursor.execute("""
            INSERT INTO restaurants (name, foody_url, google_maps_url, address, review_count)
            VALUES (?, NULL, ?, ?, 0);
        """, ("Quán Probe Nullable Test", test_gmap_url, "Địa chỉ test probe"))
        probe_id = cursor.lastrowid
        cursor.execute("DELETE FROM restaurants WHERE id = ?;", (probe_id,))
        conn.commit()

        result = {
            "status": "success",
            "db_path": db_path,
            "backup_file": backup_file,
            "restaurants_count": restaurants_count_after,
            "foody_url_notnull": new_foody_info["notnull"],
            "already_nullable": already_nullable,
        }
        print(f"-> [Migration Success] {db_path}: {restaurants_count_after} nhà hàng, foody_url notnull={new_foody_info['notnull']} (nullable).")
        return result

    except Exception as e:
        conn.rollback()
        cursor.execute("PRAGMA foreign_keys = ON;")
        print(f"-> [Migration Error] Thất bại khi rebuild bảng tại {db_path}: {e}")
        raise
    finally:
        conn.close()


def run_all_migrations():
    """Chạy migration trên cả 2 cơ sở dữ liệu: data/restaurants.db và seed_data/restaurants.db."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = [
        os.path.join(base_dir, "data", "restaurants.db"),
        os.path.join(base_dir, "seed_data", "restaurants.db"),
    ]

    results = []
    for db_file in targets:
        if os.path.exists(db_file):
            print(f"\n==================================================")
            print(f"Đang thực hiện migration cho: {db_file}")
            print(f"==================================================")
            res = rebuild_restaurants_table(db_file)
            results.append(res)
        else:
            print(f"-> [Notice] File không tồn tại, bỏ qua: {db_file}")

    return results


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        rebuild_restaurants_table(target)
    else:
        run_all_migrations()
