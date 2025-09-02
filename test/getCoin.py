# 41bebb62-aabc-45d5-8fae-e154281f76a4
import requests
import json
import os
from pathlib import Path

# CoinMarketCap API key
CMC_API_KEY = "41bebb62-aabc-45d5-8fae-e154281f76a4"  

# Path to store cached crypto_map
CACHE_FILE = "crypto_map.json"

# Number of top cryptocurrencies to fetch
TOP_CURRENCIES = 200

def fetch_top_150_cryptos():
    """
    Fetch top 150 cryptocurrencies from CoinMarketCap API.
    Returns a list of dictionaries with name and symbol.
    """
    url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest"
    headers = {"X-CMC_PRO_API_KEY": CMC_API_KEY}
    params = {
        "start": 1,
        "limit": TOP_CURRENCIES,
        "convert": "USD"  # Used to ensure data consistency
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return [{"name": coin["name"], "symbol": coin["symbol"]} for coin in data["data"]]
    except Exception as e:
        print(f"Error fetching data from CoinMarketCap: {e}")
        return []

def generate_crypto_map(coins):
    """
    Generate crypto_map from CoinMarketCap data using base symbols as keys.
    Returns a dictionary mapping base symbols to name, keywords, and Yahoo ticker.
    """
    crypto_map = {}
    for coin in coins:
        symbol = coin["symbol"]
        name = coin["name"]
        # Generate Yahoo ticker
        yahoo_ticker = f"{symbol}-USD"
        # Keywords: include name and symbol, plus common aliases
        keywords = [name, symbol]
        # Add known aliases for major coins
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

        crypto_map[symbol] = {
            "name": name,
            "keywords": keywords,
            "yahoo_ticker": yahoo_ticker
        }

    return crypto_map

def load_or_fetch_crypto_map():
    """
    Load crypto_map from cache if available, else fetch from CoinMarketCap.
    Saves new map to cache.
    Returns the crypto_map dictionary.
    """
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                print(f"Loading crypto_map from {CACHE_FILE}")
                return json.load(f)
        except Exception as e:
            print(f"Error loading cache: {e}")

    # Fetch from API if cache is missing or invalid
    coins = fetch_top_150_cryptos()
    if not coins:
        return {}

    crypto_map = generate_crypto_map(coins)
    # Save to cache
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(crypto_map, f, indent=4)
        print(f"Saved crypto_map to {CACHE_FILE}")
    except Exception as e:
        print(f"Error saving cache: {e}")

    return crypto_map

def parse_trading_pair(trading_pair):
    """
    Parse a trading pair (e.g., 'ETHUSDT', 'ETHEUR', 'ETHBTC') and return crypto_map entry.
    Returns None if pair is invalid or not found.
    """
    crypto_map = load_or_fetch_crypto_map()
    if not crypto_map:
        return None

    # Common quote currencies 
    quote_currencies = ["USDT", "BTC", "ETH", "BNB", "EUR", "TUSD"]
    base_symbol = None
    for quote in quote_currencies:
        if trading_pair.endswith(quote):
            base_symbol = trading_pair[:-len(quote)]
            break

    if not base_symbol:
        print(f"Unknown quote currency in trading pair: {trading_pair}")
        return None

    if base_symbol in crypto_map:
        return crypto_map[base_symbol]
    else:
        print(f"Base symbol {base_symbol} not found in crypto_map")
        return None

def main():
    # Example: Process user-input trading pairs
    test_pairs = ["TONUSDT", "LINKBTC", "ETHEUR", "TUSDUSDT", "INVALIDPAIR"]
    crypto_map = load_or_fetch_crypto_map()

    for pair in test_pairs:
        print(f"\nProcessing trading pair: {pair}")
        result = parse_trading_pair(pair)
        if result:
            print(f"Name: {result['name']}")
            print(f"Keywords: {result['keywords']}")
            print(f"Yahoo Ticker: {result['yahoo_ticker']}")
        else:
            print(f"No mapping found for {pair}")

if __name__ == "__main__":
    main()