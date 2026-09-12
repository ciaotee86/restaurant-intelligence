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
    create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey
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
        db_path = f"sqlite:///{file_path.replace(os.sep, '/')}"
    elif db_path.startswith("sqlite:///"):
        file_path = db_path.replace("sqlite:///", "")
        dir_name = os.path.dirname(file_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
    engine = create_engine(db_path, echo=False)
    Base.metadata.create_all(engine)
    return engine
