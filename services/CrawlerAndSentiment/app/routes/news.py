from fastapi import APIRouter, Body, HTTPException, Depends
from app.controllers.newsController import load_crypto_map, collect_crypto_news
from app.controllers.crawlController import crawl_article

BASE_URL = "/news"

router = APIRouter(prefix=BASE_URL, tags=["news"])

@router.get("/{asset_symbol}")
async def get_latest_news(asset_symbol: str):
    """
    Fetch the latest news articles for a given asset symbol.
    Supports multiple symbols separated by commas (e.g., BTCUSDT,ETHUSDT).
    """
    try:
        crypto_map = load_crypto_map()
        symbols = asset_symbol.split(",")
        results = collect_crypto_news(symbols, crypto_map)
        response_data = {}
        for symbol in symbols:
            if not results.get(symbol):
                response_data[symbol] = []
                continue
            # Enhance with crawled content
            for entry in results[symbol]:
                if not entry.get("full_content"):
                    entry.update(crawl_article(entry["link"]))
            response_data[symbol] = results[symbol]
        if not any(response_data.values()):
            raise HTTPException(status_code=404, detail="No news found for the given symbols")
        return {"symbols": response_data}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    #return {"message": "This reload endpoint is currently disabled for testing purposes.", "asset_symbol": asset_symbol}

