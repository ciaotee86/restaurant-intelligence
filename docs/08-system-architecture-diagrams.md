# BỘ SƠ ĐỒ THIẾT KẾ KIẾN TRÚC & HỆ THỐNG
## Dự án: Restaurant Intelligence System (Phân Tích Đánh Giá Nhà Hàng Đa Nguồn & AI Phản Hồi)

> **Mã tài liệu**: `DOC-ARCH-08`  
> **Phiên bản hệ thống**: v1.14.0  
> **Công nghệ chính**: React 19 + TypeScript + Vite + Tailwind CSS + FastAPI + SQLAlchemy + SQLite (WAL) + Selenium/Playwright + Google Gemini AI  
> **Ngày cập nhật**: 25/10/2026  

---

## MỤC LỤC
1. [Sơ đồ 1: Kiến Trúc Hệ Thống (System Architecture Diagram)](#1-sơ-đồ-kiến-trúc-hệ-thống-system-architecture)
2. [Sơ đồ 2: Sơ đồ Use Case (Use Case Diagram)](#2-sơ-đồ-use-case-use-case-diagram)
3. [Sơ đồ 3: Sơ đồ Luồng Hoạt Động Của 2 Đối Tượng (Activity Diagram / Swimlane)](#3-sơ-đồ-luồng-hoạt-động-của-2-đối-tượng-activity-diagram--swimlane)
4. [Sơ đồ 4: Sơ đồ Tuần Tự (Sequence Diagram)](#4-sơ-đồ-tuần-tự-sequence-diagram)
5. [Sơ đồ 5: Sơ đồ Thực Thể Liên Kết (Entity-Relationship Diagram - ERD)](#5-sơ-đồ-thực-thể-liên-kết-erd)
6. [Sơ đồ 6: Sơ đồ Luồng Dữ Liệu (Data Flow Diagram - DFD Level 1)](#6-sơ-đồ-luồng-dữ-liệu-data-flow-diagram---dfd-level-1)
7. [Sơ đồ 7: Sơ đồ Lớp (Class Diagram)](#7-sơ-đồ-lớp-class-diagram)

---

## 1. Sơ đồ Kiến Trúc Hệ Thống (System Architecture)

Sơ đồ mô tả cấu trúc phân tầng (Layered Architecture) hoàn chỉnh của hệ thống từ tầng Trình duyệt Client, tầng Web API Server, tầng Nghiệp vụ & AI, tầng Thu thập Dữ liệu (Crawling/DataOps) đến tầng Cơ sở dữ liệu SQLite.

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Tầng Trình Duyệt & Giao Diện (Frontend Client)"]
        UI_SPA["React 19 SPA (Vite + TypeScript + Tailwind CSS v4)"]
        subgraph UIPages ["Các Trang & Dashboard Views"]
            P_Home["HomePage (Khám phá & Tìm kiếm)"]
            P_Explore["ExplorePage (Danh mục & Bộ lọc quán)"]
            P_Dash["DashboardPage (BI Analytics Đa Chiều)"]
        end
        subgraph UIWidgets ["Widget Nghiệp Vụ & AI"]
            W_Aspect["AspectAnalysis (Radar & Bar 5 khía cạnh)"]
            W_Trend["SentimentTrendChart (Xu hướng thời gian)"]
            W_Explorer["ReviewExplorer (Bộ lọc & Đào sâu review)"]
            W_AIWidget["AiAssistantWidget (Chatbot F&B Hỏi Đáp)"]
            W_ReplyModal["ReviewReplyModal (AI Soạn Thư Phản Hồi)"]
        end
    end

    subgraph GatewayLayer ["2. Tầng Máy Chủ Web & API (FastAPI Backend)"]
        SVR["FastAPI Web Server (api_server.py / Port 8000)"]
        MW_CORS["CORS Middleware (Whitelisted Origins)"]
        MW_Static["StaticFiles Mount (Phục vụ React SPA Dist)"]
        
        subgraph Routers ["API Routers"]
            R_Rest["restaurants.py (/api/restaurants, /search, /ask, /generate-reply)"]
            R_Crawl["crawler.py (/api/analyze-url, /api/crawler/google-maps, /api/request-crawl)"]
        end
    end

    subgraph ServiceLayer ["3. Tầng Nghiệp Vụ & AI (Business Logic & AI Services)"]
        S_BI["bi_service.py (Thống kê BI, ABSA Aggregation, Sample Credibility Index)"]
        S_Assistant["assistant_service.py (Intent Classification, F&B Q&A Engine, Fallback BI)"]
        S_Reply["reply_service.py (4 Tông giọng phản hồi, F&B Prompting, Response Cache)"]
        S_Entity["entity_resolution.py (Fuzzy Name Match, Brand Extraction, SHA-256 Deduplication)"]
        S_Filter["review_filter.py (Rule-based Spam Filter 11 ca)"]
    end

    subgraph CrawlingLayer ["4. Tầng Thu Thập & DataOps (Crawling & Background Jobs)"]
        C_Foody["foody_crawler.py (Selenium WebDriver Headless)"]
        C_GMaps["google_maps_crawler.py (Playwright Virtual Infinite Scroll)"]
        C_Pipeline["run_pipeline.py & automated_pipeline.py (Batch Coordinator)"]
        C_Cron["GitHub Actions CI/CD (.github/workflows/scheduled_crawler.yml)"]
    end

    subgraph ExternalServices ["5. Dịch Vụ Bên Ngoài (External Services)"]
        EXT_Gemini["Google Gemini AI API (gemini-2.5-flash / gemini-3.5-flash-lite)"]
        EXT_Foody["Foody.vn Web Platform"]
        EXT_GMaps["Google Maps Place Details & Reviews"]
    end

    subgraph DataLayer ["6. Tầng Dữ Liệu & Bộ Nhớ Đệm (Data Persistence)"]
        DB_SQLite[("SQLite Database (data/restaurants.db - WAL Mode)")]
        DB_Seed[("Seed Data & Backup (seed_data/restaurants.db, CSV Backup)")]
        CACHE_Mem[("In-Memory Cache (Phản hồi AI & Intent)")]
    end

    %% Client to Gateway
    UI_SPA -->|REST API Requests qua Fetch / JSON| SVR
    SVR --> MW_CORS
    SVR --> MW_Static
    SVR --> R_Rest
    SVR --> R_Crawl

    %% Routers to Services
    R_Rest --> S_BI
    R_Rest --> S_Assistant
    R_Rest --> S_Reply
    R_Crawl --> S_Entity
    R_Crawl --> C_Foody
    R_Crawl --> C_GMaps

    %% Services to External & DB
    S_Assistant --> EXT_Gemini
    S_Assistant --> CACHE_Mem
    S_Reply --> EXT_Gemini
    S_Reply --> CACHE_Mem
    S_BI --> DB_SQLite
    S_Entity --> DB_SQLite
    
    %% Crawling & Data Ingestion
    C_Foody --> EXT_Foody
    C_GMaps --> EXT_GMaps
    C_Foody --> S_Filter
    C_GMaps --> S_Filter
    S_Filter --> S_Entity
    S_Entity --> EXT_Gemini
    EXT_Gemini --> DB_SQLite
    C_Cron --> C_Pipeline
    C_Pipeline --> C_Foody
    C_Pipeline --> C_GMaps
    DB_SQLite -.->|Auto-restore khi khởi tạo| DB_Seed
```

---

## 2. Sơ đồ Use Case (Use Case Diagram)

Sơ đồ thể hiện đầy đủ các trường hợp sử dụng (Use Cases) của 3 nhóm tác nhân chính: **Chủ nhà hàng / Quản lý**, **Thực khách / Người dùng**, và **Hệ thống tự động (DataOps Scheduler)**, cùng mối quan hệ phụ thuộc (`<<include>>`, `<<extend>>`) với dịch vụ bên ngoài **Google Gemini AI**.

```mermaid
flowchart LR
    Actor_Owner["fa:fa-user-tie Chủ nhà hàng / Quản lý"]
    Actor_User["fa:fa-user Thực khách / Khách hàng"]
    Actor_System["fa:fa-robot Hệ thống Cron / DataOps"]
    Actor_Gemini["fa:fa-brain Google Gemini AI API"]

    subgraph RestaurantIntelligenceSystem ["Hệ Thống Restaurant Intelligence"]
        UC_Search(["1. Tìm kiếm & Khám phá quán ăn"])
        UC_ViewDashboard(["2. Xem Dashboard phân tích BI"])
        UC_AspectAnalysis(["3. Đánh giá 5 khía cạnh ABSA"])
        UC_TrendAnalysis(["4. Theo dõi xu hướng cảm xúc"])
        UC_ExploreReviews(["5. Lọc & Đào sâu đánh giá"])
        UC_AskAssistant(["6. Trò chuyện với Trợ lý ảo F&B"])
        UC_GenerateReply(["7. Sinh phản hồi đánh giá thông minh"])
        UC_AttachVoucher(["8. Tích hợp mã Voucher đền bù"])
        UC_CopyReply(["9. Sao chép câu trả lời vào Clipboard"])
        UC_AnalyzeUrl(["10. Yêu cầu phân tích quán từ URL"])
        UC_LinkGoogleMaps(["11. Liên kết nguồn Google Maps"])
        UC_ScheduledCrawl(["12. Thu thập dữ liệu định kỳ"])
        UC_SpamDeduplicate(["13. Lọc Spam & Khử trùng lặp"])
        UC_ExtractABSA(["14. Bóc tách khía cạnh & Cảm xúc"])
        UC_CalculateCredibility(["15. Tính toán chỉ số độ tin cậy mẫu"])
    end

    %% Tương tác Người dùng & Chủ quán
    Actor_User --> UC_Search
    Actor_User --> UC_ViewDashboard

    Actor_Owner --> UC_Search
    Actor_Owner --> UC_ViewDashboard
    Actor_Owner --> UC_AspectAnalysis
    Actor_Owner --> UC_TrendAnalysis
    Actor_Owner --> UC_ExploreReviews
    Actor_Owner --> UC_AskAssistant
    Actor_Owner --> UC_GenerateReply
    Actor_Owner --> UC_AnalyzeUrl
    Actor_Owner --> UC_LinkGoogleMaps

    %% Quan hệ Include & Extend
    UC_ViewDashboard -.->|include| UC_CalculateCredibility
    UC_ViewDashboard -.->|include| UC_AspectAnalysis
    UC_ViewDashboard -.->|include| UC_TrendAnalysis

    UC_GenerateReply -.->|include| UC_CopyReply
    UC_GenerateReply -.->|extend| UC_AttachVoucher

    UC_AnalyzeUrl -.->|include| UC_SpamDeduplicate
    UC_AnalyzeUrl -.->|include| UC_ExtractABSA

    %% Tương tác Hệ thống DataOps
    Actor_System --> UC_ScheduledCrawl
    UC_ScheduledCrawl -.->|include| UC_SpamDeduplicate
    UC_ScheduledCrawl -.->|include| UC_ExtractABSA
    UC_ScheduledCrawl -.->|include| UC_CalculateCredibility

    %% Kết nối với AI Engine
    UC_AskAssistant -.->|include| Actor_Gemini
    UC_GenerateReply -.->|include| Actor_Gemini
    UC_ExtractABSA -.->|include| Actor_Gemini
```

---

## 3. Sơ đồ Luồng Hoạt Động Của 2 Đối Tượng (Activity Diagram / Swimlane)

Sơ đồ luồng phân làn giữa **Chủ nhà hàng (Actor)** và **Hệ thống Restaurant Intelligence & AI Engine (System)** trong quy trình nghiệp vụ cốt lõi: **Xử lý Đánh giá Tiêu cực & Tự Động Soạn Thảo Thư Phản Hồi Khách Hàng**.

```mermaid
flowchart TD
    subgraph OwnerLane ["ĐỐI TƯỢNG 1: CHỦ NHÀ HÀNG / QUẢN LÝ"]
        A1["Bắt đầu: Truy cập Dashboard quán ăn"] --> A2["Phát hiện đánh giá 1 sao (phàn nàn dịch vụ chậm)"]
        A2 --> A3["Bấm nút '⚡ AI Phản hồi' trên thẻ đánh giá"]
        A7["Xem bản thảo thư phản hồi hiển thị trong Modal"] --> A8{"Đánh giá nội dung thư?"}
        A8 -->|Cần đền bù thực khách| A9["Chuyển sang tông 'Voucher đền bù'"]
        A8 -->|Hài lòng ngay| A11["Bấm '📋 Sao chép phản hồi'"]
        A8 -->|Cần chỉnh câu chữ riêng| A10["Hiệu chỉnh trực tiếp trong ô Textarea"]
        A9 --> A12["Hệ thống tạo mã {VOUCHER_CODE} & sinh lại thư"]
        A10 --> A11
        A12 --> A7
        A11 --> A13["Dán câu trả lời lên Google Maps / Foody để phản hồi khách"]
        A13 --> A14["Kết thúc quy trình chăm sóc khách hàng"]
    end

    subgraph SystemLane ["ĐỐI TƯỢNG 2: HỆ THỐNG INTELLIGENCE & AI ENGINE"]
        A3 --> S1["Bóc tách ngữ cảnh: Tác giả, Điểm số, Nội dung, Khía cạnh lỗi"]
        S1 --> S2["Khởi tạo modal với tông mặc định phù hợp số sao"]
        S2 --> S3{"Kiểm tra Cache phiên (review_id + tone)?"}
        S3 -->|Đã có sẵn| S4["Lấy kết quả từ Memory Cache (0ms, 0 Token)"]
        S3 -->|Chưa có| S5["Tạo Few-shot Prompt chuyên gia F&B thấu cảm"]
        S5 --> S6["Gọi Google Gemini API (gemini-3.5-flash-lite)"]
        S6 --> S7["Lưu phản hồi mới sinh vào Session Cache"]
        S4 --> S8["Trả kết quả về giao diện Modal"]
        S7 --> S8
        S8 --> A7
        A9 --> S9["Cập nhật tham số tone='voucher' & generate_voucher_code()"]
        S9 --> S3
        A11 --> S10["Đưa chuỗi văn bản vào System Clipboard & bắn Toast"]
        S10 --> A13
    end
```

---

## 4. Sơ đồ Tuần Tự (Sequence Diagram)

Sơ đồ thể hiện chuỗi tương tác thời gian thực giữa Người dùng, Giao diện React, API Router, Dịch vụ Nghiệp vụ, Bộ nhớ đệm Cache và Google Gemini AI khi thực hiện chức năng **Sinh thư phản hồi tự động**.

```mermaid
sequenceDiagram
    autonumber
    actor User as Chủ nhà hàng
    participant Modal as React UI (ReviewReplyModal)
    participant Router as FastAPI Router (/api/restaurants/.../generate-reply)
    participant Service as ReplyService (reply_service.py)
    participant Cache as In-Memory Cache
    participant Gemini as Google Gemini AI API

    User->>Modal: Bấm nút "⚡ AI Phản hồi" trên bài đánh giá
    activate Modal
    Modal->>Modal: Mở Dialog, hiển thị Skeleton Loading
    Modal->>Router: POST /api/restaurants/{id}/generate-reply (reviewId, text, rating, tone='apology')
    activate Router

    Router->>Service: generate_review_reply(request_data)
    activate Service

    Service->>Cache: make_cache_key(review_id, tone, voucher_flag)
    activate Cache
    Cache-->>Service: Cache Miss (None)
    deactivate Cache

    Service->>Service: build_system_prompt(tone, author, restaurant_name, aspects)
    Service->>Gemini: generate_content(prompt) [Gemini 3.5 Flash Lite]
    activate Gemini
    Gemini-->>Service: 200 OK (Nội dung phản hồi chân thành, thấu cảm)
    deactivate Gemini

    Service->>Cache: Lưu kết quả phản hồi vào cache
    Service-->>Router: GenerateReplyResponse(reply_text, tone, aspects_addressed)
    deactivate Service

    Router-->>Modal: 200 OK (JSON phản hồi)
    deactivate Router

    Modal-->>User: Hiển thị văn bản trong Textarea kèm nhãn khía cạnh đã xử lý
    deactivate Modal

    opt Người dùng muốn tặng kèm ưu đãi
        User->>Modal: Chọn tab "Voucher đền bù"
        activate Modal
        Modal->>Router: POST /api/restaurants/{id}/generate-reply (tone='voucher', includeVoucher=True)
        activate Router
        Router->>Service: generate_review_reply(tone='voucher', voucher_code='CARE20-XYZ')
        activate Service
        Service->>Gemini: generate_content(prompt_with_voucher)
        activate Gemini
        Gemini-->>Service: 200 OK (Nội dung xin lỗi + mã voucher ưu đãi)
        deactivate Gemini
        Service-->>Router: GenerateReplyResponse(reply_text_with_voucher)
        deactivate Service
        Router-->>Modal: 200 OK
        deactivate Router
        Modal-->>User: Cập nhật văn bản mới trong Textarea
        deactivate Modal
    end

    User->>Modal: Bấm "📋 Sao chép phản hồi"
    activate Modal
    Modal->>User: Ghi vào Clipboard & thông báo Toast "Đã sao chép"
    deactivate Modal
```

---

## 5. Sơ đồ Thực Thể Liên Kết (ERD)

Sơ đồ thiết kế cơ sở dữ liệu quan hệ hoàn chỉnh được cài đặt bằng SQLAlchemy ORM trên nền tảng **SQLite Database** (`data/restaurants.db`), bao gồm 4 bảng dữ liệu, khóa chính, khóa ngoại, kiểu dữ liệu và mối quan hệ ràng buộc toàn vẹn.

```mermaid
erDiagram
    RESTAURANTS ||--o{ REVIEWS : "has (1:N, cascade delete)"
    REVIEWS ||--o{ REVIEW_ANALYSIS : "analyzed_into (1:N, cascade delete)"

    RESTAURANTS {
        int id PK "Khóa chính, tự tăng"
        varchar name "Tên quán ăn (not null)"
        varchar foody_url UK "Đường dẫn Foody (unique, nullable)"
        varchar google_maps_url UK "Đường dẫn Google Maps (unique, nullable)"
        varchar google_place_id "Mã định danh Place ID Google (indexed)"
        varchar address "Địa chỉ quán ăn"
        varchar city "Thành phố (da-nang, ho-chi-minh, ha-noi)"
        float overall_rating "Điểm đánh giá trung bình hiển thị"
        int review_count "Tổng số bài đánh giá đã lưu"
        int foody_review_count "Số bài đánh giá từ nguồn Foody"
        int google_review_count "Số bài đánh giá từ Google Maps"
        float credibility_score "Chỉ số độ tin cậy mẫu (0.0 đến 1.0)"
        datetime crawled_at "Thời điểm thu thập dữ liệu"
    }

    REVIEWS {
        int id PK "Khóa chính, tự tăng"
        int restaurant_id FK "Mã liên kết quán ăn (restaurants.id)"
        varchar author "Tên người viết đánh giá"
        float rating "Điểm người dùng chấm bài viết (1-10 hoặc 1-5)"
        text text "Toàn văn nội dung đánh giá thô"
        varchar review_date "Ngày đăng nguyên bản"
        int is_analyzed "Trạng thái phân tích AI (0=chưa, 1=rồi)"
        int is_spam "Cờ đánh dấu spam (0=sạch, 1=spam/quảng cáo)"
        float spam_score "Xác suất spam (0.0 đến 1.0)"
        varchar spam_category "Loại spam (normal, low_info, ad, duplicate)"
        text spam_reason "Danh sách lý do gắn nhãn JSON"
        varchar foody_review_id "ID bài review trên Foody (indexed)"
        varchar fingerprint "Mã băm SHA-256 chống trùng bài (indexed)"
        varchar source "Nguồn gốc: 'Foody' hoặc 'GoogleMaps'"
        varchar google_review_id "ID bài review trên Google (indexed)"
        datetime created_at "Thời điểm lưu bản ghi"
    }

    REVIEW_ANALYSIS {
        int id PK "Khóa chính, tự tăng"
        int review_id FK "Mã liên kết bài đánh giá (reviews.id)"
        varchar aspect "Khía cạnh: món ăn, dịch vụ, giá cả, không gian, vị trí"
        varchar sentiment "Cảm xúc: positive, neutral, negative"
        float confidence "Độ tin cậy do AI ước lượng (0.0 - 1.0)"
        int is_urgent "Cảnh báo khẩn cấp (1=ngộ độc/dị vật, 0=thường)"
        datetime analyzed_at "Thời điểm phân tích"
    }

    CRAWL_REQUESTS {
        int id PK "Khóa chính, tự tăng"
        varchar query "Từ khóa tìm kiếm hoặc tên quán yêu cầu"
        varchar city "Thành phố mục tiêu"
        varchar status "Trạng thái: pending, processing, completed, failed"
        varchar note "Ghi chú tiến trình hoặc thông báo lỗi"
        datetime requested_at "Thời điểm gửi yêu cầu"
        datetime completed_at "Thời điểm hoàn tất"
    }
```

---

## 6. Sơ đồ Luồng Dữ Liệu (Data Flow Diagram - DFD Level 1)

Sơ đồ thể hiện đường đi của dữ liệu (Data Flows), các tiến trình xử lý nghiệp vụ (Processes), các kho lưu trữ (Data Stores) và các thực thể bên ngoài (External Entities).

```mermaid
flowchart TD
    %% External Entities
    E_User["fa:fa-user Chủ quán & Người dùng"]
    E_Foody["fa:fa-globe Nền tảng Foody.vn"]
    E_GMaps["fa:fa-map-marker Nền tảng Google Maps"]
    E_Gemini["fa:fa-brain Google Gemini AI API"]

    %% Data Stores
    D1[("D1: Bảng restaurants")]
    D2[("D2: Bảng reviews")]
    D3[("D3: Bảng review_analysis")]
    D4[("D4: Bảng crawl_requests")]
    D5[("D5: In-Memory Cache")]

    %% Processes
    P1["1.0 Thu thập dữ liệu đa nguồn (Selenium & Playwright)"]
    P2["2.0 Tiền xử lý, lọc Spam & Khớp thực thể (ReviewFilter & EntityResolution)"]
    P3["3.0 Phân tích Aspect & Sentiment bằng AI (Gemini ABSA Engine)"]
    P4["4.0 Tổng hợp chỉ số BI & Độ tin cậy mẫu (BI Aggregator)"]
    P5["5.0 Xử lý Trợ lý ảo & Sinh phản hồi tự động (Assistant & Reply Engine)"]

    %% Ingestion Flow
    E_User -->|1. Yêu cầu phân tích URL / Thêm quán| P1
    E_User -->|2. Gửi yêu cầu hàng đợi| D4
    D4 -->|3. Tác vụ cào ngầm định kỳ| P1
    E_Foody -->|4. HTML & Dữ liệu review Foody| P1
    E_GMaps -->|5. DOM Container ảo Google Maps| P1

    P1 -->|6. Danh sách bài đánh giá thô| P2
    P2 -->|7. Kiểm tra trùng thực thể quán & địa chỉ| D1
    P2 -->|8. Tính mã SHA-256 fingerprint tránh trùng| D2
    P2 -->|9. Lưu quán ăn & bài đánh giá sạch| D1
    P2 -->|10. Lưu review sạch vào DB| D2

    %% Analysis Flow
    D2 -->|11. Đọc các bài đánh giá chưa phân tích (is_analyzed=0)| P3
    P3 -->|12. Gửi batch text đánh giá & prompt chuyên gia| E_Gemini
    E_Gemini -->|13. JSON nhãn khía cạnh, cảm xúc, cảnh báo khẩn| P3
    P3 -->|14. Cập nhật cờ is_analyzed=1| D2
    P3 -->|15. Lưu kết quả chi tiết từng khía cạnh| D3

    %% BI Aggregation Flow
    D1 -->|16. Dữ liệu quán ăn & cỡ mẫu N| P4
    D2 -->|17. Dữ liệu đánh giá & nguồn (Foody/Google)| P4
    D3 -->|18. Dữ liệu khía cạnh & nhãn cảm xúc| P4
    P4 -->|19. Cập nhật chỉ số tin cậy mẫu (credibility_score)| D1
    P4 -->|20. Dữ liệu tổng hợp BI (Radar, Trend, Explorer)| E_User

    %% Interactive AI Assistant & Reply Flow
    E_User -->|21. Câu hỏi nghiệp vụ F&B / Yêu cầu sinh phản hồi| P5
    P5 -->|22. Kiểm tra bộ nhớ đệm câu trả lời| D5
    P5 -->|23. Đọc dữ liệu ngữ cảnh quán & review| D1
    P5 -->|24. Đọc chi tiết lỗi khía cạnh liên quan| D3
    P5 -->|25. Gửi Prompt tổng hợp ngữ cảnh| E_Gemini
    E_Gemini -->|26. Câu trả lời trợ lý / Thư phản hồi 4 tông giọng| P5
    P5 -->|27. Lưu vào bộ nhớ đệm| D5
    P5 -->|28. Trả bản thảo phản hồi & giải đáp thông minh| E_User
```

---

## 7. Sơ đồ Lớp (Class Diagram)

Sơ đồ hướng đối tượng (OOP Class Diagram) thể hiện các thực thể mô hình dữ liệu (SQLAlchemy ORM Entities), các module dịch vụ nghiệp vụ (Service Engines), các lớp thu thập dữ liệu (Crawlers) cùng các phương thức và thuộc tính chi tiết.

```mermaid
classDiagram
    %% SQLAlchemy Data Models
    class Restaurant {
        +int id
        +string name
        +string foody_url
        +string google_maps_url
        +string google_place_id
        +string address
        +string city
        +float overall_rating
        +int review_count
        +int foody_review_count
        +int google_review_count
        +float credibility_score
        +datetime crawled_at
        +reviews: List~Review~
    }

    class Review {
        +int id
        +int restaurant_id
        +string author
        +float rating
        +string text
        +string review_date
        +int is_analyzed
        +int is_spam
        +float spam_score
        +string spam_category
        +string spam_reason
        +string foody_review_id
        +string fingerprint
        +string source
        +string google_review_id
        +datetime created_at
        +restaurant: Restaurant
        +analysis: List~ReviewAnalysis~
    }

    class ReviewAnalysis {
        +int id
        +int review_id
        +string aspect
        +string sentiment
        +float confidence
        +int is_urgent
        +datetime analyzed_at
        +review: Review
    }

    class CrawlRequest {
        +int id
        +string query
        +string city
        +string status
        +string note
        +datetime requested_at
        +datetime completed_at
    }

    %% Service Engines
    class BIService {
        +calculate_credibility_score(total, foody_cnt, google_cnt) float
        +format_restaurant_full(restaurant, reviews, analyses) dict
        +classify_review(text, rating) dict
        +extract_keywords_from_texts(texts, limit) List~string~
        +detect_city(address, default) string
    }

    class EntityResolutionService {
        +resolve_or_create_restaurant(db, raw_meta) Restaurant
        +calculate_name_similarity(name1, name2) float
        +is_same_location(addr1, addr2) bool
        +compute_review_fingerprint(author, text, rating) string
        +is_duplicate_review(db, fingerprint) bool
    }

    class ReplyService {
        +generate_review_reply(req_data) dict
        +build_system_prompt(tone, author, rest_name, aspects) string
        +generate_voucher_code(prefix, discount) string
        +make_cache_key(review_id, tone, voucher) string
        +extract_aspects_addressed(reply_text, aspects) List~string~
    }

    class AssistantService {
        +ask_assistant(question, restaurant_id, db) dict
        +detect_question_intent(question) string
        +synthesize_local_answer(intent, stats) string
        +call_gemini_assistant_raw(prompt, context) string
    }

    class GeminiAnalyzer {
        +string api_key
        +string model_name
        +analyze_review(text) List~dict~
        +batch_analyze(reviews_batch) List~dict~
        +parse_gemini_json(response_raw) List~dict~
    }

    class ReviewFilter {
        +int min_length
        +check_spam(text, author) tuple~bool, float, string, list~
        +_check_length(text) bool
        +_check_phone_patterns(text) bool
        +_check_advertisement_links(text) bool
        +_check_repeated_chars(text) bool
    }

    %% Crawlers
    class FoodyCrawler {
        +driver: WebDriver
        +setup_driver()
        +crawl_restaurant(url, max_reviews) dict
        +_extract_reviews(soup) List~dict~
        +_extract_rating(element) float
        +close()
    }

    class GoogleMapsCrawler {
        +browser: Browser
        +crawl_google_maps(url_or_query, max_reviews) dict
        +_scroll_reviews(page, target_count)
        +_expand_reviews(page)
        +_parse_review_card(card_element) dict
        +close()
    }

    %% Relationships
    Restaurant "1" *-- "0..*" Review : contains
    Review "1" *-- "0..*" ReviewAnalysis : analyzed_into

    EntityResolutionService ..> Restaurant : manages
    EntityResolutionService ..> Review : deduplicates
    BIService ..> Restaurant : analyzes
    BIService ..> ReviewAnalysis : aggregates
    ReplyService ..> Review : references
    AssistantService ..> Restaurant : queries
    AssistantService ..> BIService : uses_metrics

    FoodyCrawler ..> ReviewFilter : filters_with
    GoogleMapsCrawler ..> ReviewFilter : filters_with
    FoodyCrawler ..> Review : produces
    GoogleMapsCrawler ..> Review : produces

    GeminiAnalyzer ..> ReviewAnalysis : generates
    ReplyService ..> GeminiAnalyzer : uses_llm
    AssistantService ..> GeminiAnalyzer : uses_llm
```

---

## 8. Hướng Dẫn Bảo Trì & Cập Nhật

1. **Khi mở rộng bảng dữ liệu mới**: Cập nhật file `restaurant-review-ai/database/models.py`, sau đó cập nhật Sơ đồ thực thể liên kết (ERD) và Sơ đồ lớp (Class Diagram) tương ứng.
2. **Khi thêm nguồn dữ liệu thứ 3 (ví dụ: ShopeeFood, TikTok Shop)**: Cập nhật Sơ đồ kiến trúc (System Architecture), Sơ đồ tuần tự (Sequence Diagram) và Sơ đồ luồng dữ liệu (DFD).
3. **Quy tắc an toàn Mermaid**:
   - Sử dụng mũi tên xuôi (`-->`, `-.->`), không sử dụng mũi tên ngược (`<--`).
   - Nhãn cạnh chỉ chứa text thuần (`-.->|include|`, `-.->|extend|`).
   - Đặt nhãn node trong dấu ngoặc kép (`NodeID["Label"]`).
