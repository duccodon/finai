# backtest/core/indicators.py
import pandas as pd

def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window).mean()
def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()

def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    s = pd.to_numeric(series, errors="coerce")
    delta = s.diff()

    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    # Wilder’s smoothing (phổ biến)
    avg_gain = gain.ewm(alpha=1/period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False, min_periods=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    # JSON-safe & logic đúng:
    rsi = rsi.where(avg_loss != 0, 100.0)             # chỉ tăng, không giảm → 100
    rsi = rsi.where(avg_gain != 0, 0.0)               # chỉ giảm, không tăng → 0
    rsi = rsi.mask((avg_gain == 0) & (avg_loss == 0), 50.0)  # đi ngang tuyệt đối → 50

    return rsi.astype(float)



def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal_period: int = 9):
    assert fast > 0 and slow > 0 and signal_period > 0
    assert fast < slow, "MACD expects fast < slow"
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal_period)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist
