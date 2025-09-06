from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from fastapi import HTTPException

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(article: dict):
    if not article or "title" not in article or "content" not in article:
        raise HTTPException(status_code=400, detail="Invalid article data")
    text = f"{article['title']}. {article['content']}"
    try:
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]
        label = "Positive" if compound > 0.05 else "Negative" if compound < -0.05 else "Neutral"
        return {"compound": compound, "label": label, "details": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")