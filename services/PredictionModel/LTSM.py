# === LSTM next-candle prediction from Binance (PyTorch) — load-if-exists else train ===
import os, math, pickle, requests, numpy as np, pandas as pd, matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
import torch, torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# ------------ Global Config ------------
SYMBOL     = "BTCUSDT"
INTERVALS  = ["15m","1h", "4h", "1d"]   # train/load theo các timeframe này
START      = "2025-01-01T00:00:00Z"
END        = None
SEQ_LEN    = 60
EPOCHS     = 10
BATCH      = 64
LR         = 1e-3
DEVICE     = "cuda" if torch.cuda.is_available() else "cpu"
MODELS_DIR = "./models"
FORCE_TRAIN = True   # True để ép train lại dù đã có model

os.makedirs(MODELS_DIR, exist_ok=True)

# ------------ Binance fetch ------------
def _interval_ms(interval: str) -> int:
    unit = interval[-1].lower(); val = int(interval[:-1])
    mult = {"m":60_000, "h":3_600_000, "d":86_400_000}[unit]
    return val * mult

def _to_ms(ts: str):
    if not ts: return None
    dt = pd.to_datetime(ts, utc=True, errors="coerce")
    if pd.isna(dt): return None
    return int(dt.value // 1_000_000)

def _fetch_batch(symbol, interval, start_ms=None, end_ms=None, limit=1000):
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    if start_ms is not None: params["startTime"] = start_ms
    if end_ms   is not None: params["endTime"]   = end_ms
    r = requests.get(url, params=params, timeout=20); r.raise_for_status()
    data = r.json()
    if not data:
        return pd.DataFrame(columns=["t","open","high","low","close","volume"])
    df = pd.DataFrame(data, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","q_vol","n_trades","tb_base","tb_quote","ignore"
    ])
    df["t"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df = df[["t","open","high","low","close","volume"]].astype(float, errors="ignore")
    df["t"] = df["t"].dt.tz_convert("UTC")
    return df

def fetch_klines_all(symbol: str, interval: str, start: str=None, end: str=None):
    start_ms = _to_ms(start)
    end_ms   = _to_ms(end)
    step = _interval_ms(interval) * 1000
    frames, cur = [], start_ms
    while True:
        batch_end = None
        if cur is not None and end_ms is not None:
            batch_end = min(cur + step - 1, end_ms)
        elif cur is not None:
            batch_end = cur + step - 1
        df = _fetch_batch(symbol, interval, start_ms=cur, end_ms=batch_end, limit=1000)
        if df.empty: break
        frames.append(df)
        last_open = df.iloc[-1]["t"]
        cur = int(last_open.value // 1_000_000) + _interval_ms(interval)
        if end_ms is not None and cur > end_ms: break
        if len(frames) > 2000: break
    if not frames:
        return pd.DataFrame(columns=["t","open","high","low","close","volume"])
    out = pd.concat(frames, ignore_index=True).dropna()
    if start_ms: out = out[out["t"] >= pd.to_datetime(start_ms, unit="ms", utc=True)]
    if end_ms:   out = out[out["t"] <= pd.to_datetime(end_ms,   unit="ms", utc=True)]
    out = out.drop_duplicates(subset=["t"]).sort_values("t").reset_index(drop=True)
    return out

# ------------ Data utils ------------
def make_sequences(series, seq_len):
    X, y = [], []
    for i in range(seq_len, len(series)):
        X.append(series[i-seq_len:i, 0])
        y.append(series[i, 0])
    return np.array(X), np.array(y)

# ------------ Model ------------
class LSTMPredictor(nn.Module):
    def __init__(self, input_size=1, hidden=64, num_layers=2, dropout=0.1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden, num_layers=num_layers, batch_first=True, dropout=dropout)
        self.fc   = nn.Linear(hidden, 1)
    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        out = self.fc(out)
        return out

# ------------ Save/Load helpers ------------
def model_paths(symbol: str, interval: str, seq_len: int):
    base = f"LSTM_{symbol}_{interval}_seq{seq_len}"
    return (
        os.path.join(MODELS_DIR, base + ".pt"),
        os.path.join(MODELS_DIR, base + ".h5"),
        os.path.join(MODELS_DIR, base + "_scaler.pkl"),
    )

def save_model_and_scaler(model: nn.Module, scaler: MinMaxScaler, symbol: str, interval: str, seq_len: int):
    path_pt, path_h5, path_scl = model_paths(symbol, interval, seq_len)
    # PyTorch checkpoint
    torch.save({"state_dict": model.state_dict(),
                "arch": {"input_size": 1, "hidden": 64, "num_layers": 2, "dropout": 0.1}},
               path_pt)
    # Scaler
    with open(path_scl, "wb") as f:
        pickle.dump(scaler, f)
    # HDF5 (tùy chọn)
    try:
        import h5py
        sd = model.state_dict()
        with h5py.File(path_h5, "w") as h5f:
            grp = h5f.create_group("state_dict")
            for k, v in sd.items():
                grp.create_dataset(k, data=v.detach().cpu().numpy())
            meta = h5f.create_group("meta")
            meta.attrs["symbol"] = symbol
            meta.attrs["interval"] = interval
            meta.attrs["seq_len"] = seq_len
            meta.attrs["framework"] = "pytorch"
    except Exception as e:
        print(f"[WARN] Không ghi được .h5 (cài đặt h5py?): {e}")
    print(f"Saved: {path_pt}")
    print(f"Saved: {path_scl}")
    if os.path.exists(path_h5):
        print(f"Saved: {path_h5}")

def load_model(symbol: str, interval: str, seq_len: int):
    path_pt, _, path_scl = model_paths(symbol, interval, seq_len)
    # scaler
    with open(path_scl, "rb") as f:
        scaler = pickle.load(f)
    # model
    checkpoint = torch.load(path_pt, map_location=DEVICE)
    arch = checkpoint.get("arch", {"input_size": 1, "hidden": 64, "num_layers": 2, "dropout": 0.1})
    model = LSTMPredictor(**arch).to(DEVICE)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return model, scaler

def has_saved_model(symbol: str, interval: str, seq_len: int) -> bool:
    path_pt, _, path_scl = model_paths(symbol, interval, seq_len)
    return os.path.exists(path_pt) and os.path.exists(path_scl)

# ------------ Train or Load per timeframe ------------
def train_or_load(interval: str):
    print(f"\n=== {SYMBOL} {interval} ===")
    # 1) Load dữ liệu
    df = fetch_klines_all(SYMBOL, interval, START, END)
    assert not df.empty, f"Không có dữ liệu cho {SYMBOL} {interval}"
    close_vals = df[["close"]].values.astype(float)

    # 2) Nếu có model + không ép train → load
    if has_saved_model(SYMBOL, interval, SEQ_LEN) and not FORCE_TRAIN:
        print("[INFO] Tìm thấy model đã lưu. Đang load…")
        model, scaler = load_model(SYMBOL, interval, SEQ_LEN)
        scaled = scaler.transform(close_vals)
    else:
        print("[INFO] Chưa có model hoặc FORCE_TRAIN=True → bắt đầu huấn luyện…")
        scaler = MinMaxScaler(feature_range=(0,1))
        scaled = scaler.fit_transform(close_vals)

        X, y = make_sequences(scaled, SEQ_LEN)
        train_len = int(len(X) * 0.8)
        X_train, y_train = X[:train_len], y[:train_len]
        X_val,   y_val   = X[train_len:], y[train_len:]

        X_train_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(-1)
        y_train_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(-1)
        X_val_t   = torch.tensor(X_val,   dtype=torch.float32).unsqueeze(-1)
        y_val_t   = torch.tensor(y_val,   dtype=torch.float32).unsqueeze(-1)

        train_loader = DataLoader(TensorDataset(X_train_t, y_train_t), batch_size=BATCH, shuffle=True)
        val_loader   = DataLoader(TensorDataset(X_val_t,   y_val_t),   batch_size=BATCH, shuffle=False)

        model = LSTMPredictor().to(DEVICE)
        crit  = nn.MSELoss()
        opt   = torch.optim.Adam(model.parameters(), lr=LR)

        for ep in range(1, EPOCHS+1):
            model.train()
            tr_loss = 0.0
            for xb, yb in train_loader:
                xb, yb = xb.to(DEVICE), yb.to(DEVICE)
                opt.zero_grad()
                pred = model(xb)
                loss = crit(pred, yb)
                loss.backward()
                opt.step()
                tr_loss += loss.item() * xb.size(0)
            tr_loss /= len(train_loader.dataset)

            model.eval()
            vl_loss = 0.0
            with torch.no_grad():
                for xb, yb in val_loader:
                    xb, yb = xb.to(DEVICE), yb.to(DEVICE)
                    pred = model(xb)
                    loss = crit(pred, yb)
                    vl_loss += loss.item() * xb.size(0)
            vl_loss /= max(1, len(val_loader.dataset))
            print(f"[{interval}] Epoch {ep:3d}/{EPOCHS}  train_loss={tr_loss:.6f}  val_loss={vl_loss:.6f}")

        # Lưu model + scaler để lần sau load
        save_model_and_scaler(model, scaler, SYMBOL, interval, SEQ_LEN)

    # 3) Dự đoán nến kế tiếp (demo)
    last_seq = scaled[-SEQ_LEN:].reshape(1, SEQ_LEN, 1)
    with torch.no_grad():
        next_scaled = model(torch.tensor(last_seq, dtype=torch.float32, device=DEVICE)).cpu().numpy()
    next_close = scaler.inverse_transform(next_scaled)[0,0]
    last_close = float(close_vals[-1,0])
    delta = next_close - last_close
    direction = "UP" if delta > 0 else ("DOWN" if delta < 0 else "FLAT")
    print(f"[{interval}] Last: {last_close:,.2f} → Pred next: {next_close:,.2f} | {direction}")

if __name__ == "__main__":
    for tf in INTERVALS:
        train_or_load(tf)
