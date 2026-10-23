"""
Dịch vụ Soạn Thảo Thư Phản Hồi Khách Hàng Bằng Trí Tuệ Nhân Tạo (AI Review Responder Service).
Ứng dụng mô hình Google Gemini AI (Google GenAI SDK) kết hợp In-Memory Cache và Fallback chuyên gia ẩm thực.
Hỗ trợ 4 tông giọng chuẩn mực ngành F&B:
- apology: Chân thành & Nhận lỗi (review 1-2 sao hoặc có phàn nàn)
- voucher: Lịch sự & Tặng voucher ưu đãi ({VOUCHER_CODE})
- gratitude: Tri ân & Thân thiện (review 4-5 sao hoặc khen ngợi)
- clarification: Giải thích & Cầu thị (làm rõ hiểu lầm, khẩu phần, thời gian chờ)
"""

import os
import re
import sys
import time
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Nạp biến môi trường từ các file .env
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

from services.bi_service import remove_accents

# In-Memory Cache cho câu trả lời phản hồi: key = f"{restaurant_id}:{review_id}:{tone}"
_REPLY_CACHE: Dict[str, Dict[str, Any]] = {}

# Danh sách Candidate Models theo thứ tự ưu tiên (Cascading Fallback)
CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
]


def get_gemini_api_key() -> Optional[str]:
    """
    Lấy API Key linh hoạt từ biến môi trường với cơ chế tự động nhận diện và khôi phục:
    1. Kiểm tra GEMINI_API_KEY hoặc GOOGLE_API_KEY chuẩn.
    2. Nạp lại từ các file .env nếu bị thiếu lúc runtime.
    3. Tự động quét os.environ:
       - Trường hợp người dùng vô tình nhập Key vào cột Tên (Key column) trên Render Dashboard.
       - Trường hợp tên biến có chữ 'gemini' hoặc 'google_api'.
       - Trường hợp giá trị hoặc tên bắt đầu bằng 'AIzaSy' hoặc 'AQ.'.
    """
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not key:
        for k, v in os.environ.items():
            k_clean = k.strip()
            v_clean = v.strip() if v else ""

            # Case A: Người dùng paste nhầm API Key vào cột Key/Name trên Render
            if k_clean.lower().startswith("aizasy") or k_clean.lower().startswith("aq."):
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


def generate_voucher_code(restaurant_name: str, discount_percent: int = 15) -> str:
    """
    Tự động sinh mã voucher ưu đãi chuẩn định dạng CARE-{SHORTNAME}-{DISCOUNT}.
    Ví dụ: 'Bánh xèo Bà Mua' -> 'CARE-BAMUA-15'
    """
    clean_name = remove_accents(restaurant_name or "QUAN").upper()
    tokens = re.findall(r"[A-Z0-9]+", clean_name)
    stop_words = {"NHA", "HANG", "QUAN", "TIEM", "AM", "THUC", "THE", "AN", "UONG"}
    dish_words = {"BANH", "XEO", "COM", "GA", "BUN", "BO", "PHO", "MI", "QUANG", "LAU", "NEM", "CHE", "CAFE", "CA", "PHE"}
    meaningful = [t for t in tokens if t not in stop_words]
    brand_tokens = [t for t in meaningful if t not in dish_words]

    if brand_tokens:
        short_name = "".join(brand_tokens[:2])[:8]
    elif meaningful:
        short_name = "".join(meaningful[:2])[:8]
    elif tokens:
        short_name = "".join(tokens[:2])[:8]
    else:
        short_name = "RESTAURANT"

    pct = max(5, min(90, int(discount_percent or 15)))
    return f"CARE-{short_name}-{pct}"


def extract_aspects_addressed(
    aspects: Optional[List[Dict[str, Any]]] = None,
    review_text: str = ""
) -> List[str]:
    """
    Xác định các khía cạnh dịch vụ/ẩm thực được đề cập trong bài đánh giá.
    """
    found = set()
    if aspects:
        for item in aspects:
            asp_name = item.get("aspect") or item.get("name")
            if asp_name:
                found.add(str(asp_name).strip())

    text_norm = remove_accents((review_text or "").lower())
    
    def contains_keyword(text: str, keywords: List[str]) -> bool:
        for k in keywords:
            if " " in k:
                if k in text:
                    return True
            else:
                if re.search(r'\b' + re.escape(k) + r'\b', text):
                    return True
        return False

    if contains_keyword(text_norm, ["mon", "an", "ngon", "do an", "man", "nhat", "cay", "thit", "nuoc dung", "huong vi"]):
        found.add("Món ăn")
    if contains_keyword(text_norm, ["nhan vien", "phuc vu", "thai do", "cho lau", "len mon", "order", "cham"]):
        found.add("Dịch vụ")
    if contains_keyword(text_norm, ["gia", "dat", "re", "tien", "khau phan", "dinh luong", "it"]):
        found.add("Giá cả")
    if contains_keyword(text_norm, ["khong gian", "ban ghe", "dieu hoa", "nong", "bi bach", "bi", "cho ngoi", "am cung"]):
        found.add("Không gian")
    if contains_keyword(text_norm, ["ve sinh", "sach se", "sach", "ban thiu", "ban", "rua tay", "do an toan"]):
        found.add("Vệ sinh")

    return sorted(list(found)) if found else ["Dịch vụ & Món ăn"]


def build_system_prompt(
    restaurant_name: str,
    author: str,
    rating: float,
    tone: str,
    aspects_addressed: List[str],
    voucher_code: Optional[str] = None,
    discount_percent: int = 15
) -> str:
    """
    Xây dựng System Instruction và kim chỉ nam chuẩn mực cho Gemini AI theo từng tông giọng.
    """
    tone_clean = (tone or "apology").lower().strip()
    aspects_str = ", ".join(aspects_addressed) if aspects_addressed else "Dịch vụ và Món ăn"

    tone_guidelines = {
        "apology": f"""TÔNG GIỌNG: CHÂN THÀNH & NHẬN LỖI (Dành cho review tiêu cực/phàn nàn 1-2 sao)
- Mục đích: Xoa dịu bức xúc, nhận trách nhiệm cầu thị và bảo vệ uy tín thương hiệu.
- Xưng hô: Trân trọng, khiêm nhường. Xưng 'quán / chúng em / Ban Quản lý {restaurant_name}', gọi khách là 'bạn {author}' hoặc 'anh/chị {author}'.
- Thẳng thắn nhận lỗi: Thừa nhận trải nghiệm chưa tốt, đặc biệt đối với các điểm bị phàn nàn ({aspects_str}). Tuyệt đối KHÔNG bao biện, KHÔNG đổ lỗi cho giờ cao điểm hay hoàn cảnh khách quan.
- Cam kết hành động: Quán đã lập tức rà soát quy trình bếp/phục vụ và nhắc nhở nghiêm túc các nhân sự phụ trách.
- Kênh liên hệ: Mời khách để lại số điện thoại hoặc nhắn tin trực tiếp qua hotline/fanpage của quán để được hỗ trợ chu đáo nhất.""",

        "voucher": f"""TÔNG GIỌNG: LỊCH SỰ & TẶNG VOUCHER ƯU ĐÃI (Giữ chân khách hàng và bù đắp trải nghiệm)
- Mục đích: Bày tỏ sự nuối tiếc và trao giải pháp thiết thực để khách có cơ hội quay lại trải nghiệm trọn vẹn hơn.
- Xưng hô: Lịch sự, nhã nhặn và thấu cảm.
- Ghi nhận ý kiến: Chân thành cảm ơn khách đã phản hồi về {aspects_str}.
- Tặng mã ưu đãi: Khéo léo gửi tặng mã giảm giá '{voucher_code}' (ưu đãi {discount_percent}%) áp dụng cho lần ghé thăm tiếp theo.
- Hướng dẫn dùng: Khách chỉ cần đưa mã voucher này cho nhân viên khi gọi món hoặc thanh toán. Quán rất mong được đón tiếp chu đáo hơn.""",

        "gratitude": f"""TÔNG GIỌNG: TRI ÂN & THÂN THIỆN (Dành cho review tích cực 4-5 sao hoặc lời khen ngợi)
- Mục đích: Lan tỏa năng lượng tích cực, biến thực khách hài lòng thành khách hàng thân thiết.
- Xưng hô: Ấm áp, gần gũi như người quen, xưng 'quán / chúng em / {restaurant_name}' và gọi 'bạn {author}'.
- Nhắc lại điểm khen: Bày tỏ niềm vui và nhắc lại món ăn/điểm cộng mà khách đã dành lời khen ngợi ({aspects_str}).
- Động lực: Khẳng định sự hài lòng của khách là nguồn động viên to lớn cho toàn bộ đội ngũ quán.
- Lời mời tái ngộ: Hân hoan chào đón khách cùng gia đình/bạn bè quay lại quán vào những dịp tới để thưởng thức thêm nhiều món ngon.""",

        "clarification": f"""TÔNG GIỌNG: GIẢI THÍCH & CẦU THỊ (Dành cho hiểu lầm về khẩu phần, giá cả, thời gian chờ hoặc tiêu chuẩn)
- Mục đích: Làm rõ lý do khách quan một cách minh bạch nhưng giữ thái độ vô cùng khiêm tốn và tôn trọng khách hàng.
- Xưng hô: Điềm đạm, cầu thị, chuyên nghiệp.
- Cảm ơn và giải thích: Cảm ơn góp ý thẳng thắn; giải thích nhẹ nhàng về quy trình (ví dụ: món nấu tươi nóng từng mẻ nên cần thời gian chuẩn bị; nguyên liệu tuyển chọn tươi mới mỗi sáng...).
- Tinh thần cầu thị: Nhấn mạnh quán luôn ghi nhận cảm nhận thực tế của khách và sẽ tiếp tục điều chỉnh định lượng/tốc độ phục vụ để vừa vặn hơn.
- Lời chúc và kênh trao đổi thêm nếu khách còn băn khoăn."""
    }

    selected_guide = tone_guidelines.get(tone_clean, tone_guidelines["apology"])

    return f"""Bạn là Chuyên viên Chăm sóc Khách hàng & Quản lý Trải nghiệm Thực khách cao cấp (Senior F&B Customer Care Specialist) của nhà hàng "{restaurant_name}".
Nhiệm vụ của bạn là chấp bút một bức thư phản hồi hoàn chỉnh, tinh tế, giàu cảm xúc và văn phong ẩm thực Việt Nam chuẩn mực gửi tới thực khách "{author}".

{selected_guide}

QUY TẮC BẮT BUỘC (GUARDRAILS):
1. VĂN PHONG TIẾNG VIỆT THUẦN CHUẨN: Tự nhiên, ấm áp, lịch thiệp, không sáo rỗng hay dịch máy.
2. CÁ NHÂN HÓA SÂU SẮC: Đúng tên khách "{author}", đúng tên quán "{restaurant_name}", phản hồi chính xác vào nội dung khách viết.
3. KHÔNG CÓ KÝ HIỆU GIẢ LẬP: Tuyệt đối không để lại các placeholder như [Số điện thoại], [Ngày], [Tên quán]. Thay vào đó dùng hotline chăm sóc khách hàng hoặc kênh fanpage trực tiếp của quán.
4. NỘI DUNG ĐẦY ĐỦ: Bắt đầu bằng lời chào trân trọng, phần thân bài thấu cảm giải quyết vấn đề, kết thúc bằng lời chúc tốt đẹp và chữ ký trang trọng của quán.
5. CHỈ TRẢ VỀ NỘI DUNG BỨC THƯ: Không kèm lời dẫn meta như 'Dưới đây là bức thư...' hay định dạng mã code."""


def synthesize_fallback_reply(
    restaurant_name: str,
    author: str,
    rating: float,
    tone: str,
    aspects_addressed: List[str],
    voucher_code: Optional[str] = None,
    discount_percent: int = 15
) -> str:
    """
    Sinh bức thư phản hồi chuẩn mực F&B bằng Local Fallback Engine khi không có kết nối Gemini API.
    Đảm bảo 100% không crash và văn phong trau chuốt, đầy đủ cảm xúc.
    """
    author_name = author.strip() if author and author.strip() else "Quý khách"
    res_name = restaurant_name.strip() if restaurant_name and restaurant_name.strip() else "nhà hàng"
    aspect_text = ", ".join(aspects_addressed) if aspects_addressed else "trải nghiệm tại quán"
    tone_clean = (tone or "apology").lower().strip()

    if tone_clean == "apology":
        return (
            f"Kính chào bạn {author_name},\n\n"
            f"Lời đầu tiên, {res_name} xin được gửi lời xin lỗi chân thành và sâu sắc nhất tới bạn về những trải nghiệm chưa thực sự trọn vẹn trong lần ghé thăm vừa qua, "
            f"đặc biệt là các vấn đề liên quan đến {aspect_text}.\n\n"
            f"Sự hài lòng và cảm xúc thoải mái của bạn luôn là ưu tiên hàng đầu của chúng mình. Ban Quản lý quán đã trực tiếp ghi nhận phản hồi, "
            f"đồng thời tiến hành kiểm tra lại quy trình chế biến cũng như chấn chỉnh tác phong phục vụ của đội ngũ nhân sự để đảm bảo không để xảy ra sự cố tương tự.\n\n"
            f"Quán rất mong có cơ hội được lắng nghe bạn nhiều hơn và bù đắp cho trải nghiệm này. Nếu thuận tiện, bạn vui lòng nhắn tin trực tiếp cho fanpage hoặc liên hệ hotline của {res_name} bạn nhé.\n\n"
            f"Kính chúc bạn và gia đình thật nhiều sức khỏe, niềm vui!\n\n"
            f"Trân trọng,\n"
            f"Ban Quản lý {res_name}"
        )

    if tone_clean == "voucher":
        code = voucher_code or f"CARE-WELCOME-{discount_percent}"
        return (
            f"Kính chào bạn {author_name},\n\n"
            f"Cảm ơn bạn đã dành thời gian chia sẻ những đóng góp quý báu về {aspect_text} tại {res_name}. "
            f"Chúng mình vô cùng tiếc nuối khi biết rằng bữa ăn vừa rồi chưa đáp ứng được trọn vẹn sự kỳ vọng của bạn.\n\n"
            f"Để bày tỏ lời tạ lỗi chân thành và mong muốn có cơ hội được đón tiếp bạn chu đáo hơn, {res_name} xin trân trọng gửi tặng bạn mã ưu đãi đặc biệt: **{code}** (giảm {discount_percent}% cho toàn bộ hóa đơn trong lần ghé thăm tiếp theo).\n\n"
            f"Khi đến quán, bạn chỉ cần đưa mã này cho nhân viên thu ngân hoặc đặt bàn trước để chúng mình chuẩn bị vị trí ngồi và phục vụ bạn một cách chu toàn nhất.\n\n"
            f"Rất hy vọng sẽ sớm được chào đón bạn quay trở lại với {res_name}!\n\n"
            f"Trân trọng cảm ơn bạn,\n"
            f"Đội ngũ {res_name}"
        )

    if tone_clean == "gratitude":
        return (
            f"Chào bạn {author_name} thân mến,\n\n"
            f"Đọc được những dòng nhận xét ấm áp và đánh giá {rating:.0f} sao của bạn, cả đội ngũ {res_name} thực sự cảm thấy vô cùng hạnh phúc và tự hào! "
            f"Cảm ơn bạn đã dành nhiều tình cảm và lời khen ngợi cho {aspect_text} của quán.\n\n"
            f"Mỗi lời khen từ những thực khách yêu ẩm thực như bạn chính là nguồn động lực to lớn giúp các bạn nhân viên phục vụ và đội ngũ đầu bếp của {res_name} "
            f"luôn nỗ lực giữ vững chất lượng từng ngày.\n\n"
            f"Lần tới ghé quán, bạn nhớ rủ thêm người thân và bạn bè để cùng thưởng thức thêm nhiều món ngon mới nhé. {res_name} luôn sẵn sàng chào đón bạn như một người bạn thân thuộc!\n\n"
            f"Chúc bạn luôn có những bữa ăn ngon miệng và tràn ngập niềm vui mỗi ngày.\n\n"
            f"Thân ái,\n"
            f"Đội ngũ {res_name}"
        )

    # clarification
    return (
        f"Kính chào bạn {author_name},\n\n"
        f"Trước hết, {res_name} xin gửi lời cảm ơn chân thành vì bạn đã dành thời gian đóng góp ý kiến thẳng thắn về {aspect_text} cho quán.\n\n"
        f"Chúng mình rất hiểu cảm giác chưa thật sự thoải mái của bạn và xin phép được chia sẻ thêm một chút về điều này: "
        f"Tại {res_name}, các món ăn đều được chuẩn bị từ nguyên liệu tươi tuyển chọn và chỉ bắt đầu chế biến khi khách gọi món để giữ trọn độ nóng sốt và hương vị đặc trưng. "
        f"Chính vì vậy, vào một số khung giờ cao điểm khi lượng khách đến cùng lúc, thời gian lên món có thể kéo dài hơn đôi chút so với mong muốn.\n\n"
        f"Quán hoàn toàn ghi nhận cảm nhận của bạn và đang tiếp tục tối ưu hóa quy trình order cũng như bố trí nhân lực nhịp nhàng hơn để phục vụ bạn nhanh chóng và vẹn tròn nhất.\n\n"
        f"Rất mong tiếp tục nhận được sự đồng hành và thấu hiểu từ bạn trong những lần ghé quán tiếp theo!\n\n"
        f"Trân trọng,\n"
        f"Đội ngũ {res_name}"
    )


def call_gemini_reply(
    restaurant_name: str,
    author: str,
    rating: float,
    review_text: str,
    overall_sentiment: Optional[str],
    aspects: Optional[List[Dict[str, Any]]],
    tone: str,
    voucher_code: Optional[str] = None,
    discount_percent: int = 15
) -> tuple[Optional[str], Optional[str]]:
    """
    Gọi Google Gemini API sinh nội dung thư phản hồi với cơ chế Model Cascading Fallback.
    Trả về tuple: (reply_text, model_name) hoặc (None, None) nếu thất bại.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini Reply Info] Không tìm thấy API Key. Chuyển sang Fallback Template.")
        return None, None

    aspects_addressed = extract_aspects_addressed(aspects, review_text)
    system_instruction = build_system_prompt(
        restaurant_name=restaurant_name,
        author=author,
        rating=rating,
        tone=tone,
        aspects_addressed=aspects_addressed,
        voucher_code=voucher_code,
        discount_percent=discount_percent
    )

    user_content = f"""THÔNG TIN ĐÁNH GIÁ CỦA THỰC KHÁCH:
- Tác giả đánh giá: {author}
- Điểm đánh giá: {rating}/5.0 (hoặc thang điểm 10 tương ứng)
- Phân loại cảm xúc: {overall_sentiment or 'Không xác định'}
- Các khía cạnh nổi bật: {', '.join(aspects_addressed)}
- Toàn văn nhận xét gốc:
"{review_text.strip()}"

YÊU CẦU: Hãy soạn thư phản hồi gửi tới {author} theo đúng kim chỉ nam tông giọng đã hướng dẫn."""

    full_prompt = f"{system_instruction}\n\n{user_content}"

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        last_error = None
        for model in CANDIDATE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
                if response and response.text and response.text.strip():
                    return response.text.strip(), model
            except Exception as model_err:
                last_error = model_err
                safe_err = str(model_err).encode("ascii", "replace").decode("ascii")
                print(f"[Gemini Reply Warning] Model '{model}' thất bại ({safe_err[:80]}). Đang chuyển model dự phòng...")
                continue

        if last_error:
            safe_err = str(last_error).encode("ascii", "replace").decode("ascii")
            print(f"[Gemini Reply Error] Toàn bộ Candidate Models đều thất bại: {safe_err[:120]}")
    except Exception as e:
        safe_err = str(e).encode("ascii", "replace").decode("ascii")
        print(f"[Gemini Reply Error] Lỗi khởi tạo Google GenAI SDK: {safe_err[:120]}")

    return None, None


def make_cache_key(restaurant_id: str, review_id: str, tone: str, review_text: str = "") -> str:
    """Tạo cache key duy nhất cho cặp (restaurant, review, tone)"""
    rev_identifier = review_id.strip() if review_id and review_id.strip() else ""
    if not rev_identifier:
        rev_hash = hashlib.md5((review_text or "").strip().encode("utf-8")).hexdigest()[:12]
        rev_identifier = f"hash_{rev_hash}"
    return f"{restaurant_id.strip()}:{rev_identifier}:{tone.strip().lower()}"


def generate_review_reply(
    restaurant_id: str,
    restaurant_name: str,
    review_id: str,
    author: str,
    rating: float,
    overall_sentiment: Optional[str],
    review_text: str,
    aspects: Optional[List[Dict[str, Any]]] = None,
    tone: str = "apology",
    include_voucher: bool = False,
    voucher_discount_percent: int = 15,
    force_regenerate: bool = False
) -> Dict[str, Any]:
    """
    Hàm điều phối sinh phản hồi AI chính:
    1. Kiểm tra In-Memory Cache (trừ khi force_regenerate = True).
    2. Cấp mã voucher nếu tông giọng là voucher hoặc include_voucher = True.
    3. Trích xuất khía cạnh được giải quyết (aspectsAddressed).
    4. Gọi Gemini AI với cơ chế cascading fallback và đo lường thời gian suy luận (responseTimeMs).
    5. Fallback văn phong F&B nếu lỗi kết nối / thiếu key.
    6. Lưu vào cache và trả về payload chuẩn SPEC-FEAT-05.
    """
    start_time = time.perf_counter()
    tone_clean = (tone or "apology").strip().lower()
    res_id_clean = (restaurant_id or "res-unknown").strip()
    res_name_clean = (restaurant_name or "Nhà hàng").strip()
    author_clean = (author or "Quý khách").strip()
    review_clean = (review_text or "").strip()

    # Xác định có cần sinh voucher hay không
    need_voucher = tone_clean == "voucher" or bool(include_voucher)
    generated_voucher_code = generate_voucher_code(res_name_clean, voucher_discount_percent) if need_voucher else None

    # Khía cạnh giải quyết
    aspects_addressed = extract_aspects_addressed(aspects, review_clean)

    cache_key = make_cache_key(res_id_clean, review_id, tone_clean, review_clean)

    # 1. Kiểm tra In-Memory Cache
    if not force_regenerate and cache_key in _REPLY_CACHE:
        cached = _REPLY_CACHE[cache_key]
        return {
            "replyText": cached["replyText"],
            "toneUsed": cached.get("toneUsed", tone_clean),
            "engineUsed": "gemini_cache",
            "responseTimeMs": 0,
            "generatedVoucherCode": cached.get("generatedVoucherCode", generated_voucher_code),
            "aspectsAddressed": cached.get("aspectsAddressed", aspects_addressed),
            "modelName": cached.get("modelName", CANDIDATE_MODELS[0])
        }

    # 2. Gọi Gemini AI Model Cascading
    reply_text, model_used = call_gemini_reply(
        restaurant_name=res_name_clean,
        author=author_clean,
        rating=rating,
        review_text=review_clean,
        overall_sentiment=overall_sentiment,
        aspects=aspects,
        tone=tone_clean,
        voucher_code=generated_voucher_code,
        discount_percent=voucher_discount_percent
    )

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)

    if reply_text and model_used:
        engine_used = "gemini_ai"
        active_model = model_used
    else:
        # 3. Fallback chuyên gia ẩm thực F&B an toàn
        reply_text = synthesize_fallback_reply(
            restaurant_name=res_name_clean,
            author=author_clean,
            rating=rating,
            tone=tone_clean,
            aspects_addressed=aspects_addressed,
            voucher_code=generated_voucher_code,
            discount_percent=voucher_discount_percent
        )
        engine_used = "gemini_fallback"
        active_model = "local-gastronomy-engine"

    result_payload = {
        "replyText": reply_text,
        "toneUsed": tone_clean,
        "engineUsed": engine_used,
        "responseTimeMs": elapsed_ms,
        "generatedVoucherCode": generated_voucher_code,
        "aspectsAddressed": aspects_addressed,
        "modelName": active_model
    }

    # 4. Ghi vào In-Memory Cache
    _REPLY_CACHE[cache_key] = result_payload

    return result_payload
