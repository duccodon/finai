# backtest/core/engine.py
import pandas as pd
from typing import Dict, List, Optional
from datetime import timedelta
import math

def _fmt_duration(start_iso: str, end_iso: str) -> str:
    s = pd.to_datetime(start_iso); e = pd.to_datetime(end_iso)
    d = e - s
    days = d.days
    hhmm = str(timedelta(seconds=d.seconds))[:-3]
    return f"{days}d {hhmm}" if days > 0 else hhmm

def clean_backtest_result(result):
    # Xử lý NaN/inf trong summary (nếu có)
    for k, v in result["summary"].items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            result["summary"][k] = "inf" if math.isinf(v) else None

    # Downsample equity_curve nếu quá dài
    eq = result.get("equity_curve", [])
    if len(eq) > 500:
        step = math.ceil(len(eq) / 500)
        eq_ds = eq[::step]
        if eq_ds and eq and eq_ds[-1] != eq[-1]:
            eq_ds.append(eq[-1])
        result["equity_curve"] = eq_ds
    return result


def backtest_engine(df: pd.DataFrame,
                    initial_capital: float,
                    position_pct: float,
                    fee_pct: float,
                    slippage_pct: float,
                    allow_short: bool,
                    stop_loss_pct: Optional[float],
                    take_profit_pct: Optional[float]) -> Dict:

    cash = float(initial_capital)
    qty = 0.0
    entry_price: Optional[float] = None
    entry_time: Optional[str] = None
    trades: List[Dict] = []
    equity_curve: List[Dict] = []
    trade_id = 0

    def apply_fee(price, q): return float(price) * abs(float(q)) * float(fee_pct)

    # pending flags cho OPEN bar kế tiếp
    pending_enter: Optional[int] = None   # 1 = LONG, -1 = SHORT
    pending_exit: bool = False            # True = thoát vị thế ở open kế

    df = df.reset_index(drop=True)
    n = len(df)

    for i in range(n):
        t = df.at[i, "t"]
        o = float(df.at[i, "open"])
        h = float(df.at[i, "high"])
        l = float(df.at[i, "low"])
        c = float(df.at[i, "close"])
        sig = int(df.at[i, "signal"]) if "signal" in df.columns else 0
        enter_after_exit = pending_exit
        # (1) THỰC THI pending EXIT rồi mới ENTER tại OPEN hiện tại
        if qty != 0.0 and pending_exit:
            fill_px = o * (1 - slippage_pct) if qty > 0 else o * (1 + slippage_pct)
            fee_out = apply_fee(fill_px, qty)
            cash += fill_px * qty - fee_out
            # PnL: KHÔNG trừ lại entry fee (đã trừ khi mở)
            pnl = (fill_px - entry_price) * qty - fee_out
            trades[-1].update({
                "exit_time": t, "exit_price": float(fill_px),
                "pnl": round(float(pnl), 4),
                "return_pct": round(float(pnl) / (entry_price * abs(qty)) * 100.0, 4),
                "duration": _fmt_duration(entry_time, t),
                "reason": "SignalChange"
            })
            qty = 0.0
            entry_price = None
            entry_time = None
            pending_exit = False

        if pending_enter is not None and qty == 0.0:
            if pending_enter == 1:
                # VÀO LONG tại OPEN hiện tại
                fill_px = o * (1 + slippage_pct)
                cash_to_use = cash * position_pct
                if cash_to_use > 0:
                    new_qty = cash_to_use / fill_px
                    fee_in = apply_fee(fill_px, new_qty)
                    cash -= fill_px * new_qty + fee_in
                    qty = new_qty
                    entry_price = fill_px
                    entry_time = t
                    trade_id += 1
                    trades.append({
                        "id": trade_id, "side": "LONG",
                        "size": float(abs(qty)),
                        "entry_time": t, "entry_price": float(entry_price),
                        "reason": "SignalEnter"
                    })
                    # if enter_after_exit:
                    #     print("Pending enter:", "Long" if pending_enter == 1 else "Short")
                    #     print("Trade info:", trades[-1], "\n")

            elif pending_enter == -1 and allow_short:
                # VÀO SHORT tại OPEN hiện tại
                fill_px = o * (1 - slippage_pct)
                cash_to_use = cash * position_pct
                if cash_to_use > 0:
                    new_qty = -(cash_to_use / fill_px)
                    fee_in = apply_fee(fill_px, new_qty)
                    cash += fill_px * abs(new_qty) - fee_in
                    qty = new_qty
                    entry_price = fill_px
                    entry_time = t
                    trade_id += 1
                    trades.append({
                        "id": trade_id, "side": "SHORT",
                        "size": float(abs(qty)),
                        "entry_time": t, "entry_price": float(entry_price),
                        "reason": "SignalEnter"
                    })
                    # if enter_after_exit:
                    #     print("Pending enter:", "Long" if pending_enter == 1 else "Short")
                    #     print("Trade info:", trades[-1], "\n")
            # clear sau khi thực thi
            enter_after_exit = False
            pending_enter = None

        # (2) SL/TP intrabar (ưu tiên SL nếu cùng chạm)
        if qty != 0.0 and (stop_loss_pct is not None or take_profit_pct is not None):
            if qty > 0:  # LONG
                tp_hit = (take_profit_pct is not None) and (h >= entry_price * (1 + take_profit_pct))
                sl_hit = (stop_loss_pct  is not None) and (l <= entry_price * (1 - stop_loss_pct))
                exit_px = None; reason = None
                if sl_hit:
                    exit_px = entry_price * (1 - stop_loss_pct); reason = "StopLoss"
                elif tp_hit:
                    exit_px = entry_price * (1 + take_profit_pct); reason = "TakeProfit"
                if exit_px is not None:
                    exit_px *= (1 - slippage_pct)
                    fee_out = apply_fee(exit_px, qty)
                    cash += exit_px * qty - fee_out
                    pnl = (exit_px - entry_price) * qty - fee_out
                    trades[-1].update({
                        "exit_time": t, "exit_price": float(exit_px),
                        "pnl": round(float(pnl), 4),
                        "return_pct": round(float(pnl) / (entry_price * abs(qty)) * 100.0, 4),
                        "duration": _fmt_duration(entry_time, t),
                        "reason": reason
                    })
                    qty = 0.0; entry_price = None; entry_time = None
                    equity_curve.append({"t": t, "eq": float(cash)})
                    continue
            else:  # SHORT
                tp_hit = (take_profit_pct is not None) and (l <= entry_price * (1 - take_profit_pct))
                sl_hit = (stop_loss_pct  is not None) and (h >= entry_price * (1 + stop_loss_pct))
                exit_px = None; reason = None
                if sl_hit:
                    exit_px = entry_price * (1 + stop_loss_pct); reason = "StopLoss"
                elif tp_hit:
                    exit_px = entry_price * (1 - take_profit_pct); reason = "TakeProfit"
                if exit_px is not None:
                    exit_px *= (1 + slippage_pct)
                    fee_out = apply_fee(exit_px, qty)
                    cash += exit_px * qty - fee_out
                    pnl = (exit_px - entry_price) * qty - fee_out
                    trades[-1].update({
                        "exit_time": t, "exit_price": float(exit_px),
                        "pnl": round(float(pnl), 4),
                        "return_pct": round(float(pnl) / (entry_price * abs(qty)) * 100.0, 4),
                        "duration": _fmt_duration(entry_time, t),
                        "reason": reason
                    })
                    qty = 0.0; entry_price = None; entry_time = None
                    equity_curve.append({"t": t, "eq": float(cash)})
                    continue

        # (3) XỬ LÝ SIGNAL (strict theo signal, KHÔNG exit ngay bar hiện tại)
        # - Nếu đang có vị thế và signal đổi (hoặc =0): đặt pending_exit=True
        #   và pending_enter theo signal (nếu hợp lệ) cho OPEN bar kế.
        # - Nếu đang FLAT và signal ≠ 0: đặt pending_enter cho OPEN bar kế.
        if qty > 0:  # đang LONG
            if sig == -1:
                pending_exit = True
                pending_enter = sig if allow_short else None
        elif qty < 0:  # đang SHORT
            if sig == 1:
                pending_exit = True
                pending_enter = sig 
        else:  # FLAT
            if sig != 0 and (sig == 1 or (sig == -1 and allow_short)):
                pending_enter = sig if (sig == 1 or (sig == -1 and allow_short)) else None

        # (4) Mark-to-market cuối bar
        equity_curve.append({"t": t, "eq": float(cash + qty * c)})

    # (5) Đóng cuối kỳ nếu còn vị thế
    if qty != 0.0:
        last = df.iloc[-1]; t = last["t"]; c = float(last["close"])
        fill_px = c * (1 - slippage_pct) if qty > 0 else c * (1 + slippage_pct)
        fee_out = apply_fee(fill_px, qty)
        cash += fill_px * qty - fee_out
        pnl = (fill_px - entry_price) * qty - fee_out
        trades[-1].update({
            "exit_time": t, "exit_price": float(fill_px),
            "pnl": round(float(pnl), 4),
            "return_pct": round(float(pnl) / (entry_price * abs(qty)) * 100.0, 4),
            "duration": _fmt_duration(entry_time, t),
            "reason": "End"
        })
        qty = 0.0; entry_price = None; entry_time = None
        equity_curve.append({"t": t, "eq": float(cash)})

    return {"final_equity": float(cash), "trades": trades, "equity_curve": equity_curve}
