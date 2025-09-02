# backtest/api/routes.py
from flask import Blueprint, request, jsonify
from backtest.schemas import RunRequest, CapitalCfg, BacktestCfg, StrategyCfg
from backtest.data.loader_csv import fetch_klines_all
from backtest.core.strategies.ma_cross import prepare_ma_cross
from backtest.core.strategies.rsi_threshold import prepare_rsi_threshold
from backtest.core.strategies.macd import prepare_macd
from backtest.core.engine import backtest_engine, clean_backtest_result
from backtest.core.metrics import max_drawdown_pct, profit_factor, buy_hold_return_pct, win_rate_pct
from ..db import get_db
from bson import ObjectId
from datetime import datetime

bp = Blueprint("backtest", __name__, url_prefix="/api/backtest")
STRATEGY_MAP = {
    "MA_CROSS": lambda df, params: prepare_ma_cross(
        df,
        int(params.get("short_window", 20)),
        int(params.get("long_window", 50))
    ),
    "RSI_THRESHOLD": lambda df, params: prepare_rsi_threshold(df, **params),
    "MACD": lambda df, params: prepare_macd(df, **params),

}

def _get_user_id():
    uid = request.headers.get("X-User-Id")
    if not uid:
        # 401 thay vì 400 cho thiếu xác thực
        return None
    return uid
    
@bp.route("/run", methods=["POST"])
def run_backtest():
    p = request.get_json(force=True)
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401
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

    #df = load_csv(runreq.symbol, runreq.timeframe, runreq.start_date, runreq.end_date)
    df = fetch_klines_all(runreq.symbol, runreq.timeframe, runreq.start_date, runreq.end_date)

    # ---- prepare signals
    strategy_type = runreq.strategy.type
    if strategy_type not in STRATEGY_MAP:
        return jsonify({"error": "strategy_not_supported"}), 400

    # ---- data with signals
    df = STRATEGY_MAP[strategy_type](df, runreq.strategy.params)

    result = backtest_engine(
        df=df,
        initial_capital=runreq.capital.initial,
        position_pct=runreq.capital.position_pct,
        fee_pct=runreq.capital.fee_pct,
        slippage_pct=runreq.backtest.slippage_pct,
        allow_short=runreq.backtest.allow_short,
        stop_loss_pct=runreq.backtest.stop_loss_pct or 9999.0,
        take_profit_pct=runreq.backtest.take_profit_pct or 9999.0,
    )
    trades = result["trades"]
    equity = result["equity_curve"]
    final_eq = result["final_equity"]

    summary = {
        "strategy": runreq.strategy.type,
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
        "win_rate_pct": win_rate_pct(trades),
    }
            # ---------- LƯU VÀO MONGO ----------
    run_oid = ObjectId()
    run_id = f"bt_{run_oid}"  # string tiện cho FE
    db = get_db()
    db["backtest_runs"].insert_one({
        "user_id": user_id,
        "_id": run_oid,
        "run_id": run_id,
        "created_at": datetime.utcnow(),
        "params": p,         # lưu nguyên params FE gửi lên
        "summary": summary,  # lưu summary đã tính
    })

    print('trades:', trades)
    if trades:
        db["backtest_trades"].insert_many(
            [{ "run_id": run_id, "user_id": user_id, **t } for t in trades]
        )

    if equity:
        db["backtest_equity"].insert_many(
            [{ "run_id": run_id, "user_id": user_id, **pt } for pt in equity]
        )

    # ---------- TRẢ VỀ JSON ----------
    payload = clean_backtest_result({
        "run_id": run_id,
        "summary": summary,
        "trades": trades,
        "equity_curve": equity,
    })
    return jsonify(payload), 201


@bp.get("/")
def list_backtests():
    db = get_db()
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    docs = db["backtest_runs"].find({"user_id": user_id}, {"summary": 1, "run_id": 1, "created_at": 1}).sort("created_at", -1)
    return jsonify([
        {
            "run_id": d["run_id"],
            "created_at": d["created_at"].isoformat(),
            **d["summary"],
        } for d in docs
    ])

@bp.get("/<run_id>/detail")
def get_run_detail(run_id):
    db = get_db()
    user_id = _get_user_id()
    run = db["backtest_runs"].find_one({"run_id": run_id, "user_id": user_id}, {"_id": 0})
    if not run:
        return jsonify({"error": "not_found"}), 404
    return jsonify(run)  # { run_id, created_at, summary, params, ...}

@bp.get("/<run_id>/trades")
def get_trades(run_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401
    db = get_db()
    page = int(request.args.get("page", 1))
    size = int(request.args.get("size", 10))
    skip = (page - 1) * size

    q = {"run_id": run_id, "user_id": user_id}

    cursor = (db["backtest_trades"]
              .find(q, {"_id": 0})
              .sort("seq", 1)
              .skip(skip)
              .limit(size))
    items = list(cursor)
    total = db["backtest_trades"].count_documents(q)

    return jsonify({
        "items": items,
        "page": page,
        "size": size,
        "total": total,
        "has_more": page * size < total
    })


@bp.get("/<run_id>/equity")
def get_equity(run_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401

    db = get_db()
    # optional range:
    frm = request.args.get("from")  # ISO
    to  = request.args.get("to")    # ISO
    q = {"run_id": run_id, "user_id": user_id}
    if frm or to:
        rng = {}
        if frm: rng["$gte"] = frm
        if to:  rng["$lte"] = to
        q["t"] = rng

    pts = list(db["backtest_equity"]
               .find(q, {"_id": 0, "run_id": 0, "user_id": 0})
               .sort("t", 1))
    return jsonify(pts)

@bp.route("/debug", methods=["GET", "POST"])
def debug():
    return jsonify({"msg": "debug ok"})