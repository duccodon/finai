# backtest/core/strategies/rsi_threshold.py
import pandas as pd
from backtest.core.indicators import rsi
import numpy as np
def prepare_rsi_threshold(
    df: pd.DataFrame,
    period: int = 14,
    lower: float = 30.0,
    upper: float = 70.0,
) -> pd.DataFrame:
    """
    RSI cross strategy:
      - Long when RSI crosses up through `lower` (default 30).
      - Short when RSI crosses down through `upper` (default 70).
    Exits are handled by your SL/TP or by opposite signal (via `position`).

    Returns columns: ['rsi', 'signal', 'position'] + original df columns.
    """
    out = df.copy()

    # Tính RSI (yêu cầu bạn có hàm rsi(series, period) đã định nghĩa)
    out["rsi"] = rsi(out["close"], period)

    # Khởi tạo signal = 0
    sig = pd.Series(0, index=out.index, dtype="int8")

    # Cross lên qua 30: hôm qua < 30 và hôm nay >= 30 -> Long
    long_cross = (out["rsi"].shift(1) < lower) & (out["rsi"] >= lower)

    # Cross xuống qua 70: hôm qua > 70 và hôm nay <= 70 -> Short
    short_cross = (out["rsi"].shift(1) > upper) & (out["rsi"] <= upper)

    sig[long_cross] = 1
    sig[short_cross] = -1

    out["signal"] = sig

    # position: giữ trạng thái cho tới khi có tín hiệu ngược lại
    # (SL/TP bạn xử lý trong backtester, có thể override position tại thời điểm khớp SL/TP)
    pos = out["signal"].replace(0, np.nan).ffill().fillna(0).astype("int8")
    out["position"] = pos

    # Bỏ các hàng đầu tiên chưa đủ dữ liệu RSI
    out = out.dropna(subset=["rsi"]).reset_index(drop=True)
    return out