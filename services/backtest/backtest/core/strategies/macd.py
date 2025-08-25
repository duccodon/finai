# strategies/macd.py
import pandas as pd
from backtest.core.indicators import macd

def prepare_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal_period: int = 9) -> pd.DataFrame:
    df = df.copy()
    df["close"] = pd.to_numeric(df["close"], errors="coerce")

    df["macd"], df["macd_signal"], df["macd_hist"] = macd(df["close"], fast, slow, signal_period)

    prev = (df["macd"].shift(1) > df["macd_signal"].shift(1))
    curr = (df["macd"] > df["macd_signal"])

    sig = pd.Series(0, index=df.index, dtype="int8")
    sig[(~prev) & curr] = 1
    sig[prev & (~curr)] = -1

    df["signal"] = sig
    return df.dropna().reset_index(drop=True)