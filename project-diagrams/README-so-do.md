# TÀI LIỆU HƯỚNG DẪN & ĐẶC TẢ BỘ 7 SƠ ĐỒ KỸ THUẬT CHUẨN BÁO CÁO (DIAGRAMS.NET / DRAW.IO)
## Dự án: Restaurant Intelligence System (Phân Tích Đánh Giá Nhà Hàng Đa Nguồn & AI Phản Hồi)

> **Mã tài liệu**: `DOC-DIAG-01`  
> **Phiên bản hệ thống**: v1.15.0 (Ấn bản Chuẩn hóa Từ ngữ Ngắn gọn & Tượng trưng - Publication Grade)  
> **Kiến trúc**: React 19 SPA + FastAPI + SQLite (WAL Mode) + Google Gemini AI + Multi-Source Crawlers  
> **Thư mục lưu trữ file nguồn**: `project-diagrams/`  
> **Thư mục xuất vector & ảnh**: `project-diagrams/exports/`  

---

## 1. MÔ HÌNH HỆ THỐNG NỘI BỘ DÙNG CHUNG (SHARED SYSTEM MODEL)

Để đảm bảo tính nhất quán 100% xuyên suốt cả 7 sơ đồ và tuân thủ nguyên tắc **từ ngữ ngắn gọn, tượng trưng, đúng chuẩn ký pháp UML/C4/DFD (loại bỏ hoàn toàn văn bản dài dòng, danh sách gạch đầu dòng và mã nội bộ bên trong hộp)**:

### 1.1. Bảng Đối Soát Thuật Ngữ Tượng Trưng (Symbolic Terminology Mapping)
| Thành phần / Đối tượng | Tên Kỹ Thuật (Code / File) | Nhãn Tượng Trưng Trên Sơ Đồ (Concise UML/C4) |
|:---|:---|:---|
| Frontend Web | `frontend/src/App.tsx`, Vite, React 19 | **Frontend SPA (React 19 + TypeScript)** |
| API Gateway | `api_server.py`, Uvicorn, FastAPI | **FastAPI Core (api_server.py)** |
| Router Nhà hàng | `routers/restaurants.py` | **Restaurants Router (/api/restaurants)** |
| Router Thu thập | `routers/crawler.py` | **Crawler Router (/api/crawler)** |
| Dịch vụ BI | `services/bi_service.py` | **BI Service (Chỉ số & ABSA)** |
| Trợ lý AI | `services/assistant_service.py` | **Assistant Service (Trợ lý F&B)** |
| Sinh thư phản hồi | `services/reply_service.py` | **Reply Service (Sinh phản hồi & Voucher)** |
| Bộ đệm phiên | `reply_service.py` / `_reply_sessions` | **Session Cache (In-Memory)** |
| Khớp nối thực thể | `services/entity_resolution.py` | **Entity Resolution (Khớp quán & Dedup)** |
| Lọc spam đánh giá | `services/review_filter.py` | **Review Filter (Lọc spam)** |
| Cơ sở dữ liệu | SQLite WAL Mode (`data/restaurants.db`) | **SQLite Database (WAL Mode)** |
| Bản sao lưu hạt giống | `data/restaurants.db` (initial seed) | **Seed Backup (restaurants.db)** |
| Trình cào Foody | `crawlers/foody_crawler.py` (Selenium) | **Foody Crawler (Selenium)** |
| Trình cào Google Maps | `crawlers/google_maps_crawler.py` (Playwright) | **Maps Crawler (Playwright)** |
| Pipeline cào dữ liệu | `crawlers/run_pipeline.py` | **Crawl Pipeline (run_pipeline.py)** |
| Nền tảng nguồn ngoài | Foody.vn, Google Maps | **Nền tảng Đánh giá (Foody.vn & Google Maps)** |
| Lập lịch định kỳ | GitHub Actions Cron | **GitHub Actions (Lập lịch Cron)** |
| Dịch vụ AI ngoại vi | Google Gemini API (GenAI SDK) | **Google Gemini AI (ABSA & Chatbot)** |

### 1.1. Các Tác Nhân (Actors)
1. **Chủ nhà hàng / Quản lý F&B (Primary Human Actor)**: Người dùng trọng tâm của giải pháp BI, truy cập Dashboard, theo dõi 5 khía cạnh ABSA, tra cứu đánh giá, tương tác với Trợ lý ảo AI, kích hoạt sinh thư phản hồi đánh giá và gắn voucher ưu đãi đền bù.
2. **Thực khách / Người dùng ẩm thực (Primary Human Actor)**: Tìm kiếm quán ăn theo tên, địa phương (Đà Nẵng, TP.HCM, Hà Nội), xem điểm số và mức độ uy tín của quán.
3. **Bộ lập lịch DataOps / GitHub Actions (Primary System Actor)**: Tác nhân chạy định kỳ ngầm (`scheduled_crawler.yml`) kích hoạt pipeline thu thập dữ liệu tự động.
4. **Google Gemini AI API (Secondary External System)**: Cung cấp API mô hình ngôn ngữ lớn (`gemini-2.5-flash` và `gemini-3.5-flash-lite`) thực hiện Aspect-Based Sentiment Analysis (ABSA), Chatbot F&B và AI Review Responder.
5. **Nền tảng Nguồn Dữ Liệu Ngoại Vi (External Platforms)**: `Foody.vn` và `Google Maps`.

### 1.2. Phân Tầng Hệ Thống (Architectural Subsystems)
* **Presentation Tier**: `React 19 SPA` (Vite, TypeScript, Tailwind CSS v4, Recharts) gồm các trang `HomePage`, `ExplorePage`, `DashboardPage` và các widget chuyên biệt (`AspectAnalysis`, `SentimentTrendChart`, `ReviewExplorer`, `ReviewReplyModal`, `AiAssistantWidget`).
* **Ingress & API Gateway Tier**: `FastAPI` (Python 3.12, Uvicorn, port 8000), `CORS Middleware`, `StaticFiles` phục vụ build tĩnh React, gồm 2 Router chính:
  * `routers/restaurants.py` (Quản lý quán ăn, tìm kiếm, Q&A AI, sinh phản hồi AI).
  * `routers/crawler.py` (Cào theo URL, cào Google Maps, hàng đợi thu thập ngầm).
* **Core Business & AI Services**:
  * `bi_service.py`: Tính toán chỉ số BI, ABSA Aggregation, đo lường chỉ số độ tin cậy mẫu (`calculate_credibility_score()`).
  * `assistant_service.py`: Trợ lý hỏi đáp F&B, nhận diện ý định (`detect_question_intent()`), tổng hợp câu trả lời fallback nếu thiếu API key.
  * `reply_service.py`: Bộ sinh thư phản hồi 4 tông giọng (Xin lỗi, Voucher đền bù, Tri ân, Giải thích), tạo mã ưu đãi `{VOUCHER_CODE}`, quản lý In-Memory Cache.
  * `entity_resolution.py`: Khớp nối thực thể đa nguồn Foody + Google Maps, tính toán độ tương đồng tên/địa chỉ, mã băm SHA-256 (`fingerprint`) khử trùng lặp.
  * `review_filter.py`: Bộ lọc spam 11 quy tắc (độ dài, số điện thoại, link quảng cáo, ký tự lặp, trùng lặp...).
  * `gemini_analyzer.py`: Module giao tiếp Gemini API trích xuất 5 khía cạnh ABSA ("món ăn", "dịch vụ", "giá cả", "không gian", "vệ sinh/vị trí") và cờ cảnh báo khẩn cấp (`is_urgent`).
* **Data Ingestion Crawlers**:
  * `foody_crawler.py`: Selenium Chrome Headless cào dữ liệu từ Foody.
  * `google_maps_crawler.py`: Playwright Headless thực hiện virtual scroll trên container `.m6QErb`, auto-click 'Xem thêm'.
* **Persistence & Storage**:
  * Cơ sở dữ liệu SQLite (`data/restaurants.db`), quản lý bằng SQLAlchemy ORM với cấu hình WAL Mode (`PRAGMA journal_mode=WAL`), timeout 30s.
  * 4 Bảng dữ liệu: `restaurants`, `reviews`, `review_analysis`, `crawl_requests`.

---

## 2. CHI TIẾT TỪNG SƠ ĐỒ KỸ THUẬT & KIẾN TRÚC TỌA ĐỘ V6 (ZERO COLLISION)

Toàn bộ 7 sơ đồ được tái cấu trúc hình học và topology theo chuẩn ấn phẩm học thuật, đảm bảo **100% không chồng lấn đường nối, không đè nhãn chữ, không cắt xuyên qua các khối hình**:

### Sơ đồ 1: Kiến Trúc Hệ Thống (`01-system-architecture.drawio`)
* **Mục đích**: Cung cấp bức tranh toàn cảnh vĩ mô về các tầng cấu trúc, phân chia ranh giới vật lý/logic, giao thức kết nối và luồng tương tác giữa các thành phần.
* **Ký pháp**: Tiered Block Diagram (C4 Container/Component level).
* **Kiến trúc bố trí hình học**:
  * **Tầng 1 (Client)**: Trình duyệt $\rightarrow$ React 19 SPA $\rightarrow$ `restaurantService.ts`.
  * **Tầng 2 (API Gateway)**: Khối `FastAPI Application` được đặt ở **trung tâm** (center), kết nối sang trái (`Include Router: restaurants.py`) và sang phải (`Include Router: crawler.py`). Bố cục đối xứng này triệt tiêu hoàn toàn đường nối cắt ngang.
  * **Tầng 3 (Core Services)**: 5 module dịch vụ được dàn trải ngang với khoảng cách 20px. `In-Memory Session Cache` đặt bên dưới `reply_service.py`, đường kết nối ra `Google Gemini AI API` đi từ bên phải xuống, không cắt qua bất kỳ khối nào.
  * **Tầng 4 (Persistence, Crawlers & External Services)**: Chia làm **4 cột độc lập**:
    * Cột 1: `SQLite Database` (trên) & `Seed Data Backup` (dưới).
    * Cột 2: `FoodyCrawler` (trên), `GoogleMapsCrawler` (giữa), `run_pipeline.py` (dưới).
    * Cột 3: `Foody.vn & Google Maps Platforms` (trên), `GitHub Actions CI/CD DataOps` (dưới).
    * Cột 4: `Google Gemini AI API`.
    * Hai crawler kết nối thẳng sang phải vào `Platforms`, `GitHub Actions` kết nối thẳng sang trái vào `run_pipeline.py`, `run_pipeline.py` nạp sang trái vào `SQLite Database`. Tuyệt đối không có đường chéo cắt nhau.

### Sơ đồ 2: Sơ đồ Use Case (`02-use-case.drawio`)
* **Mục đích**: Mô hình hóa các yêu cầu chức năng nghiệp vụ của hệ thống dưới góc nhìn của các tác nhân con người và hệ thống hỗ trợ bên ngoài.
* **Ký pháp**: UML 2.5 Use Case Diagram chuẩn quốc tế.
* **Kiến trúc bố trí hình học**:
  * **Ranh giới hệ thống**: Khung chữ nhật bo góc `Ranh giới Hệ Thống Restaurant Intelligence` kết thúc ở `x=910`.
  * **Tác nhân ngoại vi**: `Google Gemini AI [External LLM]` đặt ở `x=980` (cách ranh giới 70px), loại bỏ hoàn toàn việc viền ranh giới đè lên hình người (actor).
  * **Luồng Include AI**: Khối `15. Bóc tách khía cạnh ABSA & AI LLM` được đặt tại Cột 3 (ngang hàng `uc7`), tiếp nhận quan hệ `«include»` từ `uc7` và `uc14`, sau đó xuất duy nhất 1 đường `«include»` sang `act_gemini`. Khối `10. Sao chép phản hồi` và `9. Tích hợp mã Voucher` hoàn toàn sạch sẽ, không có đường nối cắt ngang qua.

### Sơ đồ 3: Sơ đồ Hoạt Động Của 2 Đối Tượng (`03-activity-two-actors.drawio`)
* **Mục đích**: Mô tả dòng điều khiển (Control Flow) và quy trình phối hợp khép kín giữa 2 đối tượng chính trong hệ thống nhằm giải quyết một vấn đề nghiệp vụ thực tế.
* **Hai đối tượng xác minh**:
  * Làn 1 (Swimlane 1): **Chủ nhà hàng / Quản lý F&B** (Tác nhân người dùng).
  * Làn 2 (Swimlane 2): **Hệ thống Restaurant Intelligence & AI Engine** (Hệ thống phần mềm).
* **Nghiệp vụ**: *Quy trình Xử lý Khủng hoảng Đánh giá Tiêu cực & Tự động Hóa Phản hồi Khách hàng bằng Gemini AI*.
* **Kiến trúc bố trí hình học**:
  * Nút quyết định `Đánh giá bản thảo?` chia làm 2 nhánh rẽ ngang song song:
    * Nhánh trái: `[Hài lòng / Sửa]` $\rightarrow$ `8b. Chỉnh sửa câu từ trực tiếp trong ô soạn thảo Textarea` (nằm ở bên trái, x=65).
    * Nhánh phải: `[Cần voucher]` $\rightarrow$ `8a. Chọn tông 'Voucher đền bù'` (nằm ở bên phải, x=295).
    * Từ `8a`, luồng gửi sang Làn 2 (`Tạo mã {VOUCHER_CODE} & gọi lại Gemini sinh thư mới`) đi thẳng sang phải qua ranh giới làn mà không vướng `8b`.
    * Cả hai nhánh hội tụ tại Merge diamond (`mrg2`), sau đó đi tuần tự xuống Action 9 (Sao chép) $\rightarrow$ Action 10 (Ghi Clipboard) $\rightarrow$ Action 11 (Dán phản hồi) $\rightarrow$ Final node.
    * Đồ thị phẳng (Planar Graph) 100%, không có đường điều khiển nào cắt ngang qua nhau.

### Sơ đồ 4: Sơ đồ Tuần Tự (`04-sequence-main-flow.drawio`)
* **Mục đích**: Biểu diễn chi tiết chuỗi trao đổi thông điệp theo trục thời gian (từ trên xuống dưới) cho ca sử dụng trọng tâm: **Sinh Thư Phản Hồi Đánh Giá Khách Hàng Bằng AI (AI Review Responder)**.
* **Ký pháp**: UML 2.5 Sequence Diagram.
* **Kiến trúc bố trí hình học**:
  * Các đường trục sống (Lifelines) chạy từ `y=120` đến `y=1030`.
  * Mỗi thông điệp từ 1 đến 21 được gắn vào cặp điểm neo (anchor points) độc lập với tọa độ Y tăng đơn điệu nghiêm ngặt (khoảng cách 35-40px): Msg 1 (y=140), Msg 2 (y=175), ..., Msg 13 (y=560).
  * Khung `opt: [Người dùng chuyển sang tông 'Voucher đền bù']` bắt đầu từ `y=590` đến `y=905`. Tab tiêu đề nằm ở `y=590..612`. Thông điệp 14 bắt đầu ở `y=660` (cách mép trên 50px), hoàn toàn không chạm vào viền khung tab.
  * Msg 20 (Sao chép) và Msg 21 (Toast) nằm bên dưới khung `opt` (`y=945` và `y=985`).

### Sơ đồ 5: Sơ đồ Thực Thể Liên Kết (`05-entity-relationship.drawio`)
* **Mục đích**: Đặc tả mô hình dữ liệu quan hệ vật lý đang vận hành trực tiếp trong tệp cơ sở dữ liệu `data/restaurants.db`.
* **Ký pháp**: Crow's Foot Relational Notation.
* **Kiến trúc bố trí hình học**:
  * 3 bảng chính dàn trải theo trục ngang: `restaurants` (x=50..350), `reviews` (x=470..790), `review_analysis` (x=900..1135).
  * Khoảng cách giữa các bảng rộng 110-120px. Các đường nối quan hệ là đường thẳng nằm ngang tại `y=200` và `y=190`.
  * Huy hiệu quan hệ `1 : N (cascade)` được căn giữa trên đường nối, không chạm viền bảng hay đè lên tên cột.
  * Bảng `crawl_requests` nằm ở góc dưới bên trái, kết nối dọc lên `restaurants` với nhãn `Triggers Job`. Khung chú giải đặt ở góc dưới bên phải.

### Sơ đồ 6: Sơ đồ Luồng Dữ Liệu (`06-data-flow.drawio`)
* **Mục đích**: Mô tả các tiến trình biến đổi dữ liệu, kho lưu trữ và các luồng thông tin vào/ra hệ thống.
* **Ký pháp**: Gane-Sarson / Yourdon-DeMarco Notation.
* **Kiến trúc bố trí hình học**:
  * **DFD Mức 0 (Context)**: Đặt ở nửa trên canvas, gồm Tiến trình trung tâm `0.0`, 4 Thực thể ngoài (`User`, `Foody`, `Google Maps`, `Gemini AI`).
  * **DFD Mức 1 (Phân rã chức năng)**: Bố trí theo **3 làn luồng ngang**:
    * **Làn A (Crawl & Tiền xử lý)**: `D4 (Hàng đợi)` $\rightarrow$ `1.0 (Crawl)` $\rightarrow$ `2.0 (Lọc spam)`. Tại đây, hai kho dữ liệu `D1 (restaurants)` và `D2 (reviews)` được **xếp chồng dọc** ở bên phải (`D1` ở trên tại y=280, `D2` ở dưới tại y=345). Tiến trình 2.0 tỏa ra 2 mũi tên riêng biệt sang `D1` ("Lưu quán") và `D2` ("Lưu review"), không cắt nhau.
    * **Làn B (Phân tích AI & Chỉ số BI)**: `D2` cấp review xuống `3.0 (Aspect Analysis)`, `3.0` trao đổi với `Gemini AI` ("Prompt & JSON ABSA") và lưu sang `D3 (review_analysis)`. `4.0 (Tổng hợp BI)` đọc từ `D3` và cập nhật điểm sang `D1`.
    * **Làn C (Tương tác & Phản hồi)**: `4.0` gửi "Biểu đồ BI & Radar" về `User`. `User` gửi yêu cầu sang `5.0 (Trợ lý & Sinh thư)`, `5.0` tra cứu/lưu cache tại `D5` và trả lời về `User`.
    * Toàn bộ 16 luồng dữ liệu đều có hướng đi tự nhiên từ trên xuống dưới hoặc từ trái sang phải, triệt tiêu hoàn toàn sự rối rắm.

### Sơ đồ 7: Sơ đồ Lớp UML (`07-class-diagram.drawio`)
* **Mục đích**: Mô hình hóa cấu trúc hướng đối tượng của các thực thể ORM, các lớp dịch vụ nghiệp vụ, bộ lọc, crawler và module phân tích AI.
* **Ký pháp**: UML 2.5 Class Diagram.
* **Kiến trúc bố trí hình học**:
  * Chiều cao của các hộp thực thể ORM ở Khối 1 được tăng lên 200px, đảm bảo dòng phương thức `+ __repr__(): str` hiển thị trọn vẹn bên trong hộp mà không bị đường viền cắt ngang.
  * Khoảng cách giữa `Review` và `ReviewAnalysis` được nới rộng lên 85px, huy hiệu quan hệ hợp thành `1 : 0..*` nằm lọt trong khoảng trống.
  * Tầng dịch vụ (Khối 2) được bố trí theo 3 cột thẳng hàng với các thực thể phía trên: Cột 1 (`EntityResolutionService`, `ReviewFilter`), Cột 2 (`BIService`, `ReplyService`), Cột 3 (`AssistantService`, `GeminiAnalyzer`).
  * Các đường phụ thuộc (`«resolves»`, `«deduplicates»`, `«aggregates»`, `«uses_llm»`, `«uses_bi»`) đi theo đường thẳng đứng hoặc nằm ngang, không cắt qua bất kỳ hộp lớp nào.
  * Hai lớp Crawler (`FoodyCrawler` và `GoogleMapsCrawler`) nằm riêng biệt trong Khối 3 ở bên phải.

---

## 3. DANH MỤC TỆP BÀN GIAO & LIÊN KẾT NHANH

| STT | Tên Sơ Đồ | File Nguồn draw.io (Chỉnh sửa được) | File Vector SVG | File Ảnh PNG Preview |
|:---:|:---|:---:|:---:|:---:|
| 1 | **Kiến Trúc Hệ Thống** | [01-system-architecture.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/01-system-architecture.drawio) | [01-system-architecture.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/01-system-architecture.svg) | [01-system-architecture.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/01-system-architecture.png) |
| 2 | **Sơ Đồ Use Case** | [02-use-case.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/02-use-case.drawio) | [02-use-case.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/02-use-case.svg) | [02-use-case.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/02-use-case.png) |
| 3 | **Hoạt Động 2 Đối Tượng** | [03-activity-two-actors.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/03-activity-two-actors.drawio) | [03-activity-two-actors.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/03-activity-two-actors.svg) | [03-activity-two-actors.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/03-activity-two-actors.png) |
| 4 | **Sơ Đồ Tuần Tự (AI Reply)** | [04-sequence-main-flow.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/04-sequence-main-flow.drawio) | [04-sequence-main-flow.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/04-sequence-main-flow.svg) | [04-sequence-main-flow.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/04-sequence-main-flow.png) |
| 5 | **Sơ Đồ Thực Thể Liên Kết (ERD)** | [05-entity-relationship.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/05-entity-relationship.drawio) | [05-entity-relationship.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/05-entity-relationship.svg) | [05-entity-relationship.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/05-entity-relationship.png) |
| 6 | **Sơ Đồ Luồng Dữ Liệu (DFD)** | [06-data-flow.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/06-data-flow.drawio) | [06-data-flow.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/06-data-flow.svg) | [06-data-flow.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/06-data-flow.png) |
| 7 | **Sơ Đồ Lớp (UML Class)** | [07-class-diagram.drawio](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/07-class-diagram.drawio) | [07-class-diagram.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/07-class-diagram.svg) | [07-class-diagram.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/07-class-diagram.png) |

---

## 4. HƯỚNG DẪN MỞ & CHỈNH SỬA BẰNG DIAGRAMS.NET (DRAW.IO)

1. Truy cập trực tiếp trang web miễn phí: [https://app.diagrams.net](https://app.diagrams.net) (hoặc ứng dụng Diagrams.net Desktop).
2. Chọn menu **File** $\rightarrow$ **Open From** $\rightarrow$ **Device...** (hoặc kéo thả trực tiếp tệp `.drawio` vào cửa sổ trình duyệt).
3. Toàn bộ hình khối, nhãn văn bản, mũi tên và màu sắc là đối tượng vector chuẩn, có thể nhấp đúp để sửa chữ, kéo đổi kích thước hoặc thay đổi kiểu dáng tùy ý.
4. Để chèn vào báo cáo Word hoặc LaTeX:
   * Chọn **File** $\rightarrow$ **Export as** $\rightarrow$ **PNG...** (chọn DPI 300 cho bản in sắc nét).
   * Hoặc sử dụng trực tiếp các tệp `.svg` chất lượng cao có sẵn trong thư mục `project-diagrams/exports/`.
