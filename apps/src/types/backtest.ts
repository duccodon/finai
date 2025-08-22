// ===== OUTPUT types (match backend schema) =====
export type TradeDTO = {
  id: number;
  side: 'LONG' | 'SHORT';
  size: number;
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  pnl: number;
  return_pct: number;
  duration: string;
  reason: 'Signal' | 'StopLoss' | 'TakeProfit';
};

export type SummaryDTO = {
  symbol: string;
  timeframe: string;
  start: string;
  end: string;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  buy_and_hold_return_pct: number;
  max_drawdown_pct: number;
  profit_factor: number;
  num_trades: number;
  win_rate_pct: number;
};

export type BacktestDetailDTO = {
  summary: SummaryDTO;
  trades: TradeDTO[];
};
