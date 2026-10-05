# Changelog

All notable changes to the **Restaurant Intelligence** project will be documented in this file.

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
