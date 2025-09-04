// pages-or-views/MultiChartView.tsx
import React, { useState } from 'react';
import SearchSymbolDialog from '@/components/chart/SearchSymbolDialog';
import { MultiChartGrid } from '@/layouts/MultiChartGrid';
import { useExchangeInfo } from '@/hooks/useExchangeInfo';
import { SwitchToSingleButton } from '@/components/chart/ViewSwitchButtons';
import IntervalConfigDialog from '@/components/chart/IntervalConfigDialog';
import { Clock } from 'lucide-react';
import ChatPanel from '@/components/chat/ChatPanel';


const defaultIntervals = ['1m', '15m', '1h', '4h'] as const;
const borderColor = 'rgba(132,130,130,0.37)';

type Props = {
  onSwitchToSingleView: () => void;
};

export const MultiChartView: React.FC<Props> = ({ onSwitchToSingleView }) => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [intervalConfigOpen, setIntervalConfigOpen] = useState(false);
  const [intervals, setIntervals] = useState<string[]>([...defaultIntervals]);

  const meta = useExchangeInfo(symbol);

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-3">
          {/* Symbol picker trigger */}
          <div
            className="px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-between hover:bg-gray-50"
            style={{ borderColor }}
            onClick={() => setDialogOpen(true)}
          >
            <img
              src="/search.svg"
              alt="Search"
              className="w-4 h-4 opacity-70"
            />
            <div className="flex-1 text-center truncate ml-2">{symbol}</div>
          </div>

          {/* Interval config trigger */}
          <div
            className="px-3 py-1 rounded-[10px] cursor-pointer border transition-all flex items-center justify-between hover:bg-gray-50"
            style={{ borderColor }}
            onClick={() => setIntervalConfigOpen(true)}
          >
            <Clock className="w-4 h-4 opacity-70" />
            <div className=" ml-2">Intervals Config</div>
          </div>
        </div>

        <div className='right-4 top-4 z-20 flex items-center gap-2'>
          {/* Switch to single view */}
          <SwitchToSingleButton onClick={onSwitchToSingleView} />
          <ChatPanel symbol={symbol}/>
        </div>
      </div>

      {/* Dialogs */}
      <SearchSymbolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSymbolSelect={setSymbol}
        borderColor={borderColor}
      />

      <IntervalConfigDialog
        open={intervalConfigOpen}
        onOpenChange={setIntervalConfigOpen}
        intervals={intervals}
        onChangeIntervals={setIntervals}
      />

      {/* Grid */}
      <MultiChartGrid
        symbol={symbol}
        intervals={intervals} // <-- dùng intervals từ state (không phải default cứng)
        tickSize={meta?.tickSize ?? 0.01}
        borderColor={borderColor}
      />
    </>
  );
};

export default MultiChartView;
