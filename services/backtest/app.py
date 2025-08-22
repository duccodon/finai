# app.py
from flask import Flask
from backtest.api.routes import bp as backtest_bp

def create_app():
    app = Flask(__name__)
    app.register_blueprint(backtest_bp)  # rất quan trọng!
    return app

app = create_app()

if __name__ == "__main__":
    # đổi port nếu 5000 bị chiếm
    app.run(debug=True, host="0.0.0.0", port=5001)
