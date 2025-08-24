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
  CartesianGrid,
  Brush,
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TradeDTO } from '@/types/backtest';
import { useRunDetail, useEquity, useTrades } from '@/hooks/useBacktests';
import { useMemo } from 'react';
import { fmtDT, fmtD, num, pct } from '@/lib/date';

export default function BacktestDetailPage() {
  //router
  const { id } = useParams();
  const navigate = useNavigate();

  //real data
  const { run, loading: runLoading } = useRunDetail(id || null);
  const { data: equity, loading: eqLoading } = useEquity(id || null);
  const { items: trades, loading: tradesLoading } = useTrades(id || null);

  const s = run?.summary;

  const timeFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });

  const equityData = useMemo(
    () => (equity ?? []).map((p) => ({ ...p, ts: new Date(p.t).getTime() })),
    [equity]
  );
  if (runLoading || eqLoading || tradesLoading) return <div>Loading...</div>;
  if (!run) return <div>Run not found</div>;
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
          Backtest #{id} — {s?.symbol} ({s?.timeframe})
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
              <LineChart
                data={equityData}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ts) => timeFmt.format(ts as number)}
                  interval="preserveStartEnd"
                  minTickGap={40}
                  tickCount={6}
                />
                <YAxis tickCount={6} allowDecimals={false} width={60} />
                <RTooltip
                  labelFormatter={(ts) => fmtDT(ts)}
                  formatter={(v) => [
                    Number(v).toLocaleString('vi-VN'),
                    'Equity',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="eq"
                  dot={false}
                  strokeWidth={1.6}
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="ts"
                  height={20}
                  travellerWidth={10}
                  tickFormatter={(ts) => timeFmt.format(ts as number)}
                />
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
                          {fmtDT(t.entry_time)}
                        </TableCell>
                        <TableCell>{num(t.entry_price, 2)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtDT(t.exit_time)}
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
            <CardContent>{s?.total_return_pct}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Max Drawdown</CardTitle>
            </CardHeader>
            <CardContent>{s?.max_drawdown_pct}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Win Rate</CardTitle>
            </CardHeader>
            <CardContent>{s?.win_rate_pct}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit Factor</CardTitle>
            </CardHeader>
            <CardContent>{s?.profit_factor}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Final Equity</CardTitle>
            </CardHeader>
            <CardContent>{s?.final_equity}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Initial Capital</CardTitle>
            </CardHeader>
            <CardContent>{s?.initial_capital}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buy & Hold Return</CardTitle>
            </CardHeader>
            <CardContent>{s?.buy_and_hold_return_pct}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>#Trades</CardTitle>
            </CardHeader>
            <CardContent>{s?.num_trades}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Period</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {fmtD(s?.start)} → {fmtD(s?.end)}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
