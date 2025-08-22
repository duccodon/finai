# backtest/schemas.py
from typing import Literal, Dict, Any, List, Optional
from dataclasses import dataclass

# ---- Input ----
@dataclass
class StrategyCfg:
    type: Literal["MA_CROSS", "RSI_THRESHOLD", "BREAKOUT"]
    params: Dict[str, Any]

@dataclass
class CapitalCfg:
    initial: float
    position_pct: float
    leverage: float = 1.0
    fee_pct: float = 0.001  # 0.1% mỗi side

@dataclass
class BacktestCfg:
    allow_short: bool = False
    order_type: Literal["market"] = "market"
    slippage_pct: float = 0.0
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None

@dataclass
class RunRequest:
    symbol: str
    timeframe: str
    start_date: str
    end_date: str
    market_data: Dict[str, Any]  # {"source":"csv"} hoặc {"source":"binance"}
    capital: CapitalCfg
    backtest: BacktestCfg
    strategy: StrategyCfg

# ---- Output ----
@dataclass
class Trade:
    id: int
    side: Literal["LONG", "SHORT"]
    size: float
    entry_time: str
    entry_price: float
    exit_time: str
    exit_price: float
    pnl: float
    return_pct: float
    duration: str
    reason: Literal["Signal","StopLoss","TakeProfit"]

@dataclass
class Summary:
    symbol: str
    timeframe: str
    start: str
    end: str
    initial_capital: float
    final_equity: float
    total_return_pct: float
    buy_and_hold_return_pct: float
    max_drawdown_pct: float
    profit_factor: float
    num_trades: int
    win_rate_pct: float
