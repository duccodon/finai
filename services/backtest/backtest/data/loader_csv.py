import requests, pandas as pd
from typing import Optional

def _interval_ms(interval: str) -> int:
    unit = interval[-1].lower(); val = int(interval[:-1])
    mult = {"m":60_000, "h":3_600_000, "d":86_400_000}[unit]
    return val * mult

def _to_ms(ts: Optional[str]) -> Optional[int]:
    if not ts: return None
    dt = pd.to_datetime(ts, utc=True, errors="coerce")
    if pd.isna(dt): return None
    return int(dt.value // 1_000_000)

def _fetch_batch(symbol: str, interval: str, start_ms=None, end_ms=None, limit=1000) -> pd.DataFrame:
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    if start_ms is not None: params["startTime"] = start_ms
    if end_ms   is not None: params["endTime"]   = end_ms
    r = requests.get(url, params=params, timeout=20); r.raise_for_status()
    data = r.json()
    if not data:
        return pd.DataFrame(columns=["t","open","high","low","close","volume"])
    df = pd.DataFrame(data, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","q_vol","n_trades","tb_base","tb_quote","ignore"
    ])
    df["t"] = pd.to_datetime(df["open_time"], unit="ms", utc=True).dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    df = df[["t","open","high","low","close","volume"]].astype({"open":"float64","high":"float64","low":"float64","close":"float64","volume":"float64"})
    return df

def fetch_klines_all(symbol: str, interval: str, start: Optional[str]=None, end: Optional[str]=None) -> pd.DataFrame:
    start_ms = _to_ms(start)
    end_ms   = _to_ms(end)
    step = _interval_ms(interval) * 1000  # “khoảng thời gian” bao phủ ~1000 nến
    frames = []
    cur = start_ms

    while True:
        batch_end = None
        if cur is not None and end_ms is not None:
            batch_end = min(cur + step - 1, end_ms)
        elif cur is not None:
            batch_end = cur + step - 1

        df = _fetch_batch(symbol, interval, start_ms=cur, end_ms=batch_end, limit=1000)
        if df.empty:
            break
        frames.append(df)

        # tiến con trỏ: + 1 “nến” theo interval
        last_open = pd.to_datetime(df.iloc[-1]["t"], utc=True)
        cur = int(last_open.value // 1_000_000) + _interval_ms(interval)

        # dừng khi đủ end
        if end_ms is not None and cur > end_ms:
            break

        # chặn vòng lặp bất thường
        if len(frames) > 1000:
            break

    if not frames:
        return pd.DataFrame(columns=["t","open","high","low","close","volume"])

    out = pd.concat(frames, ignore_index=True)
    out["t"] = pd.to_datetime(out["t"], utc=True, errors="coerce")
    if start_ms: out = out[out["t"] >= pd.to_datetime(start_ms, unit="ms", utc=True)]
    if end_ms:   out = out[out["t"] <= pd.to_datetime(end_ms,   unit="ms", utc=True)]
    out = out.dropna().drop_duplicates(subset=["t"]).sort_values("t").reset_index(drop=True)
    out["t"] = out["t"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    return out
    # -----------------------------
    # Test nhanh với main()
    # -----------------------------
# def main():
#     print('running fetch_klines_all')
#     df = fetch_klines_all("BTCUSDT", "1d", start="2019-01-01", end="2024-01-01")
#     print("Số nến:", len(df))
#     print(df.head())
#     print(df.tail())


# if __name__ == "__main__":
#     main()