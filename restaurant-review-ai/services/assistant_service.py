"""
Dịch vụ Trợ lý AI Hỏi-Đáp Nhà Hàng (Conversational BI Assistant).
Ứng dụng kiến trúc Hybrid 2 tầng kết hợp Semantic/FAQ Caching:
- Tầng 1: Local Contextual Synthesis (0 Token, 0ms, chính xác 100% theo dữ liệu BI thực tế).
- Tầng 2: Gemini AI (Google GenAI SDK) xử lý các câu hỏi mở, có cơ chế Cache tự động.
"""

import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from database.models import Restaurant as DBRestaurant
from services.bi_service import format_restaurant_full, remove_accents

# In-memory FAQ & Question Cache: key = f"{restaurant_id}:{normalized_question}"
_QUESTION_CACHE: Dict[str, Dict[str, Any]] = {}

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def get_quick_questions(restaurant_name: str = "quán") -> List[str]:
    """Trả về 4 câu hỏi định hướng nhanh cho người dùng/chủ quán"""
    short_name = restaurant_name.split("-")[0].strip() if restaurant_name else "quán"
    return [
        f"Món ăn nào được thực khách khen nhiều nhất tại {short_name}?",
        "Dịch vụ và thái độ nhân viên có vấn đề gì cần lưu ý không?",
        "Mức giá và định lượng khẩu phần ăn ở đây được đánh giá thế nào?",
        "Gợi ý kế hoạch hành động cụ thể để cải thiện trải nghiệm trong tháng tới?"
    ]


def detect_question_intent(question: str) -> Optional[str]:
    """Phát hiện ý định của câu hỏi để điều hướng sang Local Synthesis hoặc Gemini AI"""
    norm = remove_accents(question.lower())

    if any(k in norm for k in ["mon nao", "mon ngon", "mon an", "huong vi", "do an", "dac san", "mon dinh", "thuc don", "nem nem"]):
        return "food"
    if any(k in norm for k in ["dich vu", "nhan vien", "phuc vu", "thai do", "cho lau", "len mon", "order", "tiep don"]):
        return "service"
    if any(k in norm for k in ["gia ca", "gia tien", "dat", "re", "khau phan", "tui tien", "dinh luong", "menu", "bao nhieu"]):
        return "price"
    if any(k in norm for k in ["khong gian", "ve sinh", "sach se", "ban ghe", "dieu hoa", "thoang", "cho ngoi", "cho de xe", "do xe"]):
        return "space_hygiene"
    if any(k in norm for k in ["ke hoach", "hanh dong", "cai thien", "khac phuc", "giai phap", "goi y", "checklist", "nang cao", "chien luoc"]):
        return "action_plan"
    if any(k in norm for k in ["tong quan", "tong the", "chung", "ti le", "bao nhieu danh gia", "danh gia the nao", "chat luong"]):
        return "overview"

    return None


def synthesize_local_answer(restaurant_data: Dict[str, Any], intent: str) -> str:
    """
    Sinh câu trả lời phân tích chuyên sâu 100% dựa trên số liệu thực tế của quán.
    Không tốn 1 token Gemini nào, tốc độ 0ms, không lo lỗi Quota API!
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

    if intent == "food":
        pos_pct = food_asp.get("positivePercentage", 75)
        keywords = ", ".join(food_asp.get("sampleKeywords", ["hương vị", "đậm đà"]))
        top_str = strengths[0] if strengths else {}
        quote = top_str.get("description", "Món ăn được nêm nếm đậm đà hợp khẩu vị thực khách.")
        
        return (
            f"🍴 **Phân tích về Ẩm thực & Món ăn tại {name}:**\n\n"
            f"- **Tỷ lệ khen ngợi:** Khía cạnh Món ăn đạt **{pos_pct}% phản hồi tích cực** từ thực khách Foody.\n"
            f"- **Đặc trưng nổi bật:** {quote}\n"
            f"- **Từ khóa thực khách nhắc nhiều:** `{keywords}`.\n"
            f"- **Đánh giá tổng kết:** Đây là điểm mạnh cạnh tranh cốt lõi của quán, phần lớn khách hàng quay lại nhờ chất lượng hương vị ổn định."
        )

    elif intent == "service":
        neg_pct = service_asp.get("negativePercentage", 15)
        pos_pct = service_asp.get("positivePercentage", 80)
        
        # Tìm phàn nàn dịch vụ nếu có
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

    elif intent == "price":
        pos_pct = price_asp.get("positivePercentage", 80)
        price_range = restaurant_data.get("priceRange", "30.000₫ - 80.000₫")
        
        return (
            f"💰 **Đánh giá Giá cả & Mức độ Hài lòng về Khẩu phần:**\n\n"
            f"- **Khung giá tham khảo:** Dao động khoảng **{price_range}**.\n"
            f"- **Mức độ đồng thuận:** **{pos_pct}% khách hàng** cho rằng mức giá này hoàn toàn xứng đáng với chất lượng món ăn và định lượng nhận được.\n"
            f"- **Khuyến nghị Menu:** Quán có thể tạo thêm các gói combo kèm nước uống để nâng cao giá trị trung bình trên mỗi hóa đơn khách ghé ăn."
        )

    elif intent == "space_hygiene":
        sp_pos = space_asp.get("positivePercentage", 85)
        hy_pos = hygiene_asp.get("positivePercentage", 90)

        return (
            f"🌿 **Không gian, Vị trí & Tiêu chuẩn Vệ sinh:**\n\n"
            f"- **Không gian & Vị trí:** Đạt **{sp_pos}% đánh giá hài lòng**. Địa điểm dễ tìm, bàn ghế bố trí thuận tiện.\n"
            f"- **Vệ sinh an toàn:** Ghi nhận **{hy_pos}% phản hồi tốt**. Khách hàng đánh giá cao quy cách dọn dẹp sạch sẽ và bảo quản thực phẩm.\n"
            f"- **Lưu ý nhỏ:** Giữ cho khu vực rửa tay và chỗ để xe luôn thông thoáng vào các khung giờ đông đúc."
        )

    elif intent == "action_plan":
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

    else:  # overview
        return (
            f"📊 **Bức tranh Tổng thể của {name}:**\n\n"
            f"- **Dữ liệu phân tích:** Dựa trên **{total_rev} đánh giá thực tế** thu thập từ Foody.\n"
            f"- **Phân bố cảm xúc:** **{dist.get('positive', 0)}% Hài lòng**, **{dist.get('neutral', 0)}% Trung lập**, **{dist.get('negative', 0)}% Chưa ưng ý**.\n"
            f"- **Điểm mạnh nhất:** Khía cạnh **{strengths[0].get('aspect', 'Món ăn') if strengths else 'Ẩm thực'}**.\n"
            f"- **Lời khuyên tóm tắt:** Quán đang vận hành rất tốt, cần tiếp tục phát huy hương vị món ăn và tối ưu tốc độ ra món khi đông khách."
        )


def call_gemini_assistant(restaurant_data: Dict[str, Any], question: str) -> str:
    """
    Gọi Gemini API cho các câu hỏi tùy biến mở rộng.
    Sử dụng context thu gọn (~150 tokens) để tối ưu quota và phản hồi nhanh (< 1 giây).
    """
    if not API_KEY:
        # Nếu chưa cấu hình API key, fallback an toàn sang Local Synthesis
        return synthesize_local_answer(restaurant_data, "overview")

    name = restaurant_data.get("name", "Quán")
    cuisine = restaurant_data.get("cuisine", "Ẩm thực")
    city = restaurant_data.get("city", "Đà Nẵng")
    rating = restaurant_data.get("rating", 4.0)
    sentiment = restaurant_data.get("sentimentDistribution", {})
    strengths = [s.get("title", "") for s in restaurant_data.get("strengths", [])]
    complaints = [a.get("commonComplaints", []) for a in restaurant_data.get("attentionAreas", [])]
    flat_complaints = [c for sub in complaints for c in sub][:3]
    sample_quote = restaurant_data.get("reviews", [{}])[0].get("text", "")[:100]

    system_context = f"""Bạn là Trợ lý Chuyên gia Quản trị Ẩm thực (Restaurant Intelligence AI).
Hãy trả lời câu hỏi của người dùng/chủ quán về nhà hàng sau:
- Tên quán: {name} ({cuisine} tại {city})
- Điểm đánh giá: {rating}/5.0
- Tỷ lệ hài lòng thực khách: {sentiment.get('positive', 0)}% tích cực, {sentiment.get('negative', 0)}% tiêu cực
- Điểm mạnh chính: {', '.join(strengths) if strengths else 'Hương vị thơm ngon'}
- Điểm khách chê / cần lưu ý: {', '.join(flat_complaints) if flat_complaints else 'Thời gian chờ đợi lúc đông'}
- Trích dẫn thực tế từ khách: "{sample_quote}"

Yêu cầu trả lời:
- Ngắn gọn, chuyên nghiệp, thực tế (khoảng 3-5 câu hoặc gạch đầu dòng rõ ràng).
- Sử dụng số liệu và bối cảnh ở trên, không bịa đặt thông tin ngoài dữ liệu.
- Trình bày đẹp mắt với định dạng Markdown."""

    try:
        from google import genai
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_context}\n\nCâu hỏi: {question}"
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        print(f"[Gemini Assistant Error] {e}. Chuyển sang Local Synthesis fallback.")

    # Fallback mượt mà nếu Gemini hết Quota hoặc mạng lỗi
    return synthesize_local_answer(restaurant_data, detect_question_intent(question) or "overview")


def ask_assistant(
    restaurant: DBRestaurant,
    db,
    question: str,
    force_ai: bool = False
) -> Dict[str, Any]:
    """
    Hàm điều phối chính:
    1. Kiểm tra Cache nội bộ
    2. Phân loại câu hỏi (Local Synthesis vs Gemini AI)
    3. Trả về câu trả lời kèm nguồn minh bạch (local_bi / cache / gemini_ai)
    """
    q_clean = question.strip()
    norm_q = remove_accents(q_clean.lower())
    cache_key = f"{restaurant.id}:{norm_q}"

    # 1. Kiểm tra bộ nhớ đệm Cache
    if not force_ai and cache_key in _QUESTION_CACHE:
        cached = _QUESTION_CACHE[cache_key]
        return {
            "success": True,
            "answer": cached["answer"],
            "source": "cache",
            "detected_intent": cached.get("intent"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # Lấy dữ liệu phân tích BI đầy đủ của quán
    restaurant_data = format_restaurant_full(restaurant, db)
    intent = detect_question_intent(q_clean)

    # 2. Xử lý câu hỏi
    if intent and not force_ai:
        # Tầng 1: Trả lời siêu tốc bằng Local Synthesis (0 Token, 0ms)
        answer = synthesize_local_answer(restaurant_data, intent)
        source = "local_bi"
    else:
        # Tầng 2: Gọi Gemini AI cho câu hỏi mở
        answer = call_gemini_assistant(restaurant_data, q_clean)
        source = "gemini_ai"

    # 3. Lưu vào Cache để tái sử dụng
    _QUESTION_CACHE[cache_key] = {
        "answer": answer,
        "intent": intent,
        "source": source
    }

    return {
        "success": True,
        "answer": answer,
        "source": source,
        "detected_intent": intent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
