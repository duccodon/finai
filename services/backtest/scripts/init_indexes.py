from ..db import get_db


if __name__ == "__main__":
    db = get_db()
    db["backtest_runs"].create_index([("symbol", 1), ("timeframe", 1), ("created_at", -1)])
    db["backtest_trades"].create_index([("run_id", 1), ("id", 1)])
    db["backtest_equity"].create_index([("run_id", 1), ("t", 1)])
    print("Indexes created ✅")
    # test insert
