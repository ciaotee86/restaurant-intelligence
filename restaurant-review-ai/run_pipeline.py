#!/usr/bin/env python3
"""
CLI Runner điều khiển tiến trình Tự động Cào & Phân tích Đánh giá Hàng loạt.

Ví dụ sử dụng:
  # Cào tự động cho thành phố Đà Nẵng, 2 quán mỗi thể loại:
  python run_pipeline.py --cities da-nang --max-places 2 --max-reviews 20

  # Cào theo các danh mục cụ thể:
  python run_pipeline.py --cities da-nang --categories "cơm gà,bánh tráng cuốn thịt heo,mì quảng"

  # Chạy ở chế độ Daemon (chạy ngầm lặp lại mỗi 24 tiếng):
  python run_pipeline.py --daemon --interval-hours 24
"""

import argparse
import sys
import time
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from automated_pipeline import run_full_pipeline, process_pending_user_requests


def main():
    parser = argparse.ArgumentParser(description="Restaurant Intelligence Batch Ingestion Pipeline")
    parser.add_argument(
        "--cities",
        type=str,
        default="",
        help="Danh sách thành phố phân cách bằng dấu phẩy (vd: da-nang,ho-chi-minh,ha-noi)"
    )
    parser.add_argument(
        "--categories",
        type=str,
        default="",
        help="Danh mục món ăn phân cách bằng dấu phẩy (vd: 'cơm gà,bánh tráng,phở')"
    )
    parser.add_argument(
        "--max-places",
        type=int,
        default=2,
        help="Số lượng quán tối đa cần lấy cho mỗi danh mục (mặc định: 2)"
    )
    parser.add_argument(
        "--max-reviews",
        type=int,
        default=25,
        help="Số lượng đánh giá tối đa cào cho mỗi quán (mặc định: 25)"
    )
    parser.add_argument(
        "--requests-only",
        action="store_true",
        help="Chỉ xử lý các yêu cầu từ người dùng trong hàng đợi crawl_requests"
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Chạy ngầm liên tục theo chu kỳ"
    )
    parser.add_argument(
        "--interval-hours",
        type=float,
        default=24.0,
        help="Khoảng thời gian lặp lại khi chạy daemon (giờ, mặc định: 24)"
    )

    args = parser.parse_args()

    cities = [c.strip() for c in args.cities.split(",") if c.strip()] if args.cities else None
    categories = [c.strip() for c in args.categories.split(",") if c.strip()] if args.categories else None

    if args.requests_only:
        print("-> Đang kiểm tra và xử lý hàng đợi yêu cầu từ người dùng...")
        count = process_pending_user_requests(max_requests=20, max_reviews=args.max_reviews)
        print(f"-> Hoàn tất xử lý {count} yêu cầu!")
        return

    if args.daemon:
        interval_secs = int(args.interval_hours * 3600)
        print(f"🔄 Khởi động chế độ Daemon ngầm. Sẽ lặp lại mỗi {args.interval_hours} giờ...")
        while True:
            try:
                run_full_pipeline(
                    cities=cities,
                    categories=categories,
                    max_places_per_cat=args.max_places,
                    max_reviews_per_place=args.max_reviews
                )
            except Exception as e:
                print(f"[Daemon Error] {e}")
            
            print(f"⏳ Nghỉ ngơi {args.interval_hours} giờ trước phiên quét tiếp theo...")
            time.sleep(interval_secs)
    else:
        run_full_pipeline(
            cities=cities,
            categories=categories,
            max_places_per_cat=args.max_places,
            max_reviews_per_place=args.max_reviews
        )


if __name__ == "__main__":
    main()
