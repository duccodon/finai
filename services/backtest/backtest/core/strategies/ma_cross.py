# backtest/core/strategies/ma_cross.py
import pandas as pd
from backtest.core.indicators import sma

def prepare_ma_cross(df: pd.DataFrame, short_window: int, long_window: int) -> pd.DataFrame:
    df = df.copy()
    df["sma_s"] = sma(df["close"], short_window)
    df["sma_l"] = sma(df["close"], long_window)
    prev = (df["sma_s"].shift(1) > df["sma_l"].shift(1))
    curr = (df["sma_s"] > df["sma_l"])
    df["signal"] = 0
    df.loc[(~prev) & (curr), "signal"] = 1    # cross up
    df.loc[(prev) & (~curr), "signal"] = -1   # cross down
    return df.dropna().reset_index(drop=True)


    
