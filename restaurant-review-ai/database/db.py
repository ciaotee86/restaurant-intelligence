"""
Tiện ích kết nối DB và các hàm CRUD dùng chung cho crawler + analyzer + dashboard.
"""

from contextlib import contextmanager
from sqlalchemy.orm import sessionmaker
from database.models import init_db, Restaurant, Review, ReviewAnalysis

engine = init_db()
SessionLocal = sessionmaker(bind=engine)


@contextmanager
def get_session():
    """Dùng: with get_session() as db: ..."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_or_create_restaurant(db, name: str, foody_url: str, address: str = "", overall_rating: float = None):
    restaurant = db.query(Restaurant).filter_by(foody_url=foody_url).first()
    if restaurant:
        return restaurant
    restaurant = Restaurant(
        name=name,
        foody_url=foody_url,
        address=address,
        overall_rating=overall_rating,
    )
    db.add(restaurant)
    db.flush()  # để lấy restaurant.id ngay mà không cần commit
    return restaurant


def save_review(db, restaurant_id: int, author: str, rating: float, text: str, review_date: str):
    """Tránh lưu trùng: kiểm tra text + author + restaurant_id đã tồn tại chưa."""
    existing = (
        db.query(Review)
        .filter_by(restaurant_id=restaurant_id, author=author, text=text)
        .first()
    )
    if existing:
        return existing
    review = Review(
        restaurant_id=restaurant_id,
        author=author,
        rating=rating,
        text=text,
        review_date=review_date,
    )
    db.add(review)
    db.flush()
    return review


def get_unanalyzed_reviews(db, limit: int = 50):
    """Lấy các review chưa được Gemini phân tích, để chạy dần theo batch (tiết kiệm free quota)."""
    return db.query(Review).filter_by(is_analyzed=0).limit(limit).all()


def save_analysis(db, review_id: int, aspect: str, sentiment: str, confidence: float, is_urgent: bool = False):
    analysis = ReviewAnalysis(
        review_id=review_id,
        aspect=aspect,
        sentiment=sentiment,
        confidence=confidence,
        is_urgent=1 if is_urgent else 0,
    )
    db.add(analysis)
    return analysis
