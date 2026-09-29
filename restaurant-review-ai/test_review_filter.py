"""
Unit test kiểm thử bộ lọc Review Filter theo 8 Test Case bắt buộc của đề bài.
"""
import sys
import json
from crawler.review_filter import classify_review

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

TEST_CASES = [
    {
        "id": "CASE 1",
        "name": "Review bình thường về đồ ăn",
        "text": "Món bún bò ở đây rất đậm đà, nước dùng thơm và nhiều thịt bò tái mềm. Nhân viên nhanh nhẹn.",
        "expected_spam": False,
        "expected_category": "normal"
    },
    {
        "id": "CASE 2",
        "name": "Review bình thường nhưng rất ngắn ('Ngon')",
        "text": "Ngon",
        "expected_spam": False,
        "expected_category": "low_information"
    },
    {
        "id": "CASE 3",
        "name": "Review quảng cáo dịch vụ cho thuê xe",
        "text": "Tuấn Dũng Travel cho thuê xe du lịch đời mới 7-16-29 chỗ đón tiễn sân bay Đà Nẵng giá hạt dẻ.",
        "expected_spam": True,
        "expected_category": "advertisement"
    },
    {
        "id": "CASE 4",
        "name": "Review chứa SĐT + email + Zalo + lời kêu gọi liên hệ",
        "text": "Dịch vụ tour du lịch trọn gói, vui lòng liên hệ ngay HOTLINE/Zalo: 0934.787.036 hoặc email: tqtuan91@gmail.com để nhận bảng báo giá.",
        "expected_spam": True,
        "expected_category": "advertisement"
    },
    {
        "id": "CASE 5",
        "name": "Review có từ 'giá rẻ' nhưng thực sự đang mô tả giá món ăn",
        "text": "Quán có giá khá rẻ, đồ ăn ngon và đĩa cơm sườn rất đầy đặn, ăn no nê.",
        "expected_spam": False,
        "expected_category": "normal"
    },
    {
        "id": "CASE 6",
        "name": "Review có SĐT của nhà hàng nhưng nội dung là trải nghiệm khách hàng",
        "text": "Nhân viên rất nhiệt tình, số điện thoại phục vụ của quán là 0901234567 để mọi người tiện gọi đặt bàn trước nhé. Món lẩu nấm rất ngon.",
        "expected_spam": False,
        "expected_category": ["normal", "suspicious"]  # Không tự động loại / không coi là spam
    },
    {
        "id": "CASE 7",
        "name": "Hai review có nội dung giống hệt nhau (Duplicate)",
        "text": "Đồ ăn bình thường, không gian hơi ồn ào và phục vụ hơi lâu.",
        "recent_texts": ["Đồ ăn bình thường, không gian hơi ồn ào và phục vụ hơi lâu."],
        "expected_spam": True,
        "expected_category": "duplicate"
    },
    {
        "id": "CASE 8",
        "name": "Review quảng cáo dịch vụ hoàn toàn không liên quan (BĐS / Gia sư)",
        "text": "Cần bán gấp lô đất nền bất động sản chính chủ sổ đỏ tại trung tâm thành phố, liên hệ ngay.",
        "expected_spam": True,
        "expected_category": ["irrelevant", "advertisement"]
    },
    {
        "id": "CASE 9",
        "name": "Review chép lại tên quán kèm ký hiệu chi nhánh bot (ChaChaanTeng F / J)",
        "text": "“港式甜品店 Trôi Nước HongKong - ChaChaanTeng F”",
        "restaurant_name": "Trôi Nước HongKong - ChaChaanTeng",
        "expected_spam": True,
        "expected_category": ["bot_placeholder", "no_opinion_placeholder"]
    },
    {
        "id": "CASE 10",
        "name": "Review dạng chuỗi tên nhãn hiệu có đuôi bot không truyền restaurant_name",
        "text": "“港式甜品店 Trôi Nước HongKong - ChaChaanTeng G”",
        "expected_spam": True,
        "expected_category": ["bot_placeholder", "no_opinion_placeholder"]
    },
    {
        "id": "CASE 11",
        "name": "Review spam săn xu / chấm nhận xu",
        "text": "hình ảnh chỉ mang tính chất nhận xu thôi ạ",
        "expected_spam": True,
        "expected_category": ["coin_farming"]
    }
]

def run_tests():
    print("=" * 70)
    print("KIỂM THỬ BỘ LỌC ĐÁNH GIÁ (REVIEW FILTER TEST SUITE)")
    print("=" * 70)

    all_passed = True
    for tc in TEST_CASES:
        res = classify_review(
            text=tc["text"],
            restaurant_name=tc.get("restaurant_name"),
            recent_texts=tc.get("recent_texts", [])
        )
        
        # Kiểm tra điều kiện spam
        spam_match = (res["is_spam"] == tc["expected_spam"])
        
        # Kiểm tra category
        exp_cat = tc["expected_category"]
        if isinstance(exp_cat, list):
            cat_match = res["spam_category"] in exp_cat
        else:
            cat_match = (res["spam_category"] == exp_cat)
            
        passed = spam_match and cat_match
        if not passed:
            all_passed = False

        status = "PASSED" if passed else "FAILED"
        print(f"\n[{status}] {tc['id']}: {tc['name']}")
        print(f"  Văn bản : \"{tc['text']}\"")
        print(f"  Kết quả : is_spam={res['is_spam']} | category='{res['spam_category']}' | score={res['spam_score']}")
        print(f"  Lý do   : {res['spam_reason']}")
        if not passed:
            print(f"  KỲ VỌNG : is_spam={tc['expected_spam']} | category='{tc['expected_category']}'")

    print("\n" + "=" * 70)
    if all_passed:
        print(f"KẾT QUẢ TỔNG THỂ: TẤT CẢ {len(TEST_CASES)}/{len(TEST_CASES)} TEST CASES ĐỀU ĐẠT CHUẨN!")
    else:
        print("KẾT QUẢ TỔNG THỂ: CÓ TEST CASE CHƯA ĐẠT.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
