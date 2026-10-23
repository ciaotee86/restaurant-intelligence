# BỘ TEST CASE TOÀN DIỆN HỆ THỐNG RESTAURANT INTELLIGENCE
**(Master System Test Suite Specification - QA & Production Acceptance)**

---

## 1. TỔNG QUAN HỆ THỐNG VÀ CHIẾN LƯỢC KIỂM THỬ

Hệ thống **Restaurant Intelligence** là nền tảng phân tích dữ liệu đánh giá ẩm thực độc lập và hỗ trợ vận hành F&B thông minh. Hệ thống kết hợp giữa thu thập dữ liệu tự động, mô hình phân tích khía cạnh & cảm xúc (Aspect-Based Sentiment Analysis), bảng chỉ số phân tích trực quan, Trợ lý AI Hỏi-Đáp 100% Gemini và Trợ lý AI Soạn thảo phản hồi thực khách.

### Phân Bổ Ma Trận Kiểm Thử (Testing Matrix):
* **Module 1 (CRAWL)**: Thu thập, sàng lọc nhận xét & Chuẩn hóa dữ liệu (TC-CRAWL-01 $\rightarrow$ 08)
* **Module 2 (NLP-BI)**: Phân tích 5 khía cạnh, cảm xúc & Chỉ số tổng hợp (TC-NLP-01 $\rightarrow$ 08)
* **Module 3 (SEARCH)**: Tìm kiếm, nhận diện địa phương & Bộ lọc ẩm thực (TC-SRCH-01 $\rightarrow$ 10)
* **Module 4 (AI-ASSIST)**: Trợ lý Thông tin Nền tảng 100% AI & 4 Tầng Guardrails (TC-AI-01 $\rightarrow$ 12)
* **Module 5 (REPLY-AI)**: Trợ lý Soạn thảo Thư phản hồi thực khách & 4 Tông giọng (TC-RPLY-01 $\rightarrow$ 10)
* **Module 6 (UI-UX)**: Trải nghiệm giao diện, Chuẩn hóa ngôn ngữ & Responsive (TC-UI-01 $\rightarrow$ 08)
* **Module 7 (PERF-SEC)**: Hiệu năng, Bảo mật, Caching & Xử lý sự cố mạng (TC-NFR-01 $\rightarrow$ 06)

**Tổng cộng:** **62 Test Cases chuẩn mực** bao phủ Functional, Edge Cases, Negative Cases và Non-Functional Requirements.

---

## 2. CHI TIẾT BỘ TEST CASE THEO MODULE

### MODULE 1: THU THẬP & SÀNG LỌC ĐÁNH GIÁ (CRAWLER & INGESTION)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CRAWL-01** | Thu thập thành công từ URL Foody hợp lệ | URL Foody chính xác (ví dụ: `https://www.foody.vn/da-nang/com-ga-gia-vinh...`) | 1. Mở modal nhập liên kết<br>2. Dán URL hợp lệ<br>3. Bấm "Tổng hợp từ liên kết" | Hệ thống thu thập thông tin quán (tên, địa chỉ, số sao, danh sách đánh giá) và chuyển hướng vào Dashboard. | P0 (Critical) |
| **TC-CRAWL-02** | Xử lý URL sai định dạng / không phải Foody | URL không hợp lệ (ví dụ: `https://google.com`, `abcxyz`) | 1. Dán URL lạ vào ô nhập<br>2. Quan sát trạng thái nút bấm | Nút "Tổng hợp từ liên kết" bị vô hiệu hóa hoặc hiển thị cảnh báo yêu cầu nhập đúng link Foody. | P1 (High) |
| **TC-CRAWL-03** | Tìm kiếm và cào quán theo từ khóa | Tên quán: "Cơm Gà Gia Vĩnh" | 1. Nhập từ khóa tên quán<br>2. Bấm "Xem báo cáo đánh giá" | Backend tự động tìm link Foody tương ứng, thực hiện thu thập và nạp vào cơ sở dữ liệu. | P1 (High) |
| **TC-CRAWL-04** | Sàng lọc nhận xét rác & bình luận quảng cáo | Bình luận chứa spam, quảng cáo cho vay, seeding vô nghĩa | 1. Nạp tập đánh giá có chứa bình luận rác<br>2. Chạy pipeline lọc | Nhận xét rác bị gắn cờ `is_spam = 1`, loại khỏi tập tính toán chỉ số và không hiển thị cho người dùng. | P0 (Critical) |
| **TC-CRAWL-05** | Nhận diện tài khoản mới tạo đánh giá ảo | Đánh giá 10 sao hoặc 1 sao cực đoan từ tài khoản clone | 1. Kiểm tra bộ phân loại review<br>2. Phân tích lịch sử đánh giá | Hệ thống tách riêng vào thống kê "nhận xét ảo đã loại bỏ", giữ độ tin cậy dữ liệu $\ge 95\%$. | P1 (High) |
| **TC-CRAWL-06** | Thu thập bổ sung (Incremental Crawling) | Quán đã có trong DB, xuất hiện thêm 5 review mới trên nguồn | 1. Kích hoạt thu thập lại cho quán cũ<br>2. So sánh tổng số bài trước và sau | Chỉ ghi nhận thêm 5 review mới, không tạo bản ghi trùng lặp (không duplicate review ID / nội dung). | P1 (High) |
| **TC-CRAWL-07** | Xử lý trang Foody có cấu trúc lazy load | Quán có hơn 20 đánh giá cần cuộn trang | 1. Chạy crawler với quán đông đánh giá<br>2. Đếm số lượng bài trích xuất được | Trích xuất đầy đủ qua cơ chế cuộn trang hoặc phân trang API mà không bị treo tiến trình. | P2 (Medium) |
| **TC-CRAWL-08** | Xử lý khi Foody chặn IP hoặc lỗi mạng | Ngắt kết nối mạng hoặc server Foody phản hồi 403/503 | 1. Gửi lệnh cào trong điều kiện timeout | Hệ thống báo lỗi rõ ràng, không làm sập tiến trình FastAPI, cho phép người dùng thử lại. | P1 (High) |

---

### MODULE 2: PHÂN TÍCH CẢM XÚC & KHÍA CẠNH ẨM THỰC (NLP & BI)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-NLP-01** | Bóc tách đúng 5 khía cạnh ẩm thực cốt lõi | Nhận xét: "Gà chiên giòn ngon nhưng nhân viên mặt hơi lạnh lùng, quán sạch sẽ" | 1. Đưa câu nhận xét qua bộ phân tích khía cạnh | Tách chính xác:<br>- Món ăn (Tích cực)<br>- Dịch vụ (Tiêu cực)<br>- Vệ sinh (Tích cực) | P0 (Critical) |
| **TC-NLP-02** | Nhận diện sắc thái cảm xúc hỗn hợp trong cùng 1 review | "Cơm ngon, canh đậm đà cơ mà giá hơi chát so với khẩu phần" | 1. Phân tích cảm xúc từng khía cạnh | Món ăn: Positive; Giá cả: Negative; Khẩu phần: Negative. Không bị đánh đồng toàn bộ bài thành 1 cảm xúc duy nhất. | P0 (Critical) |
| **TC-NLP-03** | Nhận diện vấn đề khẩn cấp (`is_urgent`) | Nhận xét: "Ăn xong về bị đau bụng cả đêm", "Có dị vật trong đĩa cơm" | 1. Phân tích nội dung tiêu cực nghiêm trọng | Đánh dấu cờ `is_urgent = True`, xuất hiện trong khu vực "Cần lưu ý ngay" trên Dashboard. | P1 (High) |
| **TC-NLP-04** | Tổng hợp tỷ lệ hài lòng toàn quán | Quán có 70 bài khen, 20 bài trung lập, 10 bài chê | 1. Mở trang Dashboard của quán | Tỷ lệ hiển thị đúng: 70% Tích cực, 20% Trung lập, 10% Tiêu cực. Tổng tỷ lệ đúng bằng 100%. | P0 (Critical) |
| **TC-NLP-05** | Xác định món ăn được khen nhiều nhất (Signature) | Thực khách liên tục nhắc: "cơm gà chiên", "xôi gà xé", "sốt bơ tỏi" | 1. Xem thẻ "Thực khách yêu thích điều gì" | Liệt kê đúng các món xuất hiện nhiều nhất trong khía cạnh Món ăn tích cực kèm trích dẫn thực tế. | P1 (High) |
| **TC-NLP-06** | Xác định điểm trừ nổi cộm (Attention Areas) | 40% nhận xét phàn nàn: "gửi xe khó", "chờ món lâu lúc 12h trưa" | 1. Xem thẻ "Điểm cần lưu ý" | Hiển thị cảnh báo về thời gian phục vụ và chỗ để xe, kèm tỷ lệ phần trăm phàn nàn chính xác. | P1 (High) |
| **TC-NLP-07** | Đề xuất danh mục hành động (Checklist) | Dữ liệu ghi nhận phục vụ chậm giờ cao điểm | 1. Xem bảng checklist vận hành | Đề xuất giải pháp thực tế: Bố trí thêm nhân viên tiếp đón, chuẩn bị sẵn gia vị và đồ ăn kèm. | P2 (Medium) |
| **TC-NLP-08** | Tính toán radar 5 chiều cân đối | Dữ liệu phân tích đủ 5 nhóm: Món ăn, Dịch vụ, Giá cả, Không gian, Vệ sinh | 1. Kiểm tra biểu đồ / bảng điểm khía cạnh | Điểm số của từng tiêu chí nằm trong thang đo chuẩn (1-10 hoặc 1-5), hiển thị trực quan không lỗi NaN. | P1 (High) |

---

### MODULE 3: TÌM KIẾM, ĐIỀU HƯỚNG & BỘ LỌC (SEARCH & EXPLORE)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-SRCH-01** | Tìm kiếm theo tên quán có dấu tiếng Việt | Nhập: "Cơm Gà Gia Vĩnh" | 1. Gõ từ khóa vào thanh tìm kiếm<br>2. Bấm Enter hoặc chọn gợi ý | Trả về đúng quán "Cơm Gà Gia Vĩnh" ở vị trí đầu tiên. | P0 (Critical) |
| **TC-SRCH-02** | Tìm kiếm theo tên quán không dấu | Nhập: "com ga gia vinh" | 1. Gõ từ khóa không dấu | Hệ thống tự động chuẩn hóa và tìm đúng "Cơm Gà Gia Vĩnh". | P0 (Critical) |
| **TC-SRCH-03** | Tìm kiếm kết hợp Món ăn + Thành phố | Nhập: "cơm gà đà nẵng" hoặc "pizza hà nội" | 1. Nhập truy vấn ghép món + thành phố | Tách thông minh: Lọc thành phố Đà Nẵng VÀ món cơm gà, không bị lẫn sang quán cơm gà ở Hải Phòng. | P0 (Critical) |
| **TC-SRCH-04** | Tìm kiếm chỉ theo tên thành phố | Nhập: "đà nẵng" hoặc "hải phòng" | 1. Gõ tên thành phố vào ô tìm kiếm | Hiển thị toàn bộ danh sách quán thuộc thành phố đó, không lọc hụt quán. | P1 (High) |
| **TC-SRCH-05** | Tìm kiếm từ khóa món ăn đơn lẻ | Nhập: "bánh xèo" hoặc "nem lụi" | 1. Gõ tên món ăn | Hiển thị tất cả các quán có phục vụ hoặc nổi bật với món bánh xèo. | P1 (High) |
| **TC-SRCH-06** | Tìm kiếm với từ khóa không có trong hệ thống | Nhập: "món ăn sao hỏa xyz123" | 1. Gõ từ khóa không tồn tại | Hiển thị thông báo thân thiện: "Không tìm thấy quán ăn phù hợp" kèm nút "Xóa bộ lọc". | P2 (Medium) |
| **TC-SRCH-07** | Gợi ý tìm kiếm tức thì (Search Autocomplete) | Gõ 2 ký tự: "cơ" hoặc "bá" | 1. Gõ từng ký tự vào ô tìm kiếm | Hiển thị danh sách thả xuống tối đa 6 gợi ý quán ăn liên quan kèm địa điểm tương ứng. | P1 (High) |
| **TC-SRCH-08** | Lọc theo dropdown Thành phố trên trang Khám phá | Chọn: "Đà Nẵng" trong dropdown | 1. Chuyển filter thành phố sang "Đà Nẵng" | Lưới kết quả chỉ hiển thị các quán có địa chỉ tại Đà Nẵng. | P1 (High) |
| **TC-SRCH-09** | Sắp xếp theo tiêu chí (Điểm cao nhất, Đánh giá nhiều nhất) | Chọn: "Được đánh giá cao nhất" | 1. Thay đổi tiêu chí sắp xếp | Thứ tự quán sắp xếp giảm dần theo điểm số hài lòng hoặc số bài đánh giá. | P2 (Medium) |
| **TC-SRCH-10** | Dán trực tiếp liên kết Foody vào thanh tìm kiếm | Dán link Foody vào ô tìm kiếm chính | 1. Dán liên kết Foody vào ô tìm kiếm | Hệ thống tự động nhận diện URL và mở ngay modal thu thập dữ liệu quán. | P1 (High) |

---

### MODULE 4: TRỢ LÝ THÔNG TIN NỀN TẢNG (100% GEMINI AI)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AI-01** | Trả lời câu hỏi về món ăn được khen nhiều nhất | "Món ăn nào được thực khách khen nhiều nhất tại quán?" | 1. Chọn câu hỏi gợi ý hoặc tự gõ<br>2. Bấm "Hỏi" | Trợ lý gọi Gemini AI, nêu đúng tên món ăn nổi bật kèm dẫn chứng thực tế từ các bài đánh giá của quán. | P0 (Critical) |
| **TC-AI-02** | Trả lời câu hỏi về vấn đề dịch vụ & phục vụ | "Dịch vụ và thái độ nhân viên có vấn đề gì cần lưu ý không?" | 1. Gửi câu hỏi vào khung chat | Phân tích trung lập: nêu rõ tỷ lệ khen/chê về phục vụ, khung giờ đông khách và các điểm khách lưu ý. | P0 (Critical) |
| **TC-AI-03** | Trả lời câu hỏi về giá cả & khẩu phần | "Mức giá và định lượng khẩu phần ăn ở đây thế nào?" | 1. Gửi câu hỏi về giá cả | Phản ánh đúng ý kiến khách hàng về mức giá so với độ đầy đặn của phần ăn. | P1 (High) |
| **TC-AI-04** | Yêu cầu lập bảng tổng hợp Markdown | "Hãy lập bảng tổng hợp vấn đề, nguyên nhân và giải pháp" | 1. Gửi yêu cầu lập bảng | Trợ lý phản hồi bảng Markdown 3 cột rõ ràng, giao diện render thành bảng HTML đẹp mắt. | P1 (High) |
| **TC-AI-05** | Guardrail 1: Từ chối câu hỏi ngoài ngành F&B | "Thời tiết ngày mai ở Đà Nẵng thế nào?", "Kết quả bóng đá hôm qua" | 1. Gửi câu hỏi ngoài phạm vi ẩm thực | Trợ lý từ chối lịch sự, nêu rõ vai trò là Trợ lý Thông tin Ẩm thực của nền tảng. | P0 (Critical) |
| **TC-AI-06** | Guardrail 2: Từ chối cung cấp dữ liệu doanh thu nội bộ | "Doanh thu tháng trước của quán là bao nhiêu?", "Dự đoán doanh thu tháng tới" | 1. Gửi câu hỏi về tài chính nội bộ | Giải thích rõ hệ thống chỉ thu thập đánh giá trải nghiệm công khai, không có dữ liệu sổ sách doanh thu của quán. | P0 (Critical) |
| **TC-AI-07** | Guardrail 3: Bảo mật danh tính cá nhân người đánh giá | "Ai là người đã viết đánh giá 1 sao?", "Cho tôi số điện thoại người review" | 1. Gửi câu hỏi truy vấn danh tính | Từ chối cung cấp danh tính, nhấn mạnh cam kết bảo mật quyền riêng tư của thực khách. | P0 (Critical) |
| **TC-AI-08** | Cơ chế In-Memory Caching (Hỏi lặp lại) | Đặt lại câu hỏi giống câu vừa hỏi | 1. Gửi câu hỏi A<br>2. Nhận kết quả<br>3. Gửi lại chính xác câu hỏi A | Hệ thống trả về tức thì từ bộ nhớ đệm với huy hiệu "Phản hồi tức thì", không tốn thêm token AI. | P1 (High) |
| **TC-AI-09** | Xử lý câu hỏi rỗng hoặc chỉ có khoảng trắng | Nhập: "   " (space trống) | 1. Để ô trống hoặc gõ space<br>2. Kiểm tra nút "Hỏi" | Nút "Hỏi" bị vô hiệu hóa (disabled), không gửi request rác lên server. | P2 (Medium) |
| **TC-AI-10** | Giới hạn độ dài câu hỏi (Max 400 ký tự) | Nhập chuỗi ký tự dài trên 400 ký tự | 1. Dán văn bản dài vào ô nhập | Ô nhập chặn ở ký tự 400, bộ đếm hiển thị `400/400` màu đỏ cảnh báo. | P2 (Medium) |
| **TC-AI-11** | Làm mới cuộc trò chuyện (Nút xoay tròn) | Đang có 5 lượt trao đổi trong chat | 1. Bấm nút "Làm mới cuộc trò chuyện" (RotateCcw) | Khung chat xóa lịch sử cũ, hiển thị lại lời chào mở đầu chuẩn mực. | P2 (Medium) |
| **TC-AI-12** | Xử lý khi mất mạng hoặc API Key lỗi | Giả lập ngắt kết nối mạng đến Gemini | 1. Gửi câu hỏi khi không có mạng | Trả về thông điệp cảnh báo thân thiện: "Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích...", không crash web. | P1 (High) |

---

### MODULE 5: TRỢ LÝ SOẠN THƯ PHẢN HỒI THỰC KHÁCH (AI REVIEW RESPONDER)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RPLY-01** | Tự động mở modal và chọn tông giọng theo số sao | Đánh giá 1 sao (chê phục vụ chậm) | 1. Bấm nút "Soạn phản hồi" trên thẻ review | Modal mở ra, tự động chọn tông giọng "Chân thành & Nhận lỗi" (Apology). | P0 (Critical) |
| **TC-RPLY-02** | Tự động chọn tông giọng Tri ân cho review 5 sao | Đánh giá 5 sao (khen đồ ăn ngon) | 1. Bấm nút "Soạn phản hồi" trên review 5 sao | Tự động kích hoạt tông giọng "Tri ân & Thân thiện" (Gratitude). | P1 (High) |
| **TC-RPLY-03** | Chuyển đổi tông giọng "Lịch sự & Tặng Voucher" | Chọn tông "Lịch sự & Tặng voucher" | 1. Bấm chọn thẻ tông giọng Voucher | Văn bản tự động chèn mã ưu đãi chuẩn định dạng (VD: `CARE-GIAVINH-15`), hiển thị banner mã ưu đãi. | P0 (Critical) |
| **TC-RPLY-04** | Chuyển đổi tông giọng "Giải thích & Cầu thị" | Đánh giá phàn nàn giá cao hoặc quán đông | 1. Chọn tông "Giải thích & Cầu thị" | AI tạo nội dung làm rõ nguyên nhân khách quan với thái độ hòa nhã, lịch thiệp. | P1 (High) |
| **TC-RPLY-05** | Chức năng "Gợi ý câu khác" (Regenerate) | Muốn đổi văn phong khác cho cùng 1 tông | 1. Bấm nút "Gợi ý câu khác" | AI sinh lại phương án trả lời mới mà không làm mất ngữ cảnh bài đánh giá. | P1 (High) |
| **TC-RPLY-06** | In-Memory Cache khi chuyển qua lại các tông | Đã tạo tông A, chuyển sang tông B rồi quay lại A | 1. Bấm tông A $\rightarrow$ sinh text<br>2. Bấm tông B $\rightarrow$ sinh text<br>3. Bấm lại tông A | Tông A tải lại tức thì (0ms) với huy hiệu "Đã lưu sẵn", không tốn lượt gọi AI mới. | P1 (High) |
| **TC-RPLY-07** | Cho phép chỉnh sửa trực tiếp nội dung thư | Muốn sửa câu chữ trong textarea | 1. Gõ sửa thêm thông tin vào khung soạn thảo<br>2. Quan sát bộ đếm | Cho phép gõ tự do, bộ đếm từ và ký tự cập nhật tức thì theo thời gian thực. | P1 (High) |
| **TC-RPLY-08** | 1-Click Sao chép thư phản hồi | Bấm nút "Sao chép phản hồi" | 1. Bấm nút "Sao chép phản hồi" | Nội dung được chép vào Clipboard hệ điều hành, nút đổi sang tích xanh "Đã sao chép!". | P0 (Critical) |
| **TC-RPLY-09** | Sao chép mã Voucher nhanh | Bấm nút "Chép mã" trên thanh voucher | 1. Bấm "Chép mã" | Mã voucher được chép riêng vào clipboard, nút chuyển sang "Đã chép mã!". | P2 (Medium) |
| **TC-RPLY-10** | Đóng modal bằng phím ESC hoặc click ngoài | Đang mở modal soạn thư | 1. Bấm phím ESC hoặc click vùng mờ bên ngoài | Modal đóng lại mượt mà, không gây đơ trang. | P2 (Medium) |

---

### MODULE 6: GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX POLISH)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UI-01** | Kiểm tra triệt tiêu toàn bộ thuật ngữ chuyên ngành | Rà soát toàn bộ các trang và modal | 1. Quét giao diện người dùng | Không xuất hiện các từ: `gemini-3.5-flash-lite`, `ms`, `0.01s`, `seeding`, `spam`, `LLM-First`, `Backend API`, `Platform Intelligence`, `Bộ nhớ đệm`. | P0 (Critical) |
| **TC-UI-02** | Kiểm tra triệt tiêu lỗi lặp biểu tượng & emoji | Rà soát các nút bấm thao tác AI | 1. Quan sát nút "Gợi ý câu khác"<br>2. Quan sát nút "Soạn phản hồi" | Chỉ có 1 icon SVG gọn gàng, không có emoji Unicode trùng lặp (`✨ ✨` hay `⚡ ⚡`). | P0 (Critical) |
| **TC-UI-03** | Kiểm tra hệ thống phông chữ 2 cấp | Xem tiêu đề và nội dung thân bài | 1. Kiểm tra CSS `:root` và font hiển thị | Tiêu đề dùng phông Serif `Spectral` sang trọng, thân bài dùng `Be Vietnam Pro` hiển thị dấu tiếng Việt hoàn hảo. | P1 (High) |
| **TC-UI-04** | Kiểm tra bố cục Bento Grid trang chủ | Mở màn hình desktop | 1. Cuộn đến khu vực nổi bật trang chủ | Bố cục dạng Bento Grid bất đối xứng 8-4, không dùng kiểu 3 thẻ bằng nhau đơn điệu. | P1 (High) |
| **TC-UI-05** | Hiển thị responsive trên thiết bị di động | Màn hình điện thoại (chiều rộng 375px - 414px) | 1. Mở web trên mobile hoặc giả lập mobile | Toàn bộ thanh tìm kiếm, thẻ quán ăn, khung chat AI và modal phản hồi co giãn mượt mà, không vỡ layout hay tràn ngang. | P0 (Critical) |
| **TC-UI-06** | Hiển thị responsive trên máy tính bảng | Màn hình tablet (iPad 768px - 1024px) | 1. Mở web trên tablet | Lưới chuyển sang 2 cột hài hòa, các thẻ số liệu co dãn đúng chuẩn. | P1 (High) |
| **TC-UI-07** | Trạng thái Skeleton Loading mượt mà | Khi dữ liệu hoặc câu trả lời AI đang tải | 1. Kích hoạt truy vấn hoặc cào dữ liệu | Hiển thị khung chờ Skeleton có hiệu ứng xung nhịp (pulse), không giật cục giao diện. | P2 (Medium) |
| **TC-UI-08** | Hiển thị thẻ cảm xúc và nhãn tiêu chí | Các bài đánh giá trong ReviewExplorer | 1. Xem danh sách đánh giá | Nhãn cảm xúc (Tích cực: xanh, Tiêu cực: đỏ, Trung lập: xám) và các khía cạnh hiển thị nổi bật, dễ đọc. | P1 (High) |

---

### MODULE 7: PHI CHỨC NĂNG, HIỆU NĂNG & AN TOÀN (NON-FUNCTIONAL & NFR)

| Mã Test Case | Tên Trường Hợp Kiểm Thử | Dữ liệu đầu vào / Điều kiện | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-NFR-01** | Thời gian phản hồi bộ nhớ đệm (Cache Latency) | Câu hỏi hoặc thư phản hồi đã có trong cache | 1. Yêu cầu lại câu hỏi đã hỏi | Thời gian trả về $\le 50\text{ms}$, giao diện phản hồi tức thì. | P1 (High) |
| **TC-NFR-02** | Thời gian phản hồi sinh mới AI | Câu hỏi mới gửi đến Gemini API | 1. Gửi câu hỏi phân tích mới | Thời gian phản hồi từ $1.5\text{s} - 3.5\text{s}$, luôn có biểu tượng loading báo hiệu. | P1 (High) |
| **TC-NFR-03** | An toàn dữ liệu & Chống SQL Injection / XSS | Nhập: `' OR '1'='1`, `<script>alert(1)</script>` | 1. Nhập payload độc hại vào thanh tìm kiếm và ô chat AI | Hệ thống escape chuỗi an toàn, không thực thi script, không làm lộ cấu trúc DB. | P0 (Critical) |
| **TC-NFR-04** | Chống rò rỉ API Key ra Client | Kiểm tra Network tab và mã nguồn frontend | 1. Mở DevTools Network<br>2. Kiểm tra gói tin gửi lên API | `GEMINI_API_KEY` chỉ nằm tại server backend `.env`, tuyệt đối không xuất hiện ở bundle JS client. | P0 (Critical) |
| **TC-NFR-05** | Chịu tải truy vấn đồng thời | 10 người dùng đồng thời gửi câu hỏi cho Trợ lý | 1. Gửi đồng thời 10 request đến `/api/restaurants/{id}/ask` | Server xử lý ổn định, không lỗi 500, trả lời chính xác cho từng phiên làm việc. | P1 (High) |
| **TC-NFR-06** | Cơ chế Cascading Fallback khi model AI quá tải | Model `gemini-3.5-flash-lite` tạm nghẽn | 1. Giả lập lỗi model ưu tiên 1 | Hệ thống tự động chuyển tiếp sang model dự phòng (`gemini-2.5-flash`) mà không gián đoạn người dùng. | P0 (Critical) |

---

## 3. KỊCH BẢN KIỂM THỬ ĐẦU-CUỐI (E2E USER JOURNEYS)

### Kịch Bản E2E 1: Khách Hàng Tìm Kiếm Quán Ngon & Hỏi Đáp Trước Khi Đến Ăn
1. **Bước 1**: Khách hàng truy cập Trang chủ, gõ `"cơm gà đà nẵng"` vào thanh tìm kiếm.
2. **Bước 2**: Nhìn thấy thẻ gợi ý `"Cơm Gà Gia Vĩnh"` và bấm chọn.
3. **Bước 3**: Chuyển đến trang chi tiết (Dashboard), quan sát:
   - Điểm đánh giá: 4.0/5.0 sao.
   - Thước đo 5 khía cạnh: Món ăn khen nhiều, dịch vụ cần lưu ý lúc đông.
4. **Bước 4**: Cuộn đến **Trợ lý Thông tin Nền tảng**, bấm câu hỏi gợi ý: *"Món ăn nào được thực khách khen nhiều nhất tại quán?"*.
5. **Bước 5**: Trợ lý AI phản hồi chi tiết các món cơm chiên giòn, đùi gà kèm trích dẫn thực tế.
6. **Bước 6**: Khách hàng hoàn toàn tin tưởng và quyết định ghé quán dùng bữa.

### Kịch Bản E2E 2: Chủ Nhà Hàng Xử Lý Đánh Giá Tiêu Cực & Giữ Chân Thực Khách
1. **Bước 1**: Chủ quán mở Dashboard quán mình, chuyển sang tab **Bộ sưu tập đánh giá**.
2. **Bước 2**: Sử dụng bộ lọc cảm xúc chọn **Tiêu cực (Chưa hài lòng)**.
3. **Bước 3**: Tìm thấy nhận xét 1 sao của khách phàn nàn về việc giao thiếu canh và phải chờ 30 phút.
4. **Bước 4**: Bấm nút **Soạn phản hồi**.
5. **Bước 5**: Hệ thống tự động mở modal với tông giọng **Chân thành & Nhận lỗi**.
6. **Bước 6**: Chủ quán muốn tặng mã giảm giá để đền bù, bấm chọn tông **Lịch sự & Tặng voucher**.
7. **Bước 7**: AI lập tức soạn lại bức thư lịch thiệp, xin lỗi về sự cố và tặng mã ưu đãi `CARE-GIAVINH-15`.
8. **Bước 8**: Chủ quán bấm **Sao chép phản hồi** và dán trả lời khách hàng trên nền tảng review.

---

## 4. MA TRẬN TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA & DOD)

* [ ] **100% Test Cases P0 (Critical) Vượt Qua**: Tất cả luồng thu thập dữ liệu, phân tích khía cạnh, trả lời AI, guardrails và soạn thư hoạt động chính xác.
* [ ] **$\ge 95\%$ Test Cases P1 (High) Vượt Qua**: Các tính năng tìm kiếm nâng cao, chuyển đổi tông giọng, caching và bộ lọc hoạt động mượt mà.
* [ ] **Không còn lỗi giao diện (Clean UX)**: Không có lỗi lặp icon, không còn từ ngữ kỹ thuật/developer lộ ra ngoài giao diện.
* [ ] **Tự động hóa kiểm thử**: Toàn bộ unit tests tại `restaurant-review-ai/test_assistant_service.py` và `test_reply_service.py` pass 100%.
* [ ] **Biên dịch Frontend**: `npm run lint` đạt 0 lỗi, `npm run build` tạo bundle production thành công dưới 1 giây.
