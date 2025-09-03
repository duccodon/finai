# backtest/api/predict.py
from flask import Blueprint, request, jsonify
import numpy as np
import pandas as pd
from datetime import timedelta
import torch

# ==== dùng lại helpers/model từ LSTM.py ====
# Lưu ý: sửa đường dẫn import cho khớp cấu trúc dự án của bạn
from ..LTSM import (
    horizon_for_interval, fetch_klines_all,           # data loader
    has_saved_model, load_model, save_model_and_scaler,
    LSTMPredictor, make_sequences_multi,              # kiến trúc + seq
    MinMaxScaler, SEQ_LEN, EPOCHS, BATCH, LR, DEVICE  # siêu tham số mặc định
)

bp = Blueprint("predict", __name__, url_prefix="/api/predict")

def _interval_ms(interval: str) -> int:
    unit = interval[-1].lower(); val = int(interval[:-1])
    mult = {"m":60_000, "h":3_600_000, "d":86_400_000}[unit]
    return val * mult

def _future_timestamps(last_ts: pd.Timestamp, interval: str, H: int):
    # last_ts là UTC Timestamp (cuối chuỗi huấn luyện)
    step = _interval_ms(interval) // 1000  # giây
    out = []
    cur = last_ts
    for i in range(1, H+1):
        cur = cur + timedelta(seconds=step)
        out.append(cur.strftime("%Y-%m-%dT%H:%M:%SZ"))
    return out

@bp.route("/run", methods=["POST"])
def run_predict():
    """
    Body JSON:
    {
      "symbol": "BTCUSDT",
      "interval": "1h",              // 15m | 1h | 4h | 1d ...
      "seq_len": 100,                // optional, default SEQ_LEN
      "force_train": false,          // optional
      "start": "2019-01-01T00:00:00Z", // optional để giới hạn dữ liệu train
      "end":   null                  // optional
    }
    """
    p = request.get_json(force=True)
    symbol   = p.get("symbol", "BTCUSDT").upper()
    interval = p.get("interval", "1h")
    seq_len  = int(p.get("seq_len", SEQ_LEN))
    force    = bool(p.get("force_train", False))
    start    = p.get("start")  # ISO Z or None
    end      = p.get("end")    # ISO Z or None

    # 1) Xác định chân trời dự đoán theo timeframe
    H = horizon_for_interval(interval)   # ví dụ: 15m→3, 1h→3, 1d→5

    # 2) Lấy dữ liệu đóng giá
    df = fetch_klines_all(symbol, interval, start, end)
    if df is None or df.empty:
        return jsonify({"error": "no_data"}), 400

    close_vals = df[["close"]].values.astype(float)

    # 3) Load model nếu có & không ép train; ngược lại train nhanh
    if has_saved_model(symbol, interval, seq_len, H) and not force:
        model, scaler = load_model(symbol, interval, seq_len, H)
        scaled = scaler.transform(close_vals)
    else:
        # Train ngắn gọn (dựa trên LTSM.py)
        scaler = MinMaxScaler(feature_range=(0,1))
        scaled = scaler.fit_transform(close_vals)

        X, y = make_sequences_multi(scaled, seq_len, H)   # y shape: (M, H)
        if len(X) < 10:
            return jsonify({"error": "not_enough_samples"}), 400

        # train/val split
        train_len = int(len(X) * 0.8)
        X_train, y_train = X[:train_len], y[:train_len]
        X_val,   y_val   = X[train_len:], y[train_len:]

        X_train_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(-1)  # (B, T, 1)
        y_train_t = torch.tensor(y_train, dtype=torch.float32)                # (B, H)
        X_val_t   = torch.tensor(X_val,   dtype=torch.float32).unsqueeze(-1)
        y_val_t   = torch.tensor(y_val,   dtype=torch.float32)

        model = LSTMPredictor(output_size=H).to(DEVICE)
        crit  = torch.nn.MSELoss()
        opt   = torch.optim.Adam(model.parameters(), lr=LR)

        # quick training theo EPOCHS mặc định trong LTSM.py
        train_ds = torch.utils.data.TensorDataset(X_train_t, y_train_t)
        val_ds   = torch.utils.data.TensorDataset(X_val_t,   y_val_t)
        train_loader = torch.utils.data.DataLoader(train_ds, batch_size=BATCH, shuffle=True)
        val_loader   = torch.utils.data.DataLoader(val_ds,   batch_size=BATCH, shuffle=False)

        for _ in range(EPOCHS):
            model.train()
            for xb, yb in train_loader:
                xb, yb = xb.to(DEVICE), yb.to(DEVICE)
                opt.zero_grad()
                loss = crit(model(xb), yb)
                loss.backward()
                opt.step()

        # lưu lại cho lần sau
        save_model_and_scaler(model, scaler, symbol, interval, seq_len, H)

    # 4) Suy luận H điểm tương lai (multi-step direct)
    scaled_full = scaler.transform(close_vals)
    last_seq = scaled_full[-seq_len:].reshape(1, seq_len, 1)
    with torch.no_grad():
        next_scaled_vec = model(torch.tensor(last_seq, dtype=torch.float32, device=DEVICE)).cpu().numpy()  # (1, H)
    next_closes = scaler.inverse_transform(next_scaled_vec.reshape(-1, 1)).reshape(-1)  # (H,)
    last_close = float(close_vals[-1, 0])

    # 5) Chuẩn response
    last_ts = pd.to_datetime(df.iloc[-1]["t"], utc=True)
    future_ts = _future_timestamps(last_ts, interval, H)

    items = []
    for i in range(H):
        pred = float(next_closes[i])
        delta = pred - last_close
        direction = "UP" if delta > 0 else ("DOWN" if delta < 0 else "FLAT")
        items.append({
            "step": i + 1,
            "t": future_ts[i],
            "pred_close": round(pred, 6),
            "delta": round(delta, 6),
            "direction": direction
        })

    payload = {
        "symbol": symbol,
        "interval": interval,
        "horizon": H,
        "last": {
            "t": df.iloc[-1]["t"],
            "close": last_close
        },
        "predictions": items
    }
    return jsonify(payload), 200
