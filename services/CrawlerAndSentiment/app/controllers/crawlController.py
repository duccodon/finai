import requests
from bs4 import BeautifulSoup
from scrapegraphai.graphs import SmartScraperGraph
import cloudscraper
from fake_useragent import UserAgent
from seleniumbase import SB
from fastapi import HTTPException
import time
import json

LLM_MODEL = "llama3.1:8b"
GRAPH_CONFIG = {
    "llm": {"model": "ollama/" + LLM_MODEL, "temperature": 0, "format": "json", "base_url": "http://localhost:11434"},
    "verbose": True
}

def get_redirected_url(google_rss_url: str) -> str:
    try:
        resp = requests.get(google_rss_url)
        data = BeautifulSoup(resp.text, 'html.parser').select_one('c-wiz[data-p]').get('data-p')
        obj = json.loads(data.replace('%.@.', '["garturlreq",'))
        payload = {'f.req': json.dumps([[['Fbv4je', json.dumps(obj[:-6] + obj[-2:]), 'null', 'generic']]])}
        headers = {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        }
        url = "https://news.google.com/_/DotsSplashUi/data/batchexecute"
        response = requests.post(url, headers=headers, data=payload)
        array_string = json.loads(response.text.replace(")]}'", ""))[0][2]
        return json.loads(array_string)[1]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting redirected URL: {str(e)}")

def clean_html_for_article(raw_html: str) -> str:
    soup = BeautifulSoup(raw_html, "html.parser")
    title = soup.find("h1") or soup.find("title")
    title_text = title.get_text(strip=True) if title else ""
    selectors = [
        ("div", {"class": "content"}),  # CoinSpeaker
        ("article", {"class": "article-wrap no-bb"}),  # Yahoo Finance
        ("div", {"class": "text-module__text__0GDob"}),  # Reuters
        ("article", {}),
        ("div", {"role": "main"}),
        ("div", {"class": "article-content"}),
        ("div", {"class": "m-detail--body"})  # TheStreet
    ]
    paragraphs = []
    for tag, attrs in selectors:
        element = soup.find(tag, attrs)
        if element:
            paragraphs = [p.get_text(" ", strip=True) for p in element.find_all("p")]
            break
    if not paragraphs:
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    article_text = "\n".join(paragraphs)
    return f"<title>{title_text}</title>\n<content>{article_text}</content>"

def extract_article_content(link: str):
    try:
        prompt = """
        You are given cleaned HTML of a news article.
        Extract the main news content only.
        Return a valid JSON object with exactly these two top-level keys:
        - "title": string (the article headline)
        - "content": string (the full article body, paragraphs joined together, no metadata, no author info)
        Do NOT wrap inside extra keys like 'content' or 'result'.
        Do NOT include explanations, only raw JSON.
        """
        scraper = SmartScraperGraph(prompt=prompt, source=link, config=GRAPH_CONFIG)
        result = scraper.run()
        if isinstance(result, dict):
            if "content" in result and isinstance(result["content"], dict):
                return {"title": result["content"].get("title", ""), "content": result["content"].get("content", "")}
            return result
        raise HTTPException(status_code=500, detail=f"Unexpected format from ScrapeGraphAI for {link}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting content: {str(e)}")

def crawl_article(link: str):
    try:
        ua = UserAgent()
        headers = {
            "User-Agent": ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/",
        }
        scraper = cloudscraper.create_scraper()
        if "news.google.com" in link:
            link = get_redirected_url(link)
        response = scraper.get(link, headers=headers, allow_redirects=True)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to retrieve: {response.status_code}")
        html_content = response.text
        if "captcha" in html_content.lower():
            raise HTTPException(status_code=403, detail="Encountered CAPTCHA, cannot proceed")
        cleaned = clean_html_for_article(html_content)
        return extract_article_content(cleaned)
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"General error: {str(e)}")
    finally:
        time.sleep(2)  # Avoid rate limiting