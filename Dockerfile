# ========================================================
# STAGE 1: Build React Frontend (Vite + TypeScript + Tailwind)
# ========================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Copy toàn bộ mã nguồn frontend và build ra thư mục dist/
COPY . .
RUN npm run build

# ========================================================
# STAGE 2: Python Backend (FastAPI + Selenium + SQLite + AI)
# ========================================================
FROM python:3.11-slim

WORKDIR /app

# Cài đặt Chromium và ChromeDriver cho môi trường Linux Headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Cấu hình đường dẫn Chrome/Chromedriver cho Selenium
ENV CHROME_BIN=/usr/bin/chromium \
    CHROMEDRIVER_PATH=/usr/bin/chromedriver \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Cài đặt thư viện Python
COPY restaurant-review-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn Python vào container
COPY restaurant-review-ai/ ./

# Copy bản build frontend tĩnh từ STAGE 1 vào thư mục dist/
COPY --from=frontend-builder /app/dist /app/dist

# Tạo thư mục data để lưu SQLite DB
RUN mkdir -p /app/data

EXPOSE 8000

# Chạy server FastAPI phục vụ cả REST API và Web tĩnh
CMD ["sh", "-c", "uvicorn api_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
