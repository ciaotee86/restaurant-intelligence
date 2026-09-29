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


def get_restaurant_existing_fingerprints(db, restaurant_id: int) -> set:
    """Lấy tập hợp các fingerprint của review đã lưu cho nhà hàng này để crawler kiểm tra duplicate."""
    rows = db.query(Review.fingerprint).filter(
        Review.restaurant_id == restaurant_id,
        Review.fingerprint.isnot(None)
    ).all()
    return {r[0] for r in rows if r[0]}


def save_review(
    db, restaurant_id: int, author: str, rating: float, text: str, review_date: str,
    is_spam: int = 0, spam_score: float = 0.0, spam_category: str = "normal", spam_reason: str = "[]",
    foody_review_id: str = None, fingerprint: str = None
):
    """
    Tránh lưu trùng:
    1. Ưu tiên kiểm tra fingerprint duy nhất (SHA-256)
    2. Kiểm tra foody_review_id nếu có
    3. Fallback kiểm tra text + author + restaurant_id
    """
    existing = None
    if fingerprint:
        existing = db.query(Review).filter_by(restaurant_id=restaurant_id, fingerprint=fingerprint).first()
    elif foody_review_id:
        existing = db.query(Review).filter_by(restaurant_id=restaurant_id, foody_review_id=foody_review_id).first()

    if not existing:
        existing = (
            db.query(Review)
            .filter_by(restaurant_id=restaurant_id, author=author, text=text)
            .first()
        )

    if existing:
        # Cập nhật bổ sung fingerprint nếu bản ghi cũ chưa có
        if fingerprint and not existing.fingerprint:
            existing.fingerprint = fingerprint
        if foody_review_id and not existing.foody_review_id:
            existing.foody_review_id = foody_review_id
        return existing

    review = Review(
        restaurant_id=restaurant_id,
        author=author,
        rating=rating,
        text=text,
        review_date=review_date,
        is_spam=is_spam,
        spam_score=spam_score,
        spam_category=spam_category,
        spam_reason=spam_reason,
        foody_review_id=foody_review_id,
        fingerprint=fingerprint,
    )
    db.add(review)
    db.flush()
    return review


def get_unanalyzed_reviews(db, limit: int = 50, exclude_spam: bool = True):
    """
    Lấy các review chưa được Gemini phân tích.
    Mặc định exclude_spam=True: loại bỏ các review bị đánh dấu spam hoặc low_information
    để không làm ô nhiễm kết quả phân tích khía cạnh (ABSA) và tiết kiệm quota Gemini.
    """
    query = db.query(Review).filter_by(is_analyzed=0)
    if exclude_spam:
        query = query.filter(Review.is_spam == 0, Review.spam_category != "low_information")
    return query.limit(limit).all()


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
