import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StrategyType = 'MA_CROSS' | 'RSI_THRESHOLD' | 'MACD';
export function StrategyParams({
  strategyType,
}: {
  strategyType: StrategyType;
}) {
  switch (strategyType) {
    case 'MA_CROSS':
      return (
        <div className="grid gap-3 md:grid-cols-3 mt-3">
          <div className="grid gap-1">
            <Label htmlFor="short_window">Short window</Label>
            <Input
              key={strategyType + '_short_window'}
              id="short_window"
              name="short_window"
              type="number"
              min={1}
              defaultValue={50}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="long_window">Long window</Label>
            <Input
              key={strategyType + '_long_window'}
              id="long_window"
              name="long_window"
              type="number"
              min={1}
              defaultValue={200}
            />
          </div>
          <div className="grid gap-1 opacity-0 pointer-events-none">
            {/* chừa chỗ cho layout */}
            <Input tabIndex={-1} aria-hidden />
          </div>
        </div>
      );

    case 'RSI_THRESHOLD':
      return (
        <div className="grid gap-3 md:grid-cols-3 mt-3">
          <div className="grid gap-1">
            <Label htmlFor="rsi_lower">RSI Lower (0–100)</Label>
            <Input
              key={strategyType + '_rsi_lower'}
              id="rsi_lower"
              name="rsi_lower"
              type="number"
              min={0}
              max={100}
              step="1"
              defaultValue={30}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rsi_upper">RSI Upper (0–100)</Label>
            <Input
              key={strategyType + '_rsi_upper'}
              id="rsi_upper"
              name="rsi_upper"
              type="number"
              min={0}
              max={100}
              step="1"
              defaultValue={70}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rsi_period">RSI Period</Label>
            <Input
              id="rsi_period"
              name="rsi_period"
              type="number"
              min={1}
              step="1"
              defaultValue={14}
            />
          </div>
        </div>
      );

    case 'MACD':
      return (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            MACD strategy with fixed parameters: Fast EMA = 12, Slow EMA = 26,
            Signal = 9
          </p>
        </div>
      );

    default:
      return null;
  }
}
