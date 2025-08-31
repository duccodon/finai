# app.py
from flask import Flask, jsonify
from .api.routes import bp as backtest_bp
from .db import get_db
from pymongo.errors import CollectionInvalid

def init_mongo(db):
    try:
        db.create_collection("backtest_runs")
    except CollectionInvalid:
        pass

    try:
        db.create_collection("backtest_trades")
    except CollectionInvalid:
        pass

    try:
        db.create_collection("backtest_equity")
    except CollectionInvalid:
        pass

    db["backtest_runs"].create_index([("user_id", 1), ("created_at", -1)])
    db["backtest_trades"].create_index([("run_id", 1), ("user_id", 1), ("seq", 1)])
    db["backtest_trades"].create_index([("run_id", 1), ("user_id", 1)])  # cho count_documents
    db["backtest_equity"].create_index([("run_id", 1), ("user_id", 1), ("t", 1)])
    print("Indexes created ✅")



def create_app():
    app = Flask(__name__)
    app.register_blueprint(backtest_bp)
    app.url_map.strict_slashes = False 
    # health check
    @app.route("/ping")
    def ping():
        db = get_db()
        db.command("ping")  # test connection
        return jsonify({"ok": True})

    @app.route("/test_insert")
    def test_insert():
        db = get_db()
        result = db["backtests"].insert_one({"msg": "hello mongo"})
        return jsonify({"inserted_id": str(result.inserted_id)})
    db = get_db()

    # Gọi init ngay lúc khởi động (an toàn khi chạy nhiều lần)
    init_mongo(db)

    return app

app = create_app()


if __name__ == "__main__":
    # đổi port nếu 5000 bị chiếm
    app.run(debug=True, host="0.0.0.0", port=5000)
