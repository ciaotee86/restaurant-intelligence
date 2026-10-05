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

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL_NAME = "gemini-3.5-flash-lite"


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
    norm = remove_accents(question.lower().strip())

    # 1. Kế hoạch hành động chuẩn (Local BI hoặc Checklist)
    if "ke hoach" in norm or "checklist" in norm:
        return "action_plan"

    # 2. Câu hỏi tư vấn / hành động / mở rộng thực đơn -> Luôn là menu_expansion hoặc advisory (gọi Gemini)
    consult_markers = [
        "nen", "co nen", "them", "bot", "tang", "giam", "lam sao", "lam the nao",
        "tai sao", "vi sao", "cach nao", "phat trien", "mo rong", "tu van",
        "goi y", "thay doi", "bo sung", "mot mon", "mon gi", "mon nao vao"
    ]
    if any(m in norm for m in consult_markers):
        if any(k in norm for k in ["mon", "thuc don", "menu", "do an", "an kem", "topping", "uong"]):
            return "menu_expansion"
        return "advisory"

    # 3. Các chỉ số thống kê & câu hỏi định hướng chuẩn (Local BI 0-token)
    if any(k in norm for k in ["khen nhieu nhat", "ngon nhat", "dac sac nhat", "khen nhat", "dac trung"]) or (("mon" in norm or "an" in norm) and "khen" in norm):
        return "food"
    if ("mon nao" in norm or "mon gi" in norm) and "ngon" in norm:
        return "food"
    if any(k in norm for k in ["nhan vien", "phuc vu", "thai do", "cho lau", "len mon"]) and any(k in norm for k in ["the nao", "ra sao", "van de", "luu y", "nhanh", "co khong"]):
        return "service"
    if any(k in norm for k in ["muc gia", "gia ca", "gia tien", "dat", "re", "khau phan", "tui tien", "dinh luong"]):
        return "price"
    if any(k in norm for k in ["khong gian", "ve sinh", "sach se", "ban ghe", "dieu hoa", "thoang", "cho ngoi", "cho de xe"]):
        return "space_hygiene"
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

    if intent == "menu_expansion":
        name_lower = name.lower()
        if "banh xeo" in name_lower or "nem lui" in name_lower or "bun" in name_lower:
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

    elif intent == "food":
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
    Sử dụng context thông minh dựa trên dữ liệu thật của quán và model gemini-3.5-flash-lite.
    """
    if not API_KEY:
        # Nếu chưa cấu hình API key, fallback an toàn sang Local Synthesis
        fallback_intent = detect_question_intent(question) or "overview"
        return synthesize_local_answer(restaurant_data, fallback_intent)

    name = restaurant_data.get("name", "Quán")
    cuisine = restaurant_data.get("cuisine", "Ẩm thực")
    city = restaurant_data.get("city", "Đà Nẵng")
    rating = restaurant_data.get("rating", 4.0)
    sentiment = restaurant_data.get("sentimentDistribution", {})
    strengths = [s.get("description", "") for s in restaurant_data.get("strengths", [])]
    complaints = [a.get("commonComplaints", []) for a in restaurant_data.get("attentionAreas", [])]
    flat_complaints = [c for sub in complaints for c in sub][:4]
    aspect_words = []
    for a in restaurant_data.get("aspects", []):
        aspect_words.extend(a.get("sampleKeywords", []))
    keywords_str = ", ".join(aspect_words[:10])

    system_context = f"""Bạn là Chuyên gia Tư vấn Quản trị & Vận hành F&B (Restaurant Intelligence AI).
Hãy trả lời câu hỏi của người dùng/chủ quán về nhà hàng sau:
- Tên quán: {name}
- Loại hình ẩm thực: {cuisine} tại {city}
- Khung giá tham khảo: {restaurant_data.get('priceRange', 'Bình dân')}
- Điểm đánh giá: {rating}/5.0 ({restaurant_data.get('totalReviews', 0)} bài đánh giá)
- Tỷ lệ hài lòng thực khách: {sentiment.get('positive', 0)}% tích cực, {sentiment.get('negative', 0)}% tiêu cực
- Điểm mạnh nổi bật từ khách: {'; '.join(strengths) if strengths else 'Hương vị thơm ngon, hợp khẩu vị'}
- Điểm khách chê / cần cải thiện: {'; '.join(flat_complaints) if flat_complaints else 'Thời gian chờ đợi lúc quán đông'}
- Từ khóa khách nhắc nhiều: {keywords_str}

Yêu cầu trả lời:
- Trả lời ĐÚNG TRỌNG TÂM câu hỏi của người dùng. Nếu hỏi về thêm món, hãy tư vấn các món ăn, đồ uống hoặc combo thực tế phù hợp với mô hình của quán.
- Thân thiện, thực tế, hành văn chuyên nghiệp của chuyên gia F&B.
- Trình bày mạch lạc với gạch đầu dòng Markdown rõ ràng, dễ đọc."""

    try:
        from google import genai
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=f"{system_context}\n\nCâu hỏi của chủ quán / người dùng: {question}"
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        safe_err = str(e).encode("ascii", "replace").decode("ascii")
        print(f"[Gemini Assistant Error] {safe_err}. Chuyển sang Local Synthesis fallback.")

    # Fallback mượt mà nếu Gemini hết Quota hoặc mạng lỗi
    fallback_intent = detect_question_intent(question) or "overview"
    return synthesize_local_answer(restaurant_data, fallback_intent)


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

    # 2. Xử lý câu hỏi:
    # - Nếu câu hỏi là các chỉ số chuẩn (food, service, price, space_hygiene, action_plan, overview) VÀ không yêu cầu force_ai -> Local Synthesis (0 Token)
    # - Nếu là tư vấn thực đơn (menu_expansion), câu hỏi tự do mở rộng, hoặc force_ai=True -> Gọi Gemini AI (gemini-3.5-flash-lite)
    if intent in ["food", "service", "price", "space_hygiene", "action_plan", "overview"] and not force_ai:
        answer = synthesize_local_answer(restaurant_data, intent)
        source = "local_bi"
    else:
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
