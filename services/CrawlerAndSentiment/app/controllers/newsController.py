import feedparser
import re
import json
import os
import urllib.error
import urllib.parse
from datetime import datetime, timedelta
import dateutil.parser
from scrapegraphai.graphs import SmartScraperGraph
from scrapegraphai.utils import prettify_exec_info
from fastapi import HTTPException
import redis
from app.controllers.getCoinController import load_or_fetch_crypto_map as coin_load_or_fetch_crypto_map


#REDIS_CLIENT = redis.Redis(host='localhost', port=6379, db=0)
LLM_MODEL = "llama3.1:8b"
GRAPH_CONFIG = {
    "llm": {
        "model": "ollama/" + LLM_MODEL, 
        "temperature": 0, 
        "format": "json", 
        "base_url": "http://localhost:11434"
    },
    "verbose": True
}
CACHE_FILE = "cache/crypto_map.json"
seen_links = set()
rss_urls = {
    "CoinDesk": {"url": "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", "weight": 0.9},
    "CoinTelegraph": {"url": "https://cointelegraph.com/rss", "weight": 0.9}
}


def load_crypto_map():
    """
    Load crypto_map from cached JSON file or fetch automatically if not found.
    Returns the crypto_map dictionary.
    """
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading crypto_map: {str(e)}")
    # Automatically fetch if cache is missing
    try:
        print(f"Cache file {CACHE_FILE} not found. Fetching crypto map automatically...")
        return coin_load_or_fetch_crypto_map()
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch crypto map automatically: {str(e)}")

def is_relevant_entry(entry, keywords):
    """
    Check if an RSS entry is relevant to the cryptocurrency based on keywords.
    Returns True if relevant, False otherwise.
    """
    title = entry.get("title", "").lower()
    summary = entry.get("summary", entry.get("description", "")).lower()
    for keyword in keywords:
        if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', title + summary):
            return True
    return False

def fetch_rss_feed(url_data, keywords, max_age_hours=24):
    """
    Fetch and filter RSS feed entries for a specific cryptocurrency.
    Returns a list of filtered entries.
    """
    try:
        url = url_data["url"]
        feed = feedparser.parse(url)
        if feed.bozo:
            raise HTTPException(status_code=500, detail=f"Error parsing feed {url}: {feed.bozo_exception}")
        filtered_entries = []
        now = datetime.utcnow()  # 08:18 PM +07, September 06, 2025
        for entry in feed.entries[:50]:
            link = entry.get("link", "")
            if link in seen_links:
                continue
            published = entry.get("published", "")
            try:
                published_date = dateutil.parser.parse(published)
                age = now - published_date
                if age <= timedelta(hours=max_age_hours):
                    if is_relevant_entry(entry, keywords):
                        filtered_entries.append({
                            "source": url,
                            "title": entry.get("title", ""),
                            "link": link,
                            "published": published,
                            "summary": entry.get("summary", entry.get("description", ""))
                        })
                        seen_links.add(link)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error parsing date for {link}: {str(e)}")
        return filtered_entries
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"HTTP error fetching feed {url_data['url']}: {str(e)}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=503, detail=f"URL error fetching feed {url_data['url']}: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"General error fetching feed {url_data['url']}: {str(e)}")

def fetch_yahoo_rss(base_symbol, crypto_map):
    if base_symbol not in crypto_map:
        raise HTTPException(status_code=404, detail=f"Base symbol {base_symbol} not found in crypto_map")
    yahoo_ticker = crypto_map[base_symbol]["yahoo_ticker"]
    keywords = crypto_map[base_symbol]["keywords"]
    url = f"https://finance.yahoo.com/rss/headline?s={yahoo_ticker}"
    return fetch_rss_feed({"url": url, "weight": 0.7}, keywords)

def fetch_reuters_google_news(base_symbol, crypto_map):
    if base_symbol not in crypto_map:
        raise HTTPException(status_code=404, detail=f"Base symbol {base_symbol} not found in crypto_map")
    keywords = crypto_map[base_symbol]["keywords"]
    query = f"site:reuters.com+{'+'.join(urllib.parse.quote(k) for k in keywords)}"
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US%3Aen"
    return fetch_rss_feed({"url": url, "weight": 0.6}, keywords)

def extract_article_content(link):
    """
    Use ScrapeGraphAI with local LLM to extract clean article content from a link.
    Returns a dictionary with 'title' and 'content' (clean text).
    """
    try:
        prompt = "Remove all HTML tags, ads, navigation, footers, and irrelevant content. Return as JSON with 'title' and 'content' keys."
        scraper = SmartScraperGraph(prompt=prompt, source=link, config=GRAPH_CONFIG)
        result = scraper.run()
        if isinstance(result, dict):
            return result
        raise HTTPException(status_code=501, detail=f"Unexpected result format from ScrapeGraphAI for {link}: {result}")
    except Exception as e:
        raise HTTPException(status_code=501, detail=f"Error extracting content from {link}: {str(e)}")

def extract_base_symbol(trading_pair):
    """
    Extract the base symbol from a trading pair (e.g., 'BTCUSDT' -> 'BTC').
    Returns the base symbol or None if invalid.
    """
    quote_currencies = ["USDT", "BTC", "ETH", "BNB", "EUR", "TUSD", "USDC"]
    for quote in quote_currencies:
        if trading_pair.endswith(quote):
            return trading_pair[:-len(quote)]
    raise HTTPException(status_code=400, detail=f"Invalid trading pair: {trading_pair}")

def collect_crypto_news(symbols, crypto_map, max_age_hours=24):
    """
    Collect news for a list of trading pairs by extracting base symbols.
    Returns a dictionary mapping each trading pair to its filtered news entries (with full_content added).
    """
    results = {}
    for symbol in symbols:
        base_symbol = extract_base_symbol(symbol)
        if base_symbol not in crypto_map:
            results[symbol] = []
            continue

        keywords = crypto_map[base_symbol]["keywords"]
        name = crypto_map[base_symbol]["name"]
        all_entries = []
        for source_name, url_data in rss_urls.items():
            print(f"Fetching from {source_name} for {name}...")
            entries = fetch_rss_feed(url_data, keywords, max_age_hours)
            all_entries.extend(entries)

        yahoo_entries = fetch_yahoo_rss(base_symbol, crypto_map)
        all_entries.extend(yahoo_entries)

        reuters_entries = fetch_reuters_google_news(base_symbol, crypto_map)
        all_entries.extend(reuters_entries)

        if not all_entries and max_age_hours < 720:
            print(f"No articles found for {name} in {max_age_hours}h, trying {max_age_hours * 2}h...")
            return collect_crypto_news([symbol], crypto_map, max_age_hours * 2)

        all_entries.sort(key=lambda x: dateutil.parser.parse(x["published"]), reverse=True)
        for entry in all_entries:
            print(f"Extracting full content from {entry['link']}...")
            content = extract_article_content(entry['link'])
            entry["full_content"] = content.get("content", "")
            entry["extracted_title"] = content.get("title", entry["title"])

        results[symbol] = all_entries
    return results