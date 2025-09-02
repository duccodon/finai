// SingleChartView.tsx

import React, { useState } from 'react';
import { ChartToolbar } from '@/components/chart/ChartToolbar';
import SearchSymbolDialog from '@/components/chart/SearchSymbolDialog';
import { CandleChart } from '@/components/chart/CandleChart';
import { useExchangeInfo } from '@/hooks/useExchangeInfo';

const intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
const borderColor = 'rgba(132,130,130,0.37)';

export const SingleChartView: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [dialogOpen, setDialogOpen] = useState(false);

  // indicator toggles
  const [maCrossOn, setMaCrossOn] = useState(false);
  const [rsiOn, setRsiOn] = useState(false);
  const [macdOn, setMacdOn] = useState(false);

  const meta = useExchangeInfo(symbol);

  return (
    <>
      <SearchSymbolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSymbolSelect={setSymbol}
        borderColor={borderColor}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <ChartToolbar
          symbol={symbol}
          onOpenSymbolDialog={() => setDialogOpen(true)}
          interval={interval}
          onChangeInterval={setInterval}
          intervals={intervals}
          maCrossOn={maCrossOn}
          setMaCrossOn={setMaCrossOn}
          rsiOn={rsiOn}
          setRsiOn={setRsiOn}
          macdOn={macdOn}
          setMacdOn={setMacdOn}
        />
      </div>

      {/* Main chart */}
      <div className="p-4 border rounded-[10px]" style={{ borderColor }}>
        <CandleChart
          symbol={symbol}
          interval={interval}
          tickSize={meta?.tickSize ?? 0.01}
          // sau này sẽ dùng maCrossOn để overlay MA fast/slow
        />
      </div>

      {/* RSI panel (placeholder) */}
      {rsiOn && (
        <div
          className="mt-4 p-3 border rounded-[10px] bg-white"
          style={{ borderColor }}
        >
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <div>RSI (14) • Threshold 30 / 70</div>
            <div className="opacity-70">value: --</div>
          </div>
          {/* vùng chart giả — thay bằng <RSIPanel .../> sau này */}
          <div className="w-full h-[220px] bg-[rgba(0,0,0,0.03)] rounded-md" />
        </div>
      )}

      {/* MACD panel (placeholder) */}
      {macdOn && (
        <div
          className="mt-4 p-3 border rounded-[10px] bg-white"
          style={{ borderColor }}
        >
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <div>MACD (12, 26, 9)</div>
            <div className="flex gap-4 opacity-70">
              <span>MACD: --</span>
              <span>Signal: --</span>
              <span>Hist: --</span>
            </div>
          </div>
          {/* vùng chart giả — thay bằng <MACDPanel .../> sau này */}
          <div className="w-full h-[220px] bg-[rgba(0,0,0,0.03)] rounded-md" />
        </div>
      )}
    </>
  );
};
