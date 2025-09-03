// SingleChartView.tsx

import React, { useState } from 'react';
import { ChartToolbar } from '@/components/chart/ChartToolbar';
import SearchSymbolDialog from '@/components/chart/SearchSymbolDialog';
import { CandleChart } from '@/components/chart/CandleChart';
import { useExchangeInfo } from '@/hooks/useExchangeInfo';
import { MACrossOverlay } from '@/components/chart/indicators/MACrossOverlay';
import { RSIPanel } from '@/components/chart/indicators/RSIPanel';
import { MACDPanel } from '@/components/chart/indicators/MACDPanel';
const intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
const borderColor = 'rgba(132,130,130,0.37)';

export const SingleChartView: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('5m');
  const [dialogOpen, setDialogOpen] = useState(false);

  // indicator toggles
  const [maCrossOn, setMaCrossOn] = useState(false);
  const [rsiOn, setRsiOn] = useState(false);
  const [macdOn, setMacdOn] = useState(false);

  const meta = useExchangeInfo(symbol);
  console.log(maCrossOn);
  return (
    <>
      <SearchSymbolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSymbolSelect={setSymbol}
        borderColor={borderColor}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between">
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
        >
          {' '}
          {<MACrossOverlay fast={30} slow={90} visible={maCrossOn} />}
          {/* RSI panel (placeholder) */}
          {rsiOn && <RSIPanel period={14} />}
          {macdOn && <MACDPanel fast={12} slow={26} signal={9} />}
        </CandleChart>
      </div>
    </>
  );
};
