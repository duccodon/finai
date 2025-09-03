// hooks/useBinanceKlines.ts
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export type PriceData = {
  current: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  change: number | null;
  changePercent: number | null;
};

type SetSeriesDataFn = (
  mode: 'set' | 'update',
  candle: any[] | null,
  bulk?: any[]
) => void;

/**
 * formatKline: [openTime(ms), open, high, low, close] -> CandlestickData
 */
export const formatKlineData = (k: any[]) => {
  if (!k || k.length < 5) return null;
  return {
    time: (k[0] / 1000) as any, // UTCTimestamp
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  };
};

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
};

type KlineRow = [number, string, string, string, string, ...rest: any[]]; // [openTime, open, high, low, close, ...]

async function fetchKlinesPage(
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number
): Promise<KlineRow[]> {
  const params: any = { symbol, interval, limit };
  if (endTime) params.endTime = endTime; // lùi về trước endTime này (ms)
  const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
    params,
  });
  return data as KlineRow[];
}

/** Lấy gần nhất ~targetCount nến bằng cách lùi theo endTime (tối đa 1000/req). */
export async function fetchKlinesBackfill(
  symbol: string,
  interval: string,
  targetCount = 5000,
  perPage = 1000,
  pauseMs = 120
): Promise<KlineRow[]> {
  const out: KlineRow[] = [];
  let endTime: number | undefined = undefined; // undefined = latest
  const seen = new Set<number>();

  while (out.length < targetCount) {
    const page = await fetchKlinesPage(symbol, interval, perPage, endTime);
    if (!page.length) break;

    // Thêm vào out nếu chưa thấy openTime
    for (const row of page) {
      const openTime = row[0];
      if (!seen.has(openTime)) {
        seen.add(openTime);
        out.push(row);
      }
    }

    // Lùi endTime về openTime của cây đầu tiên trong page - 1ms
    const firstOpenTime = page[0][0];
    const step = INTERVAL_MS[interval] ?? 60_000;
    endTime = firstOpenTime - 1; // an toàn lùi 1ms

    // Hết về quá xa thì dừng (phòng ngừa)
    if (page.length < perPage) break;

    // Nghỉ một nhịp tránh spam
    if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
  }

  // Giữ lại đúng targetCount nến mới nhất
  out.sort((a, b) => a[0] - b[0]);
  if (out.length > targetCount) {
    return out.slice(out.length - targetCount);
  }
  return out;
}

export const useBinanceKlines = (symbol: string, interval: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [priceData, setPriceData] = useState<PriceData>({
    current: null,
    high: null,
    low: null,
    open: null,
    change: null,
    changePercent: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const setSeriesDataRef = useRef<SetSeriesDataFn | null>(null);

  // Cho CandleChart đăng ký cách setData/update
  const registerSeriesSink = (fn: SetSeriesDataFn) => {
    setSeriesDataRef.current = fn;
  };

  useEffect(() => {
    let active = true;
    let openTimer: number | null = null;

    const fetchHistory = async () => {
      const symbolU = symbol.toUpperCase();
      // lấy ~5000 nến
      const rows = await fetchKlinesBackfill(
        symbolU,
        interval,
        3000,
        1000,
        120
      );

      // convert về CandlestickData và set vào series
      const bulk = rows.map((r) => ({
        time: Math.floor(r[0] / 1000) as any,
        open: parseFloat(r[1]),
        high: parseFloat(r[2]),
        low: parseFloat(r[3]),
        close: parseFloat(r[4]),
      }));
      setSeriesDataRef.current?.('set', null, bulk);

      // cập nhật priceData từ nến cuối
      const last = bulk[bulk.length - 1];
      setPriceData({
        current: last.close,
        high: last.high,
        low: last.low,
        open: last.open,
        change: last.close - last.open,
        changePercent: ((last.close - last.open) / last.open) * 100,
      });
    };

    const connect = async () => {
      await fetchHistory();

      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try {
          wsRef.current.close(1000, 'switching stream');
        } catch {}
      }
      await new Promise((r) => setTimeout(r, 150));
      if (!active) return;

      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
      );
      wsRef.current = ws;

      ws.onerror = () => {};
      ws.onopen = () => {
        if (!active) return;
        if (openTimer) window.clearTimeout(openTimer);
        openTimer = window.setTimeout(() => setIsConnected(true), 0);
      };
      ws.onclose = () => {
        if (active) setIsConnected(false);
      };
      ws.onmessage = (ev) => {
        if (!active) return;
        try {
          const msg = JSON.parse(ev.data);
          if (!msg?.k) return;
          const k = msg.k;
          const row = [k.t, k.o, k.h, k.l, k.c];
          const candle = formatKlineData(row);
          if (candle && setSeriesDataRef.current) {
            setSeriesDataRef.current('update', row);
            const o = parseFloat(k.o),
              c = parseFloat(k.c);
            const h = parseFloat(k.h),
              l = parseFloat(k.l);
            setPriceData((prev) => ({
              current: c,
              high: Math.max(h, prev.high ?? h),
              low: Math.min(l, prev.low ?? l),
              open: o,
              change: c - o,
              changePercent: ((c - o) / o) * 100,
            }));
          }
        } catch {}
      };
    };

    connect();

    return () => {
      active = false;
      if (openTimer) window.clearTimeout(openTimer);
      try {
        wsRef.current?.close(1000, 'unmount');
      } catch {}
    };
  }, [symbol, interval]);

  return { isConnected, priceData, registerSeriesSink };
};
