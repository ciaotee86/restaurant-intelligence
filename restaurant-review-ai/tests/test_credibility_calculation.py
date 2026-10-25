import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Restaurant as DBRestaurant, Review as DBReview, ReviewAnalysis as DBAnalysis
from database.db import get_or_create_restaurant
from services.entity_resolution import calculate_credibility_score, update_restaurant_counts_and_credibility
from services.bi_service import format_restaurant_full
from services.pipeline_service import save_and_analyze_reviews


@pytest.fixture
def mem_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_credibility_score_for_single_review():
    """1 review must yield ~0.2018 (20.2%), never 1.0 (100%)."""
    c0 = calculate_credibility_score(0)
    c1 = calculate_credibility_score(1)
    c5 = calculate_credibility_score(5)
    c30 = calculate_credibility_score(30)

    assert c0 == 0.0
    assert abs(c1 - 0.2018) < 0.001
    assert abs(c5 - 0.5218) < 0.001
    assert c30 == 1.0


def test_default_restaurant_creation_has_zero_credibility(mem_db):
    """A new restaurant must start with credibility 0.0, not 1.0."""
    rest = get_or_create_restaurant(
        mem_db,
        name="Quán Mới Mở",
        foody_url="https://www.foody.vn/hue/quan-moi-mo"
    )
    mem_db.commit()
    assert rest.review_count == 0
    assert rest.foody_review_count == 0
    assert rest.google_review_count == 0
    assert rest.credibility_score == 0.0


def test_format_restaurant_full_defensive_guard_single_review(mem_db):
    """When a restaurant has 1 review, format_restaurant_full must return credibilityLevel='low'."""
    rest = get_or_create_restaurant(
        mem_db,
        name="Quán Tré Trộn Cay",
        foody_url="https://www.foody.vn/hue/quan-tre-tron"
    )
    mem_db.commit()

    # Add 1 review
    rev = DBReview(
        restaurant_id=rest.id,
        author="Khách hàng",
        rating=2.4,
        text="Tré không ngon, ăn bị đau bụng",
        source="Foody",
        is_spam=0,
        is_analyzed=1
    )
    mem_db.add(rev)
    mem_db.commit()

    # Even if DB credibility_score was somehow corrupted or defaulted to 1.0:
    rest.credibility_score = 1.0
    mem_db.commit()

    # format_restaurant_full must self-correct and detect small sample
    data = format_restaurant_full(rest, mem_db)
    assert data["totalReviews"] == 1
    assert abs(data["credibilityScore"] - 20.2) < 0.5
    assert data["credibilityLevel"] == "low"
    assert data["sampleWarning"] is not None


def test_pipeline_save_and_analyze_updates_credibility(mem_db, monkeypatch):
    """save_and_analyze_reviews must update credibility_score to 0.2018 for 1 review."""
    # Mock Gemini analyze_batch so tests don't make network calls
    monkeypatch.setattr(
        "services.pipeline_service.analyze_batch",
        lambda payload: [{
            "review_id": payload[0]["id"],
            "_analysis_succeeded": True,
            "aspects": [{"aspect": "món ăn", "sentiment": "negative", "confidence": 0.9}],
            "is_urgent": True
        }]
    )

    crawl_data = {
        "name": "Quán Tré Trộn Cay",
        "address": "135 Mai Thúc Loan",
        "overall_rating": 8.0,
        "reviews": [{
            "author": "Hoang Loc",
            "rating": 2.4,
            "text": "Tré dở, ăn lạc quẻ, bị đau bụng",
            "date": "23/05/2024",
            "is_spam": 0,
            "spam_score": 0.0,
            "spam_category": "normal"
        }]
    }

    rest = save_and_analyze_reviews(
        mem_db,
        crawl_data=crawl_data,
        foody_url="https://www.foody.vn/hue/quan-tre-tron-cay"
    )

    assert rest.review_count == 1
    assert rest.foody_review_count == 1
    assert rest.google_review_count == 0
    assert abs(rest.credibility_score - 0.2018) < 0.001

    formatted = format_restaurant_full(rest, mem_db)
    assert formatted["credibilityLevel"] == "low"
    assert abs(formatted["credibilityScore"] - 20.2) < 0.5
