import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { createBacktest } from '@/services/backtestService';
import { useBacktestList } from '@/hooks/useBacktests';
import { StrategyParams } from '@/pages/Backtest/StrategyParams';
// formatter ngày giờ
const fmt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type StrategyType = 'MA_CROSS' | 'RSI_THRESHOLD' | 'MACD';

export default function BacktestHome() {
  const navigate = useNavigate();
  const { items, loading, error } = useBacktestList();

  const [strategyType, setStrategyType] = useState<StrategyType>('MA_CROSS');

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Lấy và ép kiểu từ form
    const symbol = String(fd.get('symbol') || 'BTCUSDT');
    const timeframe = String(fd.get('timeframe') || '1h');
    const start_date = String(fd.get('start_date') || '');
    const end_date = String(fd.get('end_date') || '');
    const initial = Number(fd.get('initial') || 10000);
    const position_pct = Number(fd.get('position_pct') || 50); // %
    const leverage = Number(fd.get('leverage') || 1);
    const fee_pct = Number(fd.get('fee_pct') || 0.1); // %
    const slippage_pct = Number(fd.get('slippage_pct') || 0); // %

    // stoploss/takeprofit có thể để trống => null
    const stop_loss_pct_raw = fd.get('stop_loss_pct');
    const take_profit_pct_raw = fd.get('take_profit_pct');

    const stop_loss_pct = stop_loss_pct_raw ? Number(stop_loss_pct_raw) : null; // %
    const take_profit_pct = take_profit_pct_raw
      ? Number(take_profit_pct_raw)
      : null; // %

    // pct → số thập phân
    const position_pct_num = position_pct / 100;
    const fee_pct_num = fee_pct / 100;
    const slippage_pct_num = slippage_pct / 100;
    const stop_loss_pct_num =
      stop_loss_pct && stop_loss_pct >= 1 ? stop_loss_pct / 100 : null;
    const take_profit_pct_num =
      take_profit_pct && take_profit_pct >= 1 ? take_profit_pct / 100 : null;

    // ==== Strategy params theo loại ====
    let strategy:
      | {
          type: 'MA_CROSS';
          params: { short_window: number; long_window: number };
        }
      | {
          type: 'RSI_THRESHOLD';
          params: { lower: number; upper: number; period: number };
        }
      | {
          type: 'MACD';
          params: { fast: number; slow: number; signal: number };
        };

    if (strategyType === 'MA_CROSS') {
      const short_window = Number(fd.get('short_window') || 50);
      const long_window = Number(fd.get('long_window') || 200);
      // (optional) FE-validate đơn giản
      if (
        !Number.isFinite(short_window) ||
        !Number.isFinite(long_window) ||
        short_window <= 0 ||
        long_window <= 0
      ) {
        alert('Short/Long window phải là số dương.');
        return;
      }
      if (short_window >= long_window) {
        alert('Short window phải nhỏ hơn Long window.');
        return;
      }
      strategy = {
        type: 'MA_CROSS',
        params: { short_window, long_window },
      };
    } else if (strategyType === 'RSI_THRESHOLD') {
      const lower = Number(fd.get('rsi_lower') || 30);
      const upper = Number(fd.get('rsi_upper') || 70);
      const period = Number(fd.get('rsi_period') || 14);

      // Validate Lower/Upper theo yêu cầu
      if (
        !Number.isFinite(lower) ||
        !Number.isFinite(upper) ||
        lower < 0 ||
        upper > 100
      ) {
        alert('RSI Lower/Upper phải nằm trong [0, 100].');
        return;
      }
      if (!(lower < upper)) {
        alert('RSI Lower phải nhỏ hơn RSI Upper.');
        return;
      }
      if (!Number.isFinite(period) || period <= 0) {
        alert('RSI Period phải là số dương.');
        return;
      }
      strategy = {
        type: 'RSI_THRESHOLD',
        params: { lower, upper, period },
      };
    } else if (strategyType === 'MACD') {
      strategy = {
        type: 'MACD',
        params: { fast: 12, slow: 26, signal: 9 },
      };
    } else {
      alert('Chiến lược không hợp lệ.');
      return;
    }

    // Body theo schema
    const body = {
      symbol,
      timeframe,
      start_date,
      end_date,
      capital: {
        initial,
        position_pct: position_pct_num,
        leverage,
        fee_pct: fee_pct_num,
      },
      backtest: {
        allow_short: true,
        order_type: 'market' as const,
        slippage_pct: slippage_pct_num,
        stop_loss_pct: stop_loss_pct_num ?? undefined,
        take_profit_pct: take_profit_pct_num ?? undefined,
      },
      strategy,
    };

    try {
      const res = await createBacktest(body);
      navigate(`/backtest/${res.run_id}`);
    } catch (err) {
      console.error('Create failed:', err);
      alert('Tạo backtest thất bại. Vui lòng thử lại.');
    }

    (e.target as HTMLFormElement).reset();
    setStrategyType('MA_CROSS'); // reset UI
  }

  if (loading) return <div>Đang tải…</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!items) return <div>Chưa có backtest nào.</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Backtest History</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create new backtest</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Backtest</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Set up market period, capital & costs, and strategy
                  parameters.
                </p>
              </DialogHeader>

              <form className="grid gap-6" onSubmit={handleCreate}>
                {/* ===== Layout 2 columns ===== */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* === Group 1: Market & Period === */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                      Market &amp; Period
                    </h4>
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label>Symbol</Label>
                          <Select name="symbol" defaultValue="BTCUSDT">
                            <SelectTrigger>
                              <SelectValue placeholder="Select symbol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                              <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1">
                          <Label>Timeframe</Label>
                          <Select name="timeframe" defaultValue="1h">
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1h">1h</SelectItem>
                              <SelectItem value="4h">4h</SelectItem>
                              <SelectItem value="1d">1d</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor="start_date">Start date</Label>
                          <Input
                            id="start_date"
                            name="start_date"
                            type="date"
                            required
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="end_date">End date</Label>
                          <Input
                            id="end_date"
                            name="end_date"
                            type="date"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* === Group 2: Capital & Costs === */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                      Capital &amp; Costs
                    </h4>
                    <div className="grid gap-3">
                      <div className="grid gap-1 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor="initial">
                            Initial Capital (USDT)
                          </Label>
                          <Input
                            id="initial"
                            name="initial"
                            type="number"
                            step="0.01"
                            defaultValue={10000}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="position_pct">Position %</Label>
                          <Input
                            id="position_pct"
                            name="position_pct"
                            type="number"
                            step="1"
                            defaultValue={50}
                          />
                        </div>
                      </div>

                      <div className="grid gap-1 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor="fee_pct">Fee %</Label>
                          <Input
                            id="fee_pct"
                            name="fee_pct"
                            type="number"
                            step="0.1"
                            defaultValue={0.1}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="slippage_pct">Slippage %</Label>
                          <Input
                            id="slippage_pct"
                            name="slippage_pct"
                            type="number"
                            step="0.1"
                            defaultValue={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* === Group 3: Strategy Config === */}
                  <div className="md:col-span-2 rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                      Strategy Configuration
                    </h4>

                    {/* Strategy Type */}
                    <div className="grid gap-1 md:max-w-xs">
                      <Label>Type</Label>
                      <Select
                        value={strategyType}
                        onValueChange={(v: StrategyType) => setStrategyType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MA_CROSS">MA_CROSS</SelectItem>
                          <SelectItem value="RSI_THRESHOLD">
                            RSI_THRESHOLD
                          </SelectItem>
                          <SelectItem value="MACD">MACD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Overlay params theo strategy */}
                    <StrategyParams strategyType={strategyType} />

                    {/* SL / TP */}
                    <div className="grid gap-3 md:grid-cols-2 mt-4">
                      <div className="grid gap-1">
                        <Label htmlFor="stop_loss_pct">Stop loss %</Label>
                        <Input
                          id="stop_loss_pct"
                          name="stop_loss_pct"
                          type="number"
                          step="1"
                          min={1}
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="take_profit_pct">Take profit %</Label>
                        <Input
                          id="take_profit_pct"
                          name="take_profit_pct"
                          type="number"
                          step="1"
                          min={1}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2">
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, index) => (
                <TableRow key={row.run_id}>
                  <TableCell>{index}</TableCell>
                  <TableCell className="font-medium">{row.strategy}</TableCell>
                  <TableCell>{row.symbol}</TableCell>
                  <TableCell>{row.timeframe}</TableCell>
                  <TableCell>{fmt.format(new Date(row.created_at))}</TableCell>
                  <TableCell>
                    {fmt.format(new Date(row.start))} -{'> '}
                    {fmt.format(new Date(row.end))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/backtest/${row.run_id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
