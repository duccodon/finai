# ---- Base image ----
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=9000

# Cài các gói hệ thống tối thiểu (nếu TensorFlow/NumPy cần)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---- App layer ----
WORKDIR /app

# Cài dependencies trước để tối ưu cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Copy mã nguồn
COPY . .

# Expose cổng Flask
EXPOSE 9000

# Mặc định chạy app.py (bạn đã từng chạy trực tiếp python app.py)
# Nếu app.py tự gọi app.run(host="0.0.0.0", port=5000) thì OK.
CMD ["python", "-m", "predict.app"]
