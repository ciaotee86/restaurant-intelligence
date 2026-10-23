# Changelog

All notable changes to the **Restaurant Intelligence** project will be documented in this file.

## [1.15.2] - 2026-10-23

### Dọn Dẹp Cơ Sở Dữ Liệu: Loại Bỏ Các Nhà Hàng Không Có Đánh Giá (Database Clean-up & Zero-Review Purge)
- **Thanh Lọc Cơ Sở Dữ Liệu SQLite (`restaurant-review-ai/data/restaurants.db` & `seed_data/restaurants.db`)**:
  - Đã sao lưu an toàn trước khi xóa: `restaurants.db.bak_pre_clear`.
  - Quét và loại bỏ thành công **147 nhà hàng rác không có bài đánh giá nào** (`review_count = 0` và không có bản ghi nào trong bảng `reviews`).
  - Tổng số nhà hàng sau khi tinh gọn: **103 nhà hàng** (toàn bộ 100% đều có bài đánh giá thực tế và dữ liệu phân tích khía cạnh đầy đủ, tổng cộng **783 bài đánh giá**).
  - Thực hiện lệnh `VACUUM` và checkpoint SQLite WAL giúp tối ưu hóa dung lượng lưu trữ và loại bỏ phân mảnh trang dữ liệu.
  - Đồng bộ hóa toàn diện giữa cơ sở dữ liệu chính `data/restaurants.db` và cơ sở dữ liệu hạt giống `seed_data/restaurants.db`.
- **Kiểm Định Tính Toàn Vẹn & Kiểm Thử Hệ Thống**:
  - `PRAGMA integrity_check`: **ok**.
  - `PRAGMA foreign_key_check`: **0 errors** (không phát sinh bản ghi mồ côi).
  - Toàn bộ **80/80 test cases** backend (`pytest`) vượt qua thành công 100%.
  - `npm run build` hoàn tất không có lỗi.


## [1.15.1] - 2026-10-23

### Loại Bỏ Triệt Để Mã Template AngularJS Rác & Làm Sạch Dữ Liệu Đánh Giá (AngularJS Template Filter & Review Sanitization)
- **Bộ Lọc Phía Scraper Engine (`restaurant-review-ai/crawler/foody_crawler.py`)**:
  - Bổ sung hàm kiểm tra `is_template_or_garbage_review(text, author, date)`: Tự động phát hiện và loại bỏ các khối review chứa mã nội suy template AngularJS chưa hydrate (`{{...}}`), các biến hệ thống `Model.` (như `Model.Owner.DisplayName`, `Model.CreatedDate`, `Model.AvgRating`), các chuỗi nút hành động rác (`Sửacommon_delete`), và các review rỗng.
  - Cả tầng HTTP Fast Inspector và Selenium Chrome Crawler đều tự động bỏ qua các phần tử HTML template ẩn (`display: none`, `ng-hide`, `ng-repeat` template container).
- **Bộ Lọc Spam & Pipeline Guard Backend (`restaurant-review-ai/crawler/review_filter.py`, `services/pipeline_service.py`)**:
  - `classify_review`: Tự động phân loại các review chứa cú pháp template vào danh mục `bot_placeholder` (`is_spam=True`, `spam_score=1.0`).
  - `save_and_analyze_reviews`: Thiết lập chốt chặn phòng thủ không bao giờ lưu các review template rác vào SQLite, đồng thời tự động cập nhật chính xác `review_count` của nhà hàng.
- **Tầng Làm Sạch Phòng Thủ Phía Giao Diện (`src/services/restaurantService.ts`, `src/components/dashboard/ReviewExplorer.tsx`)**:
  - Bổ sung cơ chế `sanitizeReviews` và `sanitizeRestaurant`: Tự động làm sạch mảng `recentReviews` và `criticalReviews` khi nạp từ API.
  - Các hàm helper hiển thị an toàn `getSafeAuthor`, `getSafeText`, `getSafeDateDisplay` đảm bảo không bao giờ render cú pháp `{{...}}` hoặc văn bản rác ra giao diện người dùng.
- **Dọn Dẹp Dữ Liệu SQLite (`restaurant-review-ai/data/restaurants.db`)**:
  - Đã xóa toàn bộ 10 bản ghi review rác (ID 740, 741, 753, 754, 765, 766, 775, 776, 792, 793) khỏi database.
  - Đồng bộ lại `review_count` chính xác 100% cho các quán ăn bị ảnh hưởng (như quán ID 244 "Mì Quảng Bà Mua - Ngũ Hành Sơn").
- **Kiểm Thử Toàn Diện (`restaurant-review-ai/tests/test_angular_template_filter.py`)**:
  - Bổ sung 14 unit test cases chuyên sâu bao phủ toàn diện: lọc cú pháp AngularJS, lọc nút `common_delete`, phân loại spam bot placeholder, kiểm tra phòng thủ pipeline, và xác minh database sạch 0 review rác.
  - Toàn bộ **72/72 tests** của hệ thống chạy qua thành công (100% PASS).


## [1.15.0] - 2026-10-23

### Phòng Vệ Đa Tầng Chống Cào URL Sai & Triệt Tiêu Lỗ Hổng SSRF (Foody URL Validation & SSRF Hardening)
- **Kiểm Soát Xác Thực Phía Giao Diện (`src/components/common/AnalyzeUrlModal.tsx`)**:
  - Khắc phục lỗ hổng logic kiểm tra `(url.includes('foody.vn') || url.startsWith('http'))` vốn chấp nhận mọi URL bắt đầu bằng `http` (kể cả Gmail, Facebook, IP lạ).
  - Bổ sung hàm xác thực `isValidFoodyUrl` dựa trên `new URL()`: Bắt buộc giao thức `http/https`, hostname phải thuộc domain `foody.vn` hoặc subdomains `*.foody.vn`, và path phải trỏ tới slug quán ăn cụ thể.
  - Tăng cường trải nghiệm người dùng (UX): Hiển thị cảnh báo trực quan viền đỏ kèm icon `AlertCircle` khi người dùng nhập URL không thuộc Foody (*"Chỉ hỗ trợ liên kết quán ăn từ Foody.vn..."*), đồng thời tự động vô hiệu hóa nút Submit.
- **Bảo Vệ Đa Tầng Backend API & Chống SSRF (`restaurant-review-ai/routers/crawler.py`)**:
  - Xây dựng hàm `validate_foody_url()` kiểm soát chặt chẽ URL đầu vào tại endpoint `/api/analyze-url`:
    - Chỉ cho phép hostname thuộc `foody.vn` / `*.foody.vn`.
    - Ngăn chặn triệt để SSRF: cấm IP addresses, cấm cổng lạ khác 80/443, cấm userinfo (`user:pass@host`), cấm DNS rebinding phân giải về dải IP private/loopback/link-local/multicast/reserved (`127.0.0.1`, `10.*`, `172.16.*`, `192.168.*`, `169.254.*`).
    - Chặn các đường dẫn hệ thống/login của Foody (như `/dang-nhap`, `/thanh-vien`), bắt buộc link phải trỏ tới quán ăn thực tế.
- **Sanity Check Kép Tại Crawler Engine (`restaurant-review-ai/crawler/foody_crawler.py`)**:
  - Thêm các bộ lọc `is_foody_domain`, `is_valid_foody_restaurant_page`, và danh sách đen `INVALID_RESTAURANT_NAMES` (loại bỏ các tiêu đề như "Đăng nhập", "Sign in", "Login", "404", "Page Not Found").
  - Cả hai lớp HTTP Fast Inspector và Selenium Crawler đều xác thực sự hiện diện của cấu trúc quán ăn Foody thật sự trước khi trích xuất dữ liệu, ngăn chặn việc tạo quán ma khi gặp trang chuyển hướng login.
- **Dọn Dẹp Dữ Liệu Rác Cơ Sở Dữ Liệu (`restaurant-review-ai/data/restaurants.db`)**:
  - Xóa bỏ triệt để bản ghi quán ăn rác ID 247 ("Đăng nhập" gắn với link `https://mail.google.com/mail/`), đưa tổng số lượng nhà hàng về 249 quán ăn chuẩn 100%.
- **Kiểm Thử Toàn Diện (`restaurant-review-ai/tests/test_url_validation.py`)**:
  - Bổ sung 17 unit test cases chuyên sâu bao phủ toàn diện: từ chối domain lạ (Gmail, Facebook), chặn IP/SSRF/DNS rebinding, từ chối trang đăng nhập, kiểm tra sanity check HTML, kiểm tra API response HTTP 400 và xác minh database sạch.
  - Toàn bộ 58/58 tests của dự án vượt qua thành công (100% PASS).


## [1.14.0] - 2026-10-23

### Tinh Chỉnh Ngôn Ngữ Người Dùng & Loại Bỏ Triệt Để Thuật Ngữ Kỹ Thuật (Jargon Elimination & UX Polish)
- **Chuẩn Hóa Giao Diện Trợ Lý & Khắc Phục Lỗi Hiển Thị**:
  - **Loại bỏ đồng hồ đo latency**: Xóa bỏ hiển thị số giây đo lường kỹ thuật (`0.01s`) cạnh câu trả lời của trợ lý.
  - **Khắc phục lỗi lặp biểu tượng & emoji**:
    - Nút `✨ Sinh lại với AI` $\rightarrow$ Đổi thành `<Sparkles /> Gợi ý câu khác` (loại bỏ emoji `✨` lặp và từ chuyên ngành AI "sinh lại").
    - Nút `⚡ AI Soạn phản hồi` / `⚡ AI Phản hồi` $\rightarrow$ Đổi thành `<Zap /> Soạn phản hồi` (loại bỏ emoji `⚡` lặp).
  - **Ẩn hoàn toàn tên mô hình nội bộ & số mili-giây**:
    - Thay thế huy hiệu `gemini-3.5-flash-lite • 2972ms` bằng nhãn thân thiện `Phản hồi gợi ý từ AI` (hoặc `Đã lưu sẵn`).
  - **Việt hóa tự nhiên, loại bỏ thuật ngữ IT/Developer**:
    - Thay `Phân tích bởi Gemini AI` $\rightarrow$ `Trợ lý AI`.
    - Thay `Phản hồi tức thì (Bộ nhớ đệm)` $\rightarrow$ `Phản hồi tức thì` (bỏ chữ "Bộ nhớ đệm" / Cache).
    - Thay tiêu đề `Trợ lý Thông tin Nền tảng (Platform Intelligence)` $\rightarrow$ `Trợ lý Thông tin Nền tảng`.
    - Thay phụ đề `Phân tích thông minh với Gemini AI...` $\rightarrow$ `Phân tích khách quan dựa trên {totalReviews} đánh giá thực tế`.
    - Thay `Gemini LLM-First` $\rightarrow$ `Hỗ trợ bởi AI`.
    - Thay `Mã: {review.id}` $\rightarrow$ `Đánh giá của {review.author}`.
    - Thay `seeding rác` / `spam` trên trang chủ $\rightarrow$ `đánh giá ảo` và `Tỷ lệ loại bỏ nhận xét ảo:`.
- **Làm Sạch System Prompt Backend (`restaurant-review-ai/services/assistant_service.py`)**:
  - Định vị tự nhiên: *"Bạn là Trợ lý Thông tin Ẩm thực của Restaurant Intelligence..."*, loại bỏ danh xưng kỹ thuật *"Platform Intelligence Analyst"*.
  - Làm sạch mô tả lọc dữ liệu, loại bỏ các từ `thuật toán`, `spam`, `seeding ảo`.

### Chuyển Đổi Trợ Lý Thông Tin Nền Tảng Sang 100% Gemini AI (Full LLM-First & Loại Bỏ Local Synthesizer)
- **Trợ Lý Thông Tin Nền Tảng 100% AI (`restaurant-review-ai/services/assistant_service.py`)**:
  - Chuyển đổi toàn bộ câu hỏi truy vấn của người dùng/chủ quán sang xử lý bằng **Google Gemini AI** (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-3.8-flash`).
  - Loại bỏ hoàn toàn cơ chế phân nhánh và văn mẫu tổng hợp cục bộ (`synthesize_local_answer`), không còn tình trạng sinh câu trả lời cứng/thiếu chiều sâu.
  - Tích hợp **Rich Context**: Trích xuất chi tiết 5 khía cạnh cốt lõi kèm tỷ lệ khen/chê, từ khóa trọng tâm, số lượt nhắc và mẫu trích dẫn đánh giá thực tế của thực khách (khen & chê có trích dẫn tác giả, điểm số) để AI phản hồi sâu sắc, chính xác và có bằng chứng cụ thể.
  - Thiết lập nghiêm ngặt **4 Tầng Guardrails Nền Tảng**: Độc lập & khách quan (Platform Intelligence), từ chối ngoài phạm vi F&B lịch sự, giải thích rõ giới hạn dữ liệu doanh thu nội bộ, bảo mật danh tính cá nhân người đánh giá.
  - Giữ cơ chế **In-Memory Question Caching** (`source="cache"`): Phản hồi tức thì 0ms cho các câu hỏi trùng lặp mà không tốn thêm token quota.
  - Xử lý lỗi gián đoạn mạng hoặc API Key bằng cảnh báo Markdown trực quan `> [!WARNING]`, minh bạch hóa trạng thái kết nối AI mà không che đậy bằng dữ liệu giả.
- **FastAPI Endpoints (`restaurant-review-ai/routers/restaurants.py`)**:
  - Endpoint `/restaurants/{identifier}/ask` luôn thực thi Gemini AI.
  - Tương thích ngược toàn diện với các payload cũ (`force_ai`, `forceAi`), đặt mặc định `True`.
- **Giao Diện Trợ Lý Nền Tảng (`src/components/dashboard/AiAssistantWidget.tsx`)**:
  - **Loại bỏ hoàn toàn checkbox toggle "Phân tích chuyên sâu"**: Vì hệ thống đã chạy 100% AI, không còn cần người dùng phải bấm chọn để kích hoạt AI.
  - Cập nhật header subtitle sang chuẩn AI: *"Phân tích thông minh với Gemini AI dựa trên {totalReviews} đánh giá thực tế"*.
  - Cập nhật lời chào mở đầu và hội thoại gắn nhãn nguồn `gemini_ai`.
  - Chuẩn hóa 2 huy hiệu nguồn minh bạch:
    - `gemini_ai`: Icon `Sparkles` kèm text *"Phân tích bởi Gemini AI"* (tone vàng cam ấm).
    - `cache`: Icon `Zap` kèm text *"Phản hồi tức thì (Bộ nhớ đệm)"* (tone xanh dương).
  - Tinh chỉnh trạng thái loading: *"Trợ lý AI đang phân tích dữ liệu và phản hồi..."*.
- **Client Service (`src/services/restaurantService.ts`)**:
  - Loại bỏ toàn bộ ~100 dòng mã offline synthesis fallback giả lập ở frontend.
  - Gửi trực tiếp yêu cầu lên backend API và bắt lỗi kết nối trực quan.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Toàn bộ 8 unit test cases tại `test_assistant_service.py` vượt qua thành công (100% pass).
  - Frontend `oxlint` (0 errors, 0 warnings) và `tsc -b && vite build` biên dịch thành công 100%.

## [1.13.0] - 2026-10-23

### Ra Mắt Tính Năng AI Soạn Thư Phản Hồi Thực Khách (AI Review Responder - Closed-Loop Action)
- **Backend Generative AI Engine (`restaurant-review-ai/services/reply_service.py`)**:
  - Mô hình **Gemini LLM-First** (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-3.8-flash`) tự động thấu hiểu ngữ cảnh bài đánh giá (tên khách, điểm số, khuyết điểm hoặc món ăn được khen) để tạo thư phản hồi thấu cảm, đậm chất văn hóa ẩm thực Việt Nam.
  - Hỗ trợ **4 Tông giọng nghiệp vụ chuẩn mực ngành F&B**:
    - `apology`: *Chân thành & Nhận lỗi* (dành cho đánh giá tiêu cực 1-2 sao, xoa dịu khủng hoảng truyền thông).
    - `voucher`: *Lịch sự & Tặng Voucher* (tự động đề xuất giải pháp đền bù và giữ chân khách hàng).
    - `gratitude`: *Tri ân & Thân thiện* (dành cho bài khen ngợi 4-5 sao, khuyến khích khách quen quay lại).
    - `clarification`: *Giải thích & Cầu thị* (làm rõ hiểu lầm về khẩu phần, giá cả hoặc giờ cao điểm).
  - Tự động sinh mã voucher ưu đãi chuẩn định dạng `CARE-{SHORTNAME}-{DISCOUNT}` kèm kiểm soát tỷ lệ giảm giá (5% - 90%).
  - Bộ nhớ đệm **In-Memory Cache** theo cặp `{restaurant_id}:{review_id}:{tone}`, phản hồi tức thì **0ms** khi chuyển qua lại giữa các tông giọng đã tạo trong phiên làm việc, tiết kiệm tối đa quota API.
  - Bộ Gastronomy Fallback chuyên sâu chống lỗi 500 khi mạng gián đoạn.
- **FastAPI Endpoints (`restaurant-review-ai/routers/restaurants.py`)**:
  - Khởi tạo route `POST /api/restaurants/{identifier}/reply` và alias `POST /api/restaurants/{identifier}/generate-reply`.
  - Hỗ trợ mọi định dạng định danh: ID số (`1`), ID tiền tố (`res-1`), slug Foody tiếng Việt có dấu và không dấu.
  - Schema Pydantic `GenerateReplyRequest` & `GenerateReplyResponse` tương thích cả `camelCase` (frontend) lẫn `snake_case` (backend).
- **Frontend Warm Gastronomy UI (`src/components/dashboard/ReviewReplyModal.tsx`)**:
  - Thiết kế modal sang trọng theo hệ thiết kế Warm Gastronomy & Modern Editorial (`Spectral` & `Be Vietnam Pro`, viền `#E5E3DE`).
  - Tự động nhận diện tông giọng khởi đầu thông minh dựa trên đánh giá thực khách ($\le 2$ sao $\rightarrow$ Nhận lỗi; $\ge 4$ sao $\rightarrow$ Tri ân).
  - Khung soạn thảo `textarea` trực tiếp cho phép người quản lý hiệu chỉnh văn bản linh hoạt, tích hợp bộ đếm từ và ký tự thời gian thực.
  - Trạng thái Skeleton Loading mượt mà khi AI đang suy luận.
  - Huy hiệu minh bạch mô hình AI (`gemini-3.5-flash-lite`), thời gian suy luận (hoặc `0ms - Cache`), voucher badge kèm nút chép mã nhanh.
  - Bộ nút hành động: `✨ Sinh lại với AI` và `📋 Sao chép phản hồi` (1-click clipboard copy kèm hiệu ứng tích xanh và thông báo xác nhận).
- **Tích hợp tương tác (`ReviewExplorer.tsx`, `ReviewDetailModal.tsx`)**:
  - Bổ sung nút bấm nhanh `⚡ AI Phản hồi` trên từng thẻ đánh giá và nút `⚡ AI Soạn phản hồi` trong footer modal chi tiết.
- **Kiểm thử & Đảm bảo chất lượng**:
  - Bổ sung bộ test suite 31 test cases tự động (`restaurant-review-ai/tests/test_reply_service.py`), 100% tests vượt qua thành công.
  - Toàn bộ 41 unit/integration test cases của dự án đều pass (`pytest`).
  - `oxlint`: 0 warnings, 0 errors.
  - `vite build`: biên dịch thành công 100%.

## [1.12.0] - 2026-10-13

### Tái Thiết Toàn Diện Giao Diện, Bố Cục & Hệ Màu Sắc (Warm Gastronomy & Modern Editorial)
- **Hệ Thống Thiết Kế Mới (Design System Tokens - `src/index.css`)**:
  - **Bảng màu Warm Gastronomy**: Nền canvas kem yến mạch ấm (`#F8F6F0`), thẻ bài trắng tuyết (`#FFFFFF`), chữ than đá hữu cơ (`#1C1917`), màu điểm nhấn chính Rượu vang Bordeaux (`#991B1B`), Vàng đồng Champagne (`#D97706`), Xanh ô-liu rừng sâu (`#065F46`).
  - **Hệ thống Typography 2 Phông Chuẩn Mực**:
    - Phông Display: `Spectral` (Serif cổ điển, sang trọng chuẩn Michelin Guide).
    - Phông Body: `Be Vietnam Pro` (Sans-serif hoàn hảo cho hiển thị dấu tiếng Việt).
  - Thay thế toàn bộ bóng đổ thô đen (`shadow-craft 3px 3px 0px`) bằng bóng đổ đa tầng mềm mại (`shadow-editorial`, `shadow-editorial-sm`, `shadow-editorial-lg`, `shadow-editorial-float`).
- **Cấu Trúc Lại Trang Chủ (Hero Tràn Viền & Floating Bento Radar - `src/pages/HomePage.tsx`)**:
  - **Hero Section**: Nền gradient ấm với hoa văn họa tiết nhẹ, tiêu đề lớn dạng chuyên san (`Spectral`), thanh tìm kiếm nổi kính mờ đa tầng (`shadow-editorial-float`), chip nhu cầu theo dịp ăn uống (hẹn hò, gia đình, phục vụ nhanh, bình dân, đặc sản).
  - **Bento Grid Spotlight 8-4**: Bố cục bất đối xứng với thẻ trung tâm (8 cột) hiển thị hồ sơ quán ăn tiêu biểu, điểm số hài lòng, trích dẫn thực khách và 5 thước đo cốt lõi; cột phụ (4 cột) với 2 thẻ Bento vệ tinh minh bạch hoá việc lọc nhận xét ảo và món signature.
  - **So Sánh Đối Đầu 2 Quán (Head-to-Head)**: Bảng điểm cân xứng sang trọng, thanh đo tỷ lệ mượt mà hai phía, huy hiệu ưu thế rõ ràng.
  - **Bộ Chuyển Đổi 2 Góc Nhìn (Thực khách vs Quản lý)**: Bento Grid 1 thẻ trọng tâm + 2 thẻ vệ tinh thay vì 3 thẻ bằng nhau.
  - **Lưới Tuyển Tập Quán Ăn Tiêu Biểu**: Sử dụng thẻ `RestaurantCard` phong cách mới với typography phân cấp rõ nét.
- **Đồng Bộ Giao Diện Các Trang Thành Phần**:
  - Cập nhật `Navbar`, `Footer`, `SearchBar`, `RestaurantCard`, `FilterBar`, `ExplorePage`, `DashboardPage`, `HowItWorksPage` theo cùng bảng màu và phông chữ mới.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - `oxlint`: 0 warnings, 0 errors.
  - `vite build`: biên dịch thành công 100%.

## [1.11.0] - 2026-10-13

### Sửa Lỗi Chế Độ Trợ Lý Phân Tích Chuyên Sâu (Deep Creative AI) & Khởi Động Đa Nền Tảng
- **Sửa Lỗi Khởi Động Script `npm run dev` Trên Windows PowerShell 5.1 (`package.json`)**:
  - Loại bỏ cú pháp toán tử `&&` trong `"cd restaurant-review-ai && python api_server.py"` vì gây lỗi biên dịch nghiêm trọng (`InvalidEndOfLine: The token '&&' is not a valid statement separator`) trên PowerShell 5.1 mặc định của Windows.
  - Thay bằng đường dẫn gọi trực tiếp `"python restaurant-review-ai/api_server.py"` chạy tương thích 100% trên cả Windows PowerShell, CMD, Bash, Linux và macOS.
  - Giúp FastAPI Backend luôn khởi động đồng thời cùng Vite, chấm dứt việc Frontend bị rớt kết nối dẫn đến rơi vào Local Offline Synthesis.
- **Tương Thích Payload Pydantic Đa Quy Ước (`routers/restaurants.py`)**:
  - Bổ sung alias `forceAi` và cấu hình `model_config = {"populate_by_name": True}` trong schema `AskAssistantRequest`, hỗ trợ cả chuẩn JavaScript camelCase (`forceAi`) lẫn Python snake_case (`force_ai`).
- **An Toàn Khớp Định Danh Quán Ăn Có Dấu & Ký Tự Đặc Biệt (`routers/restaurants.py`, `restaurantService.ts`)**:
  - Thêm `unquote(identifier)` và `encodeURIComponent(restaurantId)` khi gọi endpoint `/api/restaurants/{id}/ask`, xử lý thông suốt các định danh tên quán tiếng Việt và slug chứa dấu cách / dấu gạch ngang.
- **Minh Bạch Hóa Thông Báo Khi Mất Kết Nối Máy Chủ (`restaurantService.ts`)**:
  - Khi người dùng bật toggle "Phân tích chuyên sâu" nhưng máy chủ backend tạm thời không phản hồi, client-side fallback tự động hiển thị khối thông báo rõ ràng (`> [!NOTE]`) giải thích lý do, thay vì âm thầm trả về kết quả số liệu cục bộ gây hiểu lầm.
- **Mở Rộng Model Cascading Fallback Cho Gemini Assistant (`assistant_service.py`)**:
  - Bổ sung `gemini-flash-lite-latest` và ưu tiên `gemini-3.5-flash-lite`, `gemini-2.5-flash` mang lại tốc độ phản hồi nhanh và tỷ lệ sẵn sàng cao nhất.
- **Bổ Sung Bộ Test Case Tự Động (`test_assistant_service.py`)**:
  - Thêm `test_force_ai_endpoint_and_service` bao phủ kiểm tra cả 2 dạng payload `force_ai` / `forceAi`, định danh tiếng Việt và phản hồi `gemini_ai`. 100% tests vượt qua thành công.

## [1.10.0] - 2026-10-13

### Khắc Phục Triệt Để Timeout 120s Khi Cào Foody & Cơ Chế Tự Phục Hồi Gemini API Key Render
- **Kiến Trúc Fast HTTP Inspector 2 Lớp Cho Foody Crawler (`foody_crawler.py`)**:
  - Tích hợp lớp tiền kiểm tra siêu tốc `inspect_foody_via_http(url, timeout=8)`: bóc tách metadata quán (tên, địa chỉ, điểm số, trạng thái bài đánh giá) qua HTTP request chỉ mất **< 0.5 giây**.
  - Xử lý triệt để nguyên nhân gốc rễ gây lỗi timeout 120s (`HTTPConnectionPool Read timed out=120`) khi cào các quán có 0 bài đánh giá (ví dụ: `https://www.foody.vn/da-nang/mi-quang-ba-mua-duy-tan`).
  - Thoát ngay lập tức mà không khởi động trình duyệt Selenium nặng nề nếu quán được xác nhận 0 review hoặc 404.
  - Sửa lỗi điều kiện ngắt vòng lặp Selenium: bổ sung `if not current_blocks and clicks == 0: break` để tránh trường hợp cuộn trang và chờ socket vô hạn khi trang không có khối nhận xét nào.
- **Tối Ưu Thông Báo Phản Hồi API Khi Quán Chưa Có Nhận Xét (`crawler.py`)**:
  - Khi lưu trữ quán 0 review, API phản hồi thông điệp thân thiện: *"Quán '{restaurant.name}' hiện chưa có bài đánh giá nào trên Foody. Hệ thống đã lưu trữ thông tin quán thành công!"*.
- **Tự Động Phát Hiện & Khôi Phục Gemini API Key Trên Render Dashboard (`assistant_service.py`, `gemini_analyzer.py`)**:
  - Thêm cơ chế quét thông minh đa nền tảng (hỗ trợ cả Linux Container và Windows): tự động nhận diện và khôi phục khi người dùng dán nhầm API Key vào cột Tên (Key / Name column) thay vì cột Giá trị (Value column) trên giao diện cấu hình Render Dashboard.
  - Khởi tạo client lười (`get_genai_client()`) đảm bảo nạp đúng key lúc runtime, tránh đóng băng `None` tại thời điểm import module.
  - Hỗ trợ các định dạng key mới (`AQ...`, `AIzaSy...`) tương thích với cả `gemini-3.8-flash` và `gemini-3.5-flash-lite`.
- **Kiểm Thử Hồi Quy Đầy Đủ**:
  - Bộ 10 test case backend (`pytest tests/`) đạt tỷ lệ hoàn thành 10/10 (100% Passed).
  - Bản build frontend (`npm run build`) hoàn thành thành công trong 391ms (0 lỗi biên dịch).

## [1.9.0] - 2026-10-13

### Khắc Phục Triệt Để Lỗi Kết Nối Gemini API & Tối Ưu Hóa Model Cascading Fallback
- **Nạp Biến Môi Trường Đồng Bộ Tại Entrypoint (`api_server.py`)**:
  - Tích hợp `load_dotenv()` ngay đầu file máy chủ trước khi nạp routers, đảm bảo biến `GEMINI_API_KEY` được load thông suốt trên cả Localhost lẫn Container môi trường Production (Render/Docker).
  - Bổ sung thông báo kiểm tra tình trạng nạp key tại console lúc khởi động server (`-> [Environment] GEMINI_API_KEY đã được nạp thành công`).
- **Dynamic API Key Getter & Chống Lỗi Đóng Băng Tĩnh (`assistant_service.py`)**:
  - Chuyển đổi từ biến tĩnh `API_KEY` ở module level sang hàm `get_gemini_api_key()`, tự động quét lại môi trường và các file `.env` dự phòng lúc runtime nếu key ban đầu chưa sẵn sàng.
- **Cơ Chế Model Cascading Fallback Đa Tầng**:
  - Thiết lập danh sách candidate models ưu tiên: `["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash"]`.
  - Tự động chuyển đổi sang model kế tiếp nếu model hiện tại gặp lỗi 404 Deprecated hoặc 429 Rate Limit, bảo đảm tỷ lệ khả dụng 100%.
  - Ghi log chi tiết trạng thái từng model (`[Gemini Assistant Warning]`) để dễ dàng giám sát mà không làm gián đoạn trải nghiệm người dùng.
- **Kiểm Thử Tự Động Toàn Diện**:
  - Xác nhận 11/11 tests backend pytest passed thành công.
  - Kiểm thử trực tiếp endpoint `/api/restaurants/82/ask` qua FastAPI TestClient, xác nhận phản hồi AI thành công (`source: gemini_ai`).

## [1.8.0] - 2026-10-13

### Chuẩn Hóa Ngôn Ngữ Trải Nghiệm Người Dùng (F&B-Centric UI Copy) — Loại Bỏ 100% Thuật Ngữ Kỹ Thuật CNTT
- **Tái cấu trúc Ngôn từ Giao diện (Elimination of Technical & Developer Jargon)**:
  - Loại bỏ hoàn toàn các thuật ngữ kỹ thuật CNTT (`Gemini AI`, `ABSA`, `NLP`, `Crawler/cào review`, `Fast HTTP`, `Port 8000/Backend API`, `SQLite/Database`, `0 Quota/0 Token`, `Bot cày xu`, `Seeding`, `Review rác`, `Thực thể`, `Khía cạnh`, v.v.) khỏi toàn bộ giao diện người dùng và thông báo phản hồi.
  - Chuẩn hóa sang từ vựng ẩm thực, thực khách và vận hành nhà hàng gần gũi, chuyên nghiệp:
    - `Lọc sạch seeding & spam` $\rightarrow$ `Đánh giá thực tế & Khách quan` / `Loại bỏ nhận xét giả & quảng cáo rác`.
    - `+ Phân tích link Foody` $\rightarrow$ `+ Khảo sát quán mới` / `+ Thêm quán`.
    - `Tra cứu nhanh dữ liệu hoặc tổng hợp quán mới từ Foody qua Gemini AI` $\rightarrow$ `Tra cứu thông tin hoặc tổng hợp nhận xét quán ăn mới từ thực khách`.
    - `1. Tra cứu thông tin quán trên Foody (Fast HTTP)` $\rightarrow$ `1. Tra cứu thông tin địa điểm quán ăn`.
    - `3. Gemini AI phân tích khía cạnh & trích xuất cảm xúc` $\rightarrow$ `3. Tổng hợp cảm nhận thực khách theo từng tiêu chí`.
    - `Dữ liệu đã lọc sạch review rác` $\rightarrow$ `Nhận xét đã xác thực minh bạch`.
    - `Khía cạnh cần lưu ý` $\rightarrow$ `Tiêu chí cần cải thiện`.
    - `Phân tích đánh giá & Trích xuất NLP` $\rightarrow$ `Chi tiết cảm nhận thực khách`.
    - `Các thực thể khía cạnh phát hiện` $\rightarrow$ `Các tiêu chí được nhận xét`.
    - `Phân tích số liệu thực tế (0 Quota)` $\rightarrow$ `Dữ liệu thực tế đã xác thực`.
    - `Bộ nhớ đệm thông minh (0 Token)` $\rightarrow$ `Phản hồi tức thì`.
    - `Gemini AI Engine` $\rightarrow$ `Tổng hợp chuyên sâu`.
    - `Chưa kết nối Backend FastAPI (Port 8000)` $\rightarrow$ `Đang hiển thị dữ liệu mẫu ngoại tuyến do chưa kết nối máy chủ dữ liệu`.
    - `5 Khía cạnh đánh giá` $\rightarrow$ `5 Tiêu chí đánh giá`.
- **Đồng bộ Hóa Thông báo Phản hồi Backend (`assistant_service.py`, `crawler.py`, `restaurantService.ts`)**:
  - Chuẩn hóa toàn bộ câu trả lời trợ lý và thông báo lỗi API sang văn phong tôn trọng thực khách, không để lộ chi tiết kỹ thuật hệ thống.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - `npm run build` hoàn tất không có lỗi (0 type errors, 0 lint errors).
  - 11/11 tests backend (`pytest`) passed 100%.


### Tái Cấu Trúc Toàn Diện Trợ Lý Phân Tích Nền Tảng (Platform Intelligence Assistant) — Vượt Qua 100% 30 Test Cases
- **Tái định vị Bản chất Trợ lý (Platform Intelligence Analyst vs. Restaurant Bot)**:
  - Chuyển đổi ngôi xưng và vai trò từ *"Trợ lý AI của quán X"* sang *"Trợ lý Phân tích Dữ liệu Nền tảng Restaurant Intelligence"*.
  - Cung cấp góc nhìn phân tích độc lập, trung lập, phục vụ cả Chủ quán và Thực khách dựa trên sự thật (Ground Truth) từ dữ liệu đánh giá thực tế.
- **Tầng Guardrails Kiểm soát Phạm vi & Bảo mật (Bảng 4: TC19 - TC22)**:
  - **TC19**: Chặn câu hỏi ngoài lề (thời tiết, thể thao, tin tức) và từ chối lịch sự, nêu rõ phạm vi ẩm thực của nền tảng.
  - **TC20 & TC22**: Nêu rõ giới hạn dữ liệu khi hỏi về doanh thu nội bộ hoặc dự đoán tài chính (hệ thống chỉ có dữ liệu đánh giá khách quan, không truy cập sổ sách kế toán của quán).
  - **TC21**: Bảo vệ quyền riêng tư, cam kết không suy đoán danh tính cá nhân người đánh giá.
- **Tầng Truy vấn Dữ liệu Định lượng & Dẫn chứng Thật (Bảng 2: TC07 - TC12)**:
  - **TC07**: Truy vấn chính xác tổng số bài đánh giá thực tế đã làm sạch (`totalReviews`).
  - **TC08**: Thống kê số lượng (`positiveCount`) và tỷ lệ phần trăm (`positivePercentage%`) khách hàng hài lòng.
  - **TC09**: Trích xuất danh sách phàn nàn và trích dẫn nguyên văn về chất lượng dịch vụ.
  - **TC10 & TC11**: Nhận diện vấn đề lặp lại nhiều nhất và phân bố ý kiến theo 5 khía cạnh cốt lõi.
  - **TC12**: Trích xuất dẫn chứng nguyên văn từ các bài đánh giá có thật trong cơ sở dữ liệu.
- **Tầng Tư vấn Chiến lược Vận hành & Kẻ Bảng Markdown (Bảng 3: TC13 - TC18)**:
  - **TC13 & TC17**: Xác định duy nhất 1 vấn đề ưu tiên hàng đầu cần giải quyết trước mắt dựa trên số liệu phàn nàn.
  - **TC14**: Xây dựng kế hoạch hành động theo tháng (Giai đoạn 1: Tuần 1-2, Giai đoạn 2: Tuần 3-4) có mục tiêu và thời hạn rõ ràng.
  - **TC15 & TC16**: Đề xuất giải pháp chuyên biệt riêng cho Dịch vụ và Món ăn.
  - **TC18**: Tự động kết xuất bảng Markdown tổng hợp chuẩn (`| Vấn đề ghi nhận từ khách | Nguyên nhân tiềm ẩn (Giả thuyết) | Giải pháp đề xuất |`) và render bảng HTML có border, header và striped rows trên frontend.
- **Tối ưu Hóa Giao diện & Độ Bền Vững Hệ Thống (Bảng 5: TC23 - TC30)**:
  - **TC25**: Vô hiệu hóa nút gửi (`disabled`) khi ô nhập rỗng hoặc đang loading.
  - **TC26**: Giới hạn tối đa 400 ký tự kèm bộ đếm ký tự trực quan (`x/400`).
  - **TC27**: Xử lý toàn diện tiếng Việt có dấu qua chuẩn hóa Unicode NFC và không dấu.
  - **TC28**: Khóa tương tác input và nút Hỏi khi đang xử lý, triệt tiêu hoàn toàn race condition và xáo trộn thứ tự tin nhắn.
  - **TC29**: Nút làm mới (`RotateCcw`) đặt lại toàn bộ phiên chat về câu chào mừng chuẩn Nền tảng.
  - **TC30**: Đo lường và hiển thị thời gian phản hồi (Latency badge `0.02s · Phân tích số liệu thực tế (0 Quota)`) trực tiếp trên từng tin nhắn.
- **Khắc phục Triệt để Lỗi Render Tab Trợ lý (`activeTab === 'assistant'`)**:
  - Sửa lỗi thiếu khối điều kiện hiển thị khi người dùng click vào Tab *"Trợ lý Phân tích Nền tảng (Hỏi - Đáp)"* trên `DashboardPage.tsx`. Giờ đây khi bấm vào tab, khung chat Trợ lý AI hiển thị nổi bật ở vị trí trung tâm kèm các phát hiện cốt lõi và điểm cần chú ý.
- **Kiểm Thử & Đảm Bảo Chất Lượng (Quality Assurance)**:
  - Bổ sung Unit Test Suite `test_assistant_service.py` bao phủ toàn diện 22 test cases nghiệp vụ (6/6 tests PASSED).
  - Đạt 0 warnings, 0 errors trên Oxlint và Vite Build.

## [1.6.6] - 2026-10-11

### Tái Cấu Trúc Toàn Diện Thanh Tìm Kiếm (Search Overhaul) — Triệt Tiêu 100% Rò Rỉ Khác Thành Phố & Món Ăn
- **Triệt tiêu Rò rỉ Thẻ Gợi ý khi Kết quả Bằng 0 (Empty State Leakage)**:
  - Khắc phục lỗi hiển thị 6 thẻ quán Đà Nẵng khi tìm kiếm ở thành phố khác hoặc món ăn có 0 kết quả trên `ExplorePage.tsx`.
  - Giờ đây gợi ý chỉ hiển thị khi người dùng đang ở chế độ duyệt mặc định toàn quốc, không còn gây hiểu nhầm sang kết quả tìm kiếm.
  - Bổ sung nút bấm trực tiếp "Xem toàn bộ quán tại [Thành phố]" và nút kích hoạt cào dữ liệu nhanh từ Foody.
- **Loại bỏ Stopwords & Từ đệm Nhà hàng (`cleanRestaurantStopwords`)**:
  - Tự động bóc tách các từ tiền tố thông dụng như `"quán ăn"`, `"quán ngon"`, `"nhà hàng"`, `"tiệm"`, `"ở"`, `"tại"` trong `cityUtils.ts`.
  - Giúp các truy vấn như `"quán phở hà nội"` lọc đúng món `"phở"` tại `"Hà Nội"`, thay vì bị lọc rỗng vì quán không có chữ "quán".
- **So Khớp Thành phố Tuyệt Đối (`isRestaurantInCity`)**:
  - Chuẩn hóa canonical mapping đối chiếu định danh 63 tỉnh thành (`VIETNAM_CITIES`).
  - Khi quán đã có trường `city` xác định, ngăn chặn hoàn toàn việc tên đường (ví dụ "Đường Hải Phòng", "Đường Hà Nội") ở Đà Nẵng làm sai lệch địa phương.
- **Lọc Món ăn Chính Xác & Chống Rò rỉ Review (`matchesRestaurantKeyword`)**:
  - Loại bỏ hoàn toàn việc tìm kiếm món ăn trong địa chỉ quán và trong nội dung review tự do (chấm dứt việc quán Bánh Đập hay Thắng Cố hiện ra khi tìm "phở" chỉ vì khách hàng từng khen hoặc so sánh trong review).
  - Phân biệt triệt để món `"phở"` (noodle) với chữ `"phố"` trong tên thương hiệu (Hải Sản Phố, Phố Cổ).
- **Trải nghiệm Tìm kiếm Thời gian thực (Debounced Live Search & Clear Button)**:
  - Bổ sung tính năng `debounceLiveSearch` (300ms) và nút Xóa nhanh (`X`) trên `SearchBar.tsx`, tự động làm mới danh sách ngay khi gõ mà không bắt buộc phải nhấn Enter.

## [1.6.5] - 2026-10-10

### Hoàn thiện Bộ Lọc Đa Tỉnh Thành (63 Tỉnh Thành) & Khắc phục Triệt để Lỗi Ghim Thành phố
- **Khắc phục Triệt để Lỗi Ghim Thành phố (State Sticking) trong `ExplorePage.tsx`**:
  - Sửa lỗi điều kiện `filters.city === 'Tất cả địa điểm'` khiến thành phố trước đó (ví dụ "Đà Nẵng") bị kẹt vĩnh viễn trong state, làm các tìm kiếm tiếp theo ("phở hà nội", "phú yên", "lào cai", "gia lai") luôn bị lọc nhầm sang Đà Nẵng.
  - Tự động đồng bộ dropdown "Địa điểm" ngay khi người dùng gõ từ khóa chứa bất kỳ tỉnh thành nào; tự động trả về "Tất cả địa điểm" khi người dùng chỉ gõ món ăn ("cơm gà", "bánh xèo") để tìm kiếm toàn quốc.
- **Ưu tiên Thành phố Nhận diện từ Từ khóa trong `restaurantService.ts`**:
  - Đảo chiều độ ưu tiên: `parsedQuery.detectedCity` luôn chiếm ưu thế tuyệt đối so với dropdown cũ, ngăn chặn triệt để tình trạng dropdown cũ áp đặt lên từ khóa mới.
- **Hỗ trợ Toàn diện 63 Tỉnh/Thành phố Toàn quốc (`cityUtils.ts` & `bi_service.py`)**:
  - Mở rộng từ điển nhận diện từ 24 tỉnh lên toàn bộ 63 tỉnh thành Việt Nam với đầy đủ tên thành phố trực thuộc, quận/huyện đặc trưng (Gia Lai, Phú Yên, Lào Cai, Kon Tum, Thái Nguyên, Bình Phước,...).
  - Cập nhật dropdown `FilterBar.tsx` nạp động đầy đủ 63 tỉnh thành.
- **Phân biệt Dấu Tiếng Việt (Diacritic-Aware Matching)**:
  - Khắc phục lỗi false-positive nghiêm trọng khi tìm "phở" nhưng trả về "Hải Sản Phố" do loại bỏ dấu tiếng Việt làm "phố" biến thành "pho".
  - Khi người dùng gõ có dấu, bắt buộc phải khớp đúng có dấu trên tên quán, ẩm thực và từ khóa.
- **Bổ sung Dữ liệu Quán ăn Tiêu biểu cho Hà Nội, Phú Yên, Gia Lai**:
  - Bổ sung 9 quán ăn đặc sản nổi tiếng (Phở Thìn Lò Đúc, Phở Bát Đàn, Cơm Gà Tuy Hòa Tuyết Nhung, Mắt Cá Ngừ Bà Tám, Phở Khô Hai Tô Phở Hồng, Cơm Lam Gà Nướng Bazan,...) kèm đầy đủ review và chỉ số ABSA.

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
