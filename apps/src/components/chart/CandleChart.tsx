// components/chart/CandleChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from 'lightweight-charts';
import { useBinanceKlines, formatKlineData } from '@/hooks/useBinanceKlines';
import { decimalsFromTick, formatByTick } from '@/lib/utils';

type Props = {
  symbol: string;
  interval: string;
  onHoverStats?: (candle: CandlestickData | null) => void;
  tickSize?: number;
  className?: string;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const { isConnected, priceData, registerSeriesSink } = useBinanceKlines(
    symbol,
    interval
  );
  const [hover, setHover] = useState<CandlestickData | null>(null);

  // register sink (setData/update) cho hook
  useEffect(() => {
    registerSeriesSink((mode, row, bulk) => {
      if (!seriesRef.current) return;
      if (mode === 'set' && bulk) {
        seriesRef.current.setData(bulk as CandlestickData[]);
      } else if (mode === 'update' && row) {
        const c = formatKlineData(row);
        if (c) seriesRef.current.update(c);
      }
    });
  }, [registerSeriesSink]);

  // init chart
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart: IChartApi = createChart(containerRef.current, {
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

    const series: ISeriesApi<'Candlestick'> = chart.addSeries(
      CandlestickSeries,
      {
        upColor: chartColors.upColor,
        downColor: chartColors.downColor,
        borderVisible: false,
        wickUpColor: chartColors.upColor,
        wickDownColor: chartColors.downColor,
      }
    );

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setHover(null);
        onHoverStats?.(null);
        return;
      }
      const candle = param.seriesData.get(series) as CandlestickData;
      setHover(candle || null);
      onHoverStats?.(candle || null);
    });

    // lưu chart và series để sử dụng sau này
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // apply priceFormat theo tickSize
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

  // resize
  useEffect(() => {
    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // simple inline header (O/H/L/C) cho riêng chart (nếu cần)
  const fmt = (n: number | null) => formatByTick(n, tickSize);

  return (
    <div className={className}>
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

      <div ref={containerRef} className="w-full min-h-[420px]" />

      <div className="mt-2 text-xs flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
};
