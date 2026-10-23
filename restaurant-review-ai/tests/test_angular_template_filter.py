"""
Unit tests kiểm thử bộ lọc template AngularJS và rác dummy từ Foody.vn:
1. is_template_or_garbage_review: Loại bỏ {{, }}, Model., common_delete, text rỗng / < 5 ký tự.
2. classify_review: Phân loại đúng các review chứa mã template AngularJS là bot_placeholder / spam.
3. pipeline_service: Kiểm tra phòng thủ tuyệt đối không lưu review template hoặc text rỗng vào DB.
4. restaurants.db: Đảm bảo database hiện tại hoàn toàn sạch, không còn bản ghi template rác nào.
5. fetch_reviews_via_http: Bỏ qua các block ẩn (display:none, ng-hide) và chứa template binding.
"""

import os
import sqlite3
import pytest
from unittest.mock import MagicMock, patch
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Restaurant as DBRestaurant, Review as DBReview, ReviewAnalysis as DBAnalysis
from crawler.foody_crawler import (
    is_template_or_garbage_review,
    fetch_reviews_via_http
)
from crawler.review_filter import classify_review
from services.pipeline_service import save_and_analyze_reviews


class TestIsTemplateOrGarbageReview:
    """Kiểm thử hàm is_template_or_garbage_review trong crawler/foody_crawler.py"""

    def test_empty_or_too_short_text(self):
        # Text rỗng
        assert is_template_or_garbage_review(text="") is True
        assert is_template_or_garbage_review(text="   ") is True
        # Text độ dài < 5 ký tự
        assert is_template_or_garbage_review(text="Ngon") is True
        assert is_template_or_garbage_review(text="1234") is True
        assert is_template_or_garbage_review(text="abc") is True

    def test_angularjs_brackets(self):
        # Ký tự template {{ hoặc }} trong text, author, date
        assert is_template_or_garbage_review(
            text="Review bình thường nhưng có {{tag}}",
            author="Khách",
            date="Gần đây"
        ) is True
        assert is_template_or_garbage_review(
            text="Quán ăn ngon phục vụ tốt",
            author='{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}{{Model.Owner.DisplayName}}',
            date="Gần đây"
        ) is True
        assert is_template_or_garbage_review(
            text="Quán ăn ngon phục vụ tốt",
            author="Nguyễn Văn A",
            date="{{Model.CreatedDate|dateTimeJson}}"
        ) is True

    def test_model_variable_binding(self):
        # Biểu thức Model. trong author, text, date
        assert is_template_or_garbage_review(
            text="Đang tải Model.Description...",
            author="Khách",
            date="Hôm nay"
        ) is True
        assert is_template_or_garbage_review(
            text="Quán ăn rất ngon",
            author="Model.Owner.DisplayName",
            date="Hôm nay"
        ) is True
        assert is_template_or_garbage_review(
            text="Món lẩu thái ngon tuyệt",
            author="Người dùng",
            date="Model.CreatedDate"
        ) is True

    def test_common_delete_garbage(self):
        # Rác common_delete, Sửacommon_delete
        assert is_template_or_garbage_review(
            text="Sửacommon_delete",
            author="Khách",
            date="Gần đây"
        ) is True
        assert is_template_or_garbage_review(
            text="Xóa bài viết common_delete ngay",
            author="Khách",
            date="Gần đây"
        ) is True
        assert is_template_or_garbage_review(
            text="suacommon_delete",
            author="Khách",
            date="Gần đây"
        ) is True

    def test_actual_foody_garbage_records(self):
        # Kiểm thử đúng 2 mẫu thực tế đã gặp trên Foody
        # Mẫu 1 (như ID 740): text là 'Sửacommon_delete'
        assert is_template_or_garbage_review(
            text="Sửacommon_delete",
            author='{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}{{Model.Owner.DisplayName}}',
            date="{{Model.CreatedDate|dateTimeJson}}"
        ) is True

        # Mẫu 2 (như ID 741): text rỗng
        assert is_template_or_garbage_review(
            text="",
            author='{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}{{Model.Owner.DisplayName}}{{Model.CreatedDate|dateTimeJson}}',
            date="{{Model.CreatedDate|dateTimeJson}}"
        ) is True

    def test_valid_reviews_not_filtered(self):
        # Review bình thường của khách hàng không bị lọc nhầm
        assert is_template_or_garbage_review(
            text="Món bún chả ở đây rất thơm ngon, thịt nướng vừa tới, nước chấm chuẩn vị.",
            author="Hoàng Minh",
            date="2 ngày trước"
        ) is False
        assert is_template_or_garbage_review(
            text="Không gian quán thoáng đãng, phục vụ nhiệt tình nhanh nhẹn.",
            author="Khách Foody",
            date="Hôm qua"
        ) is False


class TestReviewFilterClassifyTemplate:
    """Kiểm thử classify_review trong crawler/review_filter.py nhận diện rác AngularJS"""

    def test_classify_common_delete(self):
        res = classify_review(text="Sửacommon_delete")
        assert res["is_spam"] is True
        assert res["spam_score"] == 1.0
        assert res["spam_category"] == "bot_placeholder"
        assert "common_delete_garbage" in res["spam_reason"]

    def test_classify_angular_brackets_in_text(self):
        res = classify_review(text="{{Model.Owner.DisplayName}} đánh giá rất tốt")
        assert res["is_spam"] is True
        assert res["spam_score"] == 1.0
        assert res["spam_category"] == "bot_placeholder"
        assert "angular_template_syntax" in res["spam_reason"]
        assert "angular_model_binding" in res["spam_reason"]

    def test_classify_angular_in_author_with_empty_text(self):
        res = classify_review(
            text="",
            author='{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}'
        )
        assert res["is_spam"] is True
        assert res["spam_score"] == 1.0
        assert res["spam_category"] == "bot_placeholder"

    def test_classify_model_binding_in_text(self):
        res = classify_review(text="Hiển thị nội dung Model.Reviews tại đây")
        assert res["is_spam"] is True
        assert res["spam_score"] == 1.0
        assert res["spam_category"] == "bot_placeholder"
        assert "angular_model_binding" in res["spam_reason"]

    def test_classify_valid_review_remains_normal(self):
        res = classify_review(
            text="Món lẩu nấm ở đây rất thanh đạm, đồ nhúng tươi ngon và phục vụ chu đáo.",
            author="Lê Phương"
        )
        assert res["is_spam"] is False
        assert res["spam_category"] == "normal"


class TestPipelineDefensiveFilter:
    """Kiểm thử phòng thủ trong services/pipeline_service.py: tuyệt đối không lưu review template rác vào DB"""

    @pytest.fixture
    def test_db_session(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        yield session
        session.close()

    def test_save_and_analyze_reviews_filters_template_records(self, test_db_session):
        crawl_data = {
            "name": "Quán Kiểm Thử",
            "address": "123 Đường Test, Đà Nẵng",
            "overall_rating": 8.5,
            "reviews": [
                # Review 1: Hợp lệ
                {
                    "foody_review_id": "1001",
                    "fingerprint": "fp_valid_001",
                    "author": "Khách Thực Tế",
                    "rating": 9.0,
                    "text": "Món ăn ngon và phục vụ rất nhanh nhẹn, quán sạch sẽ.",
                    "date": "Hôm qua",
                    "is_spam": 0,
                    "spam_score": 0.0,
                    "spam_category": "normal",
                    "spam_reason": "[]"
                },
                # Review 2: Rác template Sửacommon_delete (như ID 740)
                {
                    "foody_review_id": "1002",
                    "fingerprint": "fp_garbage_002",
                    "author": '{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}{{Model.Owner.DisplayName}}',
                    "rating": 10.0,
                    "text": "Sửacommon_delete",
                    "date": "{{Model.CreatedDate|dateTimeJson}}",
                    "is_spam": 1,
                    "spam_score": 1.0,
                    "spam_category": "bot_placeholder",
                    "spam_reason": '["common_delete_garbage"]'
                },
                # Review 3: Rác text rỗng kèm author AngularJS (như ID 741)
                {
                    "foody_review_id": "1003",
                    "fingerprint": "fp_garbage_003",
                    "author": '{{Model.AvgRating >= 10 ? "10" : (Model.AvgRating|number:1)}}{{Model.Owner.DisplayName}}{{Model.CreatedDate|dateTimeJson}}',
                    "rating": 10.0,
                    "text": "",
                    "date": "{{Model.CreatedDate|dateTimeJson}}",
                    "is_spam": 0,
                    "spam_score": 0.0,
                    "spam_category": "low_information",
                    "spam_reason": '["empty_text"]'
                },
                # Review 4: Text có chứa Model.
                {
                    "foody_review_id": "1004",
                    "fingerprint": "fp_garbage_004",
                    "author": "Khách Hàng",
                    "rating": 8.0,
                    "text": "Dữ liệu Model.ReviewText",
                    "date": "Gần đây",
                    "is_spam": 1,
                    "spam_score": 1.0,
                    "spam_category": "bot_placeholder",
                    "spam_reason": "[]"
                },
                # Review 5: Text quá ngắn < 5 ký tự
                {
                    "foody_review_id": "1005",
                    "fingerprint": "fp_garbage_005",
                    "author": "Khách",
                    "rating": 7.0,
                    "text": "Ok",
                    "date": "Gần đây",
                    "is_spam": 0,
                    "spam_score": 0.05,
                    "spam_category": "low_information",
                    "spam_reason": "[]"
                }
            ]
        }

        with patch("services.pipeline_service.analyze_batch", return_value=[]):
            restaurant = save_and_analyze_reviews(
                test_db_session,
                crawl_data=crawl_data,
                foody_url="https://www.foody.vn/da-nang/quan-kiem-thu"
            )

        # Kiểm chứng: Chỉ DUY NHẤT 1 review hợp lệ được lưu vào database!
        db_reviews = test_db_session.query(DBReview).filter_by(restaurant_id=restaurant.id).all()
        assert len(db_reviews) == 1
        assert db_reviews[0].text == "Món ăn ngon và phục vụ rất nhanh nhẹn, quán sạch sẽ."
        assert db_reviews[0].author == "Khách Thực Tế"

        # Kiểm chứng: restaurant.review_count được cập nhật chính xác = 1
        assert restaurant.review_count == 1


class TestDatabaseSanity:
    """Kiểm chứng trực tiếp file data/restaurants.db đảm bảo không còn rác và review_count đồng bộ"""

    def test_database_has_no_template_or_empty_reviews(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_file = os.path.join(base_dir, "data", "restaurants.db")
        assert os.path.exists(db_file), "File database data/restaurants.db phải tồn tại!"

        conn = sqlite3.connect(db_file)
        c = conn.cursor()

        # Kiểm tra 10 ID rác cũ tuyệt đối không còn
        target_ids = (740, 741, 753, 754, 765, 766, 775, 776, 792, 793)
        c.execute("SELECT count(*) FROM reviews WHERE id IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", target_ids)
        assert c.fetchone()[0] == 0, "Các ID review rác cũ vẫn còn tồn tại trong DB!"

        # Kiểm tra toàn bộ bảng reviews không chứa template binding hoặc rác common_delete
        c.execute("""
            SELECT count(*) FROM reviews
            WHERE author LIKE '%{{%' OR author LIKE '%}}%' OR author LIKE '%Model.%'
               OR text LIKE '%{{%' OR text LIKE '%}}%' OR text LIKE '%Model.%' OR text LIKE '%common_delete%'
               OR review_date LIKE '%{{%' OR review_date LIKE '%}}%' OR review_date LIKE '%Model.%'
               OR text = '' OR length(trim(text)) < 5
        """)
        garbage_count = c.fetchone()[0]
        assert garbage_count == 0, f"Vẫn còn {garbage_count} review rác trong DB!"

        # Kiểm tra review_count của các quán ăn bị ảnh hưởng (244, 246, 248, 249, 251)
        for rid in [244, 246, 248, 249, 251]:
            c.execute("SELECT review_count, (SELECT count(*) FROM reviews WHERE restaurant_id = restaurants.id) FROM restaurants WHERE id = ?", (rid,))
            row = c.fetchone()
            assert row is not None
            assert row[0] == row[1], f"Quán {rid} có review_count ({row[0]}) khác số review thực ({row[1]})!"

        conn.close()


class TestHttpCrawlTemplateBlockSkipping:
    """Kiểm thử fetch_reviews_via_http bỏ qua các block template HTML"""

    def test_skip_hidden_and_template_blocks(self):
        fake_html = """
        <html>
        <body>
            <ul class="foody-box-review">
                <!-- Block 1: Dummy template ẩn với style display:none -->
                <li class="review-item" style="display: none;" ng-repeat="review in Model.Reviews">
                    <div class="review-user"><a href="#">{{Model.Owner.DisplayName}}</a></div>
                    <div class="rd-des">Sửacommon_delete</div>
                    <span class="ru-time">{{Model.CreatedDate|dateTimeJson}}</span>
                </li>
                <!-- Block 2: Dummy template ẩn với class ng-hide -->
                <li class="review-item ng-hide">
                    <div class="review-user"><a href="#">{{Model.AvgRating}}</a></div>
                    <div class="rd-des"></div>
                    <span class="ru-time">{{Model.CreatedDate}}</span>
                </li>
                <!-- Block 3: Dummy template không ẩn nhưng chứa {{Model. -->
                <li class="review-item">
                    <div class="review-user"><a href="#">{{Model.Owner.DisplayName}}</a></div>
                    <div class="rd-des">common_delete</div>
                    <span class="ru-time">{{Model.CreatedDate|dateTimeJson}}</span>
                </li>
                <!-- Block 4: Review THẬT hợp lệ -->
                <li class="review-item" data-review-id="998877">
                    <div class="review-user"><a href="#">Nguyễn Văn An</a> đã bình luận</div>
                    <span class="review-points">9.0</span>
                    <div class="rd-des">Quán cơm gà ngon nhất khu vực, cơm vàng dẻo và thịt gà xé đậm vị.</div>
                    <span class="ru-time">3 ngày trước</span>
                </li>
            </ul>
        </body>
        </html>
        """

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = fake_html

        with patch("requests.get", return_value=mock_resp), \
             patch("crawler.foody_crawler.is_foody_domain", return_value=True):
            res = fetch_reviews_via_http("https://www.foody.vn/da-nang/quan-com-ga-ngon", max_reviews=10)

        # Chỉ có duy nhất 1 review thật được bóc tách
        assert len(res["reviews"]) == 1
        extracted = res["reviews"][0]
        assert extracted["author"] == "Nguyễn Văn An"
        assert extracted["rating"] == 9.0
        assert "cơm vàng dẻo" in extracted["text"]
        assert extracted["is_spam"] == 0
