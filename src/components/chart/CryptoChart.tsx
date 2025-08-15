import React, { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type CandlestickData, CandlestickSeries } from "lightweight-charts";
import axios from "axios";
import { type UTCTimestamp } from "lightweight-charts";

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


const intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const chartColors = {
  background: "#ffffff",
  text: "#000000",
  grid: "#2a2e39",
  crosshair: "#6a6d78",
  panel: "#262a34",
  secondaryText: "#b2b5be",
  upColor: "#26a69a",
  downColor: "#ef5350",
  green: "#26a69a",
  red: "#ef5350",
  buttonActive: "#3a3e4b",
  buttonInactive: "#2a2e39"
};
const borderColor = "rgba(132,130,130,0.37)";

const CryptoChart: React.FC = () => {
  const [symbol, setSymbol] = useState("LINKUSDT");
  const [interval, setInterval] = useState("1m");
  const [isConnected, setIsConnected] = useState(false);
  const [priceData, setPriceData] = useState({
    current: null as number | null,
    high: null as number | null,
    low: null as number | null,
    open: null as number | null,
    change: null as number | null,
    changePercent: null as number | null
  });
  const [searchSymbolDialogOpen, setSearchSymbolDialogOpen] = useState(false);
  const [symbolInput, setSymbolInput] = useState("BTCUSDT");
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const formatKlineData = (kline: any[]): CandlestickData | null => {
    if (!kline || kline.length < 5) return null;
    return {
      time: (kline[0] / 1000) as UTCTimestamp,
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4])
    };
  };

  const initChart = () => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: chartColors.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: chartColors.buttonActive
        },
        horzLine: {
          color: chartColors.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: chartColors.buttonActive
        }
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: chartColors.grid
      }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderVisible: false,
      wickUpColor: chartColors.upColor,
      wickDownColor: chartColors.downColor
    });

    chart.subscribeCrosshairMove(param => {
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

    console.log("Chart initialized with container:", chartContainerRef.current);
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: { symbol: symbol.toUpperCase(), interval, limit: 1000 }
      });

      const formattedData = response.data
        .map(formatKlineData)
        .filter((item): item is CandlestickData => item !== null);

      if (formattedData.length > 0) {
        candleSeriesRef.current?.setData(formattedData);
        const lastCandle = formattedData[formattedData.length - 1];
        setPriceData({
          current: lastCandle.close,
          high: lastCandle.high,
          low: lastCandle.low,
          open: lastCandle.open,
          change: lastCandle.close - lastCandle.open,
          changePercent: ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
        });
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      setIsConnected(false);
    }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = console.error;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.k) {
          const kline = message.k;
          const newCandle = formatKlineData([kline.t, kline.o, kline.h, kline.l, kline.c]);
          if (newCandle) {
            candleSeriesRef.current?.update(newCandle);
            setPriceData(prev => ({
              current: parseFloat(kline.c),
              high: Math.max(parseFloat(kline.h), prev.high || 0),
              low: Math.min(parseFloat(kline.l), prev.low || Infinity),
              open: parseFloat(kline.o),
              change: parseFloat(kline.c) - parseFloat(kline.o),
              changePercent: ((parseFloat(kline.c) - parseFloat(kline.o)) / parseFloat(kline.o)) * 100
            }));
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    wsRef.current = ws;
  };

  const formatPrice = (price: number | null) => price?.toFixed(2) || '-';

  useEffect(() => {
    // Initialize chart on mount
    initChart();

    return () => {
      // Cleanup on unmount
      wsRef.current?.close();
      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    let active = true;
    let ws: WebSocket | null = null;

    const fetchAndConnect = async () => {
      try {
        await fetchHistoricalData();

        // Close existing connection
        if (wsRef.current) {
          wsRef.current.close();
          setIsConnected(false);
        }

        // Create new connection
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
        wsRef.current = ws;

        ws.onopen = () => active && setIsConnected(true);
        ws.onclose = () => active && setIsConnected(false);
        ws.onerror = (error) => console.error("WebSocket error:", error);

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.k && active) {
              const kline = message.k;
              const newCandle = formatKlineData([kline.t, kline.o, kline.h, kline.l, kline.c]);
              if (newCandle) {
                candleSeriesRef.current?.update(newCandle);
                setPriceData(prev => ({
                  current: parseFloat(kline.c),
                  high: Math.max(parseFloat(kline.h), prev.high || 0),
                  low: Math.min(parseFloat(kline.l), prev.low || Infinity),
                  open: parseFloat(kline.o),
                  change: parseFloat(kline.c) - parseFloat(kline.o),
                  changePercent: ((parseFloat(kline.c) - parseFloat(kline.o)) / parseFloat(kline.o)) * 100
                }));
              }
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
      } catch (error) {
        console.error("Error in fetchAndConnect:", error);
      }
    };

    fetchAndConnect();

    return () => {
      active = false;
      ws?.close();
    };
  }, [symbol, interval]);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSymbolSelect = () => {
    if (symbolInput.trim()) {
      setSymbol(symbolInput.trim().toUpperCase());
      setSearchSymbolDialogOpen(false);
    }
  };

  return (
    <>
      <Dialog open={searchSymbolDialogOpen} onOpenChange={setSearchSymbolDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Symbol</DialogTitle>
            <DialogDescription>Enter a new cryptocurrency trading pair</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="symbol" className="sr-only">Symbol</Label>
              <Input
                id="symbol"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="Enter symbol (e.g., BTCUSDT)"
                onKeyDown={(e) => e.key === 'Enter' && handleSymbolSelect()}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSymbolSelect} disabled={!symbolInput.trim()}>
              Change Symbol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={`p-4 relative border border-[${borderColor}] rounded-[10px]`}>
        {/* TradingView-like header */}
        <div className="flex flex-col mb-2">
          {/* First row */}
          <div className="flex items-center justify-between px-3 py-1">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <div
                  className={`${chartColors.buttonInactive} px-3 py-1 rounded-[10px] w-32 cursor-pointer border border-black hover:${borderColor} hover:bg-[rgba(132,130,130,0.1)] transition-all flex items-center justify-between`}
                  onClick={() => setSearchSymbolDialogOpen(true)}
                >
                  <img
                    src="/search.svg"
                    alt="Search"
                    className="w-4 h-4 opacity-70 hover:opacity-100"
                  />
                  <div className='flex-1 text-center'>{symbol}</div>
                </div>
              </div>
              <div className="flex space-x-1">
                {intervals.map((int) => (
                  <button
                    key={int}
                    className={`py-2 px-3 text-xs rounded-[10px] border border-[${borderColor}] hover:border-white hover:bg-black hover:bg-opacity-10 transition-all ${interval === int ? `text-white bg-black ${chartColors.buttonActive}` : `${chartColors.secondaryText}`} hover:text-white`}
                    onClick={() => setInterval(int)}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </div>

          {/* Second row */}
          <div className="flex items-center justify-between rounded-[10px] px-4 py-1 w-[35%]">
            <div className="text-xs">
              {symbol} • {interval}
            </div>
            <div className="flex items-center text-sm px-3 py-1">
              {(() => {
                const changePercent = isHovering
                  ? ((hoveredCandle?.close ?? 0) - (hoveredCandle?.open ?? 0)) /
                  (hoveredCandle?.open ?? 1) *
                  100
                  : priceData.changePercent ?? 0;

                const changeColor = changePercent >= 0 ? "text-green-500" : "text-red-500";

                return (
                  <>
                    <div className="flex items-center gap-2 mr-[1rem]">
                      <span>
                        {isHovering ? formatPrice(hoveredCandle?.close ?? 0) : formatPrice(priceData.current)}
                      </span>
                      <span className={changeColor}>
                        {changePercent >= 0 ? "+" : ""}
                        {formatPrice(changePercent)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span>
                        O
                        <span className={changeColor}>
                          {isHovering ? formatPrice(hoveredCandle?.open ?? 0) : formatPrice(priceData.open)}
                        </span>
                      </span>
                      <span>
                        H
                        <span className={changeColor}>
                          {isHovering ? formatPrice(hoveredCandle?.high ?? 0) : formatPrice(priceData.high)}
                        </span>
                      </span>
                      <span>
                        L
                        <span className={changeColor}>
                          {isHovering ? formatPrice(hoveredCandle?.low ?? 0) : formatPrice(priceData.low)}
                        </span>
                      </span>
                      <span>
                        C
                        <span className={changeColor}>
                          {isHovering ? formatPrice(hoveredCandle?.close ?? 0) : formatPrice(priceData.current)}
                        </span>
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>

        </div>

        <div ref={chartContainerRef} id="candleChart" className="w-full min-h-[500px]" />
      </div>
    </>
  );
};

export default CryptoChart;