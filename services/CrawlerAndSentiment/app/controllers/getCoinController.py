import requests
import json
import os
from fastapi import HTTPException
import redis

REDIS_CLIENT = redis.Redis(host='redis', port=6379, db=0)
CACHE_FILE = "cache/crypto_map.json"
TOP_CURRENCIES = 200
CMC_API_KEY = "41bebb62-aabc-45d5-8fae-e154281f76a4"

def fetch_top_cryptos():
    """
    Fetch top 200 cryptocurrencies from CoinMarketCap API.
    Returns a list of dictionaries with name and symbol.
    """
    url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest"
    headers = {"X-CMC_PRO_API_KEY": CMC_API_KEY}
    params = {
        "start": 1,
        "limit": TOP_CURRENCIES,
        "convert": "USD"
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return [{"name": coin["name"], "symbol": coin["symbol"]} for coin in data["data"]]
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data from CoinMarketCap: {str(e)}")

def generate_crypto_map(coins):
    crypto_map = {}
    for coin in coins:
        symbol = coin["symbol"]
        name = coin["name"]
        yahoo_ticker = f"{symbol}-USD"
        keywords = [name, symbol]
        if symbol == "XRP":
            keywords.append("Ripple")
        elif symbol == "BNB":
            keywords.append("Binance Coin")
        elif symbol == "USDC":
            keywords.append("USD Coin")
        elif symbol == "LEO":
            keywords.append("UNUS SED LEO")
        elif symbol == "SHIB":
            keywords.append("Shiba Inu")
        elif symbol == "TUSD":
            keywords.append("TrueUSD")
        crypto_map[symbol] = {"name": name, "keywords": keywords, "yahoo_ticker": yahoo_ticker}
    return crypto_map

def load_or_fetch_crypto_map():
    cache_key = "crypto_map"
    cached_map = REDIS_CLIENT.get(cache_key)
    if cached_map:
        return json.loads(cached_map)

    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                crypto_map = json.load(f)
                REDIS_CLIENT.setex(cache_key, 86400, json.dumps(crypto_map))
                return crypto_map
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading cache: {str(e)}")

    coins = fetch_top_cryptos()
    if not coins:
        raise HTTPException(status_code=500, detail="Failed to fetch cryptocurrency data")
    crypto_map = generate_crypto_map(coins)
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(crypto_map, f, indent=4)
        REDIS_CLIENT.setex(cache_key, 86400, json.dumps(crypto_map))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving cache: {str(e)}")
    return crypto_map

def parse_trading_pair(trading_pair: str):
    crypto_map = load_or_fetch_crypto_map()
    if not crypto_map:
        raise HTTPException(status_code=500, detail="Crypto map is empty")
    quote_currencies = ["USDT", "BTC", "ETH", "BNB", "EUR", "TUSD"]
    base_symbol = None
    for quote in quote_currencies:
        if trading_pair.endswith(quote):
            base_symbol = trading_pair[:-len(quote)]
            break
    if not base_symbol:
        raise HTTPException(status_code=400, detail=f"Unknown quote currency in trading pair: {trading_pair}")
    if base_symbol not in crypto_map:
        raise HTTPException(status_code=404, detail=f"Base symbol {base_symbol} not found in crypto_map")
    return crypto_map[base_symbol]