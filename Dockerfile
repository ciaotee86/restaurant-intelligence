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

# Cấu hình đường dẫn Chrome/Chromedriver cho Selenium và Playwright Browsers Path
ENV CHROME_BIN=/usr/bin/chromium \
    CHROMEDRIVER_PATH=/usr/bin/chromedriver \
    PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright \
    PYTHONUNBUFFERED=1 \
    PORT=10000

# Tạo user không đặc quyền appuser (non-root) để tăng cường bảo mật container (SEC-10)
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser -s /usr/sbin/nologin appuser

# Cài đặt thư viện Python & Playwright Chromium kèm dependencies
COPY restaurant-review-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m playwright install --with-deps chromium

# Copy mã nguồn Python vào container
COPY restaurant-review-ai/ ./

# Copy bản build frontend tĩnh từ STAGE 1 vào thư mục dist/
COPY --from=frontend-builder /app/dist /app/dist

# Tạo thư mục data để lưu SQLite DB, seed_data, symlink tương thích và phân quyền cho appuser
RUN mkdir -p /app/data /app/seed_data /home/appuser/.cache && \
    (cp /app/data/restaurants.db /app/seed_data/restaurants.db 2>/dev/null || true) && \
    ln -s /app /app/restaurant-review-ai && \
    chown -R appuser:appuser /app /home/appuser && \
    chmod -R 775 /app/data /app/seed_data /home/appuser/.cache

USER appuser

EXPOSE 10000

# Chạy server FastAPI phục vụ cả REST API và Web tĩnh
CMD ["sh", "-c", "exec uvicorn api_server:app --host 0.0.0.0 --port ${PORT:-10000}"]
