import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_URL = '/api/predict/run'; // đổi sang '/predict' nếu backend mount khác
const SUPPORTED_INTERVALS = ['15m', '1h', '4h', '1d'];
const SUPPORTED_SYMBOLS = ['BTCUSDT', 'LTCUSDT'] as const;

type LinePoint = { time: UTCTimestamp; value: number };
type Trend = { label: 'UP' | 'DOWN' | 'FLAT'; detail: string };

function toUTCSecFromISO(iso: string): UTCTimestamp {
  const ms = Date.parse(iso);
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function summarizeTrend(json: any): Trend | null {
  try {
    const lastClose = Number(json?.last?.close);
    const preds = Array.isArray(json?.predictions) ? json.predictions : [];
    if (!Number.isFinite(lastClose) || preds.length === 0) return null;

    // đếm hướng theo field `direction` nếu có, fallback bằng dấu của (pred_close - lastClose)
    let up = 0, down = 0, flat = 0, totalDelta = 0;
    for (const p of preds) {
      const predClose = Number(p?.pred_close);
      let dir = (p?.direction ?? '').toString().toUpperCase();
      const delta = Number.isFinite(Number(p?.delta))
        ? Number(p.delta)
        : (Number.isFinite(predClose) ? (predClose - lastClose) : 0);
      if (!Number.isFinite(predClose)) continue;

      totalDelta += delta;
      if (!dir) {
        dir = delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'FLAT';
      }
      if (dir === 'UP') up++;
      else if (dir === 'DOWN') down++;
      else flat++;
    }

    const label: Trend['label'] =
      Math.abs(totalDelta) < 1e-6
        ? 'FLAT'
        : totalDelta > 0
        ? 'UP'
        : 'DOWN';

    const sign = totalDelta > 0 ? '+' : totalDelta < 0 ? '−' : '';
    const absDelta = Math.abs(totalDelta).toLocaleString();
    const horizon = Number(json?.horizon) || preds.length;
    const detail = `Horizon ${horizon}: ${label} • ${up}↑ / ${down}↓ / ${flat}→ • Tổng Δ ${sign}${absDelta}`;

    return { label, detail };
  } catch {
    return null;
  }
}

export default function Prediction() {
  const [symbol, setSymbol] = useState<(typeof SUPPORTED_SYMBOLS)[number]>('BTCUSDT');
  const [interval, setInterval] = useState('1d'); // bạn đang dùng mẫu 1d
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<Trend | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // init chart
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#fff' }, textColor: '#828282' },
      grid: { vertLines: { color: '#d7d8d9' }, horzLines: { color: '#d7d8d9' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6a6d78', width: 1, style: 2, labelBackgroundColor: '#3a3e4b' },
        horzLine: { color: '#6a6d78', width: 1, style: 2, labelBackgroundColor: '#3a3e4b' },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#d7d8d9' },
      rightPriceScale: { borderColor: '#d7d8d9' },
    });

    const line = chart.addSeries(LineSeries, { lineWidth: 2 });

    chartRef.current = chart;
    seriesRef.current = line;

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  const fetchAndRender = async () => {
    setLoading(true);
    setError(null);
    try {
      const safeInterval = SUPPORTED_INTERVALS.includes(interval) ? interval : '1d';

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          interval: safeInterval,
          seq_len: 60,
          force_train: false,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 800)}`);

      const json = JSON.parse(text);
      console.log('[predict response]', json);

      // —— map dữ liệu vào line
      const predictions = Array.isArray(json?.predictions) ? json.predictions : [];
      const data: LinePoint[] = predictions
        .map((p: any) => ({
          time: toUTCSecFromISO(p.t),
          value: Number(p.pred_close),
        }))
        .filter((p: LinePoint) => Number.isFinite(p.value));

      // chèn điểm "last" để nối mạch
      if (json?.last?.t && json?.last?.close != null) {
        data.unshift({
          time: toUTCSecFromISO(json.last.t),
          value: Number(json.last.close),
        });
      }

      if (!data.length) throw new Error('Không parse được điểm dữ liệu.');

      seriesRef.current?.setData(data);
      chartRef.current?.timeScale().fitContent();

      // —— mô tả xu hướng
      setTrend(summarizeTrend(json));
    } catch (e: any) {
      setError(e?.message || 'Lỗi không xác định.');
      setTrend(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // màu xu hướng
  const trendColor =
    trend?.label === 'UP' ? 'text-green-600' : trend?.label === 'DOWN' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="font-semibold">Prediction • Close (Line)</span>
          <span className="ml-2 text-gray-500">
            {symbol} • {interval}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* chỉ cho 2 lựa chọn BTCUSDT / LTCUSDT */}
          <Select value={symbol} onValueChange={(v) => setSymbol(v as (typeof SUPPORTED_SYMBOLS)[number])}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={symbol} />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_SYMBOLS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* interval */}
          <Select value={interval} onValueChange={(v) => setInterval(v)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder={interval} />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_INTERVALS.map((int) => (
                <SelectItem key={int} value={int}>
                  {int}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={fetchAndRender} disabled={loading}>
            {loading ? 'Loading…' : 'Fetch'}
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-[10px] p-3">
        <div ref={containerRef} className="w-full min-h-[420px]" />
      </div>

      {/* Mô tả xu hướng */}
      {trend && !error && (
        <div className={`text-sm ${trendColor}`}>
          <strong>Xu hướng:</strong> {trend.detail}
        </div>
      )}

      {error ? (
        <p className="text-red-600 text-sm">⚠️ {error}</p>
      ) : (
        <p className="text-xs text-gray-500">
          Dữ liệu hiển thị từ <code>last.close</code> và chuỗi <code>pred_close</code> theo <code>t</code> (ISO).
        </p>
      )}
    </div>
  );
}
