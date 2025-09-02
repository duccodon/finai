// components/chart/ChartToolbar.tsx
import React, { useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type Props = {
  symbol: string;
  onOpenSymbolDialog: () => void;
  interval: string;
  onChangeInterval: (v: string) => void;
  intervals: string[];
  isConnected?: boolean;
  borderColor?: string;
  setMaCrossOn: (v: boolean) => void;
  maCrossOn: boolean;
  setRsiOn: (v: boolean) => void;
  rsiOn: boolean;
  setMacdOn: (v: boolean) => void;
  macdOn: boolean;
};
// shadcn
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export const ChartToolbar: React.FC<Props> = ({
  symbol,
  onOpenSymbolDialog,
  interval,
  onChangeInterval,
  intervals,
  borderColor = 'rgba(132,130,130,0.37)',
  setMaCrossOn,
  maCrossOn,
  setRsiOn,
  rsiOn,
  setMacdOn,
  macdOn,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 mb-3">
      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1 rounded-[10px] w-40 cursor-pointer border transition-all flex items-center justify-between`}
          style={{ borderColor }}
          onClick={onOpenSymbolDialog}
        >
          <img src="/search.svg" alt="Search" className="w-4 h-4 opacity-70" />
          <div className="flex-1 text-center truncate ml-2">{symbol}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Select value={interval} onValueChange={onChangeInterval}>
            <SelectTrigger
              className="w-fit rounded-[10px]"
              style={{ borderColor }}
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
        {/* Indicators dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild style={{ borderColor }}>
            <Button variant="outline" className="rounded-[10px]">
              Indicators
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Indicators</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* MA Cross */}
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()} // đừng đóng khi bấm switch
              className="flex items-center justify-between"
            >
              <span>MA Cross</span>
              <Switch checked={maCrossOn} onCheckedChange={setMaCrossOn} />
            </DropdownMenuItem>

            {/* RSI Threshold */}
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex items-center justify-between"
            >
              <span>RSI Threshold</span>
              <Switch checked={rsiOn} onCheckedChange={setRsiOn} />
            </DropdownMenuItem>

            {/* MACD */}
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex items-center justify-between"
            >
              <span>MACD</span>
              <Switch checked={macdOn} onCheckedChange={setMacdOn} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
