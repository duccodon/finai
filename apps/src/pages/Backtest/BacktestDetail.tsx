import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { BacktestDetailDTO, TradeDTO } from '@/types/backtest';

// ===== MOCK OUTPUT (khớp schema backend) =====
const mockDetail: BacktestDetailDTO = {
  summary: {
    symbol: 'BTCUSDT',
    timeframe: '1h',
    start: '2025-08-01',
    end: '2025-08-22',
    initial_capital: 10000,
    final_equity: 10550,
    total_return_pct: 5.5,
    buy_and_hold_return_pct: 4.2,
    max_drawdown_pct: -3.1,
    profit_factor: 1.45,
    num_trades: 10,
    win_rate_pct: 54,
  },
  trades: [
    {
      id: 1,
      side: 'LONG',
      size: 0.1,
      entry_time: '2025-08-20 10:00',
      entry_price: 60000,
      exit_time: '2025-08-20 16:00',
      exit_price: 60500,
      pnl: 50,
      return_pct: 0.5,
      duration: '6h',
      reason: 'Signal',
    },
    {
      id: 2,
      side: 'SHORT',
      size: 0.1,
      entry_time: '2025-08-21 09:00',
      entry_price: 61000,
      exit_time: '2025-08-21 12:00',
      exit_price: 60700,
      pnl: 30,
      return_pct: 0.3,
      duration: '3h',
      reason: 'TakeProfit',
    },
    // ... thêm vài mock trade nếu muốn
  ],
};

// Chart equity (mock tạm)
const mockEquity = [
  { t: 'Day 1', eq: 10000 },
  { t: 'Day 2', eq: 10120 },
  { t: 'Day 3', eq: 9900 },
  { t: 'Day 4', eq: 10550 },
];

// helpers format
const pct = (v: number, d = 2) => `${v.toFixed(d)}%`;
const num = (v: number, d = 2) => v.toFixed(d);

export default function BacktestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const s = mockDetail.summary;
  const trades = mockDetail.trades;

  return (
    <Tabs defaultValue="chart" className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/backtest')}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h2 className="text-xl font-semibold">
          Backtest #{id} — {s.symbol} ({s.timeframe})
        </h2>
      </div>

      <TabsList>
        <TabsTrigger value="chart">Equity Chart</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
      </TabsList>

      {/* CHART + TRADES */}
      <TabsContent value="chart" className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Equity</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEquity}>
                <XAxis dataKey="t" />
                <YAxis />
                <RTooltip />
                <Line type="monotone" dataKey="eq" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trades History</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-64">
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        ID
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Side
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Size
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Entry Time
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Entry Price
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Exit Time
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Exit Price
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        PNL
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Return %
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Duration
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-background">
                        Reason
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((t: TradeDTO) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.id}</TableCell>
                        <TableCell>{t.side}</TableCell>
                        <TableCell>{num(t.size, 4)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {t.entry_time}
                        </TableCell>
                        <TableCell>{num(t.entry_price, 2)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {t.exit_time}
                        </TableCell>
                        <TableCell>{num(t.exit_price, 2)}</TableCell>
                        <TableCell
                          className={
                            t.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {num(t.pnl, 2)}
                        </TableCell>
                        <TableCell
                          className={
                            t.return_pct >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {pct(t.return_pct)}
                        </TableCell>
                        <TableCell>{t.duration}</TableCell>
                        <TableCell>{t.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* SUMMARY */}
      <TabsContent value="summary">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Return</CardTitle>
            </CardHeader>
            <CardContent>{pct(s.total_return_pct)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Max Drawdown</CardTitle>
            </CardHeader>
            <CardContent>{pct(s.max_drawdown_pct)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Win Rate</CardTitle>
            </CardHeader>
            <CardContent>{pct(s.win_rate_pct)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit Factor</CardTitle>
            </CardHeader>
            <CardContent>{num(s.profit_factor, 2)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Final Equity</CardTitle>
            </CardHeader>
            <CardContent>{num(s.final_equity, 2)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Initial Capital</CardTitle>
            </CardHeader>
            <CardContent>{num(s.initial_capital, 2)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buy & Hold Return</CardTitle>
            </CardHeader>
            <CardContent>{pct(s.buy_and_hold_return_pct)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>#Trades</CardTitle>
            </CardHeader>
            <CardContent>{s.num_trades}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Period</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {s.start} → {s.end}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
