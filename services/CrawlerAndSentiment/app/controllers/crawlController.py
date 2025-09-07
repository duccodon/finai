import requests
from bs4 import BeautifulSoup
from scrapegraphai.graphs import SmartScraperGraph
import cloudscraper
import time
from fake_useragent import UserAgent
from seleniumbase import SB
import json
from fastapi import HTTPException

LLM_MODEL = "llama3.1:8b"
GRAPH_CONFIG = {
    "llm": {
        "model": "ollama/" + LLM_MODEL,
        "temperature": 0,
        "format": "json",
        "base_url": "http://ollama:11434",
    },
    "verbose": True
}

def clean_html_for_article(raw_html: str) -> str:
    """Extract just the article body + title from a news site HTML."""
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        title = soup.find("h1")
        title_text = title.get_text(strip=True) if title else "No Title Found"

        coinspeaker_content = soup.find("div", class_="content")
        if soup.find("article", class_="article-wrap no-bb"):
            article = soup.find("article")
            paragraphs = [p.get_text(" ", strip=True) for p in article.find_all("p") if p.get_text(strip=True)]
        elif coinspeaker_content:
            paragraphs = [p.get_text(" ", strip=True) for p in coinspeaker_content.find_all("p") if p.get_text(strip=True)]
        elif soup.select("div.text-module__text__0GDob"):
            paragraphs = [p.get_text(" ", strip=True) for p in soup.select("div.text-module__text__0GDob") if p.get_text(strip=True)]
        else:
            article = (
                soup.find("article") or
                soup.find("div", {"role": "main"}) or
                soup.find("div", class_="article-content") or
                soup.select_one("div.m-detail--body")
            )
            if article:
                paragraphs = [p.get_text(" ", strip=True) for p in article.find_all("p") if p.get_text(strip=True)]
            else:
                paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]

        article_text = "\n".join(paragraphs)
        return f"<title>{title_text}</title>\n<content>{article_text}</content>"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning HTML: {e}")

def extract_article_content(content: str):
    """Use ScrapeGraphAI to extract clean article content with a fallback."""
    try:
        prompt = """
        You are given cleaned HTML of a news article containing <title> and <content> tags.
        Extract the main news content only.
        Return a valid JSON object with exactly these two top-level keys:
        - "title": string (the article headline)
        - "content": string (the full article body, paragraphs joined together, no metadata, no author info)
        Do NOT wrap inside extra keys like 'content' or 'result'.
        Do NOT include explanations, only raw JSON.
        """
        scraper = SmartScraperGraph(
            prompt=prompt,
            source=content,
            config=GRAPH_CONFIG
        )
        result = scraper.run()
        
        if isinstance(result, dict):
            if "content" in result and isinstance(result["content"], dict):
                return {
                    "title": result["content"].get("title", "No Title Found"),
                    "content": result["content"].get("content", "")
                }
            return {
                "title": result.get("title", "No Title Found"),
                "content": result.get("content", "")
            }
        else:
            soup = BeautifulSoup(content, "html.parser")
            title = soup.find("title")
            content = soup.find("content")
            return {
                "title": title.get_text(strip=True) if title else "No Title Found",
                "content": content.get_text(strip=True) if content else ""
            }
    except Exception as e:
        print(f"Error in ScrapeGraphAI: {e}")
        # Fallback: Parse the input content manually
        soup = BeautifulSoup(content, "html.parser")
        title = soup.find("title")
        content = soup.find("content")
        return {
            "title": title.get_text(strip=True) if title else "No Title Found",
            "content": content.get_text(strip=True) if content else ""
        }

def get_redirected_url(google_rss_url: str) -> str:
    """Get the final redirected URL after following all redirects."""
    try:
        resp = requests.get(google_rss_url)
        data = BeautifulSoup(resp.text, 'html.parser').select_one('c-wiz[data-p]').get('data-p')
        obj = json.loads(data.replace('%.@.', '["garturlreq",'))
        payload = {
            'f.req': json.dumps([[['Fbv4je', json.dumps(obj[:-6] + obj[-2:]), 'null', 'generic']]])
        }
        headers = {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        }
        url = "https://news.google.com/_/DotsSplashUi/data/batchexecute"
        response = requests.post(url, headers=headers, data=payload)
        array_string = json.loads(response.text.replace(")]}'", ""))[0][2]
        article_url = json.loads(array_string)[1]
        return article_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resolving Google News URL: {e}")

def crawl_article(link: str) -> dict:
    """Crawl the article at the given link and return title and content."""
    ua = UserAgent()
    headers = {
        "User-Agent": ua.random,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",
    }

    print(f"Crawling link: {link}\n")
    try:
        scraper = cloudscraper.create_scraper()
        if "news.google.com" in link:
            link = get_redirected_url(link)
        response = scraper.get(link, headers=headers, allow_redirects=True)
        if response.status_code == 200:
            html_content = response.text
        else:
            with SB(uc=True, headless=True) as sb:
                sb.uc_open_with_reconnect(link, 3)
                sb.sleep(3)
                html_content = sb.get_page_source()

        if "captcha" in html_content.lower():
            print("Encountered CAPTCHA, cannot proceed.")

        cleaned = clean_html_for_article(html_content)
        result = extract_article_content(cleaned)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {e}")
    finally:
        time.sleep(2)  # Avoid rate limiting