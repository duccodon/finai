FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

# cài deps hệ thống tối thiểu (bỏ bớt nếu không cần)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# cài python deps
COPY requirements.txt ./
RUN pip install -r requirements.txt

# copy source lần đầu (sẽ bị bind-mount đè khi compose up)
COPY . .

EXPOSE 5000

# để compose override bằng "command" cho dev
CMD ["python", "-u", "-m", "backtest.app"]
