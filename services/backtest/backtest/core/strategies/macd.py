# strategies/macd.py
import pandas as pd
from backtest.core.indicators import macd, ema

def prepare_macd(df, fast=12, slow=26, signal=9, trend_len=200):
    df = df.copy()
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df["macd"], df["macd_signal"], df["macd_hist"] = macd(df["close"], fast, slow, signal)
    df["ema_trend"] = ema(df["close"], trend_len)

    prev = (df["macd"].shift(1) > df["macd_signal"].shift(1))
    curr = (df["macd"] > df["macd_signal"])
    
    sig = pd.Series(0, index=df.index, dtype="int8")
    # cross up chỉ khi giá > EMA200
    sig[(~prev) & curr & (df["close"] > df["ema_trend"])] = 1
    # cross down chỉ khi giá < EMA200
    sig[prev & (~curr) & (df["close"] < df["ema_trend"])] = -1

    df["signal"] = sig
    return df.dropna().reset_index(drop=True)