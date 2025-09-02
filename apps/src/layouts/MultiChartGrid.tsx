// components/layout/MultiChartGrid.tsx
import React from 'react';
import { CandleChart } from '@/components/chart/CandleChart';

type Props = {
  symbol: string;
  intervals: string[]; // ví dụ ['1m','15m','1h','4h']
  tickSize?: number; // có thể pass chung từ useExchangeInfo(symbol)
  borderColor?: string;
};

export const MultiChartGrid: React.FC<Props> = ({
  symbol,
  intervals,
  tickSize = 0.01,
  borderColor = 'rgba(132,130,130,0.37)',
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {intervals.map((int) => (
        <div
          key={int}
          className="p-4 border rounded-[10px]"
          style={{ borderColor }}
        >
          <CandleChart symbol={symbol} interval={int} tickSize={tickSize} />
        </div>
      ))}
    </div>
  );
};
