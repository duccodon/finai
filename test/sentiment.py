from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Input (from your crawler)
article = {'title': 'Crypto ‘buy the dip’ calls are spiking, which may signal more downside', 'content': 'Crypto ‘buy the dip’ calls are spiking, which may signal more downside Buy the\ndip mentions on social media are climbing as Bitcoin falls, which could be a\nsign the market hasn’t bottomed yet, Santiment says. The rising number of “buy\nthe dip” calls on social media following Bitcoin’s 5% decline over the past\nweek could signal more downside ahead for the crypto market, sentiment\nplatform Santiment says. “Clearly, overall, in the markets, people are getting\nantsy and trying to find some entry spots now that prices have cooled down a\nbit,” Santiment analyst Brian Quinlivan said in a video published on YouTube\non Saturday. Santiment said in a separate report published on the same day\nthat social media mentions of “buy the dip” have increased significantly amid\nthe crypto market downturn, which may be a warning sign for the market. “Don’t\ninterpret ‘buy the dip’ chatter as a definitive bottom signal. A true market\nfloor often coincides with widespread fear and a lack of interest in buying,”\nSantiment said. “A real bottom often forms when the crowd loses hope and\nbecomes afraid to buy,” Santiment added. The total crypto market\ncapitalization is $3.79 trillion at the time of publication, down\napproximately 6.18% over the past seven days, according to CoinMarketCap.\nMeanwhile, Bitcoin ( BTC ) is trading at $108,748 at the time of publication,\ndown approximately 5% over the same period. On Aug. 14, Bitcoin reached a new\nhigh of $124,128. It’s often echoed among crypto analysts that prices move\nopposite to what retail traders expect, and history suggests that when more\npeople think the market has reached a bottom, it can actually signal further\ndownside. Market sentiment is slowly recovering, with the Crypto Fear & Greed\nIndex climbing back to a “Neutral” score of 48 out of 100 on Sunday, after\ndipping into “Fear” at 39 out of 100 the previous day. Some traders are\nspeculating that the crypto market’s pullback from Bitcoin’s recent highs\ncould be a sign that the long-awaited altcoin season is approaching. Crypto\ntrader Ash Crypto pointed out in an X post on the same day that “Altcoins are\nnow the most oversold ever.” “Even during the Covid crash, FTX collapse or\ntariff wars, they weren’t this oversold,” the trader said, suggesting it could\nbe a sign of a “mega altseason” similar to the big rallies of 2017 and 2021.\nRelated: ‘No question Bitcoin hits $1M’ — Eric Trump at BTC Asia 2025 On\nThursday, CoinMarketCap’s Altcoin Season Index shifted from “Bitcoin Season”\nto “Altcoin Season,” reaching a score of 60 out of 100 at the time of\npublication. Meanwhile, crypto trader Ak47 said , with a “possible Fed rate\ncut and altcoin ETF approval this fall, the next rally could be huge.” CME’s\nFedWatch Tool shows market participants see an 86.4% chance of the US Federal\nReserve cutting interest rates for the first time this year in September,\nwhich is typically seen as a bullish signal for crypto as investors look for\nhigher returns in riskier assets. Magazine: The one thing these 6 global\ncrypto hubs all have in common…'}
text = f"{article['title']}. {article['content']}"

# 2. Init analyzer
analyzer = SentimentIntensityAnalyzer()

# 3. Run sentiment
scores = analyzer.polarity_scores(text)

# 4. Decide label
compound = scores["compound"]
if compound > 0.05:
    label = "Positive"
elif compound < -0.05:
    label = "Negative"
else:
    label = "Neutral"

print("Sentiment Analysis")
print("------------------")
print("Title:", article["title"])
print("Compound Score:", compound)
print("Label:", label)
print("Details:", scores)
