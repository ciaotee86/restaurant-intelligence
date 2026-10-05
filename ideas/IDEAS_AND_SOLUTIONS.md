# TỔNG HỢP Ý TƯỞNG MỞ RỘNG & GIẢI PHÁP KỸ THUẬT
## Dự Án: Restaurant Intelligence (v1.4.0)

> **Mục đích tài liệu**: Lưu trữ toàn bộ các ý tưởng nâng cấp, phân tích kỹ thuật, phương án giải quyết bài toán Quota API và định hướng phát triển phục vụ cho buổi báo cáo/bảo vệ đồ án cũng như mở rộng sản phẩm trong tương lai.

---

## 1. Bối Cảnh & Thách Thức Khi Báo Cáo Đồ Án

* **Thực trạng**: Hệ thống hiện tại đã hoàn thiện trọn vẹn luồng cốt lõi: *Cào dữ liệu Foody $\rightarrow$ Lọc Spam/Bot (11 test case) $\rightarrow$ SQLite WAL Mode $\rightarrow$ Gemini AI ABSA $\rightarrow$ React 19 Editorial Dashboard*.
* **Vấn đề đặt ra**: Khi chuẩn bị báo cáo/thuyết trình, việc chỉ "cào thêm dữ liệu từ Google Maps hay ShopeeFood" dễ bị hội đồng đánh giá là *thêm chân rết lặp lại*, thiếu tính đột phá công nghệ.
* **Mục tiêu**: Bổ sung các tính năng tạo hiệu ứng **"WOW"** (tính ứng dụng thực tế cao, khép kín quy trình từ *Phân tích* đến *Hành động*), đồng thời **giải quyết triệt để bài toán nghẽn Quota API** của mô hình ngôn ngữ lớn (LLM).

---

## 2. Danh Mục 5 Ý Tưởng Mở Rộng Đột Phá

```
                                  HỆ THỐNG MỞ RỘNG
                                         │
    ┌────────────────────┬───────────────┴───────────────┬────────────────────┐
    ▼                    ▼                               ▼                    ▼
[Ý Tưởng 1]          [Ý Tưởng 2]                     [Ý Tưởng 3]          [Ý Tưởng 4]
Trợ Lý AI            AI Soạn Phản Hồi                Phát Hiện Đánh Giá    Xuất Báo Cáo
Hỏi-Đáp Về Quán      Review & Khủng Hoảng            Ảo & Độ Tin Cậy       PDF / Excel
(Conversational BI)  (Closed-Loop Action)            (Credibility Score)  (Executive Brief)
```

### Ý Tưởng 1: Trợ Lý AI Hỏi-Đáp Về Quán Ăn (Conversational BI Assistant) ⭐⭐⭐⭐⭐
* **Mô tả**: Tích hợp một khung chat thông minh ngay trên trang Dashboard của nhà hàng. Cho phép chủ quán hoặc thực khách hỏi đáp ngôn ngữ tự nhiên về dữ liệu review.
* **Câu hỏi mẫu**:
  * *"Khách hay phàn nàn về món ăn hoặc nhân viên ca tối như thế nào?"*
  * *"Món nào là món được khen nhiều nhất (món đinh) của quán?"*
  * *"Gợi ý 3 hành động thực tế để nâng cao tỷ lệ hài lòng trong tháng tới?"*
* **Giá trị buổi báo cáo**: Biến website từ một bảng thống kê số liệu khô khan thành **Hệ Chuyên Gia Cố Vấn Quản Trị**.

---

### Ý Tưởng 2: AI Soạn Thư Phản Hồi Khách Hàng (AI Review Responder) ⭐⭐⭐⭐⭐
* **Mô tả**: Cạnh mỗi bài review tiêu cực hoặc khen ngợi trong *Review Explorer*, bổ sung nút **"⚡ AI Soạn phản hồi"**.
* **Đa dạng tông giọng**:
  1. *Chân thành & Nhận lỗi*: Xoa dịu các bài chê gắt gao, giải quyết nguy cơ khủng hoảng truyền thông.
  2. *Lịch sự & Đền bù voucher*: Giữ chân khách hàng sau sự cố phục vụ/món ăn.
  3. *Biết ơn & Thân thiện*: Tri ân khách hàng khen ngợi, khuyến khích quay lại.
  4. *Giải thích & Cầu thị*: Làm rõ các hiểu lầm về khẩu phần hoặc thời gian chờ.
* **Giá trị buổi báo cáo**: Thể hiện tư duy **Đóng kín vòng lặp (Closed-Loop)**: *Không chỉ tìm ra lỗi mà còn cung cấp ngay công cụ khắc phục lỗi*.

---

### Ý Tưởng 3: Phát Hiện Đánh Giá Ảo & Chấm Điểm Tin Cậy (Fake Review & Credibility Score) ⭐⭐⭐⭐
* **Mô tả**: Tận dụng module lọc spam có sẵn (`review_filter.py`) để tính toán chỉ số **Độ Tin Cậy Dữ Liệu (Credibility Index %)** cho từng quán ăn.
* **Dấu hiệu nhận diện**:
  * Tài khoản bot sao chép văn mẫu quảng cáo thuê xe, bất động sản, săn xu.
  * Tần suất đánh giá 10/10 bất thường trong khoảng thời gian ngắn.
* **Giá trị buổi báo cáo**: Mang tính học thuật rất cao, chứng minh sinh viên hiểu sâu về kỹ thuật làm sạch dữ liệu (Data Cleaning & Preprocessing).

---

### Ý Tưởng 4: Xuất Báo Cáo Điều Hành 1 Trang (Executive Brief PDF / Excel) ⭐⭐⭐⭐
* **Mô tả**: Nút tải file báo cáo tóm tắt 1 trang chuẩn Quản Trị Nhà Hàng.
* **Nội dung file PDF**:
  * Điểm tổng quan & Biểu đồ radar 5 khía cạnh (*Món ăn, Dịch vụ, Giá cả, Không gian, Vệ sinh*).
  * 2 Điểm mạnh nhất & 2 Vấn đề cần khắc phục khẩn cấp.
  * Bảng Checklist hành động giao việc cho Quản lý và Bếp trưởng.
* **Giá trị buổi báo cáo**: In sẵn vài tờ tài liệu PDF kẹp vào tập báo cáo nộp cho giám khảo, tạo cảm giác sản phẩm đã hoàn thiện thương mại hóa.

---

### Ý Tưởng 5: Mở Rộng Nguồn Cào (Google Maps / ShopeeFood) & Phân Tích Đánh Đổi ⭐⭐⭐
* **Bản chất kỹ thuật**:
  * **Google Places API chính thức**: Rất ổn định nhưng **chỉ trả về tối đa 5 review gần nhất** và bị tính phí $\rightarrow$ Không đủ dữ liệu để phân tích ABSA.
  * **Selenium Scraping**: Lấy được nhiều review (50-100+ review) hoàn toàn miễn phí, nhưng đánh đổi lại là **độ mỏng manh (brittleness)**: dễ bị Google chặn IP/CAPTCHA, virtual scrolling phức tạp và selector dễ đổi.
  * **ShopeeFood**: Dùng chung cơ sở dữ liệu với Foody (thuộc cùng hệ sinh thái).
* **Kết luận**: Trong giai đoạn đồ án, tập trung vào chiều sâu phân tích và tính năng hữu ích sẽ ghi điểm cao hơn nhiều so với việc mở rộng thêm chân rết cào dữ liệu.

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

## 5. Lộ Trình Triển Khai Tiếp Theo

1. **Bước 1**: Tạo modal và thuật toán Local Template Engine cho tính năng **Soạn thư phản hồi review** ([`ReviewExplorer.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/components/dashboard/ReviewExplorer.tsx)).
2. **Bước 2**: Tích hợp widget **Trợ lý Quản lý Quán** kèm 4 câu hỏi FAQ nhanh trên trang Dashboard ([`DashboardPage.tsx`](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/src/pages/DashboardPage.tsx)).
3. **Bước 3**: Bổ sung bộ nhớ đệm Cache tại `restaurant-review-ai/services/bi_service.py` để lưu trữ câu trả lời.
4. **Bước 4**: Thêm nút xuất báo cáo Executive Brief (PDF) để hoàn thiện gói sản phẩm demo.
