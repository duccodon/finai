// utils/indicators.ts
export type MacdPoint = {
  time: number;
  macd: number;
  signal: number;
  hist: number;
};

export function emaArray(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length);
  out[0] = values[0]; // seed EMA = giá đầu tiên (đơn giản, đủ dùng cho chart)
  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export function macdFromCloses(
  times: number[],
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MacdPoint[] {
  if (!times.length) return [];
  const emaFast = emaArray(closes, fast);
  const emaSlow = emaArray(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = emaArray(macdLine, signalPeriod);
  return times.map((t, i) => ({
    time: Math.floor(t / 1000), // Binance ms -> seconds
    macd: macdLine[i],
    signal: signalLine[i],
    hist: macdLine[i] - signalLine[i],
  }));
}
