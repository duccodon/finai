// components/indicators/MACDPanel.tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { useChart } from '@/contexts/ChartContext';
import { useResizeObserver } from '@/hooks/useResizeObserver';
// MACD = EMA(fast) - EMA(slow), Signal = EMA(MACD, signal), Hist = MACD - Signal
function emaArray(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = new Array(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++)
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  return out;
}
function macdFromCloses(
  timesMs: number[],
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
) {
  const emaF = emaArray(closes, fast);
  const emaS = emaArray(closes, slow);
  const macd = closes.map((_, i) => emaF[i] - emaS[i]);
  const signalArr = emaArray(macd, signal);
  const hist = macd.map((m, i) => m - signalArr[i]);
  const timeSec = timesMs.map((t) => Math.floor(t / 1000) as any);
  return { timeSec, macd, signal: signalArr, hist };
}

type Props = { fast?: number; slow?: number; signal?: number; height?: number };

export const MACDPanel: React.FC<Props> = ({
  fast = 12,
  slow = 26,
  signal = 9,
  height = 220,
}) => {
  const { getTimesMs, getCloses, onHistory, onRealtime } = useChart();

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sigRef = useRef<ISeriesApi<'Line'> | null>(null);
  const histRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const { width: w } = useResizeObserver(containerRef);
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

    const macd = chart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
    });
    const sig = chart.addSeries(LineSeries, { color: '#EF6C00', lineWidth: 2 });
    const hist = chart.addSeries(HistogramSeries, {});

    // autoscale quanh 0: để mặc định autoscale là đủ; hoặc tự set giá trị min/max theo hist

    chartRef.current = chart;
    macdRef.current = macd;
    sigRef.current = sig;
    histRef.current = hist;

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
      macdRef.current = null;
      sigRef.current = null;
      histRef.current = null;
    };
  }, [height]);
  useEffect(() => {
    if (!chartRef.current || !w) return;
    chartRef.current.applyOptions({ width: w });
  }, [w]);
  useEffect(() => {
    if (!macdRef.current || !sigRef.current || !histRef.current) return;

    const setAll = () => {
      const times = getTimesMs();
      const closes = getCloses();
      if (!times.length) return;
      const {
        timeSec,
        macd,
        signal: sigArr,
        hist,
      } = macdFromCloses(times, closes, fast, slow, signal);

      macdRef.current!.setData(
        timeSec.map((t, i) => ({ time: t, value: macd[i] }))
      );
      sigRef.current!.setData(
        timeSec.map((t, i) => ({ time: t, value: sigArr[i] }))
      );
      histRef.current!.setData(
        timeSec.map((t, i) => ({
          time: t,
          value: hist[i],
          color: hist[i] >= 0 ? '#26a69a' : '#ef5350',
        }))
      );
    };

    setAll();
    const offHistory = onHistory(setAll);

    const offRealtime = onRealtime((tSec) => {
      const times = getTimesMs();
      const closes = getCloses();
      if (!times.length) return;
      const {
        macd,
        signal: sigArr,
        hist,
      } = macdFromCloses(times, closes, fast, slow, signal);
      const i = macd.length - 1;
      macdRef.current!.update({ time: tSec as any, value: macd[i] });
      sigRef.current!.update({ time: tSec as any, value: sigArr[i] });
      histRef.current!.update({
        time: tSec as any,
        value: hist[i],
        color: hist[i] >= 0 ? '#26a69a' : '#ef5350',
      });
    });

    return () => {
      offHistory?.();
      offRealtime?.();
    };
  }, [fast, slow, signal, getTimesMs, getCloses, onHistory, onRealtime]);

  return (
    <div className="mt-4 p-3 border rounded-[10px] bg-white">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
        <div>
          MACD ({fast}, {slow}, {signal})
        </div>
      </div>

      {/* Chart + legend */}
      <div className="relative">
        <div ref={containerRef} className="w-full min-h-[220px]" />

        {/* Legend góc trái trên */}
        <div className="absolute top-1 left-1 pointer-events-auto z-50">
          <div className="flex items-center gap-3 rounded-md bg-white/85 backdrop-blur py-1 shadow text-[11px] leading-none">
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-4 rounded"
                style={{ background: '#2962FF' }}
              />
              <span>MACD</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-4 rounded"
                style={{ background: '#EF6C00' }}
              />
              <span>Signal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
