import math
from typing import List, Dict, Optional
import pandas as pd

def _round2_safe(x: float) -> Optional[float]:
    """Round 2 decimals, return None if not finite."""
    return round(x, 2) if isinstance(x, (int, float)) and math.isfinite(x) else None

def win_rate_pct(trades: List[Dict], *, count_breakeven_in_denom: bool = True, win_threshold: float = 0.0) -> Optional[float]:
    """
    Engine đã đảm bảo mọi lệnh đều đóng.
    Trả None nếu không có trade hoặc dữ liệu pnl không hợp lệ hoàn toàn.
    """
    if not trades:
        return None

    wins = 0
    denom = 0

    for t in trades:
        pnl_raw = t.get("pnl", 0.0)
        try:
            pnl = float(pnl_raw)
        except Exception:
            continue
        if not math.isfinite(pnl):
            continue

        # mẫu số
        if count_breakeven_in_denom:
            denom += 1
        else:
            if pnl != 0.0:
                denom += 1

        # lệnh thắng
        if pnl > win_threshold:
            wins += 1

    if denom == 0:
        return None

    return round((wins / denom) * 100.0, 2)

def max_drawdown_pct(equity: List[Dict]) -> Optional[float]:
    """
    Trả % drawdown âm (VD: -12.34). Nếu không đủ dữ liệu/peak <= 0 → 0.0.
    """
    if not equity:
        return 0.0

    peak = -math.inf
    mdd = 0.0  # mdd là số âm hoặc 0
    for p in equity:
        eq = float(p.get("eq", 0.0))
        if not math.isfinite(eq):
            continue
        peak = max(peak, eq)
        if peak > 0:
            dd = (eq / peak - 1.0) * 100.0
            if math.isfinite(dd):
                mdd = min(mdd, dd)

    if peak <= 0:
        return 0.0  # không có mốc đỉnh > 0 → xem như không có drawdown hữu ích
    return _round2_safe(mdd) or 0.0  # mdd luôn hữu hạn ở đây, nhưng phòng vệ

def profit_factor(trades: List[Dict]) -> Optional[float]:
    """
    PF = gross_win / |gross_loss|.
    - Nếu không có lệnh thua (gross_loss ~ 0) và có lệnh thắng → PF = ∞ → trả None (để JSON-safe), FE hiển thị '∞'.
    - Nếu không có thắng lẫn thua (gross_win=0, gross_loss=0) → PF = 0.0.
    """
    gross_win = 0.0
    gross_loss = 0.0
    for t in trades:
        pnl = float(t.get("pnl", 0.0))
        if not math.isfinite(pnl):
            continue
        if pnl >= 0:
            gross_win += pnl
        else:
            gross_loss += pnl  # âm

    if abs(gross_loss) < 1e-12:
        return None if gross_win > 0 else 0.0  # ∞ → None; 0/0 → 0.0

    pf = gross_win / abs(gross_loss)
    return _round2_safe(pf)

def buy_hold_return_pct(df: pd.DataFrame) -> Optional[float]:
    """
    % return mua-giữ: ((end/start) - 1) * 100.
    - df rỗng → 0.0
    - start <= 0 → None (không hợp lệ)
    """
    if df is None or df.empty:
        return 0.0
    try:
        s = float(df.iloc[0]["close"])
        e = float(df.iloc[-1]["close"])
        if not math.isfinite(s) or not math.isfinite(e) or s <= 0:
            return None
        ret = (e / s - 1.0) * 100.0
        return _round2_safe(ret)
    except Exception:
        return None
