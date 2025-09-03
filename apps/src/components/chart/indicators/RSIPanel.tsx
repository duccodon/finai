// components/indicators/RSIPanel.tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { useChart } from '@/contexts/ChartContext';
import { useResizeObserver } from '@/hooks/useResizeObserver';
// RSI 14 đơn giản
function rsiArray(values: number[], period = 14): number[] {
  const n = values.length;
  if (n === 0) return [];
  const out = new Array<number>(n).fill(NaN);

  let gain = 0,
    loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = values[i] - values[i - 1];
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  let avgG = gain / period;
  let avgL = loss / period;
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);

  for (let i = period + 1; i < n; i++) {
    const ch = values[i] - values[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  // điền đầu mảng cho dễ setData (giữ NaN để line bị đứt đến khi đủ period)
  return out;
}

type Props = { period?: number; height?: number };

export const RSIPanel: React.FC<Props> = ({ period = 14, height = 220 }) => {
  const { getTimesMs, getCloses, onHistory, onRealtime } = useChart();

  const containerRef = useRef<HTMLDivElement>(null);
  const { width: w } = useResizeObserver(containerRef);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartRef.current || !w) return;
    chartRef.current.applyOptions({ width: w });
  }, [w]);
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#fff' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6a6d78',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3a3e4b',
        },
        horzLine: {
          color: '#6a6d78',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3a3e4b',
        },
      },
      rightPriceScale: { borderColor: '#e5e7eb' },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e5e7eb',
      },
    });

    const rsi = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2 });
    // vẽ threshold 70 & 30 (price lines)
    rsi.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
    });
    rsi.createPriceLine({
      price: 30,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
    });

    chartRef.current = chart;
    rsiRef.current = rsi;

    const onResize = () => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };
    window.addEventListener('resize', onResize);
    setTimeout(onResize, 0);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      rsiRef.current = null;
    };
  }, [height]);

  // thêm import types nếu muốn kiểu an toàn
  // import type { LineData, WhitespaceData } from 'lightweight-charts';

  useEffect(() => {
    if (!rsiRef.current) return;

    const setAll = () => {
      const times = getTimesMs();
      const closes = getCloses();
      if (!times.length) return;

      const rsi = rsiArray(closes, period);

      // ✅ map dữ liệu: nếu chưa có RSI hợp lệ thì chỉ truyền { time } (Whitespace)
      const data = times.map((t, i) => {
        const time = Math.floor(t / 1000) as any;
        const v = rsi[i];
        return Number.isFinite(v) ? { time, value: v } : { time };
      });

      rsiRef.current!.setData(data as any);
    };

    setAll();
    const offHistory = onHistory(setAll);

    const offRealtime = onRealtime((tSec) => {
      const closes = getCloses();
      const rsi = rsiArray(closes, period);
      const last = rsi[rsi.length - 1];
      // ✅ chỉ update khi có giá trị hợp lệ
      if (Number.isFinite(last)) {
        rsiRef.current!.update({ time: tSec as any, value: last as number });
      } else {
        // nếu vẫn chưa đủ kỳ, có thể bỏ qua, hoặc:
        // rsiRef.current!.update({ time: tSec as any } as any);
      }
    });

    return () => {
      offHistory?.();
      offRealtime?.();
    };
  }, [period, getTimesMs, getCloses, onHistory, onRealtime]);

  // RSIPanel.tsx
  return (
    <div className="mt-4 border rounded-[10px] bg-white">
      <div className="flex items-center justify-between text-xs text-gray-600 p-4 pb-2">
        <div>RSI ({period}) • Threshold 30 / 70</div>
      </div>
      <div className="px-0 pb-4">
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
};
