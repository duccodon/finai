import feedparser
import time
from dateutil import parser
from datetime import datetime
import re
import json
import os
import urllib.error
import urllib.parse
import redis
from app.controllers.getCoinController import load_or_fetch_crypto_map
from app.controllers.crawlController import crawl_article
from app.controllers.sentimentController import analyze_sentiment
from fastapi import HTTPException

# Path to cached crypto_map
CACHE_FILE = "cache/crypto_map.json"

# Redis client
REDIS_CLIENT = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# Redis key for seen_links
SEEN_LINKS_KEY = "news:seen_links"

# RSS feed URLs
rss_urls = {
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    "CoinTelegraph": "https://cointelegraph.com/rss"
}

def get_newest_entry(entries, before_date=None):
    """
    Return the newest entry from a list of entries based on published date,
    optionally before a given date.
    Returns None if the list is empty, dates are invalid, or no entries are before the date.
    """
    if not entries:
        return None
    try:
        if before_date:
            filtered_entries = [
                entry for entry in entries
                if parser.parse(entry["published"]) < parser.parse(before_date)
            ]
            if not filtered_entries:
                return None
            return max(filtered_entries, key=lambda x: parser.parse(x["published"]))
        return max(entries, key=lambda x: parser.parse(x["published"]))
    except Exception as e:
        print(f"Error finding newest entry: {e}")
        return None

def is_relevant_entry(entry, keywords):
    """
    Check if an RSS entry is relevant to the cryptocurrency based on keywords.
    Returns True if relevant, False otherwise.
    """
    title = entry.get("title", "").lower()
    summary = entry.get("summary", entry.get("description", "")).lower()
    
    for keyword in keywords:
        if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', title + summary):
            print(f"Relevant entry found: {entry.get('title', 'No title')} (Keyword: {keyword})")
            return True
    print(f"No relevant entry for keywords: {keywords} in title: {title[:50]}...")
    return False

def fetch_rss_feed(url, keywords):
    """
    Fetch and filter RSS feed entries for a specific cryptocurrency.
    Returns a list of filtered entries.
    """
    try:
        feed = feedparser.parse(url)
        if feed.bozo:
            print(f"Failed to parse feed {url}: {feed.bozo_exception}")
            raise HTTPException(status_code=500, detail=f"Error parsing feed {url}: {feed.bozo_exception}")

        filtered_entries = []
        print(f"Processing feed: {url} with keywords: {keywords}")
        for entry in feed.entries[:50]:
            link = entry.get("link", "")
            # Check if link is in Redis seen_links
            if REDIS_CLIENT.sismember(SEEN_LINKS_KEY, json.dumps({"link": link})):
                print(f"Skipping duplicate link: {link}")
                continue
            if is_relevant_entry(entry, keywords):
                print(f"Entry published date for {url}: {entry.get('published', 'No date')}")
                entry_data = {
                    "source": url,
                    "title": entry.get("title", ""),
                    "link": link,
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", entry.get("description", ""))
                }
                filtered_entries.append(entry_data)
                # Store full entry in Redis
                REDIS_CLIENT.sadd(SEEN_LINKS_KEY, json.dumps(entry_data))
        print(f"Found {len(filtered_entries)} relevant entries for {url}")
        return filtered_entries
    except urllib.error.HTTPError as e:
        print(f"HTTP error fetching feed {url}: {e} (Status code: {e.code})")
        raise HTTPException(status_code=500, detail=f"HTTP error fetching feed {url}: {e} (Status code: {e.code})")
    except urllib.error.URLError as e:
        print(f"URL error fetching feed {url}: {e}")
        raise HTTPException(status_code=500, detail=f"URL error fetching feed {url}: {e}")
    except Exception as e:
        print(f"General error fetching feed {url}: {e}")
        raise HTTPException(status_code=500, detail=f"General error fetching feed {url}: {e}")

def fetch_yahoo_rss(base_symbol, crypto_map):
    """
    Fetch symbol-specific RSS from Yahoo Finance for a given base symbol.
    Returns a list of filtered entries.
    """
    if base_symbol not in crypto_map:
        print(f"Base symbol {base_symbol} not in crypto_map")
        return []
    yahoo_ticker = crypto_map[base_symbol]["yahoo_ticker"]
    keywords = crypto_map[base_symbol]["keywords"]
    url = f"https://finance.yahoo.com/rss/headline?s={yahoo_ticker}"
    return fetch_rss_feed(url, keywords)

def fetch_reuters_google_news(base_symbol, crypto_map):
    """
    Fetch Reuters articles via Google News RSS for a given base symbol.
    Returns a list of filtered entries.
    """
    if base_symbol not in crypto_map:
        print(f"Base symbol {base_symbol} not in crypto_map")
        return []
    keywords = crypto_map[base_symbol]["keywords"]
    query = f"site:reuters.com+{'+'.join(urllib.parse.quote(k) for k in keywords)}"
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US%3Aen"
    return fetch_rss_feed(url, keywords)

def extract_base_symbol(trading_pair):
    """
    Extract the base symbol from a trading pair (e.g., 'BTCUSDT' -> 'BTC').
    Returns the base symbol or None if invalid.
    """
    quote_currencies = ["USDT", "BTC", "ETH", "BNB", "EUR", "TUSD", "USDC"]
    for quote in quote_currencies:
        if trading_pair.endswith(quote):
            return trading_pair[:-len(quote)]
    return None

def collect_crypto_news(symbols):
    """
    Collect news for a list of trading pairs and return the newest article before the last returned article.
    Prints article details (source, title, link, published, summary) for debugging.
    Returns a dictionary mapping each trading pair to a single news entry with cleanText and sentiment.
    """
    # Print seen_entries from Redis
    seen_entries = [json.loads(entry) for entry in REDIS_CLIENT.smembers(SEEN_LINKS_KEY)]
    print(f"\nSeen entries")
    for entry in seen_entries:
        print(f"Source: {entry['source']}")
        print(f"Title: {entry['title']}")
        print(f"Link: {entry['link']}")
        print(f"Published: {entry['published']}")
        print(f"Summary: {entry['summary'][:200]}...")
    print("\n================\n")

    crypto_map = load_or_fetch_crypto_map()
    results = {}
    
    # Store last returned links to avoid returning the same article
    last_returned_links = {}
    for symbol in symbols:
        last_returned_key = f"news:last_returned:{symbol}"
        last_returned_link_key = f"news:last_returned_link:{symbol}"
        last_returned_links[symbol] = REDIS_CLIENT.get(last_returned_link_key)

    for symbol in symbols:
        base_symbol = extract_base_symbol(symbol)
        if not base_symbol:
            print(f"Invalid trading pair: {symbol}")
            raise HTTPException(status_code=400, detail=f"Invalid trading pair: {symbol}")
        if base_symbol not in crypto_map:
            print(f"Base symbol {base_symbol} not found in crypto_map")
            raise HTTPException(status_code=404, detail=f"Base symbol {base_symbol} not found in crypto_map")

        keywords = crypto_map[base_symbol]["keywords"]
        name = crypto_map[base_symbol]["name"]
        all_entries = []

        for source_name, url in rss_urls.items():
            entries = fetch_rss_feed(url, keywords)
            all_entries.extend(entries)

        yahoo_entries = fetch_yahoo_rss(base_symbol, crypto_map)
        all_entries.extend(yahoo_entries)

        reuters_entries = fetch_reuters_google_news(base_symbol, crypto_map)
        all_entries.extend(reuters_entries)

        if not all_entries and not seen_entries:
            print(f"No news entries found for {symbol} (keywords: {keywords})")
            results[symbol] = None
            continue

        # Print all articles in the requested format
        if all_entries:
            print(f"\nFound {len(all_entries)} articles for {name} (from {symbol}):")
            for entry in all_entries:
                print(f"Source: {entry['source']}")
                print(f"Title: {entry['title']}")
                print(f"Link: {entry['link']}")
                print(f"Published: {entry['published']}")
                print(f"Summary: {entry['summary'][:200]}...")

        # Get keys for this symbol
        last_returned_key = f"news:last_returned:{symbol}"
        last_returned_link_key = f"news:last_returned_link:{symbol}"
        last_returned_date = REDIS_CLIENT.get(last_returned_key)
        last_returned_link = REDIS_CLIENT.get(last_returned_link_key)

        # Combine all available entries and sort by date descending
        all_available_entries = all_entries + seen_entries
        all_available_entries.sort(key=lambda x: parser.parse(x["published"]), reverse=True)

        # Filter entries: remove the last returned article and get the next one
        filtered_entries = []
        for entry in all_available_entries:
            # Skip the exact same article we returned last time
            if last_returned_link and entry["link"] == last_returned_link:
                continue
            
            # If we have a last returned date, only consider older or equal articles
            if last_returned_date:
                if parser.parse(entry["published"]) <= parser.parse(last_returned_date):
                    filtered_entries.append(entry)
            else:
                filtered_entries.append(entry)

        # Get the newest article from filtered list (next in sequence)
        selected_article = get_newest_entry(filtered_entries) if filtered_entries else None

        # If no suitable article found, start from the beginning
        if not selected_article and all_available_entries:
            selected_article = all_available_entries[0]  # Newest article overall

        if selected_article:
            try:
                # Crawl the article
                crawled_data = crawl_article(selected_article["link"])
                selected_article["cleanText"] = crawled_data.get("content", "")
                # Perform sentiment analysis
                selected_article["sentiment"] = analyze_sentiment({
                    "title": selected_article["title"],
                    "content": selected_article["cleanText"]
                })
                # Update last returned date AND link
                REDIS_CLIENT.set(last_returned_key, selected_article["published"])
                REDIS_CLIENT.set(last_returned_link_key, selected_article["link"])
            except HTTPException as e:
                print(f"Error processing article {selected_article['link']}: {e}")
                selected_article["cleanText"] = ""
                selected_article["sentiment"] = {"compound_score": 0, "label": "Neutral", "details": {}}

        results[symbol] = selected_article

    return results