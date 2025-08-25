from fastapi import APIRouter, Body, HTTPException, Depends

BASE_URL = "/news"

router = APIRouter(prefix=BASE_URL, tags=["news"])

@router.get("/{asset_symbol}")
async def get_latest_news(asset_symbol: str):
    """
    Fetch the latest news articles for a given asset symbol.
    """
    return {"asset_symbol": asset_symbol, "news": "News article for testing."}

