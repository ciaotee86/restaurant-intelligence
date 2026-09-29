"""
Module Bộ lọc Đánh giá (Review Filter & Spam Detection)
Hệ thống phát hiện spam, quảng cáo và nội dung không liên quan cho đánh giá nhà hàng/ẩm thực.

Nguyên tắc thiết kế:
1. Multi-signal rule-based: Kết hợp nhiều tín hiệu (Điện thoại, Email, Zalo/Hotline, Link, Dịch vụ ngoài ngành ẩm thực, Ngữ cảnh ăn uống).
2. Không over-filter: Xem xét toàn diện context. Không tự ý coi là spam chỉ vì có từ 'giá rẻ' hoặc nhắc đến số hotline của quán.
3. Phân loại chi tiết (Category & Reason):
   - normal: Đánh giá bình thường của thực khách.
   - low_information: Đánh giá quá ngắn (Ngon, OK, 10/10) - KHÔNG coi là spam.
   - advertisement: Quảng cáo dịch vụ thương mại, bán hàng, cho thuê xe...
   - irrelevant: Không liên quan đến nhà hàng (bđs, khóa học, tuyển dụng...).
   - duplicate: Bài viết trùng lặp hoặc spam hàng loạt.
   - suspicious: Nghi vấn mập mờ (cần AI xác thực nếu bật cờ AI).
"""

import re
import unicodedata
from typing import Dict, List, Any, Optional

# ==============================================================================
# 1. TỪ ĐIỂN TÍN HIỆU (DICTIONARIES & REGEX PATTERNS)
# ==============================================================================

# Regex bắt số điện thoại Việt Nam (đa dạng format: 09xx.xxx.xxx, 09xxxxxxxx, +84..., 02x...)
PHONE_REGEX = re.compile(
    r"(?:(?:\+?84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9]|2[0-9]{1,2}))"
    r"[\s\.\-]?(?:\d{3,4})[\s\.\-]?(?:\d{3,4})\b|"
    r"\b0\d{2,3}[\.\-\s]\d{3}[\.\-\s]\d{3,4}\b"
)

# Regex bắt địa chỉ Email
EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

# Regex bắt URL / Link mạng xã hội
URL_REGEX = re.compile(
    r"https?://\S+|www\.\S+|\b(?:facebook|fb|instagram|tiktok|zalo)\.(?:com|me)/\S+"
)

# Tín hiệu Kêu gọi hành động & Liên hệ quảng cáo (Call to Action / Contacts)
CONTACT_SIGNALS = [
    "hotline", "zalo", "liên hệ ngay", "lien he ngay", "gọi ngay", "goi ngay",
    "inbox", "contact", "báo giá", "bao gia", "đặt lịch", "dat lich",
    "để lại mail", "de lai mail", "nhắn tin", "tư vấn", "tu van", "đối tác",
    "tư vấn miễn phí", "hỗ trợ 24/7", "liên hệ:"
]

# Tín hiệu Dịch vụ không liên quan đến nhà hàng / ẩm thực (Irrelevant & Commercial Services)
IRRELEVANT_SERVICE_SIGNALS = [
    # Thuê xe / Du lịch ngoài ẩm thực
    "thuê xe", "thue xe", "xe du lịch", "xe du lich", "xe 7 chỗ", "xe 16 chỗ",
    "xe 29 chỗ", "xe 45 chỗ", "đón tiễn sân bay", "don tien san bay", "vé máy bay",
    "tour du lịch", "tour du lich", "tour đà nẵng", "tuan dung travel", "lái xe an toàn",
    # Bất động sản / Nhà đất
    "bất động sản", "bat dong san", "nhà đất", "nha dat", "mua bán đất", "mua ban dat",
    "cho thuê căn hộ", "mặt bằng kinh doanh", "sổ đỏ", "đất nền",
    # Tuyển dụng / Việc làm
    "tuyển dụng", "tuyen dung", "việc làm", "viec lam", "tìm việc", "tim viec",
    "tuyển ctv", "tuyen ctv", "tuyển nhân viên", "lương cao", "thu nhập khủng",
    # Đào tạo / Khóa học / Bằng lái
    "khóa học", "khoa hoc", "gia sư", "gia su", "luyện thi", "đào tạo lái xe", "bằng lái",
    # Tài chính / Vay vốn
    "vay vốn", "vay von", "vay tiền", "tài chính", "đáo hạn", "trả góp",
    # Dịch vụ khác
    "sim số đẹp", "sim so dep", "spa làm đẹp", "thẩm mỹ viện", "hút bể phốt", "thông cống"
]

# Tín hiệu Cung cấp Dịch vụ / Mua bán Thương mại (Commercial Offering & Advertising)
COMMERCIAL_OFFERING_SIGNALS = [
    "cho thuê", "cho thue", "bán", "ban", "giá rẻ", "gia re", "giá hạt dẻ",
    "khuyến mãi", "khuyen mai", "ưu đãi", "uu dai", "chiết khấu", "chiet khau",
    "dịch vụ", "dich vu", "chuyên cung cấp", "chuyen cung cap", "đặt tour",
    "travel", "báo giá", "bao gia", "đặt hàng", "dat hang"
]

# Tín hiệu Thông tin doanh nghiệp thương mại
BUSINESS_SIGNALS = [
    "trụ sở chính", "tru so chinh", "phòng giao dịch", "phong giao dich",
    "chi nhánh", "chi nhanh", "văn phòng", "van phong", "công ty tnhh",
    "công ty cổ phần", "doanh nghiệp", "quý đối tác", "quy doi tac"
]

# Tín hiệu Ngữ cảnh ẩm thực / Trải nghiệm ăn uống (Dining Context - Yếu tố bảo vệ, chống over-filter)
DINING_CONTEXT_WORDS = [
    "món", "ăn", "ngon", "dở", "dở tệ", "quán", "nhà hàng", "phục vụ", "nhân viên",
    "giá", "giá cả", "hương vị", "vị", "nước chấm", "thực đơn", "menu", "bàn",
    "không gian", "đồ ăn", "thức uống", "nước uống", "chè", "bánh", "cơm", "bún",
    "phở", "lẩu", "nướng", "nêm nếm", "đậm đà", "vệ sinh", "view", "sạch sẽ",
    "order", "chờ món", "lên món", "gọi món", "chất lượng", "ưng ý", "quay lại",
    "khẩu phần", "đĩa", "tô", "bát", "nồi", "nước lèo", "topping"
]

# Tập từ đánh giá cực ngắn nhưng có ý nghĩa tích cực/tiêu cực về quán ăn
SHORT_REVIEW_WORDS = {
    "ngon", "rất ngon", "rat ngon", "quá ngon", "qua ngon", "tuyệt", "tuyet",
    "tuyệt vời", "tuyet voi", "ok", "oke", "okay", "good", "nice", "10/10",
    "9/10", "8/10", "được", "duoc", "tạm", "tam", "tạm được", "dở", "chán",
    "view đẹp", "view dep", "rất tốt", "rat tot", "sạch sẽ", "sach se",
    "thơm ngon", "thom ngon", "đậm đà", "dam da", "hợp khẩu vị", "hop vi"
}


# ==============================================================================
# 2. HÀM CHUẨN HÓA VĂN BẢN
# ==============================================================================

def normalize_text(text: str) -> str:
    """
    Chuẩn hóa văn bản:
    - NFKC: Chuyển đổi các ký tự unicode font toán học (bold/italic ví dụ: 𝑻𝒖𝒂̂́𝒏, 𝟎𝟗𝟑𝟒) về chữ/số chuẩn.
    - Đưa về chữ thường để so khớp đồng nhất.
    """
    if not text:
        return ""
    # Chuyển đổi các font unicode stylized (thường được spammer dùng để vượt qua filter)
    norm = unicodedata.normalize("NFKC", text)
    return norm.strip()


def remove_accents(text: str) -> str:
    """Loại bỏ dấu tiếng Việt để đối chiếu chống lách chữ"""
    norm = unicodedata.normalize("NFD", text)
    return "".join(c for c in norm if unicodedata.category(c) != "Mn").lower()


# ==============================================================================
# 3. HÀM PHÂN TÍCH & BỘ LỌC ĐA TÍN HIỆU (MULTI-SIGNAL FILTER ENGINE)
# ==============================================================================

def classify_review(
    text: str,
    author: str = "",
    recent_texts: Optional[List[str]] = None,
    allow_ai: bool = False
) -> Dict[str, Any]:
    """
    Phân loại và phát hiện spam trong đánh giá nhà hàng.

    Trả về dict:
    {
        "is_spam": bool,
        "spam_score": float,       # 0.0 -> 1.0
        "spam_category": str,      # "normal" | "low_information" | "advertisement" | "irrelevant" | "duplicate" | "suspicious"
        "spam_reason": list[str],  # Danh sách các nguyên nhân phát hiện
    }
    """
    if not text or not text.strip():
        return {
            "is_spam": False,
            "spam_score": 0.0,
            "spam_category": "low_information",
            "spam_reason": ["empty_text"]
        }

    raw_text = text.strip()
    norm_text = normalize_text(raw_text)
    lower_text = norm_text.lower()
    no_accent_text = remove_accents(lower_text)
    words = lower_text.split()
    word_count = len(words)

    # --------------------------------------------------------------------------
    # TÍN HIỆU 0: KIỂM TRA TRÙNG LẶP (DUPLICATE CHECK)
    # --------------------------------------------------------------------------
    if recent_texts:
        norm_compact = " ".join(lower_text.split())
        for prev in recent_texts:
            prev_norm = " ".join(normalize_text(prev).lower().split())
            if norm_compact and norm_compact == prev_norm:
                return {
                    "is_spam": True,
                    "spam_score": 0.98,
                    "spam_category": "duplicate",
                    "spam_reason": ["duplicate_content"]
                }
            # Trùng lặp phần lớn (near duplicate: cùng 15 từ đầu tiên trên văn bản dài)
            if word_count >= 10:
                prefix = " ".join(lower_text.split()[:15])
                prev_prefix = " ".join(prev_norm.split()[:15])
                if prefix == prev_prefix:
                    return {
                        "is_spam": True,
                        "spam_score": 0.92,
                        "spam_category": "duplicate",
                        "spam_reason": ["duplicate_content_prefix"]
                    }

    # --------------------------------------------------------------------------
    # TÍN HIỆU 1: ĐÁNH GIÁ RẤT NGẮN (LOW INFORMATION - KHÔNG PHẢI SPAM)
    # --------------------------------------------------------------------------
    clean_short = lower_text.strip(" .!?,:;~+-*/\\_\"'()[]{}")
    if word_count <= 2 or len(clean_short) <= 10:
        if clean_short in SHORT_REVIEW_WORDS or any(sw in clean_short for sw in ["ngon", "ok", "good", "dở", "tuyệt", "10/10"]):
            return {
                "is_spam": False,
                "spam_score": 0.05,
                "spam_category": "low_information",
                "spam_reason": ["short_valid_review"]
            }
        # Ký hiệu biểu tượng emoji hoặc cực ngắn không dấu hiệu spam
        if not re.search(r"[a-zA-Z0-9]", clean_short):  # Ví dụ: "👍", "❤️"
            return {
                "is_spam": False,
                "spam_score": 0.05,
                "spam_category": "low_information",
                "spam_reason": ["emoji_only"]
            }

    # --------------------------------------------------------------------------
    # TÍN HIỆU ĐA CHIỀU (MULTI-SIGNALS EXTRACTION)
    # --------------------------------------------------------------------------
    detected_reasons = []
    spam_score = 0.0

    # 1. Phát hiện Số điện thoại
    phones_found = PHONE_REGEX.findall(norm_text)
    if phones_found:
        detected_reasons.append("phone_number")
        spam_score += 0.35

    # 2. Phát hiện Email
    emails_found = EMAIL_REGEX.findall(norm_text)
    if emails_found:
        detected_reasons.append("email")
        spam_score += 0.40

    # 3. Phát hiện URL / Mạng xã hội ngoài
    urls_found = URL_REGEX.findall(norm_text)
    if urls_found:
        detected_reasons.append("url_or_social_link")
        spam_score += 0.35

    # 4. Phát hiện Lời kêu gọi hành động / Liên hệ (Call to action / Contact signals)
    matched_contacts = [
        kw for kw in CONTACT_SIGNALS
        if kw in lower_text or remove_accents(kw) in no_accent_text
    ]
    if matched_contacts:
        detected_reasons.append("call_to_action_or_contact")
        # Nếu có từ 2 liên hệ trở lên (hotline, zalo, liên hệ ngay...) tăng điểm
        spam_score += min(0.40, len(matched_contacts) * 0.15)

    # 5. Phát hiện Dịch vụ ngoài ngành ẩm thực (Thuê xe, BĐS, Tuyển dụng, Vay...)
    matched_irrelevant = [
        kw for kw in IRRELEVANT_SERVICE_SIGNALS
        if kw in lower_text or remove_accents(kw) in no_accent_text
    ]
    if matched_irrelevant:
        detected_reasons.append("irrelevant_service")
        # Đây là tín hiệu spam cực mạnh đối với review nhà hàng ăn uống
        spam_score += min(0.65, 0.40 + (len(matched_irrelevant) * 0.12))

    # 6. Phát hiện Thông tin doanh nghiệp thương mại
    matched_business = [
        kw for kw in BUSINESS_SIGNALS
        if kw in lower_text or remove_accents(kw) in no_accent_text
    ]
    if matched_business:
        detected_reasons.append("business_information")
        spam_score += min(0.35, len(matched_business) * 0.15)

    # --------------------------------------------------------------------------
    # TÍN HIỆU BẢO VỆ NGỮ CẢNH ẨM THỰC (DINING CONTEXT & FALSE-POSITIVE PREVENTION)
    # --------------------------------------------------------------------------
    matched_dining = [
        kw for kw in DINING_CONTEXT_WORDS
        if kw in lower_text or remove_accents(kw) in no_accent_text
    ]
    dining_mentions_count = len(matched_dining)

    # 7. Phát hiện Tín hiệu Cung cấp Dịch vụ / Chào bán thương mại
    matched_commercial = [
        kw for kw in COMMERCIAL_OFFERING_SIGNALS
        if kw in lower_text or remove_accents(kw) in no_accent_text
    ]
    if matched_commercial:
        if matched_irrelevant or dining_mentions_count == 0:
            detected_reasons.append("commercial_offering")
            spam_score += min(0.35, len(matched_commercial) * 0.15)

    # CASE 5: Khách khen "giá rẻ" trong ngữ cảnh ẩm thực
    # Ví dụ: "Quán có giá khá rẻ, đồ ăn ngon"
    # -> "giá rẻ" không được coi là quảng cáo nếu có món ăn/ngon và không có hotline/tour/thuê xe
    if "giá rẻ" in lower_text or "gia re" in no_accent_text:
        if dining_mentions_count >= 1 and not matched_irrelevant and not phones_found and not emails_found:
            # Ngữ cảnh ẩm thực an toàn -> không phạt điểm
            pass
        elif matched_irrelevant:
            # "giá rẻ" nằm trong bài cho thuê xe / tour / phòng vé -> tăng thêm tính chất quảng cáo
            detected_reasons.append("advertisement_price_claim")
            spam_score += 0.15

    # CASE 6: Khách chia sẻ trải nghiệm có nhắc số điện thoại của quán
    # Ví dụ: "Nhân viên rất nhiệt tình, số điện thoại phục vụ của quán là 0901234567"
    # -> Nếu có nhiều từ trải nghiệm ẩm thực/nhân viên/quán, và KHÔNG CÓ dịch vụ ngoài, email, hotline bán hàng
    if phones_found and dining_mentions_count >= 2 and not matched_irrelevant and not emails_found:
        # Giảm trừ điểm phạt số điện thoại vì đây là số liên hệ của quán do khách trích dẫn
        spam_score = max(0.10, spam_score - 0.25)
        if "phone_number" in detected_reasons:
            detected_reasons.remove("phone_number")
            detected_reasons.append("restaurant_contact_reference")

    # Nếu ngữ cảnh ẩm thực phong phú (nói về nhiều món, hương vị, phục vụ), giảm trừ điểm nghi vấn nhẹ
    if dining_mentions_count >= 4 and not matched_irrelevant and not emails_found:
        spam_score = max(0.0, spam_score - 0.20)

    # Giới hạn điểm trong đoạn [0.0, 1.0]
    spam_score = round(min(1.0, max(0.0, spam_score)), 2)

    # --------------------------------------------------------------------------
    # PHÂN LOẠI DANH MỤC (CATEGORY ASSIGNMENT)
    # --------------------------------------------------------------------------
    if "irrelevant_service" in detected_reasons:
        if (
            "business_information" in detected_reasons
            or "call_to_action_or_contact" in detected_reasons
            or "commercial_offering" in detected_reasons
            or "phone_number" in detected_reasons
            or "advertisement_price_claim" in detected_reasons
        ):
            category = "advertisement"
        else:
            category = "irrelevant"
        is_spam = True
    elif spam_score >= 0.65:
        category = "advertisement"
        is_spam = True
    elif spam_score >= 0.35:
        # Trường hợp mập mờ (ambiguous / suspicious)
        category = "suspicious"
        # Nếu bật allow_ai thì gọi AI để phán quyết, nếu không thì ngưỡng thận trọng
        if allow_ai:
            ai_res = _verify_with_ai_fallback(norm_text)
            if ai_res:
                return ai_res
        # Mặc định: nếu không đủ bằng chứng chắc chắn thì KHÔNG đánh gãy review hợp lệ
        is_spam = spam_score >= 0.55
    else:
        category = "normal"
        is_spam = False

    return {
        "is_spam": is_spam,
        "spam_score": spam_score,
        "spam_category": category,
        "spam_reason": detected_reasons if detected_reasons else ["normal_experience"]
    }


# ==============================================================================
# 4. HỖ TRỢ AI FALLBACK CHO TRƯỜNG HỢP MẬP MỜ (CHỈ GỌI KHI CẦN)
# ==============================================================================

def _verify_with_ai_fallback(text: str) -> Optional[Dict[str, Any]]:
    """
    Hàm gọi Gemini để kiểm tra các bài đánh giá ở vùng ranh giới (ambiguous 0.35 - 0.65).
    Chỉ chạy khi có cờ allow_ai và đã cấu hình GEMINI_API_KEY.
    """
    try:
        from analysis.gemini_analyzer import get_gemini_model
        import json
        model = get_gemini_model()
        if not model:
            return None

        prompt = f"""
Bạn là chuyên gia kiểm duyệt nội dung đánh giá ẩm thực/nhà hàng.
Hãy xác định xem đoạn văn bản sau có phải là SPAM/QUẢNG CÁO hoặc NỘI DUNG NGOÀI NGÀNH ẨM THỰC không:
"{text}"

Yêu cầu trả về đúng định dạng JSON:
{{
    "is_spam": true hoặc false,
    "spam_score": số thực từ 0.0 đến 1.0,
    "spam_category": "normal" | "advertisement" | "irrelevant" | "suspicious",
    "spam_reason": ["lý do ngắn gọn"]
}}
"""
        response = model.generate_content(prompt)
        raw_resp = response.text.strip()
        match = re.search(r"\{.*\}", raw_resp, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return None
