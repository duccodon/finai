# backtest/core/metrics.py
import math
import pandas as pd
from typing import List, Dict

def max_drawdown_pct(equity: List[Dict]) -> float:
    peak = -float("inf")
    mdd = 0.0
    for p in equity:
        eq = p["eq"]
        peak = max(peak, eq)
        if peak > 0:
            dd = (eq/peak - 1.0) * 100.0
            mdd = min(mdd, dd)
    return round(mdd, 2)

def profit_factor(trades: List[Dict]) -> float:
    gross_win = sum(max(t["pnl"], 0.0) for t in trades)
    gross_loss = sum(min(t["pnl"], 0.0) for t in trades)
    if gross_loss == 0:
        return float("inf") if gross_win > 0 else 0.0
    return round(gross_win / abs(gross_loss), 2)

def buy_hold_return_pct(df: pd.DataFrame) -> float:
    if df.empty: return 0.0
    s, e = float(df.iloc[0]["close"]), float(df.iloc[-1]["close"])
    return round((e/s - 1.0) * 100.0, 2)
