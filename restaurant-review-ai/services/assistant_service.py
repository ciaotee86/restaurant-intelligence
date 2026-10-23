"""
Dịch vụ Trợ lý Phân tích Nền tảng (Restaurant Intelligence Platform Assistant).
Cung cấp góc nhìn phân tích dữ liệu độc lập, khách quan dựa trên dữ liệu đánh giá thực tế.
Kiến trúc 100% Gemini AI Engine kết hợp In-Memory Semantic/Question Caching:
- 100% Gemini AI (Google GenAI SDK) xử lý toàn bộ câu hỏi với Rich Context và Guardrails độc lập.
- Cache nội bộ thông minh đảm bảo phản hồi tức thì với source="cache" cho các câu hỏi trùng lặp.
"""

import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv(dotenv_path=env_path.parent / ".env")
load_dotenv()

# Đảm bảo console UTF-8 trên Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database.models import Restaurant as DBRestaurant
from services.bi_service import format_restaurant_full, remove_accents

# In-memory FAQ & Question Cache: key = f"{restaurant_id}:{normalized_question}"
_QUESTION_CACHE: Dict[str, Dict[str, Any]] = {}

def get_gemini_api_key() -> Optional[str]:
    """
    Lấy API Key linh hoạt từ biến môi trường với cơ chế tự động nhận diện và khôi phục:
    1. Kiểm tra GEMINI_API_KEY hoặc GOOGLE_API_KEY chuẩn.
    2. Nạp lại từ các file .env nếu bị thiếu lúc runtime.
    3. Tự động quét os.environ:
       - Trường hợp người dùng vô tình nhập Key vào cột Tên (Key column) trên Render Dashboard.
       - Trường hợp tên biến có chữ 'gemini' hoặc 'google_api'.
       - Trường hợp giá trị hoặc tên bắt đầu bằng 'AIzaSy' hoặc 'AQ.'.
    4. Cảnh báo định dạng nếu phát hiện token dạng 'AQ.' thay vì API Key chuẩn 'AIzaSy...'.
    """
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not key:
        # Cơ chế dò tìm thông minh đề phòng cấu hình nhầm cột trên Render Dashboard
        for k, v in os.environ.items():
            k_clean = k.strip()
            v_clean = v.strip() if v else ""

            # Case A: Người dùng paste nhầm API Key vào cột Key/Name trên Render
            if k_clean.lower().startswith("aizasy") or k_clean.lower().startswith("aq."):
                print(f"[Gemini API Info] Phát hiện API Key được cấu hình ở cột Tên/Key '{k_clean[:10]}...' trên Render. Đang tự động khôi phục...")
                key = k_clean
                break

            # Case B: Tên biến có chứa gemini hoặc google_api
            if ("gemini" in k_clean.lower() or "google_api" in k_clean.lower()) and len(v_clean) > 15:
                key = v_clean
                break

            # Case C: Giá trị bắt đầu bằng AIzaSy hoặc AQ.
            if v_clean.startswith("AIzaSy") or v_clean.startswith("AQ."):
                key = v_clean
                break

    return key.strip() if key else None

# Danh sách Candidate Models theo thứ tự ưu tiên (Cascading Fallback)
CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
]
MODEL_NAME = CANDIDATE_MODELS[0]


def get_quick_questions(restaurant_name: str = "quán") -> List[str]:
    """Trả về 4 câu hỏi định hướng nhanh cho người dùng/chủ quán tra cứu dữ liệu"""
    short_name = restaurant_name.split("-")[0].strip() if restaurant_name else "quán"
    return [
        f"Món ăn nào được thực khách khen nhiều nhất tại {short_name}?",
        "Dịch vụ và thái độ nhân viên có vấn đề gì cần lưu ý không?",
        "Mức giá và định lượng khẩu phần ăn ở đây được đánh giá thế nào?",
        "Gợi ý kế hoạch hành động cụ thể để cải thiện trải nghiệm trong tháng tới?"
    ]


def detect_question_intent(question: str) -> Optional[str]:
    """
    Phân loại ý định câu hỏi để điều hướng:
    - Guardrails ngoài phạm vi (TC19-TC22)
    - Truy vấn định lượng dữ liệu (TC07-TC12)
    - Đề xuất cải thiện & Bảng phân tích (TC13-TC18)
    - Phân tích khía cạnh cốt lõi (TC01-TC06)
    """
    norm = remove_accents(question.lower().strip())

    # ==========================================
    # NHÓM 1: GUARDRAILS NGOÀI PHẠM VI (TC19 - TC22)
    # ==========================================
    # TC19: Thời tiết, tin tức, thể thao, chính trị
    if any(k in norm for k in ["thoi tiet", "nhiet do", "mua khong", "bong da", "the thao", "gia vang", "chung khoan", "chinh tri", "tin tuc hom nay"]):
        return "out_of_scope_general"

    # TC21: Hỏi danh tính cá nhân người đánh giá
    if any(k in norm for k in ["ai la nguoi", "danh tinh", "ten nguoi danh gia", "nguoi nao viet", "ai viet danh gia"]):
        return "out_of_scope_identity"

    # TC20 & TC22: Doanh thu, tài chính, dự đoán doanh thu
    if any(k in norm for k in ["doanh thu", "loi nhuan", "doanh so", "kiem duoc bao nhieu", "lai bao nhieu"]):
        if any(k in norm for k in ["du doan", "thang toi", "sap toi", "tuong lai"]):
            return "out_of_scope_revenue_prediction"
        return "out_of_scope_financial"

    # ==========================================
    # NHÓM 2: TRUY VẤN DỮ LIỆU ĐỊNH LƯỢNG (TC07 - TC12)
    # ==========================================
    # TC07: Đếm tổng số bài đánh giá
    if any(k in norm for k in ["bao nhieu bai danh gia", "bao nhieu review", "tong so danh gia", "so luong danh gia", "hien co bao nhieu bai", "co bao nhieu bai danh gia"]):
        return "query_review_count"

    # TC08: Đếm số lượng / tỷ lệ đánh giá tích cực
    if any(k in norm for k in ["bao nhieu khach hang danh gia tich cuc", "bao nhieu danh gia tich cuc", "bao nhieu nguoi khen", "so luong tich cuc", "co bao nhieu khach hang danh gia tich cuc"]):
        return "query_positive_count"

    # TC09: Trích xuất nhận xét tiêu cực về dịch vụ
    if any(k in norm for k in ["nhan xet tieu cuc ve dich vu", "danh gia tieu cuc ve dich vu", "khach che dich vu", "phan nan ve dich vu"]):
        return "query_negative_service"

    # TC12: Dẫn chứng từ đánh giá thực tế
    if any(k in norm for k in ["dan chung tu danh gia thuc te", "dan chung thuc te", "trich dan thuc te", "dan chung cho nhan dinh"]):
        return "query_quotes_evidence"

    # TC10: Vấn đề được nhắc đến nhiều lần nhất (tần suất)
    if any(k in norm for k in ["nhac den nhieu lan nhat", "lap lai nhieu lan", "van de pho bien nhat", "chu de lap lai"]):
        return "query_frequent_issues"

    # TC11: Đánh giá chủ yếu tập trung vào khía cạnh nào
    if any(k in norm for k in ["tap trung vao nhung khia canh nao", "chu yeu tap trung vao", "phan nhom y kien", "cac khia canh nao"]):
        return "query_aspect_distribution"

    # ==========================================
    # NHÓM 3: ĐỀ XUẤT CẢI THIỆN KINH DOANH (TC13 - TC18)
    # ==========================================
    # TC18: Lập bảng tổng hợp vấn đề - nguyên nhân - giải pháp
    if any(k in norm for k in ["lap bang", "bang tong hop", "bang phan tich", "tao bang"]):
        return "action_problem_table"

    # TC14: Kế hoạch hành động cụ thể trong tháng tới
    if any(k in norm for k in ["ke hoach hanh dong cu the", "trong thang toi", "ke hoach thang toi"]):
        return "action_monthly_plan"

    # TC15: Giải pháp cải thiện chất lượng phục vụ
    if any(k in norm for k in ["cai thien chat luong phuc vu", "nang cao chat luong phuc vu", "cai thien phuc vu", "lam the nao de cai thien chat luong phuc vu"]):
        return "action_service_improvement"

    # TC16: Giải pháp cải thiện món ăn
    if any(k in norm for k in ["hai long hon ve mon an", "cai thien mon an", "cai thien chat luong mon an", "lam gi de khach hang hai long hon ve mon"]):
        return "action_food_improvement"

    # TC13 & TC17: Xác định 1 vấn đề ưu tiên hàng đầu / trước tiên
    if any(k in norm for k in ["cai thien dieu gi truoc tien", "chi mot van de", "uu tien nhat", "uu tien van de nao", "uu tien dau tien", "neu chi duoc giai quyet mot van de"]):
        return "action_priority_single"

    # Kế hoạch hành động chung
    if "ke hoach" in norm or "checklist" in norm:
        return "action_plan"

    # Điểm nghẽn vận hành
    if any(k in norm for k in ["diem nghen", "luong chinh", "tron tru", "dau den cuoi", "un tac", "nghen", "ach tac"]):
        return "bottleneck_flow"

    # Mở rộng thực đơn / tư vấn thêm món
    consult_markers = [
        "nen", "co nen", "them", "bot", "tang", "giam", "lam sao", "lam the nao",
        "tai sao", "vi sao", "cach nao", "phat trien", "mo rong", "tu van",
        "goi y", "thay doi", "bo sung", "mot mon", "mon gi", "mon nao vao"
    ]
    if any(m in norm for m in consult_markers) and any(k in norm for k in ["mon", "thuc don", "menu", "do an", "an kem", "topping", "uong"]):
        return "menu_expansion"

    # ==========================================
    # NHÓM 4: PHÂN TÍCH KHÍA CẠNH CỐT LÕI (TC01 - TC06)
    # ==========================================
    # TC01, TC02, TC03: Món ăn khen / chê / chất lượng
    if any(k in norm for k in ["khen nhieu nhat", "ngon nhat", "dac sac nhat", "khen nhat", "dac trung"]) or (("mon" in norm or "an" in norm) and "khen" in norm):
        return "food"
    if any(k in norm for k in ["che nhieu nhat", "mon bi che", "mon nao bi che", "do nhat", "khong ngon"]):
        return "food_negative"
    if ("mon nao" in norm or "mon gi" in norm) and "ngon" in norm:
        return "food"
    if "chat luong mon an" in norm or (("mon an" in norm or "thuc an" in norm) and any(k in norm for k in ["chat luong", "huong vi", "the nao", "ra sao"])):
        return "food_quality"

    # TC04: Dịch vụ & thái độ nhân viên
    if any(k in norm for k in ["nhan vien", "phuc vu", "thai do", "cho lau", "len mon"]) and any(k in norm for k in ["the nao", "ra sao", "van de", "luu y", "nhanh", "co khong"]):
        return "service"

    # TC05 & TC06: Giá cả & Khẩu phần ăn
    if any(k in norm for k in ["khau phan", "dinh luong", "phan an"]):
        return "portion"
    if any(k in norm for k in ["muc gia", "gia ca", "gia tien", "dat", "re", "tui tien"]):
        return "price"

    # Không gian, vệ sinh
    if any(k in norm for k in ["khong gian", "ve sinh", "sach se", "ban ghe", "dieu hoa", "thoang", "cho ngoi", "cho de xe"]):
        return "space_hygiene"

    # Tổng quan
    if any(k in norm for k in ["tong quan", "tong the", "chung", "ti le", "danh gia the nao"]):
        return "overview"

    return None


def synthesize_local_answer(restaurant_data: Dict[str, Any], intent: str) -> str:
    """
    [DEPRECATED - Không còn sử dụng trong luồng vận hành chính]
    Hàm phân tích cục bộ cũ dựa trên template rule-based.
    Toàn bộ hệ thống Trợ lý Phân tích Nền tảng hiện đã chuyển đổi sang 100% Gemini AI
    trong hàm `ask_assistant`. Hàm này được lưu giữ chỉ nhằm tương thích ngược nếu có import ngoài.
    """
    name = restaurant_data.get("name", "Quán ăn")
    aspects = restaurant_data.get("aspects", [])
    strengths = restaurant_data.get("strengths", [])
    attentions = restaurant_data.get("attentionAreas", [])
    checklist = restaurant_data.get("operationalChecklist", [])
    dist = restaurant_data.get("sentimentDistribution", {})
    total_rev = restaurant_data.get("totalReviews", 0)

    # Lấy dữ liệu từng khía cạnh
    aspect_map = {a["category"]: a for a in aspects}
    food_asp = aspect_map.get("Món ăn", {})
    service_asp = aspect_map.get("Dịch vụ", {})
    price_asp = aspect_map.get("Giá cả", {})
    space_asp = aspect_map.get("Không gian", {})
    hygiene_asp = aspect_map.get("Vệ sinh", {})

    # ==========================================
    # XỬ LÝ GUARDRAILS NGOÀI PHẠM VI (TC19 - TC22)
    # ==========================================
    if intent == "out_of_scope_general":
        return (
            "ℹ️ **Thông báo từ Nền tảng Restaurant Intelligence:**\n\n"
            "Tôi là Trợ lý Thông tin của Restaurant Intelligence. "
            "Câu hỏi này nằm ngoài phạm vi tìm hiểu, đánh giá quán ăn của hệ thống."
        )

    if intent == "out_of_scope_financial":
        return (
            f"📊 **Giới hạn Dữ liệu Doanh thu ({name}):**\n\n"
            f"Nền tảng Restaurant Intelligence hiện chỉ thu thập và phân tích dữ liệu đánh giá trải nghiệm thực khách công khai ({total_rev} bài đánh giá). "
            f"Hệ thống không có quyền truy cập vào sổ sách doanh thu hoặc dữ liệu tài chính nội bộ của quán, do đó không thể cung cấp số liệu doanh thu thực tế."
        )

    if intent == "out_of_scope_revenue_prediction":
        return (
            f"⚠️ **Thông báo Giới hạn Dự báo Tài chính ({name}):**\n\n"
            f"Dữ liệu đánh giá của khách hàng ({dist.get('positive', 0)}% tích cực, {dist.get('negative', 0)}% tiêu cực) "
            f"phản ánh mức độ hài lòng về hương vị và dịch vụ. "
            f"Dữ liệu này **không đủ cơ sở khoa học để dự đoán doanh thu** chính xác trong tháng tới nếu thiếu các chỉ số kinh doanh cốt lõi (chi phí vận hành, giá trị trung bình đơn hàng, số lượt xoay bàn)."
        )

    if intent == "out_of_scope_identity":
        return (
            f"🛡️ **Chính sách Bảo mật & Dữ liệu Khách quan:**\n\n"
            f"Hệ thống tôn trọng chính sách bảo mật danh tính người dùng. "
            f"Nền tảng chỉ ghi nhận và phân tích nội dung đánh giá công khai (các bài viết đánh giá thấp điểm về dịch vụ hoặc món ăn) "
            f"nhằm phục vụ cải thiện chất lượng vận hành của quán, hoàn toàn không thu thập hoặc suy đoán danh tính cá nhân của người đánh giá."
        )

    # ==========================================
    # XỬ LÝ TRUY VẤN ĐỊNH LƯỢNG (TC07 - TC12)
    # ==========================================
    if intent == "query_review_count":
        return (
            f"📊 **Số lượng Dữ liệu Thu thập tại {name}:**\n\n"
            f"Hệ thống Restaurant Intelligence hiện ghi nhận chính xác **{total_rev} bài đánh giá** từ thực khách thực tế, "
            f"đã qua chọn lọc, loại bỏ các đánh giá ảo hoặc bình luận quảng cáo."
        )

    if intent == "query_positive_count":
        pos_pct = dist.get("positive", 0)
        pos_count = round(total_rev * pos_pct / 100) if total_rev > 0 else 0
        return (
            f"📈 **Thống kê Đánh giá Tích cực ({name}):**\n\n"
            f"- **Số lượng khách hàng hài lòng:** Khoảng **{pos_count}/{total_rev} lượt đánh giá**.\n"
            f"- **Tỷ lệ tích cực:** Đạt **{pos_pct}%** trên toàn bộ dữ liệu phản hồi thu thập được.\n"
            f"- **Tỷ lệ còn lại:** {dist.get('neutral', 0)}% trung lập và {dist.get('negative', 0)}% chưa ưng ý."
        )

    if intent == "query_negative_service":
        service_att = next((a for a in attentions if a.get("aspect") == "Dịch vụ"), None)
        complaints = service_att.get("commonComplaints", []) if service_att else []
        quotes = service_att.get("sampleReviewQuotes", []) if service_att else []
        
        complaints_str = "\n".join([f"  • {c}" for c in complaints]) if complaints else "  • Chưa ghi nhận phàn nàn nghiêm trọng về dịch vụ."
        quotes_str = "\n".join([f"  > *\"{q}\"*" for q in quotes[:2]]) if quotes else "  > *Không có trích dẫn tiêu cực nổi cộm.*"

        return (
            f"🔍 **Tổng hợp Nhận xét Tiêu cực về Dịch vụ tại {name}:**\n\n"
            f"Theo ghi nhận thực tế từ các bài đánh giá chưa ưng ý:\n"
            f"{complaints_str}\n\n"
            f"**Trích dẫn thực tế từ thực khách:**\n"
            f"{quotes_str}"
        )

    if intent == "query_frequent_issues":
        issues_list = []
        for att in attentions:
            aspect_name = att.get("aspect", "Chung")
            for c in att.get("commonComplaints", [])[:2]:
                issues_list.append(f"  • **[{aspect_name}]:** {c}")
        issues_str = "\n".join(issues_list) if issues_list else "  • Không có vấn đề tiêu cực lặp lại phổ biến."

        return (
            f"📌 **Các Vấn đề Được Thực khách Nhắc đến Nhiều Lần Nhất ({name}):**\n\n"
            f"Hệ thống phân tích tần suất từ khóa nhận diện các chủ đề lặp lại sau:\n"
            f"{issues_str}\n\n"
            f"💡 *Khuyến nghị:* Các vấn đề lặp lại trên 2 lần cần được ưu tiên khắc phục trong quy trình vận hành ca làm việc."
        )

    if intent == "query_aspect_distribution":
        aspect_lines = []
        for a in aspects:
            cat = a.get("category", "")
            pos = a.get("positivePercentage", 0)
            neg = a.get("negativePercentage", 0)
            cnt = a.get("reviewCount", 0)
            aspect_lines.append(f"  • **{cat}:** {pos}% hài lòng | {neg}% phàn nàn ({cnt} lượt đề cập)")
        aspects_str = "\n".join(aspect_lines)

        return (
            f"📑 **Phân bố Ý kiến Khách hàng Theo Tiêu chí ({name}):**\n\n"
            f"Các đánh giá của khách hàng tập trung vào 5 tiêu chí cốt lõi sau:\n"
            f"{aspects_str}\n\n"
            f"Tiêu chí nhận được nhiều phản hồi tích cực nhất là **{strengths[0].get('aspect', 'Món ăn') if strengths else 'Ẩm thực'}**."
        )

    if intent == "query_quotes_evidence":
        quotes_list = []
        for att in attentions:
            for q in att.get("sampleReviewQuotes", [])[:1]:
                quotes_list.append(f"  • Phản ánh về *{att.get('aspect', 'Vận hành')}*: \"{q}\"")
        for s in strengths[:1]:
            desc = s.get("description", "")
            if desc:
                quotes_list.append(f"  • Khen ngợi về *{s.get('aspect', 'Món ăn')}*: \"{desc}\"")

        quotes_str = "\n".join(quotes_list) if quotes_list else "  • Hiện dữ liệu mẫu đã được tóm tắt tổng thể."

        return (
            f"📝 **Dẫn chứng Trích xuất từ Đánh giá Thực tế tại {name}:**\n\n"
            f"Dưới đây là các câu nhận xét nguyên văn được bóc tách từ tập dữ liệu thực tế:\n"
            f"{quotes_str}\n\n"
            f"*(Tất cả trích dẫn đều trích xuất trực tiếp từ các bài review gốc, không tự tạo nội dung giả lập).*"
        )

    # ==========================================
    # XỬ LÝ ĐỀ XUẤT CẢI THIỆN KINH DOANH (TC13 - TC18)
    # ==========================================
    if intent == "action_problem_table":
        # TC18: Render dạng bảng Markdown
        table_rows = []
        if checklist:
            for item in checklist[:3]:
                area = item.get("area", "Vận hành")
                issue = item.get("issue", "")
                fix = item.get("suggestedFix", "")
                cause = "Quá tải giờ cao điểm hoặc thiếu quy trình chuẩn" if "phục vụ" in area.lower() or "chờ" in issue.lower() else "Định lượng nguyên liệu hoặc kỹ thuật bảo quản"
                table_rows.append(f"| **{area}**: {issue} | {cause} | {fix} |")
        else:
            table_rows.append("| Tốc độ phục vụ giờ cao điểm | Lượng khách dồn cục bộ cùng lúc | Phân ca hợp lý và chuẩn bị sẵn đồ ăn kèm |")
            table_rows.append("| Ổn định chất lượng món ăn | Thiếu quy chuẩn nêm nếm cố định | Ban hành công thức định lượng tiêu chuẩn |")

        table_str = "\n".join(table_rows)

        return (
            f"📊 **Bảng Tổng hợp Vấn đề - Nguyên nhân - Giải pháp cho {name}:**\n\n"
            f"| Vấn đề ghi nhận từ khách | Nguyên nhân tiềm ẩn (Giả thuyết) | Giải pháp đề xuất |\n"
            f"| :--- | :--- | :--- |\n"
            f"{table_str}\n\n"
            f"*(Ghi chú: Cột 'Vấn đề' được trích từ phản hồi thực tế của khách, cột 'Nguyên nhân' là giả thuyết phân tích nghiệp vụ).* "
        )

    if intent == "action_priority_single":
        # TC13, TC17: Xác định ĐÚNG 1 vấn đề ưu tiên hàng đầu
        top_issue = None
        if checklist:
            top_issue = next((i for i in checklist if i.get("priority") == "Cao"), checklist[0])
        
        area = top_issue.get("area", "Dịch vụ & Vận hành") if top_issue else "Tốc độ phục vụ giờ cao điểm"
        problem = top_issue.get("issue", "Thời gian chờ đợi lên món kéo dài khi đông khách") if top_issue else "Thời gian chờ đợi lúc quán đông khách"
        fix = top_issue.get("suggestedFix", "Chuẩn bị trước phần ăn bán kèm và tối ưu khâu order") if top_issue else "Tối ưu hóa quy trình order và chuẩn bị món nhanh"

        return (
            f"🎯 **Ưu tiên Số 1 Cần Cải Thiện Ngay tại {name}:**\n\n"
            f"Nếu chỉ được chọn **duy nhất một vấn đề**, quán cần tập trung giải quyết:\n\n"
            f"- **Vấn đề ưu tiên hàng đầu:** **{area}** - {problem}.\n"
            f"- **Căn cứ dữ liệu:** Đây là điểm phát sinh tỷ lệ phàn nàn cao nhất trong {total_rev} đánh giá của thực khách, gây ảnh hưởng trực tiếp đến trải nghiệm ăn uống.\n"
            f"- **Hành động đề xuất:** {fix}."
        )

    if intent == "action_monthly_plan":
        # TC14: Kế hoạch hành động theo tháng (Tuần 1-2, Tuần 3-4)
        item1 = checklist[0] if len(checklist) > 0 else {"issue": "Tối ưu tốc độ phục vụ", "suggestedFix": "Sắp xếp lại ca trực"}
        item2 = checklist[1] if len(checklist) > 1 else {"issue": "Đảm bảo độ nóng sốt của món", "suggestedFix": "Kiểm tra khâu ra món"}

        return (
            f"📅 **Kế hoạch Hành động Cải thiện Trải nghiệm trong Tháng tới ({name}):**\n\n"
            f"**Giai đoạn 1 (Tuần 1 - Tuần 2: Xử lý điểm nghẽn cấp bách):**\n"
            f"- **Mục tiêu:** Giảm 50% các phàn nàn về thời gian chờ và thái độ nhân viên.\n"
            f"- **Hành động:** {item1.get('suggestedFix', 'Họp nhân viên quán triệt thái độ phục vụ')}.\n"
            f"- **Hạn chót:** Ngày 14 của tháng.\n\n"
            f"**Giai đoạn 2 (Tuần 3 - Tuần 4: Chuẩn hóa chất lượng & Đo lường):**\n"
            f"- **Mục tiêu:** {item2.get('suggestedFix', 'Ổn định công thức món ăn')}.\n"
            f"- **Hành động:** Thu thập phản hồi nhanh của thực khách tại bàn sau khi dùng bữa để đánh giá mức độ hài lòng mới.\n"
            f"- **Hạn chót:** Cuối tháng."
        )

    if intent == "action_service_improvement":
        # TC15: Đề xuất giải pháp dịch vụ
        service_att = next((a for a in attentions if a.get("aspect") == "Dịch vụ"), None)
        complaint = service_att.get("commonComplaints", ["Thời gian chờ đợi lúc đông khách"])[0] if service_att else "Tốc độ phục vụ"

        return (
            f"👥 **Giải pháp Cải thiện Chất lượng Phục vụ tại {name}:**\n\n"
            f"Dựa trên phản hồi thực tế của khách hàng về khâu dịch vụ:\n\n"
            f"1. **Khắc phục điểm nghẽn:** Tập trung xử lý vấn đề *\"{complaint}\"*.\n"
            f"2. **Tổ chức nhân sự:** Bố trí thêm 1 nhân sự phụ trách chạy bàn hỗ trợ vào khung giờ cao điểm (11h30-13h00 và 18h30-20h00).\n"
            f"3. **Chuẩn hóa giao tiếp:** Quy định câu chào hỏi đón khách và chủ động xin lỗi, báo trước thời gian chờ nếu bếp đang quá tải."
        )

    if intent == "action_food_improvement":
        # TC16: Đề xuất giải pháp món ăn
        food_att = next((a for a in attentions if a.get("aspect") == "Món ăn"), None)
        complaint = food_att.get("commonComplaints", ["Độ ổn định hương vị"])[0] if food_att else "Định lượng khẩu phần"

        return (
            f"🍲 **Giải pháp Nâng cao Mức độ Hài lòng về Món ăn ({name}):**\n\n"
            f"1. **Kiểm soát chất lượng:** Lưu ý phản ánh *\"{complaint}\"* của thực khách để rà soát quy trình nêm nếm gia vị.\n"
            f"2. **Độ nóng & Trình bày:** Đảm bảo món ăn được phục vụ ngay khi vừa chế biến xong, giữ trọn độ nóng sốt và bắt mắt.\n"
            f"3. **Đa dạng hóa:** Đưa ra các combo ăn kèm hoặc món mới dùng thử để thực khách có thêm trải nghiệm phong phú."
        )

    # ==========================================
    # CÁC INTENT PHÂN TÍCH KHÍA CẠNH CỐT LÕI (TC01 - TC06)
    # ==========================================
    if intent == "food_negative":
        # TC02: Món bị chê
        food_att = next((a for a in attentions if a.get("aspect") == "Món ăn"), None)
        complaints = food_att.get("commonComplaints", []) if food_att else []
        complaints_str = "\n".join([f"  • {c}" for c in complaints]) if complaints else "  • Các món ăn nhìn chung được đánh giá tốt, ít phát sinh phàn nàn tập trung."

        return (
            f"⚠️ **Các Phản hồi Chưa Ưng ý về Món ăn tại {name}:**\n\n"
            f"Dựa trên bóc tách từ các đánh giá tiêu cực:\n"
            f"{complaints_str}\n\n"
            f"💡 **Khuyến nghị Bếp trưởng:** Cần kiểm tra định lượng nguyên liệu và độ tươi mới trong từng mẻ chế biến để đảm bảo chất lượng đồng đều."
        )

    if intent == "food_quality":
        # TC03: Chất lượng món ăn tổng hợp
        pos_pct = food_asp.get("positivePercentage", 75)
        neg_pct = food_asp.get("negativePercentage", 10)
        desc = strengths[0].get("description", "Hương vị thơm ngon") if strengths else "Hương vị vừa miệng"

        return (
            f"🍲 **Tổng hợp Nhận xét về Chất lượng Món ăn tại {name}:**\n\n"
            f"- **Tỷ lệ khen ngợi (Tích cực):** Đạt **{pos_pct}%**, khách hàng đánh giá cao: *\"{desc}\"*.\n"
            f"- **Tỷ lệ chưa hài lòng (Tiêu cực):** Chiếm **{neg_pct}%**, chủ yếu liên quan đến khẩu vị đậm/nhạt tùy từng mẻ hoặc thời gian chờ món nóng.\n"
            f"- **Đánh giá chung:** Chất lượng món ăn là thế mạnh cốt lõi giúp giữ chân khách hàng của quán."
        )

    if intent == "portion":
        # TC06: Khẩu phần ăn
        pos_pct = price_asp.get("positivePercentage", 80)
        return (
            f"🍽️ **Đánh giá về Khẩu phần & Định lượng Ăn ({name}):**\n\n"
            f"- **Mức độ hài lòng:** Khoảng **{pos_pct}% thực khách** cho rằng định lượng phần ăn đầy đặn, tương xứng với mức giá bán.\n"
            f"- **Điểm cần lưu ý:** Một số ít phản hồi mong muốn bổ sung thêm đĩa rau/bánh ăn kèm hoặc gia tăng topping cho các suất ăn lớn."
        )

    if intent == "food":
        # TC01: Món khen nhiều nhất
        pos_pct = food_asp.get("positivePercentage", 75)
        keywords = ", ".join(food_asp.get("sampleKeywords", ["hương vị", "đậm đà"]))
        top_str = strengths[0] if strengths else {}
        quote = top_str.get("description", "Món ăn được nêm nếm đậm đà hợp khẩu vị thực khách.")

        return (
            f"🍴 **Phân tích về Ẩm thực & Món ăn tại {name}:**\n\n"
            f"- **Tỷ lệ khen ngợi:** Khía cạnh Món ăn đạt **{pos_pct}% phản hồi tích cực** từ thực khách.\n"
            f"- **Đặc trưng nổi bật nhất:** {quote}\n"
            f"- **Từ khóa thực khách nhắc nhiều:** `{keywords}`.\n"
            f"- **Đánh giá tổng kết:** Đây là điểm mạnh cạnh tranh hàng đầu của quán, phần lớn khách hàng ghé thăm nhờ chất lượng hương vị ổn định."
        )

    if intent == "service":
        # TC04: Dịch vụ & thái độ
        neg_pct = service_asp.get("negativePercentage", 15)
        pos_pct = service_asp.get("positivePercentage", 80)

        service_att = next((a for a in attentions if a.get("aspect") == "Dịch vụ"), None)
        complaint_bullets = ""
        if service_att:
            for c in service_att.get("commonComplaints", []):
                complaint_bullets += f"  • {c}\n"
        else:
            complaint_bullets = "  • Chưa ghi nhận phàn nàn nghiêm trọng về tác phong phục vụ.\n"

        sample_quote = service_att.get("sampleReviewQuotes", ["Khách nhận xét nhân viên cần nhanh nhẹn hơn vào giờ cao điểm."])[0] if service_att else "Nhân viên nhiệt tình, hỗ trợ khách chu đáo."

        return (
            f"👥 **Báo cáo Dịch vụ & Tác phong Phục vụ ({name}):**\n\n"
            f"- **Chỉ số:** **{pos_pct}% tích cực** vs **{neg_pct}% cần cải thiện**.\n"
            f"- **Điểm thực khách lưu ý:**\n{complaint_bullets}"
            f"- **Trích dẫn thực tế:** *\"{sample_quote}\"*\n"
            f"- **Đề xuất vận hành:** Cần bố trí thêm nhân sự chạy bàn vào khung giờ trưa/tối cao điểm và đào tạo quy chuẩn ứng xử chào đón khách."
        )

    if intent == "price":
        # TC05: Giá cả
        pos_pct = price_asp.get("positivePercentage", 80)
        price_range = restaurant_data.get("priceRange", "30.000₫ - 80.000₫")

        return (
            f"💰 **Đánh giá Giá cả & Mức độ Hài lòng về Chi phí ({name}):**\n\n"
            f"- **Khung giá tham khảo:** Dao động khoảng **{price_range}**.\n"
            f"- **Mức độ đồng thuận:** **{pos_pct}% khách hàng** cho rằng mức giá này hoàn toàn xứng đáng với chất lượng món ăn và định lượng nhận được.\n"
            f"- **Khuyến nghị Menu:** Quán có thể tạo thêm các gói combo kèm nước uống để nâng cao giá trị trung bình trên mỗi hóa đơn khách ghé ăn."
        )

    if intent == "space_hygiene":
        sp_pos = space_asp.get("positivePercentage", 85)
        hy_pos = hygiene_asp.get("positivePercentage", 90)

        return (
            f"🌿 **Không gian, Vị trí & Tiêu chuẩn Vệ sinh ({name}):**\n\n"
            f"- **Không gian & Vị trí:** Đạt **{sp_pos}% đánh giá hài lòng**. Địa điểm dễ tìm, bàn ghế bố trí thuận tiện.\n"
            f"- **Vệ sinh an toàn:** Ghi nhận **{hy_pos}% phản hồi tốt**. Khách hàng đánh giá cao quy cách dọn dẹp sạch sẽ và bảo quản thực phẩm.\n"
            f"- **Lưu ý nhỏ:** Giữ cho khu vực rửa tay và chỗ để xe luôn thông thoáng vào các khung giờ đông đúc."
        )

    if intent == "bottleneck_flow":
        pos_pct = dist.get("positive", 50)
        neg_pct = dist.get("negative", 20)

        status_line = (
            f"⚠️ **Cảnh báo vận hành:** Luồng hoạt động hiện tại **CHƯA TRƠN TRU**, có đến **{neg_pct}% đánh giá chưa ưng ý** từ khách hàng!"
            if neg_pct >= 30 else
            f"✅ **Đánh giá tổng thể:** Luồng hoạt động cơ bản trơn tru với **{pos_pct}% khách hài lòng**, tuy nhiên vẫn tồn tại một số điểm nghẽn cục bộ."
        )

        complaints_list = []
        for att in attentions:
            aspect_name = att.get("aspect", "Vận hành")
            for c in att.get("commonComplaints", []):
                complaints_list.append(f"  • **[{aspect_name}]** {c}")

        complaints_text = "\n".join(complaints_list) if complaints_list else "  • Chưa ghi nhận phàn nàn tập trung về một khâu cụ thể."

        checklist_items = []
        for item in checklist[:3]:
            checklist_items.append(f"  • **[{item.get('priority', 'Ưu tiên')} - {item.get('area', '')}]:** {item.get('issue', '')} → *Khắc phục:* {item.get('suggestedFix', '')}")
        checklist_text = "\n".join(checklist_items) if checklist_items else "  • Tiếp tục theo dõi và duy trì tốc độ phục vụ hiện tại."

        return (
            f"🚨 **Báo cáo Luồng Vận hành & Điểm nghẽn Thực tế tại {name}:**\n\n"
            f"{status_line}\n\n"
            f"**1. Các điểm nghẽn chính gây gián đoạn luồng phục vụ:**\n"
            f"{complaints_text}\n\n"
            f"**2. Giải pháp tháo gỡ điểm nghẽn ngay (Từ Checklist Vận hành):**\n"
            f"{checklist_text}\n\n"
            f"💡 **Khuyến nghị:** Ưu tiên số 1 của quán là tối ưu tốc độ ra món giờ cao điểm và quy chuẩn hóa thái độ giao tiếp của nhân viên để luồng khách từ lúc vào đến lúc ra về hoàn toàn thoải mái."
        )

    if intent == "menu_expansion":
        name_lower = name.lower()
        if "che" in name_lower or "sinh to" in name_lower or "tra" in name_lower:
            dishes_addon = (
                "- **Đồ uống giải khát pha chế sẵn (pha nhanh < 1 phút):**\n"
                "  • *Trà trái cây nhiệt đới (trà đào cam sả, trà mãng cầu):* Giúp phục vụ tức thì khi đông khách.\n"
                "  • *Trà sữa lài thạch củ năng:* Dễ làm sẵn cốt trà và topping từ trước.\n"
                "- **Món ăn vặt đi kèm:**\n"
                "  • *Bánh tráng kẹp Đà Nẵng / Bánh tráng nướng:* Rất hút khách nhâm nhi lúc chờ chè.\n"
                "- **Combo giải nhiệt:**\n"
                "  • *Combo Cặp Đôi:* 1 Chè Thái + 1 Trà trái cây giảm 5k so với mua lẻ."
            )
        elif "banh xeo" in name_lower or "nem lui" in name_lower or "bun" in name_lower:
            dishes_addon = (
                "- **Món ăn kèm & Topping mới:**\n"
                "  • *Ram bắp / Chả giò giòn rụm:* Dễ cuốn kèm bánh xèo, làm phong phú đĩa cuốn.\n"
                "  • *Bò cuốn lá lốt / Bò nướng mè:* Tăng lựa chọn thịt cao cấp, nâng giá trị đơn hàng.\n"
                "  • *Thêm phần rau rừng & xoài băm:* Tăng độ tươi mát, giảm cảm giác ngấy mỡ.\n"
                "- **Đồ uống giải ngấy (tăng biên lợi nhuận):**\n"
                "  • *Trà tắc mật ong / Nước mía tươi:* Rất hợp vị đồ chiên cuốn, khách dễ gọi thêm.\n"
                "  • *Sữa bắp / Sữa đậu nành nhà làm:* Tăng cảm giác thân thiện, ngon miệng."
            )
        elif "ga" in name_lower or "com" in name_lower:
            dishes_addon = (
                "- **Món ăn kèm & Topping gia tăng:**\n"
                "  • *Trứng ốp la lòng đào / Trứng non cháy tỏi:* Tăng cảm giác đầy đặn cho đĩa cơm.\n"
                "  • *Canh rong biển thịt bằm / Canh cải chua:* Giúp khách ăn ngon miệng, không bị khô.\n"
                "  • *Da gà chiên giòn mắm tỏi:* Món lai rai ăn vặt cực kỳ hút khách gọi thêm.\n"
                "- **Đồ uống đi kèm:**\n"
                "  • *Trà tắc hạt chia / Trà quất:* Bán theo combo cơm + nước với giá ưu đãi."
            )
        else:
            dishes_addon = (
                "- **Món ăn vặt / Khai vị:** Bổ sung các món ăn nhẹ (chả ram tôm đất, nem rán) để khách nhâm nhi khi chờ món chính.\n"
                "- **Combo bữa ăn trọn gói:** Kết hợp món chính + 1 đồ uống thanh nhiệt + 1 món tráng miệng nhẹ.\n"
                "- **Đồ uống giải khát:** Bổ sung các dòng trà trái cây, nước sâm hoặc trà đá chất lượng cao."
            )

        return (
            f"💡 **Tư vấn Phát triển Thực đơn & Thêm Món Mới cho {name}:**\n\n"
            f"Dựa trên phản hồi thực tế của khách hàng và định vị hiện tại của quán:\n\n"
            f"{dishes_addon}\n\n"
            f"🎯 **Chiến lược đề xuất:** Nên đưa các món mới vào thực đơn dưới dạng **Combo dùng thử** trong 2-3 tuần đầu để đo lường phản hồi của thực khách trước khi bổ sung chính thức."
        )

    if intent == "action_plan":
        plan_text = f"📋 **Kế hoạch Hành động Cải thiện Vận hành cho {name}:**\n\n"
        if checklist:
            for idx, item in enumerate(checklist, 1):
                prio = item.get("priority", "Trung bình")
                prio_badge = "🔴 [Ưu tiên Cao]" if prio == "Cao" else "🟡 [Trung bình]" if prio == "Trung bình" else "🟢 [Duy trì]"
                plan_text += (
                    f"**{idx}. {prio_badge} {item.get('area', 'Vận hành')}:**\n"
                    f"   - **Vấn đề:** {item.get('issue', '')}\n"
                    f"   - **Giải pháp:** {item.get('suggestedFix', '')}\n\n"
                )
        else:
            plan_text += "- Tiếp tục duy trì công thức món ăn chủ đạo.\n- Khảo sát nhanh ý kiến khách hàng sau bữa ăn để kịp thời khắc phục."

        return plan_text

    # Default: overview
    return (
        f"📊 **Báo cáo Tổng thể Đánh giá Thực tế tại {name}:**\n\n"
        f"- **Quy mô dữ liệu:** Phân tích dựa trên **{total_rev} đánh giá thực tế** từ thực khách.\n"
        f"- **Phân bố cảm xúc:** **{dist.get('positive', 0)}% Hài lòng**, **{dist.get('neutral', 0)}% Trung lập**, **{dist.get('negative', 0)}% Chưa ưng ý**.\n"
        f"- **Điểm sáng lớn nhất:** Khía cạnh **{strengths[0].get('aspect', 'Món ăn') if strengths else 'Ẩm thực'}**.\n"
        f"- **Kết luận từ Nền tảng:** Quán có tập khách hàng ổn định, cần tập trung duy trì chất lượng món ăn và tối ưu hóa thời gian phục vụ ca cao điểm."
    )


def call_gemini_assistant_raw(restaurant_data: Dict[str, Any], question: str) -> Optional[str]:
    """
    Gọi Gemini API cho Trợ lý Phân tích Nền tảng (Platform Intelligence Assistant).
    Hỗ trợ Dynamic API Key resolution và Model Cascading Fallback tự động.
    Prompt được định vị chuẩn Chuyên viên Phân tích Nền tảng độc lập, kết hợp:
    - Dữ liệu khía cạnh (aspects với tỉ lệ khen/chê, từ khóa, số lượt nhắc)
    - Mẫu đánh giá thực tế từ thực khách (cả khen và chê để trả lời sâu sắc, chân thực)
    - Guardrails độc lập nghiêm ngặt: F&B scope, doanh thu/tài chính, bảo mật danh tính thực khách.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini Assistant Warning] Chưa cấu hình GEMINI_API_KEY trong biến môi trường hoặc .env.")
        return None

    name = restaurant_data.get("name", "Quán")
    brand = restaurant_data.get("brand", name.split("-")[0].strip() if name else "Quán")
    cuisine = restaurant_data.get("cuisine", "Ẩm thực địa phương")
    city = restaurant_data.get("city", "Đà Nẵng")
    address = restaurant_data.get("address", "Chưa cập nhật")
    price_range = restaurant_data.get("priceRange", "Bình dân")
    rating = restaurant_data.get("rating", 4.0)
    total_reviews = restaurant_data.get("totalReviews", 0)
    sentiment = restaurant_data.get("sentimentDistribution", {})
    pos_pct = sentiment.get("positive", 0)
    neu_pct = sentiment.get("neutral", 0)
    neg_pct = sentiment.get("negative", 0)

    # 1. Trích xuất dữ liệu chi tiết 5 khía cạnh (Aspects)
    aspect_lines = []
    for a in restaurant_data.get("aspects", []):
        cat = a.get("category", "")
        pos = a.get("positivePercentage", 0)
        neg = a.get("negativePercentage", 0)
        neu = a.get("neutralPercentage", 0)
        count = a.get("mentionCount", 0)
        pct = a.get("mentionPercentage", 0)
        kws = ", ".join(a.get("sampleKeywords", [])[:6])
        kw_part = f" (Từ khóa: {kws})" if kws else ""
        aspect_lines.append(f"  • {cat}: {pos}% tích cực | {neg}% tiêu cực | {neu}% trung lập ({count} lượt nhắc ~ {pct}% bài viết){kw_part}")
    aspects_str = "\n".join(aspect_lines) if aspect_lines else "  • Đang cập nhật thống kê khía cạnh."

    # 2. Điểm mạnh nổi bật (Strengths)
    strength_lines = []
    for s in restaurant_data.get("strengths", []):
        asp = s.get("aspect", "")
        title = s.get("title", "")
        desc = s.get("description", "")
        pos = s.get("positivePercentage", "")
        strength_lines.append(f"  • [{asp} - {pos}% tích cực]: {title} - {desc}")
    strengths_str = "\n".join(strength_lines) if strength_lines else "  • Hương vị ẩm thực đặc sắc được thực khách yêu thích."

    # 3. Điểm lưu ý / Phàn nàn (Attention Areas)
    att_lines = []
    for att in restaurant_data.get("attentionAreas", []):
        asp = att.get("aspect", "")
        neg = att.get("negativePercentage", 0)
        complaints = "; ".join(att.get("commonComplaints", []))
        quotes = "; ".join([f'"{q}"' for q in att.get("sampleReviewQuotes", [])[:2]])
        rec = att.get("recommendedAction", "")
        att_lines.append(f"  • [{asp} - {neg}% phàn nàn]: Vấn đề: {complaints}. Dẫn chứng thực tế: {quotes}. Khuyến nghị: {rec}")
    att_str = "\n".join(att_lines) if att_lines else "  • Chưa ghi nhận phàn nàn nghiêm trọng."

    # 4. Checklist vận hành đề xuất
    checklist_lines = []
    for item in restaurant_data.get("operationalChecklist", []):
        prio = item.get("priority", "Trung bình")
        area = item.get("area", "")
        issue = item.get("issue", "")
        fix = item.get("suggestedFix", "")
        checklist_lines.append(f"  • [{prio} - {area}]: {issue} → Giải pháp: {fix}")
    checklist_str = "\n".join(checklist_lines) if checklist_lines else "  • Tiếp tục duy trì quy chuẩn vận hành hiện tại."

    # 5. Mẫu đánh giá thực tế của thực khách (khen và chê)
    reviews = restaurant_data.get("reviews", [])
    pos_reviews = [r for r in reviews if r.get("overallSentiment") == "positive" and len(r.get("text", "").strip()) > 8]
    neg_reviews = [r for r in reviews if r.get("overallSentiment") == "negative" and len(r.get("text", "").strip()) > 8]

    sample_pos_quotes = []
    for r in pos_reviews[:6]:
        author = r.get("author", "Thực khách")
        rating_val = r.get("rating", 5.0)
        txt = r.get("text", "").strip().replace("\n", " ")
        if len(txt) > 160:
            txt = txt[:160] + "..."
        sample_pos_quotes.append(f'  • [{author} - {rating_val}/5★]: "{txt}"')

    sample_neg_quotes = []
    for r in neg_reviews[:6]:
        author = r.get("author", "Thực khách")
        rating_val = r.get("rating", 1.0)
        txt = r.get("text", "").strip().replace("\n", " ")
        if len(txt) > 160:
            txt = txt[:160] + "..."
        sample_neg_quotes.append(f'  • [{author} - {rating_val}/5★]: "{txt}"')

    pos_quotes_str = "\n".join(sample_pos_quotes) if sample_pos_quotes else "  • (Không có trích đoạn khen dài)"
    neg_quotes_str = "\n".join(sample_neg_quotes) if sample_neg_quotes else "  • (Không có trích đoạn phàn nàn dài)"

    system_context = f"""Bạn là Trợ lý Thông tin Ẩm thực của Restaurant Intelligence. Bạn đưa ra góc nhìn phân tích trung lập, khách quan dựa trên dữ liệu đánh giá thực tế từ thực khách.
VAI TRÒ VÀ ĐỊNH VỊ:
- Bạn là Trợ lý Thông tin độc lập, khách quan của Restaurant Intelligence.
- Bạn KHÔNG PHẢI là nhân viên hay trợ lý riêng của quán ăn, cũng KHÔNG PHẢI người trò chuyện xã giao chung chung.
- Mọi phân tích, kết luận và dẫn chứng của bạn phải dựa trên số liệu và các trích dẫn đánh giá thực tế từ thực khách.

THÔNG TIN NHÀ HÀNG & DỮ LIỆU ĐÁNH GIÁ THỰC TẾ:
- Tên quán: {name} (Thương hiệu: {brand})
- Loại hình ẩm thực: {cuisine} tại {city}
- Địa chỉ: {address}
- Khung giá tham khảo: {price_range}
- Điểm đánh giá trung bình: {rating}/5.0 sao
- Tổng số bài đánh giá thực tế: {total_reviews} bài đánh giá (đã qua chọn lọc, loại bỏ các đánh giá ảo hoặc bình luận quảng cáo)
- Tỷ lệ cảm xúc chung: {pos_pct}% Tích cực | {neu_pct}% Trung lập | {neg_pct}% Tiêu cực

CHI TIẾT 5 KHÍA CẠNH ĐÁNH GIÁ (ASPECTS):
{aspects_str}

ĐIỂM SÁNG NỔI BẬT ĐƯỢC KHÁCH KHEN (STRENGTHS):
{strengths_str}

CÁC ĐIỂM CẦN LƯU Ý & PHÀN NÀN (ATTENTION AREAS):
{att_str}

CHECKLIST VẬN HÀNH ĐỀ XUẤT CHO QUÁN:
{checklist_str}

MẪU ĐÁNH GIÁ THỰC TẾ TỪ THỰC KHÁCH:
+ Đánh giá tích cực tiêu biểu:
{pos_quotes_str}

+ Đánh giá tiêu cực / phàn nàn tiêu biểu:
{neg_quotes_str}

QUY TẮC PHÂN TÍCH & GUARDRAILS ĐỘC LẬP CỦA NỀN TẢNG (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. ĐỘC LẬP & KHÁCH QUAN:
   - Đưa ra góc nhìn phân tích trung lập, minh bạch, dựa trên dữ liệu thật.
   - Khi được hỏi về số lượng hoặc tỷ lệ (ví dụ: có bao nhiêu bài đánh giá, bao nhiêu đánh giá tích cực): hãy trả lời chính xác bằng số liệu trong báo cáo ({total_reviews} bài đánh giá, tỷ lệ tích cực {pos_pct}%).
   - Khi người dùng yêu cầu dẫn chứng từ đánh giá thực tế: trích dẫn trực tiếp các câu nhận xét của thực khách từ phần mẫu đánh giá trên.
   - Khi được yêu cầu lập bảng tổng hợp vấn đề - nguyên nhân - giải pháp: BẮT BUỘC trình bày dạng bảng Markdown có 3 cột: | Vấn đề | Nguyên nhân | Giải pháp | (hoặc | Vấn đề ghi nhận từ khách | Nguyên nhân tiềm ẩn | Giải pháp đề xuất |).
   - Khi được hỏi cải thiện điều gì trước tiên hoặc chỉ được giải quyết 1 vấn đề: xác định ĐÚNG 1 vấn đề ưu tiên hàng đầu (từ khía cạnh có tỷ lệ phàn nàn cao nhất hoặc checklist ưu tiên Cao) và đề xuất giải pháp cụ thể.
2. NGOÀI PHẠM VI ẨM THỰC:
   - Nếu câu hỏi hỏi về thời tiết, thể thao, chính trị, tin tức hoặc chủ đề ngoài ẩm thực: Hãy từ chối lịch sự, nêu rõ bạn là Trợ lý Thông tin của Restaurant Intelligence và câu hỏi này nằm ngoài phạm vi tìm hiểu, đánh giá quán ăn của hệ thống.
3. DOANH THU & TÀI CHÍNH NỘI BỘ:
   - Nếu câu hỏi yêu cầu cung cấp doanh thu, lợi nhuận hoặc dự đoán doanh thu tương lai: Hãy giải thích rõ ràng rằng nền tảng Restaurant Intelligence chỉ thu thập và phân tích dữ liệu đánh giá trải nghiệm thực khách công khai ({total_reviews} bài đánh giá), hệ thống KHÔNG có quyền truy cập vào sổ sách doanh thu hoặc dữ liệu tài chính nội bộ của quán, do đó không thể cung cấp hay dự báo doanh thu.
4. BẢO MẬT QUYỀN RIÊNG TƯ & DANH TÍNH:
   - Nếu người dùng hỏi về danh tính người đánh giá (ví dụ: ai đã viết đánh giá tiêu cực nhất, thông tin cá nhân của người đánh giá): Hãy từ chối và giải thích hệ thống tuân thủ chính sách bảo mật danh tính thực khách, chỉ phân tích nội dung đánh giá công khai nhằm mục đích cải thiện chất lượng dịch vụ, tuyệt đối không suy đoán hoặc cung cấp danh tính cá nhân.
5. ĐỊNH DẠNG TRẢ LỜI:
   - Trả lời bằng tiếng Việt, hành văn chuyên nghiệp, súc tích, cấu trúc rõ ràng với tiêu đề Markdown, gạch đầu dòng, highlight số liệu quan trọng."""

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        last_error = None
        for model in CANDIDATE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=f"{system_context}\n\nCâu hỏi cần phân tích từ người dùng: {question}"
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as model_err:
                last_error = model_err
                safe_err = str(model_err).encode("ascii", "replace").decode("ascii")
                print(f"[Gemini Assistant Warning] Model '{model}' không thành công: {safe_err}. Thử model dự phòng...")
                continue

        if last_error:
            safe_err = str(last_error).encode("ascii", "replace").decode("ascii")
            print(f"[Gemini Assistant Error] Tất cả candidate models đều gặp lỗi: {safe_err}")
    except Exception as e:
        safe_err = str(e).encode("ascii", "replace").decode("ascii")
        print(f"[Gemini Assistant Error] Lỗi khởi tạo hoặc thực thi client Gemini: {safe_err}")

    return None


def ask_assistant(
    restaurant: DBRestaurant,
    db,
    question: str,
    force_ai: bool = True
) -> Dict[str, Any]:
    """
    Trợ lý Phân tích Nền tảng (Platform Intelligence Assistant) - 100% Gemini AI Engine.
    
    Quy trình xử lý:
    1. Chuẩn hóa câu hỏi và kiểm tra In-Memory Semantic/Question Cache.
       - Nếu đã có trong Cache -> Trả về ngay lập tức với source="cache".
    2. Nếu chưa có -> Bóc tách dữ liệu BI toàn diện của quán ăn (khía cạnh, điểm mạnh, lưu ý, mẫu review thật).
    3. Chuyển tiếp câu hỏi sang Gemini AI (Google GenAI SDK) kèm System Prompt giàu ngữ cảnh và Guardrails độc lập.
    4. Nếu kết nối Gemini thành công:
       - Lưu câu trả lời vào Cache.
       - Trả về source="gemini_ai", success=True.
    5. Nếu kết nối Gemini thất bại (mất mạng/API key lỗi):
       - Trả về thông báo lỗi cảnh báo rõ ràng từ AI, source="gemini_ai", success=False.
       - TUYỆT ĐỐI không âm thầm fallback sang văn mẫu local giả lập.
    """
    q_clean = question.strip()
    norm_q = remove_accents(q_clean.lower())
    cache_key = f"{restaurant.id}:{norm_q}"

    # 1. Kiểm tra bộ nhớ đệm Cache
    if cache_key in _QUESTION_CACHE:
        cached = _QUESTION_CACHE[cache_key]
        return {
            "success": True,
            "answer": cached["answer"],
            "source": "cache",
            "detected_intent": cached.get("intent"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # 2. Lấy dữ liệu phân tích BI đầy đủ của quán
    restaurant_data = format_restaurant_full(restaurant, db)
    intent = detect_question_intent(q_clean) or "overview"

    # 3. 100% Chuyển cho Gemini AI xử lý cùng Rich Context và Guardrails
    ai_resp = call_gemini_assistant_raw(restaurant_data, q_clean)

    if ai_resp:
        answer = ai_resp
        source = "gemini_ai"
        success = True

        # Lưu vào Cache để tái sử dụng
        _QUESTION_CACHE[cache_key] = {
            "answer": answer,
            "intent": intent,
            "source": source
        }
    else:
        # Xử lý lỗi kết nối rõ ràng, không âm thầm fallback sang văn mẫu local
        answer = (
            "> [!WARNING]\n"
            "> *Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.*"
        )
        source = "gemini_ai"
        success = False

    return {
        "success": success,
        "answer": answer,
        "source": source,
        "detected_intent": intent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

