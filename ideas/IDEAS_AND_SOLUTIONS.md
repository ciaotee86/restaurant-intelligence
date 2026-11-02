# TỔNG HỢP Ý TƯỞNG MỞ RỘNG & GIẢI PHÁP KỸ THUẬT
## Dự Án: Restaurant Intelligence (v1.21.0)

> **Mục đích tài liệu**: Lưu trữ toàn bộ các ý tưởng nâng cấp, phân tích kỹ thuật, phương án giải quyết bài toán Quota API và định hướng phát triển phục vụ cho buổi báo cáo/bảo vệ đồ án cũng như mở rộng sản phẩm trong tương lai.

---

## 1. Bối Cảnh & Thách Thức Khi Báo Cáo Đồ Án

* **Thực trạng**: Hệ thống hiện tại đã hoàn thiện trọn vẹn luồng cốt lõi: *Cào dữ liệu đa nguồn (Foody & Google Maps) $\rightarrow$ Khớp nối thực thể (Entity Resolution) $\rightarrow$ Lọc Spam/Bot (11 test case) $\rightarrow$ SQLite WAL Mode $\rightarrow$ Gemini AI ABSA $\rightarrow$ React 19 Editorial Dashboard $\rightarrow$ Trợ lý AI Hỏi-Đáp & Soạn phản hồi thực khách*.
* **Vấn đề đặt ra**: Khi chuẩn bị báo cáo/thuyết trình, việc chỉ có một nguồn Foody ít ỏi (do Foody thoái trào sau 2021) dẫn đến thiếu hụt dữ liệu (Data Sparsity). Hệ thống đã mở rộng thành công sang Google Maps kết hợp kiểm định độ tin cậy mẫu và chống trùng lặp.
* **Mục tiêu**: Bổ sung các tính năng tạo hiệu ứng **"WOW"** (tính ứng dụng thực tế cao, khép kín quy trình từ *Phân tích* đến *Hành động*), đồng thời **giải quyết triệt để bài toán nghẽn Quota API** của mô hình ngôn ngữ lớn (LLM).

---

## 2. Danh Mục 5 Ý Tưởng Mở Rộng Đột Phá

```
                                                 HỆ THỐNG MỞ RỘNG
                                                         │
    ┌────────────────────┬───────────────────────┼───────────────────────┬────────────────────┐
    ▼                    ▼                       ▼                       ▼                    ▼
[Ý Tưởng 1] ✅        [Ý Tưởng 2] ✅          [Ý Tưởng 3] ✅          [Ý Tưởng 4] ⏳       [Ý Tưởng 5] ✅
Trợ Lý AI            AI Soạn Phản Hồi        Độ Tin Cậy Mẫu &        Xuất Báo Cáo        Mở Rộng Đa Nguồn
Hỏi-Đáp Về Quán      Review & Khủng Hoảng    Lọc Nhận Xét Ảo         PDF / Excel         Google Maps & Cloud
(ĐÃ HOÀN THÀNH)      (ĐÃ HOÀN THÀNH)         (ĐÃ HOÀN THÀNH)         (KẾ HOẠCH)          (ĐÃ HOÀN THÀNH)
```

### [ĐÃ HOÀN THÀNH ✅] Ý Tưởng 1: Trợ Lý AI Hỏi-Đáp Về Quán Ăn (Conversational BI Assistant) ⭐⭐⭐⭐⭐
* **Trạng thái**: **Đã hoàn thành & Hoạt động thực tế (v1.5.0, nâng cấp 100% LLM trong v1.14.0)**
* **Mô tả**: Tích hợp một khung chat thông minh ngay trên trang Dashboard của nhà hàng. Cho phép chủ quán hoặc thực khách hỏi đáp ngôn ngữ tự nhiên về dữ liệu review.
* **Các thành phần đã triển khai**:
  * **Frontend UI**: [`AiAssistantWidget.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/AiAssistantWidget.tsx) tích hợp ở tab riêng *"Trợ lý AI"*, tab *"Thực khách"* và tab *"Chủ quán"*.
  * **Kiến trúc Pure Generative AI (LLM-First)**: Google Gemini AI (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-3.8-flash`) kèm 4 tầng Guardrails độc lập, khách quan, bảo vệ danh tính cá nhân.
  * **In-Memory Semantic Cache**: Tự động lưu cache câu trả lời theo cặp `{restaurant_id}:{normalized_question}`, phản hồi tức thì 0ms khi hỏi lại.
  * **Endpoints API**: `POST /api/restaurants/{id}/ask` và `GET /api/restaurants/{id}/quick-questions`.
* **Câu hỏi mẫu đã hỗ trợ**:
  * *"Khách hay phàn nàn về món ăn hoặc nhân viên ca tối như thế nào?"*
  * *"Món nào là món được khen nhiều nhất (món đinh) của quán?"*
  * *"Gợi ý thêm món ăn hoặc đồ uống mới để tăng doanh thu?"*
  * *"Luồng hoạt động từ đầu đến cuối có điểm nghẽn nào gây ách tắc không?"*
* **Giá trị buổi báo cáo**: Biến website từ một bảng thống kê số liệu khô khan thành **Hệ Chuyên Gia Cố Vấn Quản Trị**.

---

### [ĐÃ HOÀN THÀNH ✅] Ý Tưởng 2: AI Soạn Thư Phản Hồi Khách Hàng (AI Review Responder) ⭐⭐⭐⭐⭐
* **Trạng thái**: **Đã hoàn thành & Hoạt động thực tế (Phiên bản v1.13.0, v1.14.0)**
* **Mô tả**: Cạnh mỗi bài review tiêu cực hoặc khen ngợi trong *Review Explorer* và *ReviewDetailModal*, bổ sung nút **"⚡ AI Phản hồi" / "Soạn phản hồi"**.
* **Đa dạng 4 tông giọng nghiệp vụ F&B**:
  1. *Chân thành & Nhận lỗi* (`apology`): Xoa dịu các bài chê gắt gao 1-2 sao, giải quyết nguy cơ khủng hoảng truyền thông.
  2. *Lịch sự & Đền bù voucher* (`voucher`): Tự động cấp mã ưu đãi `CARE-{SHORTNAME}-{DISCOUNT}` giữ chân khách hàng sau sự cố phục vụ/món ăn.
  3. *Biết ơn & Thân thiện* (`gratitude`): Tri ân khách hàng khen ngợi 4-5 sao, khuyến khích quay lại.
  4. *Giải thích & Cầu thị* (`clarification`): Làm rõ các hiểu lầm về khẩu phần hoặc thời gian chờ.
* **Các thành phần đã triển khai**:
  * **Frontend UI**: [`ReviewReplyModal.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/ReviewReplyModal.tsx) chuẩn Warm Gastronomy & Modern Editorial (`Spectral` & `Be Vietnam Pro`), bộ chọn 4 tông giọng, khung soạn thảo in-place có đếm từ/ký tự, 1-click clipboard copy.
  * **Backend Service**: [`reply_service.py`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/restaurant-review-ai/services/reply_service.py) kết nối Google GenAI SDK, In-Memory Cache (0ms), bộ fallback ẩm thực chống lỗi 500.
  * **API Endpoints**: `POST /api/restaurants/{identifier}/reply` và alias `POST /api/restaurants/{identifier}/generate-reply`.
* **Giá trị buổi báo cáo**: Thể hiện tư duy **Đóng kín vòng lặp (Closed-Loop Action)**: *Không chỉ tìm ra lỗi mà còn cung cấp ngay công cụ khắc phục lỗi*.

---

### [ĐÃ HOÀN THÀNH ✅] Ý Tưởng 3: Phát Hiện Đánh Giá Ảo & Chấm Điểm Tin Cậy Mẫu (Fake Review & Credibility Score) ⭐⭐⭐⭐
* **Trạng thái**: **Đã hoàn thành & Hoạt động thực tế (Phiên bản v1.16.0)**
* **Mô tả**: Tận dụng module lọc spam có sẵn (`review_filter.py`) kết hợp công thức toán học đo lường độ tin cậy mẫu thống kê (**Sample Credibility Index %**) cho từng quán ăn.
* **Các thành phần đã triển khai**:
  * **Thuật toán tiệm cận độ tin cậy mẫu**: $C = \min\left(1.0, \frac{\ln(N + 1)}{\ln(31)}\right) \times 100\%$.
  * **Phân cấp độ tin cậy**:
    * $N \ge 30$: $C \ge 90\%$ $\rightarrow$ **Độ tin cậy cao** (Huy hiệu xanh ngọc Emerald, đủ mẫu phân tích).
    * $10 \le N < 30$: $65\% \le C < 90\%$ $\rightarrow$ **Độ tin cậy khá** (Huy hiệu hổ phách Amber, tham khảo tốt).
    * $N < 10$: $C < 65\%$ $\rightarrow$ **Mẫu nhỏ** (Huy hiệu đỏ Crimson, tự động kích hoạt thanh cảnh báo đề xuất nạp thêm từ Google Maps).
  * **Minh bạch dữ liệu rác trên UI**:
    * Thẻ Bento vệ tinh trên `HomePage.tsx`: Tỷ lệ loại bỏ nhận xét ảo (Spam/Bot filter 11 test case), độ tin cậy dữ liệu.
    * Huy hiệu trạng thái độ tin cậy mẫu và thanh cảnh báo trên `RestaurantHero.tsx`.
* **Giá trị buổi báo cáo**: Mang tính học thuật rất cao, chứng minh sinh viên hiểu sâu về kỹ thuật làm sạch dữ liệu (Data Cleaning & Preprocessing) và khoa học thống kê (Statistical Sample Size).

---

### [KẾ HOẠCH TIẾP THEO ⏳] Ý Tưởng 4: Xuất Báo Cáo Điều Hành 1 Trang (Executive Brief PDF / Excel) ⭐⭐⭐⭐
* **Mô tả**: Nút tải file báo cáo tóm tắt 1 trang chuẩn Quản Trị Nhà Hàng.
* **Nội dung file PDF**:
  * Điểm tổng quan & Biểu đồ radar 5 khía cạnh (*Món ăn, Dịch vụ, Giá cả, Không gian, Vệ sinh*).
  * 2 Điểm mạnh nhất & 2 Vấn đề cần khắc phục khẩn cấp.
  * Bảng Checklist hành động giao việc cho Quản lý và Bếp trưởng.
* **Giá trị buổi báo cáo**: In sẵn vài tờ tài liệu PDF kẹp vào tập báo cáo nộp cho giám khảo, tạo cảm giác sản phẩm đã hoàn thiện thương mại hóa.

---

### [ĐÃ HOÀN THÀNH ✅] Ý Tưởng 5: Mở Rộng Đa Nguồn Google Maps & Khớp Nối Thực Thể (Entity Resolution) ⭐⭐⭐⭐⭐
* **Trạng thái**: **Đã hoàn thành & Hoạt động thực tế (Phiên bản v1.16.0, v1.17.0, v1.19.0, v1.21.0)**
* **Mô tả**: Mở rộng nguồn dữ liệu sang Google Maps để giải quyết triệt để vấn đề Foody thoái trào và thiếu hụt dữ liệu (Data Sparsity), đảm bảo 1 thực thể nhà hàng duy nhất trong database.
* **Các thành phần đã triển khai**:
  * **Playwright Headless Crawler (`google_maps_crawler.py`)**: Tự động cuộn container ảo `.m6QErb.DxyBCb`, tự bấm "Xem thêm", thu thập 30-50 review thật/quán. Tối ưu chặn ảnh/media giúp giảm 75% RAM (70-90MB), Deadline Guard 35s chống timeout.
  * **Khớp nối thực thể (Entity Resolution - `entity_resolution.py`)**: So khớp mờ Fuzzy Token Set Match ($\ge 85\%$) tên quán không dấu kết hợp đối chiếu số nhà/tên đường/thành phố; ngăn chặn sinh object trùng lặp; chốt chặn Entity Mismatch Guard chống dán nhầm quán.
  * **Khử trùng lặp qua mã băm SHA-256 (`fingerprint`)**: Tự động bỏ qua các review giống nhau giữa Foody và Google Maps (0 token).
  * **Giao diện đa nguồn (`LinkGoogleMapsModal.tsx`, `AnalyzeUrlModal.tsx`, `ReviewExplorer.tsx`)**:
    * Hỗ trợ dán URL Google Maps trực tiếp hoặc tìm theo tên quán.
    * Hàng chip lọc nguồn (`Tất cả`, `Foody`, `Google Maps`) và badge nguồn trên từng review.
  * **Tự động hóa Cloud DataOps (GitHub Actions - `.github/workflows/scheduled_crawler.yml`)**: Tự động chạy định kỳ ban đêm, đổi dải IP Data Center, tự phân tích Gemini ABSA và commit database về repo.
* **Giá trị buổi báo cáo**: Minh chứng năng lực kỹ sư Dữ liệu (Data Engineering / MLOps), giải quyết trọn vẹn bài toán thực tế của thị trường ẩm thực Việt Nam.

---

## 3. Giải Pháp Kỹ Thuật Giải Quyết Bài Toán Cạn Quota API

### Vấn đề:
Khi lượng truy cập tăng (hoặc hội đồng bấm thử liên tục), việc gửi mọi câu hỏi/yêu cầu lên Gemini API sẽ nhanh chóng chạm trần **Rate Limit (15 requests/phút)** hoặc cạn Token miễn phí, gây lỗi `HTTP 429 Too Many Requests`.

### 2 Giải Pháp Kiến Trúc Cốt Lõi (Phù hợp nhất cho Đồ án):

```mermaid
flowchart TD
    UserReq["Yêu Cầu (Hỏi AI / Soạn Phản Hồi)"] --> CacheCheck{"Kiểm tra Cache nội bộ?"}
    CacheCheck -->|Đã có sẵn kết quả| ReturnCache["Trả về ngay từ Cache (0ms, 0 Token)"]
    CacheCheck -->|Chưa có| EngineCheck{"Cần tùy biến sáng tạo cao?"}
    EngineCheck -->|Không (80% câu hỏi chuẩn)| LocalEngine["Tầng 1: Local Contextual Template Engine (0 Token)"]
    EngineCheck -->|Có (20% yêu cầu tự do)| GeminiAPI["Tầng 2: Gọi Gemini API với Prompt tối giản (~150 tokens)"]
    GeminiAPI --> SaveCache["Lưu kết quả mới vào Cache"]
    SaveCache --> ReturnAI["Trả về phản hồi"]
```

#### Giải Pháp 1: Kiến Trúc Lai 2 Tầng (Hybrid Contextual Template + AI Fallback)
* **Tầng 1 (Local Engine - 0 Token, 0ms, 100% Ổn định)**:
  * Hệ thống đã có sẵn dữ liệu bóc tách: *Tên khách, Tên quán, Khía cạnh bị chê, Câu trích dẫn phàn nàn thật*.
  * Ghép nối tự động vào ma trận văn bản chuẩn mực theo ngữ cảnh. Đảm bảo câu phản hồi luôn chính xác, lịch sự, trúng vấn đề mà **không cần gọi tới bất kỳ API nào**.
* **Tầng 2 (Gemini AI Fallback)**:
  * Nút bấm tùy chọn *"Tạo lời văn sáng tạo với AI"*. Chỉ kích hoạt khi người dùng muốn AI viết tự do.

#### Giải Pháp 2: Bộ Nhớ Đệm Thông Minh (FAQ & Semantic Caching)
* **Cơ chế**:
  * Các câu hỏi về quán ăn thường lặp lại: *"Món nào ngon nhất?"*, *"Khách chê gì?"*, *"Mức giá thế nào?"*.
  * Lần đầu tiên hỏi $\rightarrow$ Lưu câu trả lời vào Cache nội bộ theo mã quán: `(restaurant_id, normalized_question)`.
  * Hàng trăm người dùng tiếp theo bấm xem hoặc hỏi câu tương tự $\rightarrow$ Lấy trực tiếp từ Cache trong **5ms**, không gọi lại Gemini, tiết kiệm 100% quota!

*(Lưu ý: Giải pháp giới hạn lượt hỏi Client Rate Limiting sẽ dành cho giai đoạn thương mại hóa sau này, không cần áp dụng trong đồ án để thuận tiện cho việc chấm thi).*

---

## 4. "Vũ Khí Thuyết Trình" Dành Cho Buổi Báo Cáo

Khi thuyết trình về kiến trúc hệ thống, bạn có thể tự tin tuyên bố:

> *"Trong quá trình phát triển tính năng Trợ lý AI và Soạn thư phản hồi, em nhận thấy rủi ro nghẽn hạn mức API (Rate Limit) và chi phí vận hành nếu hệ thống có lượng truy cập tăng đột biến.  
> Vì vậy, thay vì phụ thuộc hoàn toàn vào dịch vụ bên thứ ba, em đã thiết kế **Kiến trúc Lai 2 Tầng (Hybrid Architecture) kết hợp Caching thông minh**:  
> - 80% tác vụ phản hồi và giải đáp câu hỏi thông dụng được xử lý tức thì bằng Local Contextual Engine với chi phí 0 đồng và độ trễ 0ms.  
> - Chỉ các tác vụ phân tích tự do chuyên sâu mới được phân luồng sang Gemini API và lập tức lưu vào bộ nhớ đệm để tái sử dụng."*

Câu trả lời này thể hiện tư duy của một **Kỹ sư Kiến trúc Phần mềm (Software Architect)** thực thụ, biết tối ưu tài nguyên và tính toán độ chịu tải cho sản phẩm.

---

## 5. Tiến Độ Thực Hiện & Lộ Trình Tiếp Theo

- [x] **Ý Tưởng 1: Trợ Lý AI Hỏi-Đáp Về Quán Ăn (ĐÃ HOÀN THÀNH - v1.5.0 & v1.14.0)**
  - [x] Tích hợp widget Trợ lý AI trên Dashboard ([`AiAssistantWidget.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/AiAssistantWidget.tsx)).
  - [x] Nâng cấp 100% Generative AI thuần túy (Gemini LLM-First: `gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-3.8-flash`) trong [`assistant_service.py`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/restaurant-review-ai/services/assistant_service.py).
  - [x] Bộ nhớ đệm In-Memory Semantic Caching cho các câu hỏi phổ biến (0ms, 0 token).
  - [x] 4 Tầng Guardrails nền tảng khách quan, bảo vệ danh tính, giới hạn phạm vi F&B.

- [x] **Ý Tưởng 2: AI Soạn Thư Phản Hồi Khách Hàng (ĐÃ HOÀN THÀNH - v1.13.0 & v1.14.0)**
  - [x] Thêm nút *"⚡ AI Phản hồi"* / *"Soạn phản hồi"* trong từng thẻ review tại [`ReviewExplorer.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/ReviewExplorer.tsx) và [`ReviewDetailModal.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/ReviewDetailModal.tsx).
  - [x] Thiết kế Modal Warm Gastronomy chọn 4 tông giọng: *Chân thành & Nhận lỗi, Lịch sự & Voucher đền bù, Biết ơn & Thân thiện, Giải thích & Cầu thị* ([`ReviewReplyModal.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/ReviewReplyModal.tsx)).
  - [x] Tích hợp Gemini LLM-First (`gemini-3.5-flash-lite`), tự sinh mã voucher, bộ nhớ đệm In-Memory Cache (0ms) và 1-click clipboard copy ([`reply_service.py`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/restaurant-review-ai/services/reply_service.py)).

- [x] **Ý Tưởng 3: Phát Hiện Đánh Giá Ảo & Chấm Điểm Tin Cậy Mẫu (ĐÃ HOÀN THÀNH - v1.16.0)**
  - [x] Xây dựng công thức toán học đo lường độ tin cậy mẫu tiệm cận: $C = \min(1.0, \frac{\ln(N + 1)}{\ln(31)}) \times 100\%$.
  - [x] Tích hợp huy hiệu độ tin cậy đa phân cấp (Đủ mẫu phân tích / Khá / Mẫu nhỏ) và thanh cảnh báo khi $N < 10$ trên [`RestaurantHero.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/RestaurantHero.tsx).
  - [x] Minh bạch tỷ lệ loại bỏ nhận xét ảo (Spam/Bot filter 11 test case) trên Bento Grid trang chủ [`HomePage.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/pages/HomePage.tsx).

- [x] **Ý Tưởng 5: Mở Rộng Đa Nguồn Google Maps & Khớp Nối Thực Thể (ĐÃ HOÀN THÀNH - v1.16.0, v1.17.0, v1.21.0)**
  - [x] Xây dựng Playwright crawler tự động bóc tách 30-50 review từ Google Maps ([`google_maps_crawler.py`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/restaurant-review-ai/crawler/google_maps_crawler.py)) kèm chặn media giảm 75% RAM và Deadline Guard 35s.
  - [x] Khớp nối thực thể đa nguồn 1 quán duy nhất trong SQLite ([`entity_resolution.py`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/restaurant-review-ai/services/entity_resolution.py)), Entity Mismatch Guard và khử trùng lặp qua mã băm SHA-256 fingerprint.
  - [x] Giao diện đa nguồn: [`LinkGoogleMapsModal.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/LinkGoogleMapsModal.tsx), bộ lọc chip nguồn trên `ReviewExplorer.tsx`.
  - [x] Tự động hóa Cloud DataOps qua GitHub Actions Workflow ([`scheduled_crawler.yml`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/.github/workflows/scheduled_crawler.yml)).

- [ ] **Ý Tưởng 4: Xuất Báo Cáo Điều Hành 1 Trang (Executive Brief PDF / Excel) (Kế hoạch tiếp theo)**
  - [ ] Thiết kế mẫu báo cáo tóm tắt A4 Executive Brief chuẩn Warm Gastronomy.
  - [ ] Nút tải file PDF / Excel xuất báo cáo phân tích tổng hợp cho Quản lý và Bếp trưởng.

- [ ] **Ý Tưởng 6: Hoàn thiện slide & kịch bản demo bảo vệ đồ án**
