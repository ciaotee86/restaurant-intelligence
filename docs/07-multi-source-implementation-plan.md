# KẾ HOẠCH TRIỂN KHAI: MỞ RỘNG ĐA NGUỒN GOOGLE MAPS & THƯỚC ĐO ĐỘ TIN CẬY
## Lộ Trình Kỹ Thuật 2-Tier, Phân Rã Chi Tiết Từng Tác Vụ & Tiêu Chí Nghiệm Thu

> **Mã kế hoạch**: `PLAN-FEAT-06`  
> **Dự án**: Restaurant Intelligence System  
> **Tài liệu tham chiếu**: [`docs/06-multi-source-expansion-spec.md`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/docs/06-multi-source-expansion-spec.md)  

---

## 1. Lộ Trình Tổng Quan Cấp Cao (High-Level Roadmap)

| Phase | Tên giai đoạn | Thời lượng | Mục tiêu cốt lõi | Sản phẩm bàn giao |
| :---: | :--- | :---: | :--- | :--- |
| **P1** | **Database & Khớp Thực Thể** | 1 buổi | Schema đa nguồn, khớp quán và chống trùng | Migration script, `entity_resolution.py` |
| **P2** | **Google Maps Crawler** | 1 - 2 buổi | Thu thập tự động 30-50 review qua Playwright | `google_maps_crawler.py`, endpoint `/api/crawler/google-maps` |
| **P3** | **Độ Tin Cậy & UI Thích Ứng** | 1 buổi | Huy hiệu độ tin cậy mẫu, lọc đa nguồn | UI Badges, Bộ lọc nguồn trên `ReviewExplorer` |
| **P4** | **GitHub Actions Cloud Pipeline** | 0.5 buổi | Tự động hóa cào ngầm, đổi IP trên Cloud | Workflow `.github/workflows/scheduled_crawler.yml` |
| **P5** | **Kiểm Thử & Đóng Gói** | 0.5 buổi | Kiểm thử end-to-end, test suite, tài liệu | Bộ test cases, CHANGELOG v1.14.0 |

---

## 2. Chi Tiết Phân Rã Công Việc (Detailed Task Breakdown)

### Phase 1: Database Migration & Khớp Thực Thể (Entity Resolution)

- [x] **[TASK-01] Nâng cấp Schema SQLite & Script Migration Tương Thích Ngược** (1.5h)
  - **Module/Files**: `restaurant-review-ai/database/models.py`, `restaurant-review-ai/database/migrate_multisource.py`
  - **Dependencies**: Không có.
  - **Chi tiết**:
    - Chỉnh sửa `models.py`: Bảng `restaurants` bổ sung các cột `google_maps_url`, `google_place_id`, `foody_review_count`, `google_review_count`, `credibility_score`; cho phép `foody_url` mang giá trị NULL.
    - Bảng `reviews` bổ sung cột `source` (mặc định `'Foody'`) và `google_review_id`.
    - Viết script `migrate_multisource.py` sử dụng câu lệnh `ALTER TABLE` an toàn, bảo toàn 100% dữ liệu các quán và đánh giá hiện có trong file `restaurants.db`.
  - **DoD / Acceptance Criteria**:
    - Chạy script thành công trên database hiện tại mà không làm mất mát bất kỳ dòng dữ liệu nào.
    - Toàn bộ 41 test cases hiện có vẫn pass bình thường.

- [x] **[TASK-02] Xây Dựng Thuật Toán Khớp Thực Thể & Khử Trùng Lặp (Entity Resolution)** (2h)
  - **Module/Files**: `restaurant-review-ai/services/entity_resolution.py`
  - **Dependencies**: TASK-01.
  - **Chi tiết**:
    - Viết hàm `resolve_or_create_restaurant(db, name, address, google_maps_url, foody_url)`:
      * Bước 1: Tìm theo URL Google Maps hoặc Foody trực tiếp.
      * Bước 2: So khớp mờ (Fuzzy Token Set Match) tên quán không dấu ($\ge 85\%$).
      * Bước 3: So khớp tên đường và quận/thành phố để xác định cùng chi nhánh.
      * Bước 4: Nếu khớp, trả về `restaurant_id` có sẵn và cập nhật link Google Maps; nếu không khớp địa chỉ, tạo chi nhánh mới.
    - Viết hàm `is_duplicate_review(db, restaurant_id, review_text)`: băm SHA-256 chuỗi văn bản đã chuẩn hóa và đối chiếu với cột `fingerprint`.
  - **DoD / Acceptance Criteria**:
    - Khi nạp bài từ Google Maps cho quán "Cơm Gà Gia Vĩnh", dữ liệu gắn chính xác vào `restaurant_id` cũ, số lượng quán trong DB không đổi.

---

### Phase 2: Google Maps Crawler Engine (Playwright Headless)

- [x] **[TASK-03] Xây Dựng Module Playwright Google Maps Scraper** (3h)
  - **Module/Files**: `restaurant-review-ai/crawler/google_maps_crawler.py`
  - **Dependencies**: Cài đặt gói `playwright` (`pip install playwright`).
  - **Chi tiết**:
    - Khởi tạo trình duyệt Chromium headless với stealth options (`--disable-blink-features=AutomationControlled`, `--no-sandbox`, User-Agent thật của Chrome).
    - Mở URL địa điểm Google Maps, click vào tab "Đánh giá".
    - Tìm và cuộn container danh sách review `.m6QErb.DxyBCb` với human-like delay (400-700ms) để tải 30-50 đánh giá mới nhất.
    - Click tự động các nút "Xem thêm" (`button.w8nwRe`) để lấy trọn vẹn văn bản dài.
    - Trích xuất: Tên người dùng, điểm sao (1-5), thời gian tương đối, nội dung review.
  - **DoD / Acceptance Criteria**:
    - Cào thành công tối thiểu 25-40 review từ một link Google Maps bất kỳ trong thời gian $< 25\text{s}$.
    - Bắt lỗi timeout và trả về kết quả rỗng một cách an toàn nếu Google yêu cầu CAPTCHA.

- [x] **[TASK-04] Tích Hợp API Router Crawler & Pipeline ABSA** (1.5h)
  - **Module/Files**: `restaurant-review-ai/routers/crawler.py`
  - **Dependencies**: TASK-02, TASK-03.
  - **Chi tiết**:
    - Thêm endpoint `POST /api/crawler/google-maps` nhận `restaurantId`, `googleMapsUrl`, `maxReviews`.
    - Gọi `google_maps_crawler.py` thu thập dữ liệu thô.
    - Chạy dữ liệu qua `review_filter.py` lọc spam $\rightarrow$ Khử trùng lặp qua `fingerprint` $\rightarrow$ Chạy `gemini_analyzer.py` phân tích ABSA 5 khía cạnh $\rightarrow$ Lưu vào SQLite với `source='GoogleMaps'`.
    - Cập nhật bộ đếm `review_count`, `google_review_count` và tính lại `credibility_score`.
  - **DoD / Acceptance Criteria**:
    - Gọi API trả về mã 200 kèm số lượng review mới cào và số bài trùng lặp bị bỏ qua.

---

### Phase 3: Thước Đo Độ Tin Cậy & Giao Diện Thích Ứng (Adaptive UI)

- [x] **[TASK-05] Backend Thống Kê Đa Nguồn & Độ Tin Cậy Mẫu** (1h)
  - **Module/Files**: `restaurant-review-ai/services/bi_service.py`
  - **Dependencies**: TASK-01.
  - **Chi tiết**:
    - Cập nhật `format_restaurant_full()` bổ sung các chỉ số:
      * `sourceBreakdown`: `{ total: N, foody: X, googleMaps: Y }`
      * `credibilityScore`: Tỷ lệ phần trăm tin cậy mẫu $C = \min\left(1.0, \frac{\ln(N + 1)}{\ln(31)}\right) \times 100\%$
      * `credibilityLevel`: `'high'` ($\ge 90\%$), `'medium'` ($65-89\%$), `'low'` ($< 65\%$)
      * `sampleWarning`: Thông điệp khuyến nghị nếu $N < 10$.
  - **DoD / Acceptance Criteria**:
    - Endpoint `/api/restaurants/{id}` trả về đầy đủ các trường thống kê đa nguồn mới.

- [x] **[TASK-06] Frontend Giao Diện Đa Nguồn, Badge Độ Tin Cậy & Modal Liên Kết** (3h)
  - **Module/Files**: `src/components/dashboard/RestaurantHero.tsx`, `src/components/dashboard/ReviewExplorer.tsx`, `src/components/dashboard/LinkGoogleMapsModal.tsx`
  - **Dependencies**: TASK-04, TASK-05.
  - **Chi tiết**:
    - **RestaurantHero**: Hiển thị Huy hiệu Độ Tin Cậy Mẫu với màu sắc trực quan (Xanh: Đủ mẫu, Vàng: Khá, Đỏ: Mẫu nhỏ). Nút **`🔗 Bổ sung từ Google Maps`** mở modal liên kết.
    - **LinkGoogleMapsModal**: Cho phép dán link Google Maps hoặc tìm nhanh theo tên quán, hiển thị thanh tiến trình khi đang cào.
    - **ReviewExplorer**: Thêm Chip lọc nguồn đánh giá: `Tất cả`, `Foody`, `Google Maps`. Trên mỗi thẻ review hiển thị Badge nhận diện nguồn (`[Foody]` hoặc `[G-Maps]`).
  - **DoD / Acceptance Criteria**:
    - Giao diện đạt chuẩn Warm Gastronomy & Modern Editorial, responsive mượt mà.
    - Lọc review theo nguồn hoạt động chính xác tức thì trên Frontend.

---

### Phase 4: Tự Động Hóa CI/CD Trên Cloud (GitHub Actions DataOps)

- [x] **[TASK-07] Nâng Cấp GitHub Actions Workflow Cho Đa Nguồn** (1.5h)
  - **Module/Files**: `.github/workflows/scheduled_crawler.yml`, `restaurant-review-ai/run_pipeline.py`
  - **Dependencies**: TASK-03, TASK-04.
  - **Chi tiết**:
    - Bổ sung bước cài đặt Playwright browsers trong GitHub Actions runner (`npx playwright install chromium --with-deps` hoặc qua Python).
    - Cập nhật script `run_pipeline.py` chế độ `--auto-enrich`: Tự động tìm các quán trong database đang có $N < 10$ review để kích hoạt cào bù đắp từ Google Maps.
    - Cấu hình cron chạy định kỳ mỗi đêm (02:00 AM UTC+7) và hỗ trợ chạy thủ công (`workflow_dispatch`).
    - Tự động commit file `restaurants.db` mới về nhánh chính.
  - **DoD / Acceptance Criteria**:
    - Kích hoạt workflow thủ công trên GitHub Actions chạy thành công từ đầu đến cuối không bị lỗi.

---

### Phase 5: Kiểm Thử Toàn Diện & Đóng Gói

- [x] **[TASK-08] Bộ Kiểm Thử Tự Động & Cập Nhật Changelog** (1.5h)
  - **Module/Files**: `restaurant-review-ai/tests/test_multisource.py`, `CHANGELOG.md`
  - **Dependencies**: Hoàn tất Phase 1 đến Phase 4.
  - **Chi tiết**:
    - Viết test cases kiểm tra: Schema migration, Entity Resolution khớp quán, Deduplication qua fingerprint, công thức tính Credibility Score.
    - Kiểm tra `npx oxlint` 0 lỗi và `npm run build` thành công.
    - Cập nhật `CHANGELOG.md` lên phiên bản `v1.14.0`.
  - **DoD / Acceptance Criteria**:
    - 100% pytest test cases pass.
    - Hệ thống sẵn sàng cho demo thuyết trình.

---

## 3. Tiêu Chí Nghiệm Thu Từng Giai Đoạn (Phase Exit Criteria)

1. **Phase 1 Exit**: Database SQLite bảo toàn 100% dữ liệu cũ, hàm khớp thực thể phân biệt chính xác cùng quán vs khác chi nhánh.
2. **Phase 2 Exit**: Playwright cào được trung bình 30-50 review từ Google Maps, nạp đúng vào quán và chạy phân tích Gemini ABSA thành công.
3. **Phase 3 Exit**: Dashboard thể hiện minh bạch chỉ số tin cậy mẫu, thẻ review có badge nguồn và bộ lọc nguồn mượt mà.
4. **Phase 4 Exit**: GitHub Actions chạy tự động trên máy ảo Ubuntu và commit database thành công.
5. **Phase 5 Exit**: Toàn bộ unit/integration tests pass 100%, bản build Vite không có bất kỳ warning/error nào.
