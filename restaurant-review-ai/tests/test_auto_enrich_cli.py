"""
Test Suite cho CLI Auto-enrich & Workflow Đa Nguồn ([TASK-07]).
Dự án: Restaurant Intelligence System
Tuân thủ đặc tả: docs/06-multi-source-expansion-spec.md (MOD-04)
và kế hoạch: docs/07-multi-source-implementation-plan.md ([TASK-07]).
"""

import sys
import json
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Restaurant, Review, ReviewAnalysis
from run_pipeline import auto_enrich_sparse_restaurants, main


# ==============================================================================
# TEST FIXTURES & ISOLATED DATABASE
# ==============================================================================

@pytest.fixture
def memory_db():
    """Tạo database SQLite in-memory cô lập hoàn toàn cho từng test case."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


# ==============================================================================
# 1. TEST CLI ARGUMENT PARSING
# ==============================================================================

class TestCliArgumentParsing:
    """Kiểm thử tính năng phân tích tham số dòng lệnh CLI."""

    def test_cli_auto_enrich_flag_parsed(self):
        """Kiểm tra cờ --auto-enrich được parser ghi nhận đúng."""
        import argparse
        # Tạo test parser khớp với run_pipeline
        parser = argparse.ArgumentParser()
        parser.add_argument("--auto-enrich", action="store_true")
        parser.add_argument("--max-places", type=int, default=2)
        parser.add_argument("--max-reviews", type=int, default=25)

        args = parser.parse_args(["--auto-enrich"])
        assert args.auto_enrich is True
        assert args.max_places == 2
        assert args.max_reviews == 25

    def test_cli_auto_enrich_with_custom_limits(self):
        """Kiểm tra kết hợp --auto-enrich với các tham số giới hạn tùy chỉnh."""
        with patch.object(sys, "argv", ["run_pipeline.py", "--auto-enrich", "--max-places", "4", "--max-reviews", "15"]):
            with patch("run_pipeline.auto_enrich_sparse_restaurants") as mock_enrich:
                mock_enrich.return_value = {
                    "total_sparse_found": 1,
                    "processed_count": 1,
                    "enriched_restaurants": 1,
                    "total_new_reviews": 10,
                    "total_duplicates_skipped": 0,
                    "details": []
                }
                main()
                mock_enrich.assert_called_once_with(max_restaurants=4, max_reviews=15)

    def test_cli_backward_compatibility_flags(self):
        """Đảm bảo các cờ CLI cũ không bị ảnh hưởng và hoạt động bình thường."""
        with patch.object(sys, "argv", ["run_pipeline.py", "--requests-only", "--max-reviews", "10"]):
            with patch("run_pipeline.process_pending_user_requests") as mock_requests:
                with patch("run_pipeline.auto_enrich_sparse_restaurants") as mock_enrich:
                    mock_requests.return_value = 2
                    main()
                    mock_requests.assert_called_once_with(max_requests=20, max_reviews=10)
                    mock_enrich.assert_not_called()


# ==============================================================================
# 2. TEST AUTO-ENRICH RESTAURANT SELECTION CRITERIA
# ==============================================================================

class TestAutoEnrichSelection:
    """Kiểm tra tiêu chí lọc quán ăn có dữ liệu mỏng (sparse)."""

    def test_sparse_restaurants_filter_criteria(self, memory_db):
        """
        Quán mỏng: review_count < 10 hoặc credibility_score < 0.65 hoặc None.
        Quán đủ mẫu: review_count >= 10 VÀ credibility_score >= 0.65 -> không bù đắp.
        """
        # Quán 1: Rất ít review (mỏng)
        r1 = Restaurant(
            name="Quán Mì Quảng Bé Hạnh",
            city="Đà Nẵng",
            review_count=3,
            credibility_score=0.40,
            google_maps_url="https://maps.google.com/?cid=1"
        )
        # Quán 2: Đủ mẫu (không mỏng)
        r2 = Restaurant(
            name="Cơm Gà Bà Buội",
            city="Đà Nẵng",
            review_count=45,
            credibility_score=0.98,
            google_maps_url="https://maps.google.com/?cid=2"
        )
        # Quán 3: Mới tạo chưa có review (None)
        r3 = Restaurant(
            name="Bánh Tráng Cuốn Thịt Heo Đại Lộc",
            city="Đà Nẵng",
            review_count=None,
            credibility_score=None
        )
        memory_db.add_all([r1, r2, r3])
        memory_db.commit()

        # Mock crawler trả về thành công
        fake_crawl = {
            "success": True,
            "restaurant_name": "Test",
            "reviews": [],
            "error": None
        }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl) as mock_crawl_url:
            with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", return_value=fake_crawl) as mock_crawl_search:
                summary = auto_enrich_sparse_restaurants(
                    max_restaurants=10,
                    max_reviews=20,
                    db_session=memory_db
                )

                # Chỉ có 2 quán mỏng (r1 và r3) được tìm thấy
                assert summary["total_sparse_found"] == 2
                assert summary["processed_count"] == 2

    def test_empty_database_handling(self, memory_db):
        """Khi không có quán mỏng nào trong DB, trả về summary rỗng an toàn."""
        summary = auto_enrich_sparse_restaurants(
            max_restaurants=5,
            max_reviews=20,
            db_session=memory_db
        )
        assert summary["total_sparse_found"] == 0
        assert summary["enriched_restaurants"] == 0
        assert summary["total_new_reviews"] == 0


# ==============================================================================
# 3. TEST CRAWLING, ENTITY RESOLUTION & DEDUPLICATION
# ==============================================================================

class TestAutoEnrichIngestionFlow:
    """Kiểm tra luồng thu thập dữ liệu, phân loại spam và chống trùng lặp."""

    def test_auto_enrich_with_existing_google_maps_url(self, memory_db):
        """Quán đã có google_maps_url -> Gọi trực tiếp crawl_google_maps_reviews."""
        rest = Restaurant(
            name="Cơm Gà Gia Vĩnh",
            address="129 Hải Phòng, Đà Nẵng",
            city="Đà Nẵng",
            review_count=0,
            credibility_score=0.0,
            google_maps_url="https://maps.google.com/?cid=giavinh123"
        )
        memory_db.add(rest)
        memory_db.commit()

        fake_crawl_result = {
            "success": True,
            "restaurant_name": "Cơm Gà Gia Vĩnh",
            "address": "129 Hải Phòng, Đà Nẵng",
            "overall_rating": 4.5,
            "google_maps_url": "https://maps.google.com/?cid=giavinh123",
            "google_place_id": "ChIJ_giavinh_test",
            "reviews": [
                {
                    "author": "Nguyễn Văn A",
                    "rating": 5.0,
                    "review_date": "1 ngày trước",
                    "text": "Cơm gà da giòn thơm ngon đậm vị, canh nóng hổi tuyệt vời!",
                    "google_review_id": "g_rev_001"
                },
                {
                    "author": "Trần Thị B",
                    "rating": 4.0,
                    "review_date": "3 ngày trước",
                    "text": "Quán phục vụ nhanh, nước sốt chấm đặc biệt rất vừa miệng.",
                    "google_review_id": "g_rev_002"
                }
            ],
            "total_crawled": 2,
            "error": None
        }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl_result) as mock_crawl:
            with patch("crawler.google_maps_crawler.search_and_crawl_google_maps") as mock_search:
                with patch("analysis.gemini_analyzer.analyze_batch") as mock_absa:
                    mock_absa.return_value = [
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

                    summary = auto_enrich_sparse_restaurants(
                        max_restaurants=5,
                        max_reviews=30,
                        db_session=memory_db
                    )

                    mock_crawl.assert_called_once_with(
                        url="https://maps.google.com/?cid=giavinh123",
                        max_reviews=30,
                        headless=True
                    )
                    mock_search.assert_not_called()

                    assert summary["enriched_restaurants"] == 1
                    assert summary["total_new_reviews"] == 2
                    assert summary["total_duplicates_skipped"] == 0

                    # Kiểm tra dữ liệu được lưu vào SQLite
                    db_reviews = memory_db.query(Review).filter(Review.restaurant_id == rest.id).all()
                    assert len(db_reviews) == 2
                    assert all(r.source == "GoogleMaps" for r in db_reviews)
                    assert all(r.fingerprint is not None for r in db_reviews)
                    assert all(r.is_analyzed == 1 for r in db_reviews)

                    # Kiểm tra cập nhật credibility_score
                    memory_db.refresh(rest)
                    assert rest.review_count == 2
                    assert rest.google_review_count == 2
                    assert rest.credibility_score > 0.0

    def test_auto_enrich_without_gmap_url_performs_search(self, memory_db):
        """Quán chưa có google_maps_url -> Tự động tìm kiếm qua search_and_crawl_google_maps."""
        rest = Restaurant(
            name="Bún Chả Cá Hòn",
            address="113/3 Nguyễn Chí Thanh",
            city="Đà Nẵng",
            review_count=1,
            credibility_score=0.20,
            google_maps_url=None
        )
        memory_db.add(rest)
        memory_db.commit()

        fake_search_result = {
            "success": True,
            "restaurant_name": "Bún Chả Cá Hòn 113",
            "address": "113/3 Nguyễn Chí Thanh, Hải Châu, Đà Nẵng",
            "overall_rating": 4.6,
            "google_maps_url": "https://maps.google.com/?cid=hon113",
            "google_place_id": "ChIJ_hon113",
            "reviews": [
                {
                    "author": "Lê Văn C",
                    "rating": 5.0,
                    "review_date": "1 tuần trước",
                    "text": "Nước dùng ngọt thanh từ xương cá, chả cá dai giòn không bị bột.",
                    "google_review_id": "g_hon_01"
                }
            ],
            "total_crawled": 1,
            "error": None
        }

        with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", return_value=fake_search_result) as mock_search:
            with patch("crawler.google_maps_crawler.crawl_google_maps_reviews") as mock_crawl:
                with patch("analysis.gemini_analyzer.analyze_batch", return_value=[]):
                    summary = auto_enrich_sparse_restaurants(
                        max_restaurants=5,
                        max_reviews=10,
                        db_session=memory_db
                    )

                    mock_search.assert_called_once_with(
                        query="Bún Chả Cá Hòn 113/3 Nguyễn Chí Thanh",
                        city="Đà Nẵng",
                        max_reviews=10,
                        headless=True
                    )
                    mock_crawl.assert_not_called()

                    assert summary["enriched_restaurants"] == 1
                    assert summary["total_new_reviews"] == 1

                    memory_db.refresh(rest)
                    assert rest.google_maps_url == "https://maps.google.com/?cid=hon113"
                    assert rest.google_place_id == "ChIJ_hon113"

    def test_auto_enrich_deduplicates_existing_reviews(self, memory_db):
        """Khử trùng lặp: bài đánh giá đã có fingerprint trong DB sẽ bị bỏ qua."""
        from services.entity_resolution import compute_review_fingerprint

        rest = Restaurant(
            name="Bánh Xèo Tôm Nhảy Cô Ba",
            city="Đà Nẵng",
            review_count=1,
            credibility_score=0.20,
            google_maps_url="https://maps.google.com/?cid=coba"
        )
        memory_db.add(rest)
        memory_db.commit()

        review_text = "Bánh xèo giòn rụm, tôm còn nhảy tanh tách rất tươi ngon!"
        fp = compute_review_fingerprint(review_text)

        old_rev = Review(
            restaurant_id=rest.id,
            author="Khách cũ",
            rating=5.0,
            text=review_text,
            fingerprint=fp,
            source="Foody"
        )
        memory_db.add(old_rev)
        memory_db.commit()

        fake_crawl = {
            "success": True,
            "restaurant_name": "Bánh Xèo Tôm Nhảy Cô Ba",
            "reviews": [
                {
                    "author": "Khách cũ Google",
                    "rating": 5.0,
                    "text": review_text,  # Trùng lặp nội dung
                    "review_date": "Hôm nay"
                },
                {
                    "author": "Khách mới Google",
                    "rating": 4.0,
                    "text": "Rau sống tươi sạch, nước chấm pha rất chuẩn vị miền Trung.",
                    "review_date": "Hôm nay"
                }
            ]
        }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl):
            with patch("analysis.gemini_analyzer.analyze_batch", return_value=[]):
                summary = auto_enrich_sparse_restaurants(
                    max_restaurants=5,
                    max_reviews=10,
                    db_session=memory_db
                )

                assert summary["total_duplicates_skipped"] == 1
                assert summary["total_new_reviews"] == 1

                # Tổng số review trong DB của quán là 2 (1 cũ + 1 mới)
                total = memory_db.query(Review).filter(Review.restaurant_id == rest.id).count()
                assert total == 2

    def test_auto_enrich_filters_spam_and_anomalies(self, memory_db):
        """Lọc spam qua classify_review và loại bỏ text có biểu thức {{...}}."""
        rest = Restaurant(
            name="Quán Chè Sầu Liên",
            city="Đà Nẵng",
            review_count=1,
            credibility_score=0.20,
            google_maps_url="https://maps.google.com/?cid=chelien"
        )
        memory_db.add(rest)
        memory_db.commit()

        fake_crawl = {
            "success": True,
            "restaurant_name": "Quán Chè Sầu Liên",
            "reviews": [
                {
                    "author": "Spammer",
                    "rating": 1.0,
                    "text": "Cho vay tiền nhanh không cần thế chấp liên hệ 0909123456",  # Spam quảng cáo
                    "review_date": "Gần đây"
                },
                {
                    "author": "Bot {{injection}}",
                    "rating": 5.0,
                    "text": "Nội dung {{injection}} giả mạo",
                    "review_date": "Gần đây"
                },
                {
                    "author": "Thực khách chân chính",
                    "rating": 5.0,
                    "text": "Chè sầu thơm nức mũi, múi sầu riêng dày thịt béo ngậy!",
                    "review_date": "Gần đây"
                }
            ]
        }

        with patch("crawler.google_maps_crawler.crawl_google_maps_reviews", return_value=fake_crawl):
            with patch("analysis.gemini_analyzer.analyze_batch", return_value=[]):
                summary = auto_enrich_sparse_restaurants(
                    max_restaurants=5,
                    max_reviews=10,
                    db_session=memory_db
                )

                # Chỉ có bài của thực khách chân chính được lưu
                assert summary["total_new_reviews"] == 1
                reviews = memory_db.query(Review).filter(Review.restaurant_id == rest.id).all()
                assert len(reviews) == 1
                assert reviews[0].author == "Thực khách chân chính"


# ==============================================================================
# 4. TEST DEFENSIVE ERROR HANDLING (ANTI-CRASH)
# ==============================================================================

class TestDefensiveErrorHandling:
    """Kiểm thử cơ chế phòng vệ chống sập CLI khi crawler hoặc AI gặp sự cố."""

    def test_crawler_exception_does_not_crash_pipeline(self, memory_db):
        """Nếu cào quán 1 bị crash/timeout, pipeline tiếp tục xử lý quán 2 bình thường."""
        r1 = Restaurant(name="Quán Gặp Lỗi", city="Đà Nẵng", review_count=2, credibility_score=0.3)
        r2 = Restaurant(name="Quán Bình Thường", city="Đà Nẵng", review_count=3, credibility_score=0.4)
        memory_db.add_all([r1, r2])
        memory_db.commit()

        def side_effect_crawl(query, city, max_reviews, headless):
            if "Quán Gặp Lỗi" in query:
                raise RuntimeError("Playwright headless timeout khi tải trang!")
            return {
                "success": True,
                "restaurant_name": "Quán Bình Thường",
                "reviews": [
                    {"author": "User 1", "rating": 5.0, "text": "Món ăn tuyệt vời!", "review_date": "Hôm nay"}
                ]
            }

        with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", side_effect=side_effect_crawl):
            with patch("analysis.gemini_analyzer.analyze_batch", return_value=[]):
                summary = auto_enrich_sparse_restaurants(
                    max_restaurants=5,
                    max_reviews=10,
                    db_session=memory_db
                )

                assert summary["processed_count"] == 2
                assert summary["enriched_restaurants"] == 1
                assert summary["total_new_reviews"] == 1

                # Quán 1 được ghi nhận thất bại trong details
                failed_item = next(d for d in summary["details"] if d["name"] == "Quán Gặp Lỗi")
                assert failed_item["status"] == "failed"
                assert "Playwright headless timeout" in failed_item["error"]

    def test_gemini_absa_failure_does_not_crash_pipeline(self, memory_db):
        """Nếu Gemini API bị rate-limit hoặc thiếu API key, bài đánh giá vẫn được lưu an toàn."""
        rest = Restaurant(name="Quán Không Có AI", city="Đà Nẵng", review_count=2, credibility_score=0.3)
        memory_db.add(rest)
        memory_db.commit()

        fake_crawl = {
            "success": True,
            "restaurant_name": "Quán Không Có AI",
            "reviews": [
                {"author": "Khách 1", "rating": 5.0, "text": "Đồ ăn ngon giá hợp lý.", "review_date": "Hôm nay"}
            ]
        }

        with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", return_value=fake_crawl):
            with patch("analysis.gemini_analyzer.analyze_batch", side_effect=Exception("Gemini API Key missing or quota exceeded")):
                summary = auto_enrich_sparse_restaurants(
                    max_restaurants=5,
                    max_reviews=10,
                    db_session=memory_db
                )

                # Review vẫn được lưu vào database và cập nhật chỉ số
                assert summary["enriched_restaurants"] == 1
                assert summary["total_new_reviews"] == 1
                db_rev = memory_db.query(Review).filter(Review.restaurant_id == rest.id).first()
                assert db_rev is not None
                assert db_rev.source == "GoogleMaps"

    def test_crawler_returns_unsuccessful_status(self, memory_db):
        """Khi crawler trả về success=False (ví dụ dính CAPTCHA), xử lý êm thắm."""
        rest = Restaurant(name="Quán Dính Captcha", city="Đà Nẵng", review_count=1, credibility_score=0.2)
        memory_db.add(rest)
        memory_db.commit()

        fake_fail = {
            "success": False,
            "error": "Google Maps yêu cầu xác thực bot CAPTCHA"
        }

        with patch("crawler.google_maps_crawler.search_and_crawl_google_maps", return_value=fake_fail):
            summary = auto_enrich_sparse_restaurants(
                max_restaurants=5,
                max_reviews=10,
                db_session=memory_db
            )

            assert summary["enriched_restaurants"] == 0
            assert summary["total_new_reviews"] == 0
            failed_item = summary["details"][0]
            assert failed_item["status"] == "failed"
            assert "CAPTCHA" in failed_item["error"]
