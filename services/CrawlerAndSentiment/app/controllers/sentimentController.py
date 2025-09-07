from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from fastapi import HTTPException

def analyze_sentiment(article: dict) -> dict:
    """Perform sentiment analysis on the article content."""
    try:
        text = f"{article['title']}. {article['content']}"
        analyzer = SentimentIntensityAnalyzer()
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound > 0.05:
            label = "Positive"
        elif compound < -0.05:
            label = "Negative"
        else:
            label = "Neutral"
        return {
            "compound_score": compound,
            "label": label,
            "details": scores
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in sentiment analysis: {e}")