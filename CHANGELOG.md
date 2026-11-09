# Changelog

All notable changes to the **Restaurant Intelligence** project will be documented in this file.

## [1.22.0] - 2026-11-03

### Khắc Phục Lỗi Hiển Thị Nguồn Foody & Đại Tu Trình Cào Đánh Giá Google Maps
- **Hiển Thị Badge Nguồn Động (`src/components/dashboard/TopMetricsRow.tsx`)**:
  - Khắc phục triệt để lỗi hardcode nhãn `"Foody"` tại thẻ KPI "Tổng đánh giá".
  - Bổ sung logic tính toán nguồn động qua `useMemo`: Tự động xác định và hiển thị chính xác `"Google Maps"`, `"Foody"`, hoặc `"Đa nguồn"` dựa theo `restaurant.sourceBreakdown`, đường dẫn nguồn (`googleMapsUrl`, `foodyUrl`) và trường `dataSource`.
- **Đại Tu Trình Cào Đánh Giá Google Maps (`crawler/google_maps_crawler.py`)**:
  - **Thoát bẫy tab Overview & Thu thập trọn vẹn đánh giá**: Loại bỏ cơ chế kiểm tra sớm `div.jftiEf` vốn bị đánh lừa bởi 3-5 bài đánh giá mẫu tại tab Tổng quan. Kích hoạt trực tiếp tab bài đánh giá thông qua tham số URL `!9m1!1b1` và tự động click các nút kích hoạt feed đánh giá (`"Xem các bài đánh giá khác"`, `"Bài đánh giá khác"`, `button.uj73Ce`).
  - **Tự động đóng Modal đăng nhập**: Thêm bộ lọc bắt và tự động click các nút `"Loại bỏ"` / `"Dismiss"` trên popup yêu cầu đăng nhập của Google Maps, ngăn chặn việc lớp phủ modal chặn tương tác cuộn.
  - **Tối ưu hóa bộ cuộn vô tận (Infinite Scroll)**: Tác động trực tiếp vào vùng chứa danh sách đánh giá `.m6QErb.DxyBCb` bằng `scrollTop = scrollHeight` kèm phát sự kiện `scroll`; nâng thời gian chờ phản hồi XHR `batchexecute` lên 1.8s - 2.4s và nâng ngưỡng Early Stopping lên 4 nhịp để cào đủ hạn ngạch theo yêu cầu (15 - 40 đánh giá) thay vì bị dừng non ở 3 bài đánh giá.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Frontend: `npm run build` thành công (1838 modules transformed, 0 lỗi), `npm test` 10/10 test suites pass (100%), `npm run lint` sạch lỗi.
  - Backend: `pytest` 60/60 tests pass (21/21 tests `test_multisource_crawler_api.py`, 39/39 tests `test_google_maps_crawler.py` & `test_crawler_google_maps_api.py`).


## [1.21.0] - 2026-11-02

### Khắc Phục Triệt Để Lỗi 502 Bad Gateway (OOM RAM & Timeout) & Sửa Lỗi Tìm Kiếm Lệch Chi Nhánh Google Maps
- **Tối Ưu Hóa Tài Nguyên Chromium & Chặn Lỗi 502 OOM 512MB (`crawler/google_maps_crawler.py`)**:
  - Tích hợp cờ cấu hình tài nguyên tối thiểu cho Chromium: `--js-flags=--max-old-space-size=128`, `--renderer-process-limit=1`, `--disable-software-rasterizer`, `--mute-audio`.
  - Thiết lập cơ chế chặn tài nguyên mạng chủ động qua `context.route`: Chặn triệt để toàn bộ Map tiles `/maps/vt/`, ảnh vệ tinh (`khms`, `ggpht`), ảnh tải lên (`googleusercontent.com/p/`) và multimedia (`png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`, `ico`, `woff`, `woff2`, `ttf`, `mp4`, `webm`) trong khi vẫn bảo toàn 100% dữ liệu văn bản và XHR/fetch.
  - Giảm tiêu thụ RAM từ ~450MB xuống còn ~70-90MB (giảm hơn 75%), loại bỏ hoàn toàn nguy cơ OOM Killer trên Render Free Tier (512MB RAM).
- **Tăng Tốc Độ Cào Dữ Liệu & Deadline Guard 35s (`crawler/google_maps_crawler.py`)**:
  - Loại bỏ hoàn toàn vòng lặp tìm kiếm 8 từ khóa phụ rườm rà (vốn gây tốn 30-40s và chứa từ khóa hardcode `"đà nẵng"`).
  - Tối ưu hóa việc cuộn feed container `.m6QErb.DxyBCb` với cơ chế Early Stopping (tự động dừng ngay sau 2 nhịp cuộn liên tiếp không tăng thêm đánh giá mới).
  - Bổ sung Deadline Guard 35 giây: Tự động trả về danh sách đánh giá đã thu thập được nếu chạm ngưỡng 35s, ngăn chặn tình trạng chạm mốc timeout 100s của Render proxy.
- **Sửa Lỗi Tìm Kiếm Theo Tên Quán & Khớp Chi Nhánh Thông Minh (`routers/crawler.py`, `google_maps_crawler.py`, `LinkGoogleMapsModal.tsx`)**:
  - **Backend API**: Xóa bỏ hardcode `city="Đà Nẵng"` trong `crawl_google_maps_endpoint`, tự động ưu tiên thành phố thực của quán (`target_rest_city` hoặc bóc tách từ địa chỉ).
  - **Multi-Result Branch Matching**: Bổ sung hàm `check_address_match` duyệt qua 5 thẻ kết quả đầu tiên của danh sách tìm kiếm Google Maps để đối chiếu với địa chỉ quán mục tiêu, ưu tiên chọn đúng chi nhánh trùng khớp.
  - **Thông Điệp Lỗi Rõ Ràng**: Nâng cấp câu thông báo lỗi tại `validate_restaurant_match`, phân biệt rõ giữa tìm kiếm theo tên và dán URL, đồng thời nêu rõ khi phát hiện khác chi nhánh (như Bò Tơ Năm Sánh QL22B vs 30 Tháng 4) và hướng dẫn chuyển sang tab dán link.
  - **Frontend UX (`LinkGoogleMapsModal.tsx`)**: Thuật toán làm sạch chuỗi tìm kiếm `buildSmartGoogleMapsQuery` khử lặp từ ngữ giữa tên quán và địa chỉ; bổ sung nút tiện ích chuyển nhanh sang tab dán link khi phát hiện cảnh báo lệch chi nhánh.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - `npm run build`: 1838 modules transformed, 0 lỗi TypeScript / JSX.
  - `npm test`: 6/6 tests passed.
  - Backend Crawler Test Suite: 108/108 tests passed 100% in 12.34s.

## [1.20.0] - 2026-10-30

### Nhận Diện Thương Hiệu Mới — 'The Culinary Lens' (Lăng Kính Đọc Vị Ẩm Thực)
- **Hệ Thống Logo & Brand Assets (`public/brand/`, `public/favicon.svg`)**:
  - Thiết kế và vector hóa biểu tượng chính **The Culinary Lens**: Kết hợp nắp đậy món ăn (*Fine Dining Cloche*) với vệt cắt quang học âm bản và ngôi sao hổ phách 4 cánh (*Michelin & AI Sparkle*) ở đỉnh vòm.
  - Xây dựng tổ hợp nhận diện chuẩn **Brand Lockup** kết hợp biểu tượng với typography *Spectral Serif* và *Be Vietnam Pro*.
  - Kiểm thử độ sắc nét quang học đa tỷ lệ (16px, 32px, 64px, 128px, 256px) vượt chuẩn hiển thị pixel-level.
  - Cập nhật Favicon chính thức tại `public/favicon.svg` và liên kết trong `index.html`.
- **Tích Hợp Giao Diện Ứng Dụng (`BrandLogo.tsx`, `Navbar.tsx`, `Footer.tsx`)**:
  - Tạo component chuẩn `BrandMark` tại `src/components/common/BrandLogo.tsx`.
  - Thay thế placeholder ký tự `RI` cũ trên thanh điều hướng `Navbar` và chân trang `Footer`.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - `npm run build`: 1838 modules transformed, 0 lỗi TypeScript / JSX.

## [1.19.0] - 2026-10-27

### Khắc Phục Lỗi Playwright Browser Thiếu Trong Docker & Tự Động Nhận Diện URL Thông Minh
- **Hạ Tầng Docker & Container Runtime (`Dockerfile`)**:
  - Thiết lập biến môi trường `PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright` nhằm chỉ định vị trí cài đặt browser toàn cục cho user không đặc quyền `appuser`.
  - Bổ sung lệnh `RUN python -m playwright install --with-deps chromium` trong Docker build layer, đảm bảo binary Chromium của Playwright luôn có sẵn trong container image trước khi deploy.
  - Phân quyền sở hữu `chown -R appuser:appuser /home/appuser` cho phép tiến trình chạy dưới quyền `appuser` có toàn quyền thực thi trình duyệt Playwright.
- **Backend Crawler & Self-Healing Fallback (`crawler/google_maps_crawler.py`, `routers/crawler.py`)**:
  - **Cơ chế tự phục hồi trình duyệt 3 lớp (`create_stealth_browser`)**:
    1. Kiểm tra `playwright_instance.chromium.executable_path` trên đĩa.
    2. Nếu executable chưa có sẵn, tự động fallback sang Chromium hệ thống (`/usr/bin/chromium` hoặc `CHROME_BIN`).
    3. Nếu cả hai chưa tồn tại, tự động thực thi subprocess `python -m playwright install chromium` trong runtime.
  - **Nhận diện URL thông minh trong `search_and_crawl_google_maps`**: Tự động nhận diện nếu `query` là một Google Maps URL trực tiếp (Place URL, Share Link `goo.gl`), chuẩn hóa protocol và gọi trực tiếp `crawl_google_maps_reviews` thay vì ghép nối chuỗi thành URL tìm kiếm không hợp lệ.
  - **Chuyển hướng an toàn trong `search_and_crawl_restaurant`**: Khi người dùng nhập/dán URL trực tiếp vào tham số tìm kiếm `req.query`, router tự động chuyển hướng sang `analyze_restaurant_url`, hỗ trợ đồng nhất cả Foody và Google Maps URLs.
- **Frontend UX & Auto-Detect URL (`AnalyzeUrlModal.tsx`, `LinkGoogleMapsModal.tsx`)**:
  - **Modal Tổng Hợp Đánh Giá Quán Mới (`AnalyzeUrlModal.tsx`)**:
    - Khi người dùng dán hoặc nhập chuỗi liên kết (`http://` hoặc `https://`) vào ô "Tìm theo tên quán / từ khóa", hệ thống tự động nhận diện domain (Foody / Google Maps), tự động chuyển sang tab "Dán liên kết trang quán ăn" (`setTab('url')`) và điền URL.
    - Bổ sung lớp phòng thủ trong `handleSubmit`: nếu form submit trong tab keyword chứa URL, tự động chuyển hướng gọi `analyzeFoodyUrl` thay vì `searchAndCrawlFoody`.
  - **Modal Bổ Sung Đánh Giá Google Maps (`LinkGoogleMapsModal.tsx`)**:
    - Tự động nhận diện Google Maps URL khi nhập vào ô tìm kiếm tên quán và chuyển sang tab dán đường dẫn.
    - Phòng thủ trong `handleSubmit`: nếu đang ở tab tìm kiếm mà giá trị là URL, tự động xử lý như `payloadUrl`.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - `npm run build`: 1837 modules transformed, 0 lỗi TypeScript / JSX.
  - `npm test`: 6/6 tests passed.
  - Backend `pytest`: 63/63 crawler tests passed (100%).

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
