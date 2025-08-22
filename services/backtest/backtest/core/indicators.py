# backtest/core/indicators.py
import pandas as pd

def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window).mean()

# chừa chỗ RSI sau
