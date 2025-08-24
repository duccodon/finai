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
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { createBacktest } from '@/services/backtestService';
import { useBacktestList } from '@/hooks/useBacktests';

// formatter ngày giờ
const fmt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
export default function BacktestHome() {
  const navigate = useNavigate();
  const { items, loading, error } = useBacktestList();
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Lấy và ép kiểu từ form
    const symbol = String(fd.get('symbol') || 'BTCUSDT');
    const timeframe = String(fd.get('timeframe') || '1h');
    const start_date = String(fd.get('start_date') || '');
    const end_date = String(fd.get('end_date') || '');
    const initial = Number(fd.get('initial') || 10000);
    const position_pct = Number(fd.get('position_pct') || 0.5);
    const leverage = Number(fd.get('leverage') || 1);
    const fee_pct = Number(fd.get('fee_pct') || 0.001);

    const allow_short = fd.get('allow_short') === 'on'; // checkbox
    const slippage_pct = Number(fd.get('slippage_pct') || 0);
    const stop_loss_pct = fd.get('stop_loss_pct')
      ? Number(fd.get('stop_loss_pct'))
      : null;
    const take_profit_pct = fd.get('take_profit_pct')
      ? Number(fd.get('take_profit_pct'))
      : null;

    const short_window = Number(fd.get('short_window') || 50);
    const long_window = 200; // default tạm thời

    // Body theo schema
    const body = {
      symbol,
      timeframe,
      start_date,
      end_date,
      capital: { initial, position_pct, leverage, fee_pct },
      backtest: {
        allow_short,
        order_type: 'market' as const,
        slippage_pct,
        stop_loss_pct: stop_loss_pct ?? undefined,
        take_profit_pct: take_profit_pct ?? undefined,
      },
      strategy: {
        type: 'MA_CROSS' as const,
        params: { short_window, long_window },
      },
    };

    // Create new backtest
    try {
      const res = await createBacktest(body);
      console.log('Created backtest:', res);
      navigate(`/backtest/${res.run_id}`);
    } catch (err) {
      console.error('Create failed:', err);
    }
    // Debug xem body khớp chưa
    console.log('CreateBacktest (mock) body:', body);

    // Option: reset form hoặc đóng dialog (tuỳ bạn)
    (e.target as HTMLFormElement).reset();
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
                      {/* Symbol + Timeframe */}
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

                      {/* Dates */}
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

                      {/* Allow short */}
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox id="allow_short" name="allow_short" />
                        <Label htmlFor="allow_short">Allow short</Label>
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
                          <Label htmlFor="initial">Initial</Label>
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
                            step="0.01"
                            defaultValue={0.5}
                          />
                        </div>
                      </div>

                      <div className="grid gap-1 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor="leverage">Leverage</Label>
                          <Input
                            id="leverage"
                            name="leverage"
                            type="number"
                            step="0.01"
                            defaultValue={1}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="fee_pct">Fee %</Label>
                          <Input
                            id="fee_pct"
                            name="fee_pct"
                            type="number"
                            step="0.0001"
                            defaultValue={0.001}
                          />
                        </div>
                      </div>

                      <div className="grid gap-1">
                        <Label htmlFor="slippage_pct">Slippage %</Label>
                        <Input
                          id="slippage_pct"
                          name="slippage_pct"
                          type="number"
                          step="0.0001"
                          defaultValue={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* === Group 3: Strategy Config === */}
                  <div className="md:col-span-2 rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                      Strategy Configuration
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="grid gap-1">
                        <Label>Type</Label>
                        <Input value="MA_CROSS" disabled />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="short_window">Short window</Label>
                        <Input
                          id="short_window"
                          name="short_window"
                          type="number"
                          defaultValue={50}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="long_window">Long window</Label>
                        <Input
                          id="long_window"
                          name="long_window"
                          type="number"
                          defaultValue={200}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 mt-3">
                      <div className="grid gap-1">
                        <Label htmlFor="stop_loss_pct">Stop loss %</Label>
                        <Input
                          id="stop_loss_pct"
                          name="stop_loss_pct"
                          type="number"
                          step="0.0001"
                          placeholder="0.03"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="take_profit_pct">Take profit %</Label>
                        <Input
                          id="take_profit_pct"
                          name="take_profit_pct"
                          type="number"
                          step="0.0001"
                          placeholder="0.03"
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
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, index) => (
                <TableRow key={row.run_id}>
                  <TableCell>{index}</TableCell>
                  <TableCell className="font-medium">{row.run_id}</TableCell>
                  <TableCell>{row.symbol}</TableCell>
                  <TableCell>{row.timeframe}</TableCell>
                  <TableCell>{fmt.format(new Date(row.created_at))}</TableCell>
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
