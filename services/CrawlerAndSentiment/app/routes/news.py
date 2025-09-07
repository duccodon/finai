from fastapi import APIRouter, Body, HTTPException, Depends
from app.controllers.newsController import collect_crypto_news

BASE_URL = "/news"

router = APIRouter(prefix=BASE_URL, tags=["news"])

@router.get("/{asset_symbol}")
async def get_latest_news(asset_symbol: str):
    """
    Fetch the latest news articles for a given asset symbol.
    Supports multiple symbols separated by commas (e.g., BTCUSDT,ETHUSDT).
    """
    try:
        symbols = asset_symbol.split(",")
        results = collect_crypto_news(symbols)
        response_data = {}
        for symbol in symbols:
            response_data[symbol] = results.get(symbol, [])
        if not any(response_data.values()):
            raise HTTPException(status_code=404, detail="No news found for the given symbols")
        return {"symbols": response_data}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    #return {"message": "This reload endpoint is currently disabled for testing purposes.", "asset_symbol": asset_symbol}

