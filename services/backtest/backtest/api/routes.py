# backtest/api/routes.py
from flask import Blueprint, request, jsonify
from backtest.schemas import RunRequest, CapitalCfg, BacktestCfg, StrategyCfg
from backtest.data.loader_csv import fetch_klines_all
from backtest.core.strategies.ma_cross import prepare_ma_cross
from backtest.core.engine import backtest_engine, clean_backtest_result
from backtest.core.metrics import max_drawdown_pct, profit_factor, buy_hold_return_pct

bp = Blueprint("api", __name__)

@bp.route("/api/backtest/run", methods=["POST"])
def run_backtest():
    p = request.get_json(force=True)
    # ---- parse input
    runreq = RunRequest(
        symbol=p["symbol"],
        timeframe=p["timeframe"],
        start_date=p["start_date"],
        end_date=p["end_date"],
        market_data=p.get("market_data", {"source":"csv"}),
        capital=CapitalCfg(**p["capital"]),
        backtest=BacktestCfg(**p["backtest"]),
        strategy=StrategyCfg(**p["strategy"])
    )

    # ---- load data (CSV dev)
    #df = load_csv(runreq.symbol, runreq.timeframe, runreq.start_date, runreq.end_date)
    df = fetch_klines_all(runreq.symbol, runreq.timeframe, runreq.start_date, runreq.end_date)
    print("Số nến:", len(df))
    # df: t, open, high, low, close, volume

    # ---- prepare signals
    if runreq.strategy.type == "MA_CROSS":
        sw = int(runreq.strategy.params.get("short_window", 20))
        lw = int(runreq.strategy.params.get("long_window", 50))
        df = prepare_ma_cross(df, sw, lw) #prepare data for MA_CROSS strategy
    else:
        return jsonify({"error":"strategy_not_supported"}), 400

    # ---- run engine
    result = backtest_engine(
        df=df,
        initial_capital=runreq.capital.initial,
        position_pct=runreq.capital.position_pct,
        fee_pct=runreq.capital.fee_pct,
        slippage_pct=runreq.backtest.slippage_pct,
        allow_short=runreq.backtest.allow_short,
        stop_loss_pct=runreq.backtest.stop_loss_pct,
        take_profit_pct=runreq.backtest.take_profit_pct
    )

    trades = result["trades"]
    equity = result["equity_curve"]
    final_eq = result["final_equity"]

    summary = {
        "symbol": runreq.symbol,
        "timeframe": runreq.timeframe,
        "start": df.iloc[0]["t"] if not df.empty else runreq.start_date,
        "end": df.iloc[-1]["t"] if not df.empty else runreq.end_date,
        "initial_capital": runreq.capital.initial,
        "final_equity": final_eq,
        "total_return_pct": round((final_eq / runreq.capital.initial - 1.0) * 100.0, 2),
        "buy_and_hold_return_pct": buy_hold_return_pct(df),
        "max_drawdown_pct": max_drawdown_pct(equity),
        "profit_factor": profit_factor(trades),
        "num_trades": len([t for t in trades if "exit_time" in t]),
        "win_rate_pct": round(
            (sum(1 for t in trades if t.get("pnl",0) > 0) / max(1, len([t for t in trades if "exit_time" in t])))
            * 100.0, 2
        )
    }

    return jsonify(clean_backtest_result({
        "summary": summary,
        "trades": trades,
        "equity_curve": equity
    }))
