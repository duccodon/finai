import requests
from bs4 import BeautifulSoup
from scrapegraphai.graphs import SmartScraperGraph

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

link = "https://www.coindesk.com/markets/2025/09/01/solv-and-chainlink-bring-real-time-collateral-verification-to-solvbtc-pricing"


def clean_html_for_article(raw_html: str) -> str:
    """Extract just the article body + title from a news site HTML."""
    soup = BeautifulSoup(raw_html, "html.parser")

    # Title
    title = soup.find("h1")
    title_text = title.get_text(strip=True) if title else ""

    # Coindesk specific: article body inside <article> or div with role="main"
    article = soup.find("article") or soup.find("div", {"role": "main"})
    if article:
        paragraphs = [p.get_text(" ", strip=True) for p in article.find_all("p")]
    else:
        # fallback: all <p> in page (still better than full HTML)
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]

    article_text = "\n".join(paragraphs)

    return f"<title>{title_text}</title>\n<content>{article_text}</content>"


def extract_article_content(content: str):
    """
    Use ScrapeGraphAI with local LLM to extract clean article content.
    """
    try:
        prompt = (
            "You are given cleaned HTML of a news article. "
            "Extract ONLY the actual news article text. "
            "Return JSON with exactly two keys: "
            "'title' (string) and 'content' (string with full article body)."
        )

        scraper = SmartScraperGraph(
            prompt=prompt,
            source=content,
            config=GRAPH_CONFIG
        )

        result = scraper.run()
        print("=========================================================")
        if isinstance(result, dict):
            print(result)
            return result
        else:
            print(f"Unexpected format: {result}")
            return {"title": "", "content": ""}
    except Exception as e:
        print(f"Error: {e}")
        return {"title": "", "content": ""}


# ---- MAIN ----
response = requests.get(link, headers={"User-Agent": "Mozilla/5.0"})
if response.status_code == 200:
    html_content = response.text
    cleaned = clean_html_for_article(html_content)
    extract_article_content(cleaned)
else:
    print(f"Failed to retrieve: {response.status_code}")
