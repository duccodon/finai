// components/chart/CandleChart.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from 'lightweight-charts';
import { useBinanceKlines, formatKlineData } from '@/hooks/useBinanceKlines';
import { decimalsFromTick, formatByTick } from '@/lib/utils';
import { ChartContext } from '@/contexts/ChartContext';
import { useResizeObserver } from '@/hooks/useResizeObserver';
type Props = {
  symbol: string;
  interval: string;
  onHoverStats?: (candle: CandlestickData | null) => void;
  tickSize?: number;
  className?: string;
  children?: React.ReactNode; // overlays
};

const chartColors = {
  background: '#ffffff',
  text: '#828282',
  grid: '#d7d8d9',
  crosshair: '#6a6d78',
  upColor: '#26a69a',
  downColor: '#ef5350',
  buttonActive: '#3a3e4b',
};

export const CandleChart: React.FC<Props> = ({
  symbol,
  interval,
  onHoverStats,
  tickSize = 0.01,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerW } = useResizeObserver(containerRef);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);

  // buffers cho indicators + realtime emit
  const timesMsRef = useRef<number[]>([]);
  const closesRef = useRef<number[]>([]);
  const realtimeSubs = useRef(new Set<(tSec: number, close: number) => void>());
  const historySubs = useRef(new Set<() => void>());

  const { isConnected, priceData, registerSeriesSink } = useBinanceKlines(
    symbol,
    interval
  );
  const [hover, setHover] = useState<CandlestickData | null>(null);

  const fmt = (n: number | null) => formatByTick(n, tickSize);

  useEffect(() => {
    if (!chartRef.current || !containerW) return;
    chartRef.current.applyOptions({ width: containerW });
  }, [containerW]);

  // init chart + series (once)
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      crosshair: {
        mode: CrosshairMode.MagnetOHLC,
        vertLine: {
          color: chartColors.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: chartColors.buttonActive,
        },
        horzLine: {
          color: chartColors.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: chartColors.buttonActive,
        },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: chartColors.grid,
      },
      rightPriceScale: { borderColor: chartColors.grid },
    });

    const priceSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderVisible: false,
      wickUpColor: chartColors.upColor,
      wickDownColor: chartColors.downColor,
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setHover(null);
        onHoverStats?.(null);
        return;
      }
      const candle = param.seriesData.get(priceSeries) as CandlestickData;
      setHover(candle || null);
      onHoverStats?.(candle || null);
    });

    chartRef.current = chart;
    seriesRef.current = priceSeries;

    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };
    // window.addEventListener('resize', onResize);
    //setTimeout(onResize, 0);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [onHoverStats]);

  // áp định dạng theo tickSize
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: decimalsFromTick(tickSize),
        minMove: tickSize,
      },
    });
  }, [tickSize]);

  //  setData/update + cập nhật buffer + emit realtime
  useEffect(() => {
    if (!seriesRef.current) return;
    registerSeriesSink((mode, row, bulk) => {
      if (!seriesRef.current) return;

      if (mode === 'set' && bulk) {
        const data = bulk as CandlestickData[];
        seriesRef.current.setData(data);

        // cập nhật buffers
        timesMsRef.current = data.map((d) => (d.time as number) * 1000);
        closesRef.current = data.map((d) => d.close as number);

        historySubs.current.forEach((fn) => fn());
        return;
      } else if (mode === 'update' && row) {
        const c = formatKlineData(row);
        if (!c) return;

        seriesRef.current.update(c);

        const tMs = (c.time as number) * 1000;
        const close = c.close;

        // update buffer (ghi đè nếu cùng openTime, thêm nếu nến mới)
        const times = timesMsRef.current;
        const closes = closesRef.current;
        if (times.length && tMs === times[times.length - 1]) {
          closes[closes.length - 1] = close as number;
        } else {
          times.push(tMs);
          closes.push(close as number);
        }

        // emit realtime cho overlays
        const tSec = c.time as number;
        realtimeSubs.current.forEach((fn) => fn(tSec, close as number));
      }
    });
  }, [registerSeriesSink]);

  // build ChartContext value
  const ctxValue =
    chartRef.current && seriesRef.current
      ? {
          chart: chartRef.current,
          priceSeries: seriesRef.current,
          registerLineSeries: (opts?: any) =>
            chartRef.current!.addSeries(LineSeries, { lineWidth: 2, ...opts }),
          removeSeries: (s: ISeriesApi<any>) => {
            try {
              (chartRef.current as any)?.removeSeries?.(s);
            } catch {}
          },
          getTimesMs: () => timesMsRef.current,
          getCloses: () => closesRef.current,
          onRealtime: (fn: (tSec: number, close: number) => void) => {
            realtimeSubs.current.add(fn);
            return () => realtimeSubs.current.delete(fn);
          },
          onHistory: (fn: () => void) => {
            historySubs.current.add(fn);
            return () => historySubs.current.delete(fn);
          },
          tickSize,
          getOverlayRoot: () => overlayRootRef.current,
        }
      : null;

  return (
    <div className={className}>
      {/* Header nhỏ O/H/L/C */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div>
          {symbol} • {interval}
        </div>
        <div className="flex items-center gap-3">
          <span>
            O <b>{fmt(hover?.open ?? priceData.open)}</b>
          </span>
          <span>
            H <b>{fmt(hover?.high ?? priceData.high)}</b>
          </span>
          <span>
            L <b>{fmt(hover?.low ?? priceData.low)}</b>
          </span>
          <span>
            C{' '}
            <b
              className={
                (hover
                  ? hover.close - (hover.open ?? 0)
                  : priceData.change ?? 0) >= 0
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {fmt(hover?.close ?? priceData.current)}
            </b>
          </span>
        </div>
      </div>

      {/* Overlay cho các chỉ báo */}
      <div className="relative">
        <div ref={containerRef} className="w-full min-h-[420px]" />
        <div
          ref={overlayRootRef}
          className="absolute inset-0 pointer-events-none z-50"
        />
      </div>
      {/* Trạng thái kết nối */}
      <div className="mt-2 text-xs flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Provider bọc overlays */}
      {ctxValue && (
        <ChartContext.Provider value={ctxValue}>
          {children}
        </ChartContext.Provider>
      )}
    </div>
  );
};
