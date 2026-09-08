# 🚀 HƯỚNG DẪN DEPLOY "RESTAURANT INTELLIGENCE" LÊN WEBSITE THẬT

Tài liệu này hướng dẫn bạn đưa toàn bộ hệ thống (Frontend React + Backend FastAPI + SQLite Database + Gemini AI + Selenium Crawler) lên Internet có tên miền công khai để bất kỳ ai cũng có thể truy cập.

---

## 🌟 CÁCH 1: DEPLOY MIỄN PHÍ LÊN RENDER.COM (KHUYẾN NGHỊ SỐ 1)

Render.com cho phép chạy Docker Web Service miễn phí với chứng chỉ SSL HTTPS tự động.

### Bước 1: Đẩy mã nguồn lên GitHub
1. Tạo một repository mới trên GitHub (ví dụ: `restaurant-intelligence`).
2. Mở terminal tại thư mục dự án và đẩy code lên:
   ```bash
   git init
   git add .
   git commit -m "Production release for Restaurant Intelligence"
   git branch -M main
   git remote add origin https://github.com/username/restaurant-intelligence.git
   git push -u origin main
   ```

### Bước 2: Tạo Web Service trên Render
1. Truy cập [https://render.com](https://render.com) và đăng ký/đăng nhập bằng tài khoản GitHub.
2. Chọn nút **New +** ở góc phải trên -> chọn **Web Service**.
3. Chọn repository `restaurant-intelligence` bạn vừa đẩy lên.
4. Render sẽ tự động phát hiện `Dockerfile`:
   - **Name**: `restaurant-intelligence` (hoặc tên tùy thích)
   - **Region**: `Singapore` (để truy cập từ Việt Nam có tốc độ nhanh nhất)
   - **Instance Type**: `Free` (0$/tháng)
5. Cuộn xuống mục **Environment Variables** (Biến môi trường) -> bấm **Add Environment Variable**:
   - `GEMINI_API_KEY`: Dán mã API key Gemini của bạn (lấy tại [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
6. Bấm nút **Create Web Service**.

### Bước 3: Hoàn tất & Trải nghiệm
- Render sẽ tự động chạy `Dockerfile` (build React tĩnh + cài đặt Python & Chromium Headless).
- Sau 2-3 phút, bạn sẽ nhận được đường dẫn công khai, ví dụ:
  👉 **`https://restaurant-intelligence.onrender.com`**
- Bạn có thể gửi link này cho bạn bè, giảng viên hoặc gắn vào portfolio!

---

## ⚡ CÁCH 2: DEPLOY TRÊN RAILWAY.APP

1. Truy cập [https://railway.app](https://railway.app) -> đăng nhập bằng GitHub.
2. Chọn **New Project** -> **Deploy from GitHub repo**.
3. Chọn repo `restaurant-intelligence`.
4. Vào mục **Variables** trong Railway -> thêm biến:
   - `GEMINI_API_KEY`: Key Gemini của bạn.
5. Railway sẽ tự động build từ `Dockerfile` và tạo domain public cho bạn trong tab **Settings -> Generate Domain**.

---

## 🖥️ CÁCH 3: DEPLOY TRÊN VPS RIÊNG (UBUNTU / DEBIAN) VỚI DOCKER

Nếu bạn có máy chủ riêng (VPS DigitalOcean, Vultr, Linode, AWS EC2, Viettel Cloud...):

1. Cài đặt Docker trên VPS:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```
2. Clone mã nguồn về VPS:
   ```bash
   git clone https://github.com/username/restaurant-intelligence.git
   cd restaurant-intelligence
   ```
3. Build và chạy Docker container:
   ```bash
   docker build -t restaurant-intelligence .
   docker run -d --name restaurant-app \
     -p 80:8000 \
     -e GEMINI_API_KEY="key_gemini_cua_ban" \
     -v $(pwd)/restaurant-review-ai/data:/app/data \
     --restart always \
     restaurant-intelligence
   ```
4. Truy cập thẳng địa chỉ IP của VPS: `http://dia-chi-ip-vps`.

---

## 🌐 CÁCH 4: DEPLOY TÁCH BIỆT (FRONTEND VERCEL + BACKEND RENDER)

Nếu bạn muốn giao diện load cực nhanh qua CDN của Vercel:

1. **Deploy Backend (FastAPI)**: Deploy thư mục lên Render như Cách 1, lấy link API backend (ví dụ: `https://my-api.onrender.com`).
2. **Deploy Frontend (Vercel)**:
   - Vào [https://vercel.com](https://vercel.com), import repo GitHub.
   - Thêm biến môi trường trong Vercel Project Settings:
     - `VITE_API_BASE_URL`: `https://my-api.onrender.com/api`
   - Bấm **Deploy**. Vercel sẽ tự động build và cấp domain `https://restaurant-intelligence.vercel.app`.

---

## 🧪 CÁCH CHẠY THỬ NGHIỆM UNIFIED SERVER TẠI MÁY CỦA BẠN (LOCAL)

Bạn có thể kiểm tra trực tiếp chế độ Unified Production ngay trên máy:

1. Build giao diện React:
   ```bash
   npm run build
   ```
2. Chạy server FastAPI:
   ```bash
   python restaurant-review-ai/api_server.py
   ```
3. Mở trình duyệt vào [http://localhost:8000](http://localhost:8000):
   - Cả giao diện React, REST API và tính năng cào dữ liệu AI đều chạy chung trên cổng `8000`!
