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
      const res = await axios.get('https://api.binance.com/api/v3/klines', {
        params: { symbol: symbol.toUpperCase(), interval, limit: 1000 },
      });
      const bulk = res.data
        .map((row: any[]) => [row[0], row[1], row[2], row[3], row[4]])
        .map(formatKlineData)
        .filter(Boolean);
      if (bulk?.length && setSeriesDataRef.current) {
        setSeriesDataRef.current('set', null, bulk);
        const last = bulk[bulk.length - 1];
        setPriceData({
          current: last.close,
          high: last.high,
          low: last.low,
          open: last.open,
          change: last.close - last.open,
          changePercent: ((last.close - last.open) / last.open) * 100,
        });
      }
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
