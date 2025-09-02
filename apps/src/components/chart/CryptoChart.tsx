import React, { useState, useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  CandlestickSeries,
} from 'lightweight-charts';
import axios from 'axios';
import { type UTCTimestamp } from 'lightweight-charts';

import SearchSymbolDialog from '@/components/chart/SearchSymbolDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const chartColors = {
  background: '#ffffff',
  text: '#828282',
  grid: '#d7d8d9',
  crosshair: '#6a6d78',
  panel: '#262a34',
  secondaryText: '#b2b5be',
  upColor: '#26a69a',
  downColor: '#ef5350',
  green: '#26a69a',
  red: '#ef5350',
  buttonActive: '#3a3e4b',
  buttonInactive: '#2a2e39',
};
const borderColor = 'rgba(132,130,130,0.37)';

const CryptoChart: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [priceData, setPriceData] = useState({
    current: null as number | null,
    high: null as number | null,
    low: null as number | null,
    open: null as number | null,
    change: null as number | null,
    changePercent: null as number | null,
  });
  const [searchSymbolDialogOpen, setSearchSymbolDialogOpen] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(
    null
  );
  const [isHovering, setIsHovering] = useState(false);
  const [symbolMeta, setSymbolMeta] = useState<{
    tickSize: number;
    stepSize: number;
  } | null>(null);

  // Chuyển "0.00010000" -> 0.0001, hoặc "1.00000000" -> 1
  const toNumberSafe = (s: string) => Number(s);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatKlineData = (kline: any[]): CandlestickData | null => {
    if (!kline || kline.length < 5) return null;
    return {
      time: (kline[0] / 1000) as UTCTimestamp,
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
    };
  };
  const formatPrice = (price: number | null) =>
    formatByTick(price, symbolMeta?.tickSize ?? 0.01);

  // Suy ra số chữ số thập phân từ tickSize (0.0001 -> 4)
  const decimalsFromTick = (tick: number) => {
    if (!isFinite(tick) || tick <= 0) return 2; // fallback
    // đếm chữ số sau dấu phẩy của tick
    const s = tick.toString();
    if (s.includes('e-')) {
      // vd: 1e-8
      return Number(s.split('e-')[1]);
    }
    const dot = s.indexOf('.');
    return dot === -1 ? 0 : s.length - dot - 1;
  };

  const roundToTick = (price: number | null | undefined, tick = 0.01) => {
    if (price == null || !isFinite(price)) return null;
    if (!tick || tick <= 0) return price;
    // làm tròn tới bội số gần nhất của tick
    const n = Math.round(price / tick) * tick;
    // fix lỗi sai số dấu phẩy động
    return Number(n.toFixed(decimalsFromTick(tick)));
  };

  const formatByTick = (price: number | null | undefined, tick = 0.01) => {
    if (price == null || !isFinite(price)) return '-';
    const decimals = decimalsFromTick(tick);
    // KHÔNG ép toFixed cứng – để locale format đẹp hơn
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(roundToTick(price, tick)!);
  };
  const initChart = () => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: chartColors.grid,
      },
      rightPriceScale: {
        borderColor: chartColors.grid,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderVisible: false,
      wickUpColor: chartColors.upColor,
      wickDownColor: chartColors.downColor,
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setIsHovering(false);
        return;
      }

      const candleData = param.seriesData.get(candleSeries) as CandlestickData;
      setHoveredCandle(candleData || null);
      setIsHovering(!!candleData);
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    console.log('Chart initialized with container:', chartContainerRef.current);
  };

  // const connectWebSocket = () => {
  //   if (wsRef.current) {
  //     wsRef.current.close();
  //     setIsConnected(false);
  //   }

  //   const ws = new WebSocket(
  //     `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
  //   );

  //   ws.onopen = () => setIsConnected(true);
  //   ws.onclose = () => setIsConnected(false);
  //   ws.onerror = console.error;

  //   ws.onmessage = (event) => {
  //     try {
  //       const message = JSON.parse(event.data);
  //       if (message.k) {
  //         const kline = message.k;
  //         const newCandle = formatKlineData([
  //           kline.t,
  //           kline.o,
  //           kline.h,
  //           kline.l,
  //           kline.c,
  //         ]);
  //         if (newCandle) {
  //           candleSeriesRef.current?.update(newCandle);
  //           setPriceData((prev) => ({
  //             current: parseFloat(kline.c),
  //             high: Math.max(parseFloat(kline.h), prev.high || 0),
  //             low: Math.min(parseFloat(kline.l), prev.low || Infinity),
  //             open: parseFloat(kline.o),
  //             change: parseFloat(kline.c) - parseFloat(kline.o),
  //             changePercent:
  //               ((parseFloat(kline.c) - parseFloat(kline.o)) / parseFloat(kline.o)) * 100,
  //           }));
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error processing WebSocket message:', error);
  //     }
  //   };

  //   wsRef.current = ws;
  // };

  // Init chart + series + crosshair
  useEffect(() => {
    initChart();
    return () => {
      wsRef.current?.close();
      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  //fetch symbol metadata
  useEffect(() => {
    let cancelled = false;
    const fetchSymbolMeta = async () => {
      try {
        const res = await axios.get(
          'https://api.binance.com/api/v3/exchangeInfo',
          {
            params: { symbol: symbol.toUpperCase() },
          }
        );
        const info = res.data?.symbols?.[0];
        if (!info) return;

        const priceFilter = info.filters?.find(
          (f: any) => f.filterType === 'PRICE_FILTER'
        );
        const lotFilter = info.filters?.find(
          (f: any) => f.filterType === 'LOT_SIZE'
        );

        const tickSize = toNumberSafe(priceFilter?.tickSize ?? '0.01');
        const stepSize = toNumberSafe(lotFilter?.stepSize ?? '1');

        if (!cancelled) setSymbolMeta({ tickSize, stepSize });
      } catch (e) {
        // fallback: vẫn dùng 0.01 để không vỡ UI
        if (!cancelled) setSymbolMeta({ tickSize: 0.01, stepSize: 1 });
      }
    };
    fetchSymbolMeta();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Connect to Binance API by REST to get historical data, WS for real-time
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    let active = true;
    let ws: WebSocket | null = null;
    let openTimer: number | null = null;

    const fetchHistoricalData = async () => {
      try {
        const response = await axios.get(
          'https://api.binance.com/api/v3/klines',
          {
            params: { symbol: symbol.toUpperCase(), interval, limit: 1000 },
          }
        );
        const formattedData = response.data
          .map(formatKlineData)
          .filter((i: CandlestickData): i is CandlestickData => i !== null);

        if (formattedData.length) {
          candleSeriesRef.current!.setData(formattedData);
          const last = formattedData[formattedData.length - 1];
          setPriceData({
            current: last.close,
            high: last.high,
            low: last.low,
            open: last.open,
            change: last.close - last.open,
            changePercent: ((last.close - last.open) / last.open) * 100,
          });
        }
      } catch (e) {
        console.warn('Fetch klines failed:', e);
      }
    };

    const connect = async () => {
      // 1) Lấy lịch sử trước
      await fetchHistoricalData();

      // 2) Đóng socket cũ êm ái (1000 = normal closure)
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try {
          wsRef.current.close(1000, 'switching stream');
        } catch {}
      }

      // 3) Chờ một nhịp nhỏ để tránh spam connect
      await new Promise((r) => setTimeout(r, 150));

      if (!active) return;

      ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
      );
      wsRef.current = ws;

      ws.onerror = () => {};

      ws.onopen = () => {
        if (!active) return;
        // Tránh nháy trạng thái nếu onopen/onclose sát nhau
        if (openTimer) window.clearTimeout(openTimer);
        openTimer = window.setTimeout(() => setIsConnected(true), 0);
      };

      ws.onclose = (ev) => {
        if (!active) return;
        setIsConnected(false);
        // Log nhẹ để biết lý do đóng
        console.log(
          `[WS closed] code=${ev.code} reason="${ev.reason}" wasClean=${ev.wasClean}`
        );
        // Binance/Network có thể reset: tuỳ chọn auto-reconnect ở đây nếu muốn
        // (thêm backoff nếu cần)
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const msg = JSON.parse(event.data);
          if (!msg?.k) return;
          const k = msg.k;
          const newCandle = formatKlineData([k.t, k.o, k.h, k.l, k.c]);
          if (newCandle) {
            candleSeriesRef.current!.update(newCandle);
            setPriceData((prev) => {
              const o = parseFloat(k.o);
              const c = parseFloat(k.c);
              const h = parseFloat(k.h);
              const l = parseFloat(k.l);
              return {
                current: c,
                high: Math.max(h, prev.high ?? h),
                low: Math.min(l, prev.low ?? l),
                open: o,
                change: c - o,
                changePercent: ((c - o) / o) * 100,
              };
            });
          }
        } catch {
          // Nuốt lỗi parse để tránh spam console
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (openTimer) window.clearTimeout(openTimer);
      // Đóng êm, tránh bắn error/close bất thường
      try {
        ws?.close(1000, 'component unmount');
      } catch {}
    };
  }, [symbol, interval]);

  // Update candle series options when symbolMeta changes
  useEffect(() => {
    if (!candleSeriesRef.current || !symbolMeta) return;
    const { tickSize } = symbolMeta;

    candleSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: decimalsFromTick(tickSize),
        minMove: tickSize, // rất quan trọng: bội số nhỏ nhất
      },
    });

    // Tuỳ ý: scale biên phải cũng có thể cập nhật border/màu tại đây
  }, [symbolMeta]);
  // Handle resize charts
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <SearchSymbolDialog
        open={searchSymbolDialogOpen}
        onOpenChange={setSearchSymbolDialogOpen}
        onSymbolSelect={setSymbol}
        borderColor={borderColor}
      />

      {/* ===== Top Bar: First row moved out of the chart card ===== */}
      <div className="flex items-center justify-between px-3 py-2 mb-3">
        <div className="flex items-center gap-3">
          {/* Symbol picker button */}
          <div
            className={`${chartColors.buttonInactive} px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-between`}
            style={{ borderColor: borderColor }}
            onClick={() => setSearchSymbolDialogOpen(true)}
          >
            <img
              src="/search.svg"
              alt="Search"
              className="w-4 h-4 opacity-70"
            />
            <div className="flex-1 text-center truncate ml-2">{symbol}</div>
          </div>

          {/* Interval dropdown */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Select value={interval} onValueChange={(v) => setInterval(v)}>
              <SelectTrigger
                className="w-fit rounded-[10px]"
                style={{ borderColor: borderColor }}
              >
                <SelectValue placeholder={interval} />
              </SelectTrigger>
              <SelectContent>
                {intervals.map((int) => (
                  <SelectItem key={int} value={int}>
                    {int}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-3 w-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* ===== Chart Card ===== */}
      <div
        className="p-4 relative border rounded-[10px]"
        style={{ borderColor: borderColor }}
      >
        {/* Second row */}
        <div className="flex items-center justify-between rounded-[10px] px-4 py-1 w-full sm:w-[60%] md:w-[50%] lg:w-[40%] mb-2">
          <div className="text-xs">
            {symbol} • {interval}
          </div>
          <div className="flex items-center text-sm px-3 py-1">
            {(() => {
              const changePercent = isHovering
                ? (((hoveredCandle?.close ?? 0) - (hoveredCandle?.open ?? 0)) /
                    (hoveredCandle?.open ?? 1)) *
                  100
                : priceData.changePercent ?? 0;

              const changeColor =
                changePercent >= 0 ? 'text-green-500' : 'text-red-500';

              return (
                <>
                  <div className="flex items-center gap-2 mr-[1rem]">
                    <span>
                      {isHovering
                        ? formatPrice(hoveredCandle?.close ?? 0)
                        : formatPrice(priceData.current)}
                    </span>
                    <span className={changeColor}>
                      {changePercent >= 0 ? '+' : ''}
                      {Number.isFinite(changePercent)
                        ? changePercent.toFixed(2)
                        : '0.00'}
                      %
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>
                      O{' '}
                      <span className={changeColor}>
                        {isHovering
                          ? formatPrice(hoveredCandle?.open ?? 0)
                          : formatPrice(priceData.open)}
                      </span>
                    </span>
                    <span>
                      H{' '}
                      <span className={changeColor}>
                        {isHovering
                          ? formatPrice(hoveredCandle?.high ?? 0)
                          : formatPrice(priceData.high)}
                      </span>
                    </span>
                    <span>
                      L{' '}
                      <span className={changeColor}>
                        {isHovering
                          ? formatPrice(hoveredCandle?.low ?? 0)
                          : formatPrice(priceData.low)}
                      </span>
                    </span>
                    <span>
                      C{' '}
                      <span className={changeColor}>
                        {isHovering
                          ? formatPrice(hoveredCandle?.close ?? 0)
                          : formatPrice(priceData.current)}
                      </span>
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Chart container */}
        <div
          ref={chartContainerRef}
          id="candleChart"
          className="w-full min-h-[500px]"
        />
      </div>
    </>
  );
};

export default CryptoChart;
