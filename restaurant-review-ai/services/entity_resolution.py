"""
Module Khớp Nối Thực Thể & Khử Trùng Lặp (Entity Resolution & Deduplication).

Chức năng:
1. normalize_vietnamese: Chuẩn hóa văn bản tiếng Việt, loại bỏ dấu thanh/mũ và ký tự đặc biệt.
2. calculate_name_similarity: So khớp mờ (Fuzzy Token Set Match) tên quán ăn (>= 85% là khớp).
3. is_same_location: Kiểm tra tính tương đồng và nhất quán của địa chỉ/chi nhánh.
4. resolve_or_create_restaurant: Khớp quán có sẵn hoặc tạo mới theo thứ tự ưu tiên.
5. compute_review_fingerprint: Sinh mã băm SHA-256 từ nội dung review đã chuẩn hóa.
6. is_duplicate_review: Kiểm tra trùng lặp nội dung review cho quán ăn.
7. calculate_credibility_score: Tính điểm độ tin cậy cỡ mẫu tiệm cận C = min(1.0, ln(N+1)/ln(31)).
8. update_restaurant_counts_and_credibility: Cập nhật bộ đếm Foody, Google và chỉ số tin cậy.
"""

import re
import math
import hashlib
import difflib
import unicodedata
from typing import Tuple, Optional
from sqlalchemy import func, or_
from database.models import Restaurant, Review


# Danh sách các quận/huyện phổ biến tại các thành phố lớn để phân biệt chi nhánh
KNOWN_DISTRICTS = [
    # Đà Nẵng
    "hai chau", "thanh khe", "son tra", "ngu hanh son", "lien chieu", "cam le", "hoa vang",
    # Hà Nội
    "ba dinh", "hoan kiem", "hai ba trung", "dong da", "tay ho", "cau giay",
    "thanh xuan", "hoang mai", "long bien", "nam tu liem", "bac tu liem", "ha dong",
    # TP. Hồ Chí Minh
    "quan 1", "quan 2", "quan 3", "quan 4", "quan 5", "quan 6", "quan 7", "quan 8",
    "quan 9", "quan 10", "quan 11", "quan 12", "binh thanh", "tan binh", "tan phu",
    "phu nhuan", "go vap", "binh tan", "thu duc"
]

# Các từ chỉ loại hình ẩm thực, món ăn phổ biến để tách riêng khỏi tên thương hiệu
COMMON_CUISINE_STOPWORDS = {
    "quan", "tiem", "nha", "hang", "nhahang", "bep", "lo", "shop", "store",
    "pizza", "burger", "hamburger", "com", "pho", "bun", "mi", "lau", "nuong", "bbq",
    "oc", "chao", "che", "cafe", "coffee", "hue", "vietnam", "anvat", "amthuc",
    "garan", "my", "quang", "haisan", "bone", "trasua", "caphe", "dacsan",
    "mon", "an", "uong", "giaikhat", "banhmi", "banhtrang", "spaghetti", "steak"
}

# Các từ chỉ địa danh, tỉnh thành phố phổ biến
COMMON_CITY_STOPWORDS = {
    "da nang", "ha noi", "sai gon", "tp hcm", "ho chi minh", "hoi an", "nha trang",
    "da lat", "can tho", "hai phong", "vung tau", "viet nam", "danang", "hanoi", "saigon", "vietnam"
}


def normalize_vietnamese(text: str) -> str:
    """
    Chuẩn hóa văn bản tiếng Việt:
    - Chuyển thành chữ thường
    - Thay thế chữ đ/Đ thành d
    - Khử toàn bộ dấu thanh/mũ bằng NFD decomposition
    - Thay thế ký tự đặc biệt thừa bằng khoảng trắng
    - Gom nhóm khoảng trắng và strip
    """
    if not text:
        return ""
    text = str(text).lower()
    text = text.replace("đ", "d").replace("Đ", "d")
    nfd = unicodedata.normalize("NFD", text)
    text = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Tính độ tương đồng giữa hai tên quán ăn (0.0 -> 1.0).
    Sử dụng kết hợp SequenceMatcher, Token Sort Ratio và Token Set Containment.
    Ngưỡng khớp tiêu chuẩn >= 0.85 (85%).
    """
    n1 = normalize_vietnamese(name1)
    n2 = normalize_vietnamese(name2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0

    # Sequence similarity trên chuỗi đã chuẩn hóa
    seq_ratio = difflib.SequenceMatcher(None, n1, n2).ratio()

    tokens1 = n1.split()
    tokens2 = n2.split()
    set1, set2 = set(tokens1), set(tokens2)

    if set1 == set2:
        return 1.0

    # Token sort ratio (thứ tự từ đảo lộn)
    sorted1 = " ".join(sorted(tokens1))
    sorted2 = " ".join(sorted(tokens2))
    sort_ratio = difflib.SequenceMatcher(None, sorted1, sorted2).ratio()

    # Kiểm tra tập token chung
    intersection = set1 & set2
    if not intersection:
        return round(max(seq_ratio, sort_ratio), 4)

    min_len = min(len(set1), len(set2))
    max_len = max(len(set1), len(set2))
    containment = len(intersection) / min_len

    # Trường hợp một tên là tập con hoàn chỉnh của tên kia
    # Ví dụ: "Cơm Gà Gia Vĩnh" nằm trọn trong "Cơm Gà Gia Vĩnh - Hải Phòng"
    if containment >= 1.0 and min_len >= 3:
        extra_penalty = (max_len - min_len) * 0.03
        subset_score = max(0.85, 1.0 - extra_penalty)
        score = max(seq_ratio, sort_ratio, subset_score)
    elif containment >= 1.0 and min_len == 2:
        score = max(seq_ratio, sort_ratio, 0.88 if max_len <= 4 else 0.75)
    else:
        jaccard = len(intersection) / len(set1 | set2)
        score = max(seq_ratio, sort_ratio, (containment * 0.6 + jaccard * 0.4))

    return round(min(1.0, max(0.0, score)), 4)


def is_same_location(addr1: Optional[str], addr2: Optional[str]) -> bool:
    """
    Kiểm tra hai địa chỉ có thuộc cùng một chi nhánh nhà hàng hay không.
    - Nếu một trong hai địa chỉ để trống -> Coi như không có mâu thuẫn -> True
    - Nếu cùng quận/huyện và không xung đột số nhà -> True
    - Nếu khác quận/huyện rõ ràng -> False (khác chi nhánh)
    - Nếu khác số nhà trên cùng tuyến đường -> False
    """
    if not addr1 or not addr2:
        return True

    a1 = normalize_vietnamese(addr1)
    a2 = normalize_vietnamese(addr2)

    if not a1 or not a2 or a1 == a2:
        return True

    # 1. Kiểm tra xung đột quận/huyện
    d1 = None
    d2 = None
    for d in KNOWN_DISTRICTS:
        if d in a1:
            d1 = d
        if d in a2:
            d2 = d

    if d1 and d2 and d1 != d2:
        # Khác quận rõ ràng (ví dụ: Hải Châu vs Sơn Trà) -> Khác chi nhánh!
        return False

    # 2. Kiểm tra số nhà
    nums1 = set(re.findall(r"\b\d+[a-z]?\b", a1))
    nums2 = set(re.findall(r"\b\d+[a-z]?\b", a2))

    # Nếu cả hai đều có số nhà và không có số nào trùng nhau
    if nums1 and nums2 and not (nums1 & nums2):
        # Kiểm tra xem có cùng tuyến đường không
        # Nếu cùng tuyến đường mà khác số nhà -> khác chi nhánh
        tokens1 = set(a1.split())
        tokens2 = set(a2.split())
        street_overlap = len(tokens1 & tokens2 - nums1 - nums2)
        if street_overlap >= 2:
            return False

    # 3. Tính độ tương đồng token của địa chỉ
    tokens1 = set(a1.split())
    tokens2 = set(a2.split())
    if not tokens1 or not tokens2:
        return True

    common = tokens1 & tokens2
    overlap_ratio = len(common) / min(len(tokens1), len(tokens2))

    # Nếu độ trùng lặp địa chỉ >= 40% hoặc cùng quận thì coi là cùng địa điểm
    if overlap_ratio >= 0.40 or (d1 and d2 and d1 == d2):
        return True

    # Nếu độ tương đồng chuỗi khá cao
    seq_sim = difflib.SequenceMatcher(None, a1, a2).ratio()
    return seq_sim >= 0.50


def extract_brand_tokens(name: str) -> set:
    """
    Trích xuất các token thương hiệu cốt lõi, loại bỏ từ chỉ loại hình ẩm thực, món ăn và địa danh.
    Ví dụ: 'Pizza Take Away Đà Nẵng' -> {'take', 'away'}
           'King Pizza - Burger & Gà rán - Đà Nẵng' -> {'king'}
    """
    if not name:
        return set()
    norm = normalize_vietnamese(name)
    # Loại bỏ tên thành phố/địa danh phổ biến
    for cw in COMMON_CITY_STOPWORDS:
        norm = re.sub(r'\b' + re.escape(cw) + r'\b', ' ', norm)
    # Loại bỏ các từ món ăn/loại hình phổ biến
    tokens = [t for t in norm.split() if t not in COMMON_CUISINE_STOPWORDS and len(t) >= 2]
    return set(tokens)


def is_confirmed_same_location(addr1: Optional[str], addr2: Optional[str]) -> bool:
    """
    Xác nhận thực tế 2 địa chỉ có bằng chứng cụ thể thuộc cùng một vị trí/chi nhánh:
    - Bắt buộc CẢ HAI địa chỉ đều phải có dữ liệu (không được rỗng).
    - Phải trùng khớp cụ thể số nhà, tên đường hoặc độ tương đồng địa chỉ rõ ràng.
    """
    if not addr1 or not addr2:
        return False
    a1 = normalize_vietnamese(addr1)
    a2 = normalize_vietnamese(addr2)
    if not a1 or not a2:
        return False
    if a1 == a2:
        return True

    # Trích xuất số nhà
    nums1 = set(re.findall(r"\b\d+[a-z]?\b", a1))
    nums2 = set(re.findall(r"\b\d+[a-z]?\b", a2))
    if nums1 and nums2 and not (nums1 & nums2):
        # Khác số nhà cụ thể -> Chắc chắn không cùng vị trí
        return False

    t1 = set(a1.split())
    t2 = set(a2.split())
    generic_addr = {
        "da", "nang", "ha", "noi", "tp", "hcm", "viet", "nam", "vietnam",
        "quan", "phuong", "duong", "thanh", "pho", "tinh", "xa", "huyen",
        "nha", "doi", "dien", "khoang", "so"
    }
    distinct1 = t1 - generic_addr
    distinct2 = t2 - generic_addr
    if not distinct1 or not distinct2:
        return False
    overlap = distinct1 & distinct2
    # Trùng từ 2 token địa chỉ riêng biệt trở lên (ví dụ: 'ho', 'tung', 'mau')
    if len(overlap) >= 2:
        return True

    # Trùng số nhà và ít nhất 1 token tên đường
    if (nums1 & nums2) and len(overlap) >= 1:
        return True

    return False


def validate_restaurant_match(
    current_name: str,
    candidate_name: str,
    current_addr: Optional[str] = None,
    candidate_addr: Optional[str] = None
) -> Tuple[bool, str, float]:
    """
    Xác thực nghiêm ngặt liên kết mục tiêu (từ Google Maps) có đúng là quán đang xem hay không.
    Ngăn chặn hoàn toàn tình trạng 'Lệch thực thể' (Entity Mismatch) khi người dùng dán nhầm link quán khác.
    
    Trả về Tuple[is_match: bool, reason: str, best_similarity: float].
    """
    if not current_name or not candidate_name:
        return False, "Thiếu tên quán để so khớp thực thể", 0.0

    sim_full = calculate_name_similarity(current_name, candidate_name)

    parts1 = [p.strip() for p in current_name.split("-") if len(p.strip()) >= 3]
    parts2 = [p.strip() for p in candidate_name.split("-") if len(p.strip()) >= 3]
    all_sims = [sim_full]
    for p1 in parts1:
        all_sims.append(calculate_name_similarity(p1, candidate_name))
        for p2 in parts2:
            all_sims.append(calculate_name_similarity(p1, p2))
    for p2 in parts2:
        all_sims.append(calculate_name_similarity(current_name, p2))

    best_sim = max(all_sims)

    brand1 = extract_brand_tokens(current_name)
    brand2 = extract_brand_tokens(candidate_name)
    brand_overlap = brand1 & brand2

    conflict_loc = not is_same_location(current_addr, candidate_addr)
    confirmed_loc = is_confirmed_same_location(current_addr, candidate_addr)

    # 1. Nếu xung đột vị trí rõ ràng (khác quận/huyện hoặc khác số nhà trên cùng đường) -> Chặn
    if conflict_loc:
        return False, "Địa chỉ chi nhánh hoặc quận/huyện xung đột rõ rệt", best_sim

    # 2. Nếu cả 2 đều có từ khóa thương hiệu đặc trưng nhưng hoàn toàn không trùng nhau (VD: 'take away' vs 'king') -> Chặn
    if brand1 and brand2 and not brand_overlap:
        b1_str = ", ".join(sorted(brand1))
        b2_str = ", ".join(sorted(brand2))
        return False, f"Thương hiệu khác biệt ('{b1_str}' khác '{b2_str}')", best_sim

    # 3. Độ tương đồng tên quán cao (>= 0.80) -> Khớp
    if best_sim >= 0.80:
        return True, "Tên thương hiệu tương đồng cao", best_sim

    # 4. Độ tương đồng tên khá (>= 0.65) VÀ có trùng token thương hiệu hoặc cùng địa chỉ -> Khớp
    if best_sim >= 0.65 and (brand_overlap or confirmed_loc):
        return True, "Tên thương hiệu và địa điểm tương thích", best_sim

    # 5. Độ tương đồng trung bình (>= 0.50) nhưng xác nhận 100% cùng số nhà/tên đường cụ thể -> Khớp
    if best_sim >= 0.50 and confirmed_loc:
        return True, "Cùng địa chỉ chi nhánh cụ thể", best_sim

    return False, f"Độ tương đồng tên quán không đủ tin cậy ({round(best_sim * 100, 1)}%)", best_sim


def resolve_or_create_restaurant(
    db_session,
    name: str,
    address: Optional[str] = None,
    google_maps_url: Optional[str] = None,
    foody_url: Optional[str] = None,
    google_place_id: Optional[str] = None,
) -> Tuple[Restaurant, bool]:
    """
    Khớp thực thể quán ăn (Entity Resolution):
    Trả về Tuple[Restaurant, is_created]:
    - is_created = False: Đã tìm thấy quán cũ và gán đúng restaurant_id (kèm cập nhật link nếu thiếu)
    - is_created = True: Quán mới hoàn toàn, đã tạo bản ghi mới trong bảng restaurants
    
    Thứ tự khớp:
    1. Trực tiếp theo google_place_id, google_maps_url hoặc foody_url.
    2. So khớp mờ (Fuzzy Name Token Matching >= 85%) và kiểm tra tương thích địa chỉ/chi nhánh.
    """
    existing: Optional[Restaurant] = None

    # Bước 1: Khớp theo ID / URL chính xác
    if google_place_id:
        existing = db_session.query(Restaurant).filter(Restaurant.google_place_id == google_place_id).first()

    if not existing and google_maps_url:
        existing = db_session.query(Restaurant).filter(Restaurant.google_maps_url == google_maps_url).first()

    if not existing and foody_url:
        existing = db_session.query(Restaurant).filter(Restaurant.foody_url == foody_url).first()

    # Bước 2: So khớp mờ tên quán và cùng địa chỉ chi nhánh
    if not existing:
        candidates = db_session.query(Restaurant).all()
        best_match = None
        best_score = 0.0

        for cand in candidates:
            sim = calculate_name_similarity(name, cand.name)
            if sim >= 0.85 and sim > best_score:
                if is_same_location(address, cand.address):
                    best_match = cand
                    best_score = sim

        existing = best_match

    # Bước 3: Nếu tìm thấy quán đã có -> Cập nhật thông tin bổ sung và trả về (quán cũ, False)
    if existing:
        changed = False
        if google_maps_url and not existing.google_maps_url:
            existing.google_maps_url = google_maps_url
            changed = True
        if google_place_id and not existing.google_place_id:
            existing.google_place_id = google_place_id
            changed = True
        if foody_url and not existing.foody_url:
            existing.foody_url = foody_url
            changed = True
        if address and not existing.address:
            existing.address = address
            changed = True

        if changed:
            db_session.flush()

        return existing, False

    # Bước 4: Không tìm thấy quán nào -> Tạo quán mới hoàn toàn
    new_restaurant = Restaurant(
        name=name.strip(),
        address=address.strip() if address else None,
        google_maps_url=google_maps_url,
        foody_url=foody_url,
        google_place_id=google_place_id,
        review_count=0,
        foody_review_count=0,
        google_review_count=0,
        credibility_score=0.0,
    )
    db_session.add(new_restaurant)
    db_session.flush()
    return new_restaurant, True


def compute_review_fingerprint(text: str) -> str:
    """
    Sinh mã băm SHA-256 duy nhất từ nội dung review đã chuẩn hóa
    (bỏ dấu, chuyển chữ thường, bỏ ký tự đặc biệt, chuẩn hóa khoảng trắng).
    """
    norm = normalize_vietnamese(text)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def is_duplicate_review(db_session, restaurant_id: int, review_text: str) -> bool:
    """
    Kiểm tra bài đánh giá có bị trùng lặp trong database của quán này hay không:
    1. So khớp mã băm SHA-256 fingerprint trên văn bản đã chuẩn hóa.
    2. Fallback so khớp chính xác review_text nếu bản ghi cũ chưa có fingerprint.
    """
    if not review_text or not str(review_text).strip():
        return False

    fp = compute_review_fingerprint(review_text)

    # 1. So khớp theo fingerprint
    existing_fp = db_session.query(Review.id).filter(
        Review.restaurant_id == restaurant_id,
        Review.fingerprint == fp
    ).first()
    if existing_fp:
        return True

    # 2. Fallback so khớp text trực tiếp
    existing_text = db_session.query(Review.id).filter(
        Review.restaurant_id == restaurant_id,
        Review.text == review_text.strip()
    ).first()
    if existing_text:
        return True

    return False


def calculate_credibility_score(review_count: int) -> float:
    """
    Tính chỉ số độ tin cậy mẫu C (0.0 -> 1.0):
    C = min(1.0, ln(N + 1) / ln(31))
    """
    if review_count <= 0:
        return 0.0
    score = math.log(review_count + 1) / math.log(31)
    return round(min(1.0, max(0.0, score)), 4)


def update_restaurant_counts_and_credibility(db_session, restaurant_id: int) -> Optional[Restaurant]:
    """
    Tự động đếm lại số lượng đánh giá Foody, Google Maps và tính toán credibility_score:
    C = min(1.0, ln(N + 1) / ln(31))
    """
    restaurant = db_session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        return None

    # Đếm tổng số review
    total_reviews = db_session.query(func.count(Review.id)).filter(
        Review.restaurant_id == restaurant_id
    ).scalar() or 0

    # Đếm review Foody (source = 'Foody' hoặc NULL)
    foody_reviews = db_session.query(func.count(Review.id)).filter(
        Review.restaurant_id == restaurant_id,
        or_(Review.source == "Foody", Review.source.is_(None))
    ).scalar() or 0

    # Đếm review Google Maps (source thuộc GoogleMaps / google_maps)
    google_reviews = db_session.query(func.count(Review.id)).filter(
        Review.restaurant_id == restaurant_id,
        Review.source.in_(["GoogleMaps", "google_maps", "Google Maps"])
    ).scalar() or 0

    credibility = calculate_credibility_score(total_reviews)

    restaurant.review_count = total_reviews
    restaurant.foody_review_count = foody_reviews
    restaurant.google_review_count = google_reviews
    restaurant.credibility_score = credibility

    db_session.flush()
    return restaurant
