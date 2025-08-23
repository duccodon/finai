import os
import json
import base64
import asyncio
import aiofiles
from pathlib import Path
from typing import List, Optional

# (Sentiment) dùng VADER
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader_ok = True
except Exception:
    _vader_ok = False

# ---- Crawl4AI ----
try:
    from crawl4ai import (
        AsyncWebCrawler,
        BrowserConfig,
        CrawlerRunConfig,
        DefaultMarkdownGenerator,
        PruningContentFilter,
        LLMExtractionStrategy,
        LLMConfig,
        JsonCssExtractionStrategy,
        BFSDeepCrawlStrategy,
        FilterChain,
        DomainFilter,
        ProxyConfig,
        RoundRobinProxyStrategy,
        CacheMode,
        CrawlResult,
    )
except Exception as e:
    raise RuntimeError(
        "Không tìm thấy thư viện crawl4ai. Hãy cài đặt: pip install crawl4ai"
    ) from e


# ========== 1) BASIC WEB CRAWLING ==========
async def demo_basic_crawl():
    """Basic web crawling with markdown generation"""
    print("\n=== 1. Basic Web Crawling ===")
    async with AsyncWebCrawler(
        config=BrowserConfig(
            viewport_height=800,
            viewport_width=1200,
            headless=True,
            verbose=True,
        )
    ) as crawler:
        results: List[CrawlResult] = await crawler.arun(
            url=(
                "https://www.tradingview.com/news/"
                "tradingview:cb9d56e68094b:0-googl-alphabet-stock-ticks-up-as-google-strikes-10-billion-cloud-deal-with-meta/"
            )
        )

        for i, result in enumerate(results):
            print(f"Result {i + 1}:")
            print(f"Success: {result.success}")
            if result.success:
                print(f"Markdown length: {len(result.markdown.raw_markdown)} chars")
                print(f"First 100 chars: {result.markdown.raw_markdown[:100]}...")
            else:
                print("Failed to crawl the URL")


# ========== 2) PARALLEL CRAWL ==========
async def demo_parallel_crawl():
    """Crawl multiple URLs in parallel"""
    print("\n=== 2. Parallel Crawling ===")

    urls = [
        "https://news.ycombinator.com/",
        "https://example.com/",
        "https://httpbin.org/html",
    ]

    async with AsyncWebCrawler() as crawler:
        results: List[CrawlResult] = await crawler.arun_many(urls=urls)

        print(f"Crawled {len(results)} URLs in parallel:")
        for i, result in enumerate(results):
            print(f"  {i + 1}. {result.url} - {'Success' if result.success else 'Failed'}")


# ========== 3) FIT MARKDOWN ==========
async def demo_fit_markdown():
    """Generate focused markdown with LLM content filter"""
    print("\n=== 3. Fit Markdown with LLM Content Filter ===")

    async with AsyncWebCrawler() as crawler:
        result: CrawlResult = await crawler.arun(
            url=(
                "https://www.tradingview.com/news/"
                "tradingview:cb9d56e68094b:0-googl-alphabet-stock-ticks-up-as-google-strikes-10-billion-cloud-deal-with-meta/"
            ),
            config=CrawlerRunConfig(
                markdown_generator=DefaultMarkdownGenerator(
                    content_filter=PruningContentFilter()
                )
            ),
        )

        # Print stats and save the fit markdown
        print(f"Raw: {len(result.markdown.raw_markdown)} chars")
        print(f"Fit: {len(result.markdown.fit_markdown)} chars")


# ========== 4) LLM STRUCTURED EXTRACTION (NO SCHEMA) ==========
async def demo_llm_structured_extraction_no_schema():
    # Create a simple LLM extraction strategy (no schema required)
    print("\n=== 4. LLM Structured Extraction (No Schema) ===")

    extraction_strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(
            provider="groq/llama-3.3-70b-versatile",
            api_token="",
        ),
        instruction=(
            "This is news.ycombinator.com, extract all news, and for each, "
            "I want title, source url, number of comments."
        ),
        extract_type="schema",
        schema="{title: string, url: string, comments: int}",
        extra_args={
            "temperature": 0.0,
            "max_tokens": 4096,
        },
        verbose=True,
    )

    config = CrawlerRunConfig(extraction_strategy=extraction_strategy)

    async with AsyncWebCrawler() as crawler:
        results: List[CrawlResult] = await crawler.arun(
            "https://news.ycombinator.com/", config=config
        )

        for result in results:
            print(f"URL: {result.url}")
            print(f"Success: {result.success}")
            if result.success and result.extracted_content:
                data = json.loads(result.extracted_content)
                print(json.dumps(data, indent=2))
            else:
                print("Failed to extract structured data")


# ========== 5) CSS STRUCTURED EXTRACTION (GENERATE SCHEMA ONCE) ==========
async def demo_css_structured_extraction_no_schema():
    """Extract structured data using CSS selectors"""
    print("\n=== 5. CSS-Based Structured Extraction ===")

    __cur_dir__ = str(Path(__file__).parent.resolve())
    tmp_dir = Path(__cur_dir__) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # Sample HTML for schema generation (one-time cost)
    sample_html = """
<div class="body-post clear">
    <a class="story-link" href="https://thehackernews.com/2025/04/malicious-python-packages-on-pypi.html">
        <div class="clear home-post-box cf">
            <div class="home-img clear">
                <div class="img-ratio">
                    <img alt="..." src="...">
                </div>
            </div>
            <div class="clear home-right">
                <h2 class="home-title">Malicious Python Packages on PyPI Downloaded 39,000+ Times, Steal Sensitive Data</h2>
                <div class="item-label">
                    <span class="h-datetime"><i class="icon-font icon-calendar"></i>Apr 05, 2025</span>
                    <span class="h-tags">Malware / Supply Chain Attack</span>
                </div>
                <div class="home-desc"> Cybersecurity researchers have...</div>
            </div>
        </div>
    </a>
</div>
    """

    schema_file_path = tmp_dir / "schema.json"
    if schema_file_path.exists():
        async with aiofiles.open(schema_file_path, "r") as f:
            content = await f.read()
            schema = json.loads(content)
    else:
        # Generate schema using LLM (one-time setup)
        schema = JsonCssExtractionStrategy.generate_schema(
            html=sample_html,
            llm_config=LLMConfig(
                provider="groq/llama-3.3-70b-versatile",
                api_token="",
            ),
            query=(
                "From https://thehackernews.com/, I have shared a sample of one news "
                "div with a title, date, and description. Please generate a schema for this news div."
            ),
        )
        async with aiofiles.open(schema_file_path, "w") as f:
            await f.write(json.dumps(schema, indent=2))

    print(f"Generated schema: {json.dumps(schema, indent=2)}")

    # Create no-LLM extraction strategy with the generated schema
    extraction_strategy = JsonCssExtractionStrategy(schema)
    config = CrawlerRunConfig(extraction_strategy=extraction_strategy)

    # Use the fast CSS extraction (no LLM calls during extraction)
    async with AsyncWebCrawler() as crawler:
        results: List[CrawlResult] = await crawler.arun(
            "https://thehackernews.com", config=config
        )

        for result in results:
            print(f"URL: {result.url}")
            print(f"Success: {result.success}")
            if result.success and result.extracted_content:
                data = json.loads(result.extracted_content)
                print(json.dumps(data, indent=2))
            else:
                print("Failed to extract structured data")


# ========== 6) DEEP CRAWL ==========
async def demo_deep_crawl():
    """Deep crawling with BFS strategy"""
    print("\n=== 6. Deep Crawling ===")

    filter_chain = FilterChain([DomainFilter(allowed_domains=["crawl4ai.com"])])

    deep_crawl_strategy = BFSDeepCrawlStrategy(
        max_depth=1, max_pages=5, filter_chain=filter_chain
    )

    async with AsyncWebCrawler() as crawler:
        results: List[CrawlResult] = await crawler.arun(
            url="https://docs.crawl4ai.com",
            config=CrawlerRunConfig(deep_crawl_strategy=deep_crawl_strategy),
        )

        print(f"Deep crawl returned {len(results)} pages:")
        for i, result in enumerate(results):
            depth = result.metadata.get("depth", "unknown")
            print(f"  {i + 1}. {result.url} (Depth: {depth})")


# ========== 7) JS INTERACTION (LOAD MORE) ==========
async def demo_js_interaction():
    """Execute JavaScript to load more content"""
    print("\n=== 7. JavaScript Interaction ===")

    async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
        news_schema = {
            "name": "news",
            "baseSelector": "tr.athing",
            "fields": [
                {"name": "title", "selector": "span.titleline", "type": "text"}
            ],
        }
        results: List[CrawlResult] = await crawler.arun(
            url="https://news.ycombinator.com",
            config=CrawlerRunConfig(
                session_id="hn_session",  # Keep session
                extraction_strategy=JsonCssExtractionStrategy(schema=news_schema),
            ),
        )

        news = []
        for result in results:
            if result.success and result.extracted_content:
                data = json.loads(result.extracted_content)
                news.extend(data)
                print(json.dumps(data, indent=2))
            else:
                print("Failed to extract structured data")

        print(f"Initial items: {len(news)}")

        # Click "More" link (stays in same page context)
        more_config = CrawlerRunConfig(
            js_code="document.querySelector('a.morelink').click();",
            js_only=True,
            session_id="hn_session",
            extraction_strategy=JsonCssExtractionStrategy(schema=news_schema),
        )

        more_results: List[CrawlResult] = await crawler.arun(
            url="https://news.ycombinator.com", config=more_config
        )

        for result in more_results:
            if result.success and result.extracted_content:
                data = json.loads(result.extracted_content)
                news.extend(data)
                print(json.dumps(data, indent=2))
            else:
                print("Failed to extract structured data")
        print(f"Total items: {len(news)}")


# ========== 8) MEDIA & LINKS EXTRACTION ==========
async def demo_media_and_links():
    """Extract media and links from a page"""
    print("\n=== 8. Media and Links Extraction ===")

    __cur_dir__ = str(Path(__file__).parent.resolve())
    tmp_dir = Path(__cur_dir__) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    async with AsyncWebCrawler() as crawler:
        result_list: List[CrawlResult] = await crawler.arun("https://en.wikipedia.org/wiki/Main_Page")

        for i, result in enumerate(result_list):
            if not result.success:
                print("Failed to crawl wiki main page")
                continue

            images = result.media.get("images", [])
            print(f"Found {len(images)} images")

            internal_links = result.links.get("internal", [])
            external_links = result.links.get("external", [])
            print(f"Found {len(internal_links)} internal links")
            print(f"Found {len(external_links)} external links")

            for image in images[:3]:
                print(f"Image: {image['src']}")
            for link in internal_links[:3]:
                print(f"Internal link: {link['href']}")
            for link in external_links[:3]:
                print(f"External link: {link['href']}")

            # Save everything to files
            async with aiofiles.open(tmp_dir / "images.json", "w") as f:
                await f.write(json.dumps(images, indent=2))

            async with aiofiles.open(tmp_dir / "links.json", "w") as f:
                await f.write(
                    json.dumps({"internal": internal_links, "external": external_links}, indent=2)
                )


# ========== 9) SCREENSHOT & PDF ==========
async def demo_screenshot_and_pdf():
    """Capture screenshot and PDF of a page"""
    print("\n=== 9. Screenshot and PDF Capture ===")

    __cur_dir__ = str(Path(__file__).parent.resolve())
    tmp_dir = Path(__cur_dir__) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    async with AsyncWebCrawler() as crawler:
        result_list: List[CrawlResult] = await crawler.arun(
            url="https://en.wikipedia.org/wiki/Giant_anteater",
            config=CrawlerRunConfig(screenshot=True, pdf=True),
        )

        for i, result in enumerate(result_list):
            if result.screenshot:
                screenshot_path = tmp_dir / "example_screenshot.png"
                async with aiofiles.open(screenshot_path, "wb") as f:
                    await f.write(base64.b64decode(result.screenshot))
                print(f"Screenshot saved to {screenshot_path}")

            if result.pdf:
                pdf_path = tmp_dir / "example.pdf"
                async with aiofiles.open(pdf_path, "wb") as f:
                    await f.write(result.pdf)
                print(f"PDF saved to {pdf_path}")


# ==========
async def demo_proxy_rotation():
    """Proxy rotation for multiple requests"""
    print("\n=== 10. Proxy Rotation ===")

    # Example proxies (replace with real ones)
    proxies = [
        ProxyConfig(server="http://proxy1.example.com:8080"),
        ProxyConfig(server="http://proxy2.example.com:8080"),
    ]

    proxy_strategy = RoundRobinProxyStrategy(proxies)

    print(f"Using {len(proxies)} proxies in rotation")
    print("Note: This example uses placeholder proxies - replace with real ones to test")

    async with AsyncWebCrawler() as crawler:
        config = CrawlerRunConfig(proxy_rotation_strategy=proxy_strategy)
        print("In a real scenario, requests would rotate through the available proxies")


# ==========
async def demo_raw_html_and_file():
    """Process raw HTML and local files"""
    print("\n=== 11. Raw HTML and Local Files ===")

    __cur_dir__ = str(Path(__file__).parent.resolve())
    tmp_dir = Path(__cur_dir__) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    raw_html = """
    <html><body>
        <h1>Sample Article</h1>
        <p>This is sample content for testing Crawl4AI's raw HTML processing.</p>
    </body></html>
    """

    # Save to file
    file_path = tmp_dir / "sample.html"
    async with aiofiles.open(file_path, "w") as f:
        await f.write(raw_html)

    async with AsyncWebCrawler() as crawler:
        # Crawl raw HTML
        raw_result = await crawler.arun(
            url="raw:" + raw_html, config=CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
        )
        print("Raw HTML processing:")
        print(f"  Markdown: {raw_result.markdown.raw_markdown[:50]}...")

        # Crawl local file
        file_result = await crawler.arun(
            url=f"file://{file_path}",
            config=CrawlerRunConfig(cache_mode=CacheMode.BYPASS),
        )
        print("\nLocal file processing:")
        print(f"  Markdown: {file_result.markdown.raw_markdown[:50]}...")

    # Clean up (tùy chọn)
    # await aiofiles.os.remove(file_path)
    print(f"Processed both raw HTML and local file ({file_path})")


# "CRAWLER + AI PHÂN TÍCH CẤU TRÚC"

def _sentiment(text: str) -> Optional[dict]:
    """Phân tích cảm xúc đơn giản bằng VADER (positive/neutral/negative & compound)."""
    if not _vader_ok:
        print(">>> VADER chưa được cài. Cài: pip install vaderSentiment")
        return None
    analyzer = SentimentIntensityAnalyzer()
    score = analyzer.polarity_scores(text or "")
    # score = {'neg': x, 'neu': y, 'pos': z, 'compound': c}
    label = "positive" if score["compound"] >= 0.2 else "negative" if score["compound"] <= -0.2 else "neutral"
    return {"label": label, "score": score}


async def demo_smart_site_crawl(target_url: str):
    """
    AI tự phân tích cấu trúc HTML để crawler (không cần CSS schema sẵn).
    - Trả về: title, source, published_time, author, body_text, comments (nếu có)
    """
    print("\n=== SMART SITE CRAWL (AI schema-free) ===")
    print(f"Target: {target_url}")

    instruction = (
        "You are given an arbitrary news/article page. "
        "Extract a single JSON object with fields: "
        "{title: string, source: string, published_time: string|nullable, "
        "author: string|nullable, body_text: string, comments: [{author?: string, text: string}] } "
        "Rules: infer 'source' as site hostname; 'body_text' is the main readable content; "
        "If a field is unavailable, set it to null or empty list. Return ONLY JSON."
    )

    extraction_strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(provider="groq/llama-3.3-70b-versatile", api_token=""),
        instruction=instruction,
        extract_type="json",  # cho phép trả thẳng JSON
        extra_args={"temperature": 0.0, "max_tokens": 4096},
        verbose=True,
    )

    async with AsyncWebCrawler(config=BrowserConfig(headless=True, verbose=True)) as crawler:
        result: CrawlResult = await crawler.arun(
            url=target_url,
            config=CrawlerRunConfig(extraction_strategy=extraction_strategy),
        )

        if not result.success:
            print("Crawl thất bại.")
            return

        # --- Parse robust ---
        raw = result.extracted_content
        title = None
        body_text = ""

        def _join(parts):
            if not parts:
                return ""
            return " ".join([p if isinstance(p, str) else str(p) for p in parts])

        parsed = None
        if isinstance(raw, str):
            # cố parse JSON
            try:
                parsed = json.loads(raw)
            except Exception:
                # thử cắt {...}
                s = raw.strip()
                l, r = s.find("{"), s.rfind("}")
                if l != -1 and r != -1 and r > l:
                    try:
                        parsed = json.loads(s[l:r+1])
                    except Exception:
                        parsed = None

        # Nếu là dict: lấy body_text/title nếu có
        if isinstance(parsed, dict):
            title = parsed.get("title")
            body_text = parsed.get("body_text") or parsed.get("content") or ""
            if isinstance(body_text, list):
                body_text = _join(body_text)

        # Nếu là list các block
        elif isinstance(parsed, list):
            for block in parsed:
                if not isinstance(block, dict):
                    continue
                tag = (block.get("tag") or "").lower()
                content_parts = block.get("content") or []
                if tag == "title" and content_parts and not title:
                    title = _join(content_parts).strip()
                else:
                    body_text += " " + _join(content_parts)
            body_text = body_text.strip()

        # Fallback: nếu vẫn chưa có body, lấy từ markdown
        if not body_text:
            body_text = (result.markdown.fit_markdown or result.markdown.raw_markdown or "")

        # --- Output ---
        print("=== Structured (title + preview) ===")
        print("Title:", title or "(unknown)")
        print("Body preview:", (body_text[:400].replace("\n", " ")) + ("..." if len(body_text) > 400 else ""))

        # --- Sentiment ---
        text_for_sent = body_text[:8000] if body_text else ""
        scores = _sentiment(text_for_sent)
        label = "positive" if scores["score"]["compound"] >= 0.2 else "negative" if scores["score"]["compound"] <= -0.2 else "neutral"

        print("\n=== Sentiment (VADER) ===")
        print(json.dumps({"label": label, "scores": scores}, indent=2, ensure_ascii=False))


async def demo_finance_news_sentiment():
    print("\n=== FINANCE NEWS SENTIMENT ===")
    urls = [
        "https://finance.yahoo.com/news/warren-buffett-selling-apple-bank-141000107.html",
        "https://www.cnbc.com/markets/",
    ]

    async with AsyncWebCrawler() as crawler:
        results: List[CrawlResult] = await crawler.arun_many(urls)

        for r in results:
            print(f"\n--- {r.url} ---")
            if not r.success:
                print("Failed to crawl.")
                continue

            # Dùng markdown.fit nếu có bộ lọc; nếu không, raw_markdown
            content = r.markdown.fit_markdown or r.markdown.raw_markdown or ""
            preview = content[:400].replace("\n", " ")
            print(f"Content preview: {preview}...")

            sent = _sentiment(content[:8000])  # hạn chế độ dài
            if sent:
                print("Sentiment:", json.dumps(sent, indent=2))
            else:
                print("Sentiment: (skip – VADER not installed)")


# ================= MAIN =================
async def main():
    """ await demo_basic_crawl()
    await demo_parallel_crawl()
    await demo_fit_markdown()
    await demo_llm_structured_extraction_no_schema()
    await demo_css_structured_extraction_no_schema()
    await demo_deep_crawl()
    await demo_js_interaction()
    await demo_media_and_links()
    await demo_screenshot_and_pdf()
    await demo_proxy_rotation()
    await demo_raw_html_and_file() """

    # 1) Phân tích cấu trúc HTML & trích xuất
    await demo_smart_site_crawl(
        "https://www.tradingview.com/news/tradingview:cb9d56e68094b:0-googl-alphabet-stock-ticks-up-as-google-strikes-10-billion-cloud-deal-with-meta/"
    )

    # 2) Thu thập tin tài chính và chấm sentiment nhanh
    await demo_finance_news_sentiment()


if __name__ == "__main__":
    # Yêu cầu:
    # - pip install crawl4ai vaderSentiment aiofiles
    # - Xuất biến môi trường GROQ_API_KEY nếu dùng LLM:
    #   (Linux/Mac) export GROQ_API_KEY="your_key"
    #   (Windows)   setx GROQ_API_KEY "your_key"
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Interrupted by user")
