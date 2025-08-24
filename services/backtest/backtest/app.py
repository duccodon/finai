# app.py
from flask import Flask, jsonify
from .api.routes import bp as backtest_bp
from .db import get_db
def create_app():
    app = Flask(__name__)
    app.register_blueprint(backtest_bp)
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

    return app

app = create_app()


if __name__ == "__main__":
    # đổi port nếu 5000 bị chiếm
    app.run(debug=True, host="0.0.0.0", port=5000)
