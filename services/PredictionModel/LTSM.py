# === LSTM next-candle prediction from Binance (PyTorch) ===
import math, requests, numpy as np, pandas as pd, matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
import torch, torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# ------------ Config ------------
SYMBOL   = "BTCUSDT"   # ví dụ: BTCUSDT, ETHUSDT
INTERVAL = "4h"        # 1m,5m,15m,1h,4h,1d
START    = "2025-01-01T00:00:00Z"  # ISO8601
END      = None  # có thể để None
SEQ_LEN  = 60
EPOCHS   = 10
BATCH    = 64
LR       = 1e-3
DEVICE   = "cuda" if torch.cuda.is_available() else "cpu"

# ------------ Fetch Binance ------------
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
    df["t"] = df["t"].dt.tz_convert("UTC")  # giữ UTC
    return df

def fetch_klines_all(symbol: str, interval: str, start: str=None, end: str=None):
    start_ms = _to_ms(start)
    end_ms   = _to_ms(end)
    step = _interval_ms(interval) * 1000  # ~1000 nến mỗi lần
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

df = fetch_klines_all(SYMBOL, INTERVAL, START, END)
assert not df.empty, "Không có dữ liệu. Kiểm tra SYMBOL/INTERVAL/START/END."

# ------------ Use only Close for a minimal baseline ------------
data = df[["t","close"]].copy()
values = data["close"].values.reshape(-1, 1)

# Scale to [0,1]
scaler = MinMaxScaler(feature_range=(0,1))
scaled = scaler.fit_transform(values)

# Create sequences (X: SEQ_LEN closes, y: next close)
def make_sequences(series, seq_len):
    X, y = [], []
    for i in range(seq_len, len(series)):
        X.append(series[i-seq_len:i, 0])
        y.append(series[i, 0])
    return np.array(X), np.array(y)

X, y = make_sequences(scaled, SEQ_LEN)
# Train/Val split (time-ordered)
train_len = int(len(X)*0.8)
X_train, y_train = X[:train_len], y[:train_len]
X_val,   y_val   = X[train_len:], y[train_len:]

# Reshape for LSTM: (batch, seq, feature=1)
X_train_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(-1)
y_train_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(-1)
X_val_t   = torch.tensor(X_val,   dtype=torch.float32).unsqueeze(-1)
y_val_t   = torch.tensor(y_val,   dtype=torch.float32).unsqueeze(-1)

train_loader = DataLoader(TensorDataset(X_train_t, y_train_t), batch_size=BATCH, shuffle=True, drop_last=False)
val_loader   = DataLoader(TensorDataset(X_val_t,   y_val_t),   batch_size=BATCH, shuffle=False, drop_last=False)

# ------------ LSTM model ------------
class LSTMPredictor(nn.Module):
    def __init__(self, input_size=1, hidden=64, num_layers=2, dropout=0.1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden, num_layers=num_layers, batch_first=True, dropout=dropout)
        self.fc   = nn.Linear(hidden, 1)
    def forward(self, x):
        out, _ = self.lstm(x)       # (B, T, H)
        out = out[:, -1, :]         # last step
        out = self.fc(out)          # (B, 1)
        return out

model = LSTMPredictor().to(DEVICE)
crit  = nn.MSELoss()
opt   = torch.optim.Adam(model.parameters(), lr=LR)

# ------------ Train ------------
best_val = math.inf
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
    if vl_loss < best_val: best_val = vl_loss
    print(f"Epoch {ep:3d}/{EPOCHS}  train_loss={tr_loss:.6f}  val_loss={vl_loss:.6f}")

# ------------ In-sample prediction (for plotting) ------------
model.eval()
with torch.no_grad():
    pred_scaled = model(torch.tensor(X, dtype=torch.float32, device=DEVICE).unsqueeze(-1)).cpu().numpy()
pred = scaler.inverse_transform(pred_scaled)[:,0]

"""
# Align for plotting
plot_df = pd.DataFrame({
    "t": data["t"].iloc[SEQ_LEN:].values,
    "Real": data["close"].iloc[SEQ_LEN:].values,
    "Pred": pred
})
plt.figure(figsize=(14,6))
plt.title(f"{SYMBOL} {INTERVAL} — LSTM Predictions vs Real")
plt.xlabel("Time (UTC)"); plt.ylabel("Close Price")
plt.plot(plot_df["t"], plot_df["Real"], label="Real")
plt.plot(plot_df["t"], plot_df["Pred"], label="Pred")
plt.legend(); plt.xticks(rotation=20); plt.tight_layout()
plt.show()
"""

# ------------ Predict the NEXT candle (t_{last+1}) ------------
# Lấy 1 sequence cuối cùng (chưa có nhãn), shape (1, SEQ_LEN, 1)
last_seq = scaled[-SEQ_LEN:].reshape(1, SEQ_LEN, 1)
with torch.no_grad():
    next_scaled = model(torch.tensor(last_seq, dtype=torch.float32, device=DEVICE)).cpu().numpy()
next_close = scaler.inverse_transform(next_scaled)[0,0]

last_close = float(data["close"].iloc[-1])
delta = next_close - last_close
direction = "UP" if delta > 0 else ("DOWN" if delta < 0 else "FLAT")

print(f"\n=== NEXT CANDLE ({SYMBOL} {INTERVAL}) ===")
print(f"Last close:       {last_close:,.2f}")
print(f"Pred next close:  {next_close:,.2f}")
print(f"Delta:            {delta:,.2f}  ->  Direction: {direction}")

# Mini-plot last 100 points + predicted next
tail_n = 100
tail_t = list(data["t"].iloc[-tail_n:].astype(str).values) + ["t_next"]
tail_y = list(data["close"].iloc[-tail_n:].values) + [next_close]
plt.figure(figsize=(10,4))
plt.title(f"Next Candle Prediction → {direction}")
plt.plot(tail_t[:-1], tail_y[:-1], label="Recent Close")
plt.scatter([tail_t[-1]], [tail_y[-1]], marker="x", s=80, label="Pred next close")
plt.xticks(rotation=20); plt.legend(); plt.tight_layout(); plt.show()
