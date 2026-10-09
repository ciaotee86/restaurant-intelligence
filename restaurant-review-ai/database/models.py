"""
Schema database cho hệ thống phân tích đánh giá nhà hàng.

3 bảng chính:
- restaurants: thông tin quán ăn đã crawl
- reviews: review thô lấy từ Foody
- review_analysis: kết quả phân tích của Gemini (aspect + sentiment) cho từng review,
  một review có thể sinh nhiều dòng (mỗi dòng ứng với 1 khía cạnh được nhắc tới)
"""

import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, text, event
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    foody_url = Column(String(500), unique=True, nullable=False)
    address = Column(String(500))
    overall_rating = Column(Float)          # điểm Foody hiển thị (thang 10 hoặc 5 tùy trang)
    review_count = Column(Integer, default=0)
    crawled_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship("Review", back_populates="restaurant", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    author = Column(String(255))
    rating = Column(Float)                  # điểm người dùng chấm cho review này
    text = Column(Text, nullable=False)
    review_date = Column(String(50))        # lưu string thô, Foody hay ghi kiểu "2 ngày trước"
    is_analyzed = Column(Integer, default=0)  # 0 = chưa phân tích, 1 = đã phân tích (tránh gọi lại Gemini)
    is_spam = Column(Integer, default=0)      # 0 = bình thường, 1 = spam/quảng cáo/không liên quan
    spam_score = Column(Float, default=0.0)   # Điểm số xác suất spam: 0.0 -> 1.0
    spam_category = Column(String(50), default="normal") # "normal", "low_information", "advertisement", "irrelevant", "duplicate", "suspicious"
    spam_reason = Column(Text, default="[]")  # Danh sách lý do dưới dạng JSON: ["phone_number", "email", ...]
    foody_review_id = Column(String(100), index=True, nullable=True)  # ID định danh từ Foody (nếu trích xuất được)
    fingerprint = Column(String(64), index=True, nullable=True)      # Mã băm SHA-256 duy nhất chống trùng lặp
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="reviews")
    analysis = relationship("ReviewAnalysis", back_populates="review", cascade="all, delete-orphan")


class ReviewAnalysis(Base):
    __tablename__ = "review_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    aspect = Column(String(50))             # "món ăn" | "giá cả" | "dịch vụ" | "không gian" | "vệ sinh"
    sentiment = Column(String(20))          # "positive" | "neutral" | "negative"
    confidence = Column(Float)              # 0.0 - 1.0, do Gemini tự ước lượng
    is_urgent = Column(Integer, default=0)  # 1 nếu review có dấu hiệu cần cảnh báo (ngộ độc, dị vật...)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("Review", back_populates="analysis")


class CrawlRequest(Base):
    """Hàng đợi lưu yêu cầu thu thập quán ăn từ người dùng để pipeline chạy ngầm"""
    __tablename__ = "crawl_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(String(255), nullable=False)
    city = Column(String(100), default="da-nang")
    status = Column(String(50), default="pending")  # "pending", "processing", "completed", "failed"
    note = Column(String(500), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


def init_db(db_path: str = None):
    """Tạo file DB + toàn bộ bảng nếu chưa tồn tại. Tự động xác định đúng đường dẫn tuyệt đối."""
    if not db_path:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_path = os.path.join(base_dir, "data", "restaurants.db")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Tự động nạp dữ liệu gốc từ seed nếu file database chưa tồn tại, rỗng 0 bytes hoặc rỗng 0 bản ghi (ví dụ: mount persistent volume trên Cloud)
        need_seed = False
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            need_seed = True
        else:
            try:
                import sqlite3
                _test_conn = sqlite3.connect(file_path)
                _cur = _test_conn.cursor()
                _cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='restaurants'")
                _has_tbl = _cur.fetchone()[0] > 0
                if _has_tbl:
                    _cur.execute("SELECT count(*) FROM restaurants")
                    _row_cnt = _cur.fetchone()[0]
                    if _row_cnt == 0:
                        need_seed = True
                else:
                    need_seed = True
                _test_conn.close()
            except Exception:
                pass

        if need_seed:
            seed_candidates = [
                os.path.join(base_dir, "seed_data", "restaurants.db"),
                os.path.join(base_dir, "data", "restaurants.db.bak_7"),
                os.path.join(os.path.dirname(base_dir), "data", "restaurants.db")
            ]
            for sc in seed_candidates:
                if os.path.exists(sc) and os.path.getsize(sc) > 0:
                    import shutil
                    try:
                        shutil.copy2(sc, file_path)
                        print(f"-> [Database Init] Đã tự động khôi phục dữ liệu từ bản seed: {sc}")
                        break
                    except Exception as e:
                        print(f"-> [Database Init] Không thể sao chép seed database: {e}")
        
        db_path = f"sqlite:///{file_path.replace(os.sep, '/')}"
    elif db_path.startswith("sqlite:///"):
        file_path = db_path.replace("sqlite:///", "")
        dir_name = os.path.dirname(file_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

    connect_args = {}
    is_sqlite = db_path.startswith("sqlite")
    if is_sqlite:
        connect_args = {"check_same_thread": False, "timeout": 30.0}

    engine = create_engine(db_path, echo=False, connect_args=connect_args)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.close()

    Base.metadata.create_all(engine)

    # Tự động nâng cấp cột mới nếu đang mở SQLite DB cũ
    with engine.connect() as conn:
        if is_sqlite:
            try:
                conn.execute(text("PRAGMA journal_mode=WAL;"))
                conn.execute(text("PRAGMA synchronous=NORMAL;"))
                conn.execute(text("PRAGMA busy_timeout=30000;"))
                conn.commit()
            except Exception:
                pass

        for col, col_type in [
            ("is_spam", "INTEGER DEFAULT 0"),
            ("spam_score", "FLOAT DEFAULT 0.0"),
            ("spam_category", "VARCHAR(50) DEFAULT 'normal'"),
            ("spam_reason", "TEXT DEFAULT '[]'"),
            ("foody_review_id", "VARCHAR(100)"),
            ("fingerprint", "VARCHAR(64)")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE reviews ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

    return engine
