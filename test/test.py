import feedparser
import time
from datetime import datetime
import re
import json
import os
import urllib.error
import urllib.parse

# New imports for ScrapeGraphAI
from scrapegraphai.graphs import SmartScraperGraph
from scrapegraphai.utils import prettify_exec_info

# Ollama LLM config (use local model)
LLM_MODEL = "llama3.1:8b"  # Or "gemma2:2b" "llama3.1:8b" "phi3:mini"
GRAPH_CONFIG = {
    "llm": {
        "model": "ollama/" + LLM_MODEL,
        "temperature": 0,
        "format": "json",
        "base_url": "http://localhost:11434"  # Default Ollama URL
    },
    "verbose": True
}

# Path to cached crypto_map
CACHE_FILE = "crypto_map.json"

def load_crypto_map():
    """
    Load crypto_map from cached JSON file.
    Returns the crypto_map dictionary or an empty dict if not found.
    """
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                print(f"Loading crypto_map from {CACHE_FILE}")
                return json.load(f)
        except Exception as e:
            print(f"Error loading crypto_map: {e}")
            return {}
    else:
        print(f"Cache file {CACHE_FILE} not found. Please run the CoinMarketCap fetch script first.")
        return {}

# RSS feed URLs (general feeds unless specified)
rss_urls = {
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    "CoinTelegraph": "https://cointelegraph.com/rss"
}

# Cache to avoid duplicate entries (stores seen links)
seen_links = set()

def is_relevant_entry(entry, keywords):
    """
    Check if an RSS entry is relevant to the cryptocurrency based on keywords.
    Returns True if relevant, False otherwise.
    """
    title = entry.get("title", "").lower()
    summary = entry.get("summary", entry.get("description", "")).lower()
    
    # Check for any keyword match with word boundaries
    for keyword in keywords:
        if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', title + summary):
            return True
    return False

def fetch_rss_feed(url, keywords):
    """
    Fetch and filter RSS feed entries for a specific cryptocurrency.
    Returns a list of filtered entries.
    """
    try:
        feed = feedparser.parse(url)
        if feed.bozo:  # Check for parsing errors
            print(f"Error parsing feed {url}: {feed.bozo_exception}")
            return []

        filtered_entries = []
        for entry in feed.entries[:50]:  # Limit to first 50 entries for efficiency
            link = entry.get("link", "")
            if link in seen_links:  # Skip duplicates
                continue
            if is_relevant_entry(entry, keywords):
                filtered_entries.append({
                    "source": url,
                    "title": entry.get("title", ""),
                    "link": link,
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", entry.get("description", ""))
                })
                seen_links.add(link)  # Add to cache
        return filtered_entries

    except urllib.error.HTTPError as e:
        print(f"HTTP error fetching feed {url}: {e} (Status code: {e.code})")
        return []
    except urllib.error.URLError as e:
        print(f"URL error fetching feed {url}: {e}")
        return []
    except Exception as e:
        print(f"General error fetching feed {url}: {e}")
        return []

def fetch_yahoo_rss(base_symbol, crypto_map):
    """
    Fetch symbol-specific RSS from Yahoo Finance for a given base symbol.
    Returns a list of filtered entries.
    """
    if base_symbol not in crypto_map:
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
        return []

    keywords = crypto_map[base_symbol]["keywords"]
    # Construct Google News RSS URL with site:reuters.com and keywords
    query = f"site:reuters.com+{'+'.join(urllib.parse.quote(k) for k in keywords)}"
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US%3Aen"
    return fetch_rss_feed(url, keywords)

def extract_article_content(link):
    """
    Use ScrapeGraphAI with local LLM to extract clean article content from a link.
    Returns a dictionary with 'title' and 'content' (clean text).
    """
    try:
        # Define prompt for extraction
        prompt = "Remove all HTML tags, ads, navigation, footers, and irrelevant content. Return as JSON with 'title' and 'content' keys."

        # Use SmartScraperGraph for single-page extraction
        scraper = SmartScraperGraph(
            prompt=prompt,
            source=link,
            config=GRAPH_CONFIG
        )

        result = scraper.run()
        if isinstance(result, dict):
            return result  # Expected: {'title': '...', 'content': 'clean text...'}
        else:
            print(f"Unexpected result format from ScrapeGraphAI for {link}: {result}")
            return {"title": "", "content": ""}

    except Exception as e:
        print(f"Error extracting content from {link}: {e}")
        return {"title": "", "content": ""}

def extract_base_symbol(trading_pair):
    """
    Extract the base symbol from a trading pair (e.g., 'BTCUSDT' -> 'BTC').
    Returns the base symbol or None if invalid.
    """
    # Common quote currencies
    quote_currencies = ["USDT", "BTC", "ETH", "BNB", "EUR", "TUSD", "USDC"]
    for quote in quote_currencies:
        if trading_pair.endswith(quote):
            return trading_pair[:-len(quote)]
    return None

def collect_crypto_news(symbols, crypto_map):
    """
    Collect news for a list of trading pairs by extracting base symbols.
    Returns a dictionary mapping each trading pair to its filtered news entries (with full_content added).
    """
    results = {}
    for symbol in symbols:
        base_symbol = extract_base_symbol(symbol)
        if not base_symbol:
            print(f"Invalid trading pair: {symbol}")
            results[symbol] = []
            continue

        if base_symbol not in crypto_map:
            print(f"Base symbol {base_symbol} not found in crypto_map")
            results[symbol] = []
            continue

        keywords = crypto_map[base_symbol]["keywords"]
        name = crypto_map[base_symbol]["name"]
        all_entries = []

        # Fetch from general RSS sources
        for source_name, url in rss_urls.items():
            print(f"Fetching from {source_name} for {name}...")
            entries = fetch_rss_feed(url, keywords)
            all_entries.extend(entries)

        # Fetch from Yahoo Finance (symbol-specific)
        print(f"Fetching from Yahoo Finance for {name}...")
        yahoo_entries = fetch_yahoo_rss(base_symbol, crypto_map)
        all_entries.extend(yahoo_entries)

        # # Fetch from Reuters via Google News
        print(f"Fetching from Reuters (via Google News) for {name}...")
        reuters_entries = fetch_reuters_google_news(base_symbol, crypto_map)
        all_entries.extend(reuters_entries)

        # Extract full clean content for each entry using AI
        for entry in all_entries:
            print(f"Extracting full content from {entry['link']}...")
            #content = extract_article_content(entry['link'])
            #entry["full_content"] = content.get("content", "")  # Add clean content
            #entry["extracted_title"] = content.get("title", entry["title"])  # Use AI-extracted title if better

        results[symbol] = all_entries
        print(f"Found {len(all_entries)} articles for {name} (from {symbol})")

    return results

def main():
    # Load crypto_map from cache
    crypto_map = load_crypto_map()
    if not crypto_map:
        print("Failed to load crypto_map. Exiting.")
        return

    # Example: List of trading pairs
    # symbols = ["BTCUSDT", "LINKBTC", "ETHEUR", "TUSDUSDT"]
    symbols = ["BTCUSDT"]
    news_entries = collect_crypto_news(symbols, crypto_map)

    # Display results (for UI integration)
    for symbol, entries in news_entries.items():
        base_symbol = extract_base_symbol(symbol)
        name = crypto_map.get(base_symbol, {}).get('name', 'Unknown')
        print(f"\nFound {len(entries)} articles for {name} (from {symbol}):")
        for entry in entries:
            print(f"\nSource: {entry['source']}")
            print(f"Title: {entry['title']}")
            print(f"Link: {entry['link']}")
            print(f"Published: {entry['published']}")
            print(f"Summary: {entry['summary'][:200]}...")
            #print(f"Full Clean Content: {entry['full_content'][:500]}...")  # Truncate for display

    # For near real-time updates, uncomment to run periodically
    # while True:
    #     print(f"\nUpdating at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    #     news_entries = collect_crypto_news(symbols, crypto_map)
    #     # Update UI with news_entries
    #     time.sleep(15 * 60)  # Wait 15 minutes

if __name__ == "__main__":
    main()