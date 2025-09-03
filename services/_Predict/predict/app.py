from flask import Flask
from  .api.predict import bp as predict_bp

app = Flask(__name__)
app.register_blueprint(predict_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000, debug=True)
