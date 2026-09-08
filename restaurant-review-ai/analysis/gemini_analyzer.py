import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

MODEL_NAME = "gemini-3.5-flash-lite"

ASPECTS = [
    "món ăn",
    "giá cả",
    "dịch vụ",
    "không gian",
    "vệ sinh",
]

BATCH_SIZE = 20


PROMPT_TEMPLATE = """Bạn là hệ thống phân tích đánh giá nhà hàng.

Hãy phân tích TẤT CẢ các review bên dưới.

Với mỗi review:

1. Xác định review đề cập tới khía cạnh nào trong:
   - món ăn
   - giá cả
   - dịch vụ
   - không gian
   - vệ sinh

2. Một review có thể đề cập nhiều khía cạnh.

3. Với mỗi khía cạnh, xác định:
   - sentiment: "positive", "neutral", hoặc "negative"
   - confidence: số từ 0.0 đến 1.0

4. is_urgent = true nếu review có vấn đề nghiêm trọng:
   - ngộ độc thực phẩm
   - dị vật trong đồ ăn
   - mất vệ sinh nghiêm trọng
   - nhân viên gây hấn
   - hoặc vấn đề nghiêm trọng tương tự

5. Nếu review không đề cập rõ khía cạnh nào:
   "aspects": []

6. Phải giữ nguyên review_id.

CHỈ trả về JSON, không giải thích.

Cấu trúc bắt buộc:

{{
  "reviews": [
    {{
      "review_id": 123,
      "aspects": [
        {{
          "aspect": "món ăn",
          "sentiment": "positive",
          "confidence": 0.95
        }}
      ],
      "is_urgent": false,
      "urgent_reason": ""
    }}
  ]
}}

DANH SÁCH REVIEW:

{reviews}
"""


client = None

if API_KEY:
    client = genai.Client(api_key=API_KEY)


def analyze_batch_reviews(reviews: list, retries: int = 3) -> list:
    """
    Phân tích nhiều review trong MỘT request Gemini.

    reviews:
    [
        {"id": 1, "text": "..."},
        {"id": 2, "text": "..."}
    ]

    Trả về:
    [
        {
            "review_id": 1,
            "aspects": [...],
            "is_urgent": False,
            "urgent_reason": "",
            "_analysis_succeeded": True
        }
    ]
    """

    if not client:
        print("  [Cảnh báo] Chưa cấu hình GEMINI_API_KEY.")

        return [
            {
                "review_id": review["id"],
                "aspects": [],
                "is_urgent": False,
                "urgent_reason": "",
                "_analysis_succeeded": False,
            }
            for review in reviews
        ]

    reviews_text = []

    for review in reviews:
        reviews_text.append(
            f'REVIEW_ID: {review["id"]}\n'
            f'TEXT: {review["text"]}'
        )

    prompt = PROMPT_TEMPLATE.format(
        reviews="\n\n".join(reviews_text)
    )

    for attempt in range(retries):

        try:
            print(
                f"  -> Gửi {len(reviews)} review "
                f"trong 1 request tới {MODEL_NAME}"
            )

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0,
                ),
            )

            data = json.loads(response.text)

            results = data.get("reviews", [])

            # Map kết quả theo review_id
            result_map = {
                item["review_id"]: item
                for item in results
            }

            final_results = []

            for review in reviews:

                review_id = review["id"]

                if review_id in result_map:

                    result = result_map[review_id]

                    result["_analysis_succeeded"] = True

                    final_results.append(result)

                else:

                    print(
                        f"  [Cảnh báo] Gemini không trả "
                        f"kết quả cho review {review_id}"
                    )

                    final_results.append({
                        "review_id": review_id,
                        "aspects": [],
                        "is_urgent": False,
                        "urgent_reason": "",
                        "_analysis_succeeded": False,
                    })

            return final_results

        except Exception as e:

            error_text = str(e).lower()

            print(
                f"  Lỗi Gemini batch "
                f"(lần {attempt + 1}/{retries}): {e}"
            )

            # Hết quota → KHÔNG retry
            if (
                "429" in error_text
                or "resource_exhausted" in error_text
                or "quota" in error_text
            ):
                print(
                    "  -> Đã hết quota Gemini free tier."
                )
                break

            # Model không tồn tại
            if (
                "404" in error_text
                or "not_found" in error_text
            ):
                print(
                    "  -> Model Gemini không khả dụng."
                )
                break

            # API key
            if (
                "401" in error_text
                or "403" in error_text
            ):
                print(
                    "  -> API key hoặc quyền truy cập "
                    "có vấn đề."
                )
                break

            # Lỗi tạm thời
            if attempt < retries - 1:
                wait = 3 * (attempt + 1)

                print(
                    f"  -> Thử lại sau {wait} giây..."
                )

                time.sleep(wait)

    return [
        {
            "review_id": review["id"],
            "aspects": [],
            "is_urgent": False,
            "urgent_reason": "",
            "_analysis_succeeded": False,
        }
        for review in reviews
    ]


def analyze_batch(
    reviews: list,
    delay_seconds: float = 1.5
) -> list:
    """
    Phân tích toàn bộ reviews theo batch.

    Ví dụ 100 review với BATCH_SIZE=20:

    batch 1: 1-20
    batch 2: 21-40
    batch 3: 41-60
    batch 4: 61-80
    batch 5: 81-100
    """

    results = []

    total = len(reviews)

    for start in range(0, total, BATCH_SIZE):

        batch = reviews[
            start:start + BATCH_SIZE
        ]

        batch_number = start // BATCH_SIZE + 1

        total_batches = (
            (total + BATCH_SIZE - 1)
            // BATCH_SIZE
        )

        print(
            f"\n  === Batch {batch_number}/{total_batches} "
            f"({len(batch)} review) ==="
        )

        batch_results = analyze_batch_reviews(batch)

        results.extend(batch_results)

        # Delay giữa các batch
        if start + BATCH_SIZE < total:
            time.sleep(delay_seconds)

    return results