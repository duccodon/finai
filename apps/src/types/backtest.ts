// ==== INPUT (request to create/run) ====
export type RunRequest = {
  symbol: string;
  timeframe: string;
  start_date: string; // ISO yyyy-mm-dd
  end_date: string; // ISO yyyy-mm-dd
  capital: {
    initial: number;
    position_pct: number;
    leverage: number;
    fee_pct: number;
  };
  backtest: {
    allow_short: boolean;
    order_type: 'market';
    slippage_pct: number;
    stop_loss_pct?: number;
    take_profit_pct?: number;
  };
  strategy: {
    type: 'MA_CROSS' | 'RSI_THRESHOLD' | 'BREAKOUT';
    params: Record<string, any>; // e.g. { short_window: number, long_window: number }
  };
};

// ==== OUTPUT (backend → FE) ====
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
  reason: 'SignalChange' | 'StopLoss' | 'TakeProfit';
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

export type BacktestListItem = SummaryDTO & {
  run_id: string;
  created_at: string; // ISO
};

export type BacktestDetailDTO = {
  run_id: string;
  created_at: string; // ISO
  summary: SummaryDTO;
  params: any; // có thể type-safe sau
};

// List item tuỳ backend của bạn trả gì (mock trước)

export interface EquityPoint {
  t: string;
  eq: number;
}

// Common API response shapes (nếu cần)
export type IdResponse = { run_id: string };
