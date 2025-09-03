// components/chart/IntervalConfigDialog.tsx
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intervals: string[]; // current 4 items
  onChangeIntervals: (next: string[]) => void;
};

const ALL_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const label = (i: number) => `Slot ${i + 1}`;

const ensureLen = (arr: string[], len = 4) => {
  const copy = [...arr];
  while (copy.length < len) copy.push('1m');
  return copy.slice(0, len);
};

const IntervalConfigDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  intervals,
  onChangeIntervals,
}) => {
  const [draft, setDraft] = useState<string[]>(ensureLen(intervals));

  useEffect(() => {
    if (open) setDraft(ensureLen(intervals));
  }, [open, intervals]);

  const updateAt = (idx: number, value: string) => {
    setDraft((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleSave = () => {
    onChangeIntervals(ensureLen(draft));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Configure intervals</DialogTitle>
          <DialogDescription>
            Chọn 4 khung thời gian cho multi-chart grid.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {ensureLen(draft).map((val, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="text-xs text-gray-500">{label(idx)}</div>
              <Select value={val} onValueChange={(v) => updateAt(idx, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_INTERVALS.map((it) => (
                    <SelectItem key={it} value={it}>
                      {it}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntervalConfigDialog;
