# backtest/data/loader_binance.py
import requests
import pandas as pd
import math
from datetime import datetime, timezone

BINANCE_BASE = "https://api.binance.com"  # spot public

_INTERVAL_MAP = {
    "1m":"1m","5m":"5m","15m":"15m","1h":"1h","4h":"4h","1d":"1d"
}

def _to_ms(ts_str: str) -> int:
    # nhận "2023-01-01T00:00:00Z" hoặc "2023-01-01 00:00:00+00:00"
    dt = pd.to_datetime(ts_str, utc=True, errors="coerce")
    return int(dt.value // 10**6)

def _iso(ms: int) -> str:
    return datetime.fromtimestamp(ms/1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00:00")

def load_binance_klines(symbol: str, timeframe: str, start: str, end: str, limit: int = 1000) -> pd.DataFrame:
    interval = _INTERVAL_MAP.get(timeframe)
    if not interval:
        raise ValueError(f"timeframe not supported: {timeframe}")

    start_ms = _to_ms(start) if start else None
    end_ms   = _to_ms(end)   if end   else None

    url = f"{BINANCE_BASE}/api/v3/klines"
    out = []

    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    cur = start_ms
    while True:
        if cur: params["startTime"] = cur
        if end_ms: params["endTime"] = end_ms
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        if not data:
            break

        out.extend(data)
        # Binance trả kline có trường open time ở index 0, close time ở 6
        last_open_ms = data[-1][0]
        step = (data[-1][6] - data[-1][0]) or 1  # dựa vào close-open ms
        next_ms = last_open_ms + step
        if end_ms and next_ms > end_ms:
            break
        if len(data) < limit:
            break
        cur = next_ms

    if not out:
        return pd.DataFrame(columns=["t","open","high","low","close","volume"])

    df = pd.DataFrame(out, columns=[
        "openTime","open","high","low","close","volume",
        "closeTime","quoteAssetVolume","numberOfTrades",
        "takerBuyBase","takerBuyQuote","ignore"
    ])
    # ép kiểu + chuẩn hoá
    df["t"] = df["openTime"].apply(_iso)
    for col in ["open","high","low","close","volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df[["t","open","high","low","close","volume"]].dropna().copy()
    df = df.sort_values("t").reset_index(drop=True)
    return df
