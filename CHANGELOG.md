# Changelog

All notable changes to the **Restaurant Intelligence** project will be documented in this file.

## [1.6.4] - 2026-10-10

### Nâng cấp Bộ Lọc Tìm Kiếm Thông Minh theo Tỉnh/Thành phố & Món Ăn
- **Tự động nhận diện Địa danh trong Từ khóa (`src/utils/cityUtils.ts`)**:
  - Xây dựng module nhận diện 25+ tỉnh thành trên toàn quốc với danh sách alias có dấu và không dấu.
  - Phân tích từ khóa tìm kiếm (`parseSearchQuery`):
    - Khi từ khóa chứa tên thành phố (ví dụ: `"đà nẵng"`, `"cơm hà nội"`, `"bánh xèo đà nẵng"`), hệ thống tự động bóc tách thành phố và từ khóa món ăn còn lại.
    - Lọc nghiêm ngặt 100% quán thuộc đúng địa phương đó, loại bỏ triệt để tình trạng quán ở Bình Dương, Sài Gòn,... lọt vào khi tìm kiếm Đà Nẵng.
    - Nhận diện các món ăn phức hợp truyền thống (ví dụ: `"bún bò huế"`, `"mì quảng"`) mà không bị nhầm lẫn ép lọc sai thành phố khi người dùng chỉ muốn tìm món ăn.
- **Tìm kiếm Món ăn Toàn quốc khi chỉ gõ tên món**:
  - Khi người dùng chỉ gõ món ăn (ví dụ: `"cơm gà"`, `"bánh tráng"`, `"pizza"`), hệ thống không giới hạn thành phố và hiển thị kết quả trên toàn bộ các địa phương.
- **Loại bỏ False Positive từ Nội dung Review**:
  - Thay thế việc so khớp chuỗi con tự do trong hàng nghìn ký tự review bằng cơ chế so khớp từ nguyên vẹn (word-boundary token match) và so khớp cụm từ (phrase match) trên tên, ẩm thực, địa chỉ và từ khóa khía cạnh.
- **Đồng bộ hóa Backend API (`routers/restaurants.py` & `services/bi_service.py`)**:
  - Nâng cấp endpoint `/restaurants/search` và `/search` trên FastAPI backend với cùng cơ chế tách thành phố và lọc chính xác.
  - Cải tiến `detect_city()` tận dụng Foody URL slug, địa chỉ chi tiết (quận/huyện) và tên thương hiệu để chuẩn hóa 100% dữ liệu 234 quán ăn trong database.
- **Kiểm thử**:
  - Bổ sung 3 test case hồi quy trong `test_search_and_crawl.py` kiểm chứng kết quả lọc Đà Nẵng, Hà Nội và toàn quốc (100% pass).

## [1.6.3] - 2026-10-10

### Khắc phục Lỗi "Unexpected token 'I', Internal Server Error" khi Tìm kiếm & Tổng hợp Đánh giá Quán Mới
- **Sửa lỗi `AttributeError` tại Backend (`routers/crawler.py`)**:
  - Loại bỏ các truy cập thuộc tính không tồn tại trên SQLAlchemy model `Restaurant` (`r.slug`, `r.cuisine`) trong vòng lặp so khớp từ khóa SQLite.
  - Sử dụng slug từ `r.foody_url` và kết hợp tên/địa chỉ chuẩn hóa, ngăn chặn triệt để lỗi crash HTTP 500 khi người dùng tìm kiếm từ khóa quán ăn chưa có trong danh mục.
  - Bao bọc toàn bộ khối xử lý của `/search-and-crawl` trong `try ... except` có ghi log chi tiết để trả về mã lỗi và thông điệp JSON tường minh.
- **Bảo vệ Toàn diện FastAPI Global Exception Handler (`api_server.py`)**:
  - Đăng ký middleware `@app.exception_handler(Exception)` để mọi ngoại lệ không mong muốn đều được phản hồi dưới dạng JSON chuẩn `{ "detail": "..." }`, loại bỏ tình trạng phản hồi plain text `"Internal Server Error"` làm crash bộ phân tích JSON phía client.
- **Phòng thủ Frontend An toàn (`src/services/restaurantService.ts`)**:
  - Bổ sung helper `parseResponseSafe()` cho tất cả các cuộc gọi API (`searchAndCrawlFoody`, `analyzeFoodyUrl`, `requestCrawl`, `fetchFromApi`).
  - Kiểm tra trạng thái HTTP và đọc raw text trước khi parse JSON, ngăn chặn hoàn toàn lỗi SyntaxError `Unexpected token 'I', "Internal S"... is not valid JSON` trên giao diện người dùng.
- **Unit Testing**:
  - Bổ sung bộ test hồi quy `restaurant-review-ai/test_search_and_crawl.py` kiểm chứng tìm kiếm từ khóa và validation đầu vào.

## [1.6.2] - 2026-10-09

### Khắc phục Triệt để Lỗi Hiển thị 6 Quán vs >200 Thực thể Database trên Localhost & Production
- **Kiến trúc Tự động Đồng bộ Khởi chạy Dev (`concurrently`)**:
  - Tích hợp `concurrently` vào `package.json` để lệnh `npm run dev` tự động khởi chạy song song cả **Vite Frontend (5173)** và **FastAPI Backend (8000)** cùng lúc.
  - Phân tách các lệnh chạy lẻ linh hoạt: `npm run dev:frontend` và `npm run dev:backend`.
- **Cơ chế Khôi phục Dữ liệu Siêu Bền Vững (Database Seed Resilience)**:
  - Khởi tạo thư mục chuẩn `restaurant-review-ai/seed_data/restaurants.db` với đầy đủ 233 quán ăn thực tế được theo dõi bởi Git.
  - Nâng cấp `init_db()` trong `models.py`: Tự động kiểm tra nếu SQLite rỗng, 0 bytes hoặc bảng `restaurants` có 0 bản ghi (do gắn Persistent Disk mới trên Cloud che lấp), hệ thống tự động copy seed database sang trước khi mở cổng HTTP.
- **In-Memory TTL Caching cho `/api/restaurants`**:
  - Thêm bộ đệm RAM 5 phút cho endpoint `/restaurants` trong `routers/restaurants.py`. Tốc độ phản hồi từ lượt thứ hai giảm từ 1.42s xuống **0.00001s (< 1ms)**.
  - Tự động hủy cache (`invalidate_restaurants_cache`) ngay khi có quán ăn mới được cào và phân tích thành công.
- **Tách Biệt Hoàn Toàn Dữ Liệu Tĩnh Khỏi Runtime (Triển khai Phương án A)**:
  - Loại bỏ hoàn toàn 6 bản ghi tĩnh giả lập trong `mockRestaurants.ts` khỏi client runtime và lưu trữ độc lập tại `tests/fixtures/mockRestaurants.ts` cho Unit Testing. Giảm hơn **51.8 KB** dung lượng JS bundle production.
  - Chuyển đổi 100% logic giao diện sang trung thực (Honest UI): Hiển thị Banner lỗi mất kết nối trực quan kèm nút "Thử kết nối lại" (Retry), loại bỏ vĩnh viễn rủi ro đánh tráo dữ liệu mẫu che giấu lỗi hệ thống.
  - Xóa bỏ việc trộn đè 6 quán mẫu vào danh sách 233 quán thật khi kết nối database thành công.

## [1.6.0] - 2026-10-06

### Tối ưu Tốc độ Tổng hợp Đánh giá Quán ăn (Modal & Crawler Optimization)
- **Instant Autocomplete từ Database có sẵn (Tốc độ < 0.1s)**:
  - Khi người dùng gõ tên quán/từ khóa, hiển thị ngay dropdown gợi ý từ 233 quán đã có trong SQLite.
  - Bấm chọn quán là mở ngay báo cáo phân tích lập tức trong 0.1s, hoàn toàn không cần cào mạng Foody hay gọi AI.
- **Fast HTTP Path cho Tìm kiếm Quán ăn trên Foody (< 1s)**:
  - Triển khai `_search_foody_via_http` bằng Direct HTTP GET + BeautifulSoup, loại bỏ 100% thời gian khởi động Chrome nặng nề ở khâu tìm kiếm (giảm từ 8s xuống < 1s).
  - Tự động fallback sang Selenium nếu HTTP gặp sự cố.
- **Tối ưu Chrome Headless & Eager Page Load**:
  - Bật cờ `--blink-settings=imagesEnabled=false` chặn hoàn toàn tải ảnh của Foody (tiết kiệm băng thông & tăng tốc 3x).
  - Thiết lập `page_load_strategy = 'eager'` không chờ các tài nguyên phụ của Foody tải xong.
  - Tối ưu hóa chu kỳ sleep cuộn trang và phân trang (`0.8s` thay vì `2.0s`).
- **Nâng cấp UX với Progress Stepper 3 bước**:
  - Thay thế spinner quay tròn vô định bằng thanh tiến trình 3 bước trực quan: (1) Tra cứu quán $\rightarrow$ (2) Thu thập đánh giá $\rightarrow$ (3) Gemini AI phân tích khía cạnh.
  - Bổ sung tùy chọn linh hoạt số lượng đánh giá: 15 (Siêu tốc ~5-8s), 25 (Tiêu chuẩn ~12-15s), 40 (Chuyên sâu ~25s).

## [1.5.1] - 2026-10-05

### Conversational BI Engine Fixes & Decoupling
- **Phân định rạch ròi 2 chế độ xử lý theo Checkbox "Sáng tạo sâu (Gemini)"**:
  - Khi checkbox **TẮT** (`force_ai = false`): 100% xử lý bằng **Local Contextual BI** (tiết kiệm Quota, 0 Token, nhãn `Phân tích số liệu thực tế`). Tuyệt đối không gọi Gemini API.
  - Khi checkbox **BẬT** (`force_ai = true`): Gọi trực tiếp **Gemini 3.5 Flash Lite** (nhãn `Gemini AI Engine`).
- **Bổ sung phân tích Điểm nghẽn Vận hành (`bottleneck_flow`) cho Local BI**:
  - Nhận diện các câu hỏi về luồng chính, điểm nghẽn, trơn tru, ách tắc, trục trặc vận hành.
  - Trích xuất tỷ lệ tiêu cực, các điểm nghẽn cụ thể từ `attentionAreas` và các giải pháp ưu tiên từ `operationalChecklist`.
- **Frontend & Networking Enhancements**:
  - Thêm cấu hình Proxy `/api` trong `vite.config.ts` để đồng bộ kết nối backend trên mọi port dev server.
  - Cập nhật Client-side Offline Fallback trong `restaurantService.ts` đồng bộ đầy đủ các bộ phân tích menu và điểm nghẽn.

## [1.5.0] - 2026-10-05

### Conversational BI Assistant (Trợ lý AI Hỏi-Đáp Nhà Hàng)
- **Kiến trúc Hybrid 2-Tier thông minh**:
  - **Tier 1 (Local BI Synthesis)**: Tự động phát hiện ý định câu hỏi (món ăn, phục vụ, giá cả, không gian/vệ sinh, hành động cải tiến kinh doanh, tổng quan) và tổng hợp câu trả lời chi tiết dựa trên dữ liệu ABSA thực tế của quán. **0 token, 0 latency, 0% rủi ro cạn Quota**.
  - **Tier 2 (Gemini Flash Deep Context)**: Hỗ trợ phân tích câu hỏi tự do mở rộng qua `google-genai` SDK khi người dùng bật chế độ "Sáng tạo sâu", có cơ chế graceful degradation nếu mất mạng hoặc chạm quota.
- **In-Memory FAQ & Semantic Caching**:
  - Bộ nhớ đệm tự động lưu trữ câu trả lời theo cặp `{restaurant_id}:{normalized_question}`.
  - Phản hồi tức thì trong 0ms khi hỏi lại các câu hỏi phổ biến hoặc click vào Quick Question pills.
- **Giao diện Chat trực quan (`AiAssistantWidget.tsx`)**:
  - Tích hợp 4 câu hỏi định hướng nhanh (Quick Question Pills) sinh động theo từng quán ăn.
  - Nhãn hiển thị nguồn dữ liệu minh bạch (`Phân tích dữ liệu thực tế (0 Quota)`, `Bộ nhớ đệm (0ms)`, `Gemini AI`).
  - Hỗ trợ format Markdown (in đậm, danh sách gạch đầu dòng, mã khối).
  - Tích hợp vào 3 vị trí: Tab riêng "Trợ lý AI" (có badge Mới), góc dưới Dashboard Thực khách và Dashboard Chủ quán.
- **Backend Endpoints & Unit Tests**:
  - `GET /api/restaurants/{id}/quick-questions`: Lấy danh sách câu hỏi nhanh gợi ý cho quán.
  - `POST /api/restaurants/{id}/ask`: Nhận câu hỏi, phân loại intent, tra cứu cache hoặc gọi Gemini.
  - `test_assistant_service.py`: 3/3 tests PASSED (Quick questions, Intent classification, In-memory cache hit).

## [1.4.0] - 2026-10-05

### Backend Architecture Refactoring
- **Modularized FastAPI backend**: Tách file nguyên khối `api_server.py` (> 1.160 dòng) thành kiến trúc 3 lớp rõ ràng:
  - `restaurant-review-ai/services/bi_service.py`: Tách toàn bộ Business Intelligence engine (`format_restaurant_full`, SWOT analysis, operational checklist generation, aspect calculations).
  - `restaurant-review-ai/services/pipeline_service.py`: Điều phối lưu trữ dữ liệu cào và phân tích Gemini ABSA theo batch an toàn.
  - `restaurant-review-ai/routers/restaurants.py`: Nhóm các endpoint đọc thông tin quán ăn (`/api/restaurants`, `/api/restaurants/{id}`, `/api/search`, `/api/suggestions`, `/api/health`).
  - `restaurant-review-ai/routers/crawler.py`: Nhóm các endpoint cào dữ liệu và quản lý hàng đợi (`/api/analyze-url`, `/api/search-and-crawl`, `/api/request-crawl`, `/api/crawl-requests`).
  - `restaurant-review-ai/api_server.py`: Rút gọn xuống ~95 dòng làm đúng vai trò Application Entrypoint & Static Server.
- **Unit Testing**: Bổ sung bộ kiểm thử `test_bi_service.py` cho logic tính toán BI độc lập mà không cần khởi động Web Server (5/5 tests PASSED).

### Database Concurrency
- **SQLite WAL Mode**: Kích hoạt `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL` và `PRAGMA busy_timeout=30000` trong `models.py` và `db.py` để ngăn triệt để lỗi database lock khi crawler chạy ngầm.

### Frontend Optimization
- **Linter & Performance**: Khắc phục triệt để 14 cảnh báo `react(set-state-in-effect)`, `missing dependencies` và `unused-vars` trên React 19 trong `App.tsx`, `HomePage.tsx`, `ExplorePage.tsx`, `SearchBar.tsx`, `RestaurantCard.tsx`, `AspectAnalysis.tsx`, `Footer.tsx`, `Navbar.tsx`, `AnalyzeUrlModal.tsx`.
- Oxlint & Vite Build đạt chuẩn 0 warnings, 0 errors.
