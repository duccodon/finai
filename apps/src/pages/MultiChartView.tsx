// pages-or-views/MultiChartView.tsx
import React, { useState } from 'react';
import SearchSymbolDialog from '@/components/chart/SearchSymbolDialog';
import { MultiChartGrid } from '@/layouts/MultiChartGrid';
import { useExchangeInfo } from '@/hooks/useExchangeInfo';

const defaultIntervals = ['1m', '15m', '1h', '4h'];
const borderColor = 'rgba(132,130,130,0.37)';

export const MultiChartView: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [dialogOpen, setDialogOpen] = useState(false);

  const meta = useExchangeInfo(symbol);

  return (
    <>
      {/* Chỉ chọn symbol một lần, khóa cho 4 charts */}
      <SearchSymbolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSymbolSelect={setSymbol}
        borderColor={borderColor}
      />

      <div className="flex items-center justify-between px-3 py-2 mb-3">
        <div
          className={`px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-between`}
          style={{ borderColor }}
          onClick={() => setDialogOpen(true)}
        >
          <img src="/search.svg" alt="Search" className="w-4 h-4 opacity-70" />
          <div className="flex-1 text-center truncate ml-2">{symbol}</div>
        </div>
        <div className="text-sm text-gray-500">
          Multi-chart · 1 symbol / 4 intervals
        </div>
      </div>

      <MultiChartGrid
        symbol={symbol}
        intervals={defaultIntervals}
        tickSize={meta?.tickSize ?? 0.01}
        borderColor={borderColor}
      />
    </>
  );
};
