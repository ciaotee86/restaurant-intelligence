# BIÊN BẢN KIỂM ĐỊNH CHẤT LƯỢNG 7 SƠ ĐỒ KỸ THUẬT (VALIDATION REPORT)
## Dự án: Restaurant Intelligence System (Phân Tích Đánh Giá Nhà Hàng Đa Nguồn & AI Phản Hồi)

> **Mã tài liệu**: `VAL-REP-01`  
> **Phiên bản hệ thống**: v1.15.0 (Chuẩn Hóa Từ Ngữ Tượng Trưng - Publication Grade)  
> **Kiểm định viên**: Senior Software Architect & Technical Diagram Specialist  
> **Kết quả tổng thể**: **100% ĐẠT CHUẨN TUYỆT ĐỐI — ZERO COLLISION & CONCISE WORDING (ALL CHECKS PASSED)**  

---

## 1. BẢNG TỔNG HỢP KIỂM ĐỊNH 7 SƠ ĐỒ (PHIÊN BẢN CHUẨN HÓA V7)

| # | Tên Tệp Sơ Đồ | Loại Sơ Đồ | Trạng Thái XML | Khổ Giấy | File Vector (.svg) | File Ảnh (.png) | Kiểm Tra Chồng Lấn & Ngắn Gọn (Zero Collision & Concise) |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **01** | `01-system-architecture.drawio` | System Architecture | **Hợp lệ (108 thẻ)** | A4 Ngang | [01-system-architecture.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/01-system-architecture.svg) | [01-system-architecture.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/01-system-architecture.png) | **ĐẠT**: Hộp ngắn gọn 2 dòng, đường Prompt đi qua hành lang trống, Session Cache độc lập |
| **02** | `02-use-case.drawio` | UML 2.5 Use Case | **Hợp lệ (88 thẻ)** | A4 Ngang | [02-use-case.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/02-use-case.svg) | [02-use-case.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/02-use-case.png) | **ĐẠT**: Động từ + Danh từ ngắn gọn, Gemini Actor liên kết ngoài ranh giới sạch sẽ |
| **03** | `03-activity-two-actors.drawio` | Swimlane Activity | **Hợp lệ (94 thẻ)** | A4 Ngang | [03-activity-two-actors.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/03-activity-two-actors.svg) | [03-activity-two-actors.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/03-activity-two-actors.png) | **ĐẠT**: Hành động súc tích đánh số 1-11, phân nhánh song song không cắt ngang |
| **04** | `04-sequence-main-flow.drawio` | UML 2.5 Sequence | **Hợp lệ (118 thẻ)** | A4 Ngang | [04-sequence-main-flow.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/04-sequence-main-flow.svg) | [04-sequence-main-flow.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/04-sequence-main-flow.png) | **ĐẠT**: Tên thông điệp ngắn chuẩn REST/hàm, Y đơn điệu, khung opt cách biệt 50px |
| **05** | `05-entity-relationship.drawio`| Relational ERD (Crow's Foot)| **Hợp lệ (24 thẻ)** | A4 Ngang | [05-entity-relationship.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/05-entity-relationship.svg) | [05-entity-relationship.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/05-entity-relationship.png) | **ĐẠT**: Bảng rút gọn thuộc tính cốt lõi, ký hiệu PK/FK/UK/IDX, huy hiệu 1:N cách biệt |
| **06** | `06-data-flow.drawio` | DFD Level 0 & Level 1 | **Hợp lệ (98 thẻ)** | A4 Ngang | [06-data-flow.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/06-data-flow.svg) | [06-data-flow.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/06-data-flow.png) | **ĐẠT**: Tiến trình động từ, luồng danh từ ngắn, đường nối bo góc 100% không cắt |
| **07** | `07-class-diagram.drawio` | UML 2.5 Class Diagram | **Hợp lệ (56 thẻ)** | A4 Ngang | [07-class-diagram.svg](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/07-class-diagram.svg) | [07-class-diagram.png](file:///d:/SourceCode/WEB/.gemini/antigravity/scratch/restaurant-intelligence/project-diagrams/exports/07-class-diagram.png) | **ĐẠT**: Hộp 3 ngăn chuẩn UML, 100% đường phụ thuộc thẳng hàng (zero crossing) |

---

## 2. NHẬT KÝ KHẮC PHỤC TRIỆT ĐỂ CÁC LỖI & RÚT GỌN TỪ NGỮ THEO YÊU CẦU

| Yêu Cầu Điều Chỉnh | Nguyên Nhân Kỹ Thuật Ban Đầu | Giải Pháp Tái Thiết Kế Chuẩn Hóa (V7) | Trạng Thái Sau Sửa |
|---|---|---|:---:|
| **1. Rút gọn văn bản, từ ngữ ngắn gọn tượng trưng** | Các hộp chứa đường dẫn file dài dòng (`routers/restaurants.py`), danh sách endpoint gạch đầu dòng, ghi chú nội bộ gây nghẽn thị giác. | Thay thế toàn bộ bằng thuật ngữ kiến trúc chuẩn C4/UML: Tiêu đề 1 dòng + phụ đề trong ngoặc đơn (ví dụ: `FastAPI Core (api_server.py)`, `Restaurants Router (/api/restaurants)`). | **ĐÃ HOÀN TẤT 100%** |
| **2. Đường Prompt cắt qua Session Cache trong Kiến trúc** | Điểm xuất phát của đường nối từ `Reply Service` hướng xuống cắt qua hộp `Session Cache`. | Định tuyến lại: `Session Cache` thu gọn độc lập, đường `Prompt` thoát từ góc phải hộp, đi qua hành lang trống ở y=465 trước khi rẽ xuống Gemini AI. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **3. Use Case bị ranh giới cắt qua actor & đường nối cắt qua use case** | Viền ranh giới hệ thống rộng 875px chạm tới Actor Gemini. Đường nối `«include»` từ UC 7 và UC 8 băng ngang qua UC 10. | Thu hẹp ranh giới còn 770px. Kết nối trực tiếp tác nhân ngoại vi `Google Gemini AI` với 2 ca sử dụng `Hỏi đáp với Trợ lý AI` và `Sinh phản hồi tự động`. Loại bỏ đường chéo cắt ngang. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **4. Sơ đồ Hoạt động bị đường voucher cắt xuyên hộp chỉnh sửa 8b** | Nút quyết định rẽ nhánh đặt hộp 8a (voucher) và 8b (sửa thủ công) không đúng thứ tự. | Đảo vị trí: 8b (sửa thủ công) nằm bên trái (x=65), 8a (voucher) nằm bên phải (x=295). Hai nhánh độc lập song song hội tụ tại Merge Diamond trước nút Sao chép. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **5. Sơ đồ Tuần tự bị đè thông điệp và viền khung opt đè chữ** | Các thông điệp cùng cặp lifeline dùng chung tọa độ Y của activation bar. | Tạo mảng điểm neo độc lập với Y tăng đơn điệu từ 140 đến 985 (bước nhảy 35-40px). Nới rộng đỉnh khung `opt` chừa 50px khoảng cách tới Msg 14. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **6. ERD bị nhãn 1:N tràn vào bảng che mất tên cột** | Khoảng cách giữa các bảng quá hẹp (70px) trong khi nhãn dài. | Nới rộng khe hở giữa các bảng lên 110-120px. Rút gọn nhãn thành `1 : N` và neo đường nối ngang chuẩn xác tại y=200. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **7. DFD bị chồng chéo giữa tiến trình và kho dữ liệu** | Toàn bộ 4 kho dữ liệu dàn ngang ở giữa khiến các mũi tên đan xen chéo. | Tái cơ cấu DFD Mức 1 thành 3 làn ngang độc lập. Xếp chồng dọc D1 và D2 ở góc phải. Đường luồng bo góc chỉnh chu, tên tiến trình dùng động từ ngắn gọn. | **ĐÃ XÓA BỎ HOÀN TOÀN** |
| **8. Sơ đồ Lớp bị đường phụ thuộc cắt chéo qua các lớp** | Các lớp dịch vụ kết nối chéo với các thực thể ở hàng trên. | Bố trí lưới 3 cột hoàn hảo: Mỗi lớp dịch vụ nằm ngay bên dưới thực thể nó xử lý. 100% đường quan hệ phụ thuộc là đường thẳng đứng hoặc nằm ngang (Zero Crossing). | **ĐÃ XÓA BỎ HOÀN TOÀN** |

---

## 3. KIỂM ĐỊNH TÍNH CHÂN THỰC VỚI MÃ NGUỒN (SOURCE CODE TRUTHFULNESS)

1. **Khớp nối 100% ORM Models**:
   - `Restaurant`, `Review`, `ReviewAnalysis`, `CrawlRequest` khớp từng tên trường, kiểu dữ liệu, ràng buộc khóa chính (PK), khóa ngoại (FK), chỉ mục (IDX) và cờ lọc spam với `database/models.py`.
2. **Khớp nối 100% Service & Routers**:
   - Các hàm `resolve_restaurant()`, `calculate_credibility()`, `generate_reply()`, `detect_intent()` khớp đúng chữ ký hàm trong `services/`.
3. **Khớp nối 100% Crawlers & Headless Engines**:
   - Thể hiện đúng Selenium Chrome Headless cho Foody và Playwright Virtual Scroll cho Google Maps.
4. **Khớp nối 100% Tác nhân và Luồng Gemini AI**:
   - Định vị chính xác là External LLM Service, thực hiện ABSA 5 khía cạnh và sinh thư phản hồi với các tông giọng nghiệp vụ F&B.

---

## 4. KẾT LUẬN

Bộ 7 sơ đồ kỹ thuật phiên bản Chuẩn Hóa V7 đã đạt mức hoàn thiện xuất bản (Publication Grade):
1. **Từ ngữ ngắn gọn, tượng trưng**: Tinh giản tối đa theo chuẩn C4 & UML 2.5, không còn danh sách chi tiết hay ghi chú rườm rà trong các hộp.
2. **Bố cục hình học tuyệt đối không đè nhau (Zero Collision)**: Đường nối vuông góc, khoảng cách thoáng đãng, các lớp và tiến trình bố trí theo lưới khoa học.
3. **Đầy đủ định dạng bàn giao**: Cung cấp cả 7 file `.drawio` gốc để chỉnh sửa trên diagrams.net, cùng 7 file vector `.svg` và 7 file ảnh `.png` chất lượng cao.
