# Hệ thống phân tích đánh giá nhà hàng (Foody + Gemini API + SQLite)

## Cấu trúc project
```
restaurant-review-ai/
├── crawler/foody_crawler.py     # cào review từ Foody bằng Selenium
├── database/models.py           # schema SQLAlchemy (3 bảng)
├── database/db.py                # kết nối + CRUD dùng chung
├── analysis/gemini_analyzer.py  # gọi Gemini phân tích khía cạnh + cảm xúc
├── dashboard/app.py              # dashboard Streamlit
├── main.py                       # chạy pipeline: crawl -> lưu -> phân tích
└── data/restaurants.db           # file SQLite (tự tạo khi chạy lần đầu)
```

## Cài đặt

```bash
pip install -r requirements.txt
```

Cần cài Google Chrome trên máy (Selenium điều khiển Chrome thật).

## Lấy Gemini API key (miễn phí)

1. Vào https://aistudio.google.com/apikey
2. Tạo key mới
3. Copy file `.env.example` thành `.env`, dán key vào:
   ```
   GEMINI_API_KEY=key_cua_ban
   ```

## Chạy pipeline

1. Mở `main.py`, điền URL các quán muốn cào vào `RESTAURANT_URLS`
2. Chạy:
   ```bash
   python main.py
   ```
   Lần đầu sẽ cào + lưu DB + phân tích 1 batch review (mặc định 30 review/lần,
   chỉnh `BATCH_SIZE_ANALYSIS` trong `main.py` nếu muốn nhanh hơn — free tier Gemini
   có giới hạn request/phút nên đừng để quá cao).
3. Chạy lại `python main.py` nhiều lần nếu còn review chưa phân tích — review đã
   phân tích rồi sẽ được bỏ qua tự động (cột `is_analyzed` trong bảng `reviews`).

## Xem dashboard

```bash
streamlit run dashboard/app.py
```

## Nếu crawler báo lỗi "không tìm thấy phần tử"

Foody có thể đã đổi giao diện. Mở trang quán trên Chrome, bấm F12 > Elements,
tìm đúng class/thẻ HTML của tên quán / review / rating, rồi cập nhật lại các
hằng số `SELECTOR_*` ở đầu file `crawler/foody_crawler.py`.

## Lưu ý học thuật

- Chỉ cào dữ liệu phục vụ mục đích học tập/nghiên cứu, không dùng cho mục đích thương mại.
- Giữ nguyên các `time.sleep()` trong crawler để tránh gửi request quá nhanh, dễ bị chặn IP.
- Backup CSV (`data/raw_reviews_backup.csv`) được tạo tự động sau mỗi lần crawl,
  phòng khi DB gặp lỗi vẫn còn dữ liệu thô để khôi phục.
