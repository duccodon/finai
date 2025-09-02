import os
from functools import lru_cache
from pymongo import MongoClient
from dotenv import load_dotenv

# Load biến môi trường từ .env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/Backtest-Service-DB")

@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    """
    Tạo MongoClient (singleton trong app).
    lru_cache đảm bảo chỉ tạo 1 lần và tái sử dụng.
    """
    return MongoClient(MONGO_URI)

def get_db():
    """
    Lấy database mặc định từ URI.
    Nếu URI có tên DB ở cuối (/backtest_db) thì dùng DB đó,
    nếu không thì fallback thành 'test'.
    """
    client = get_client()
    return client.get_default_database()
