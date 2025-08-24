import http from '@/lib/http';
import type {
  RunRequest,
  BacktestDetailDTO,
  BacktestListItem,
  IdResponse,
  TradeDTO,
  EquityPoint,
} from '@/types/backtest';

// POST /api/backtest (hoặc /api/backtest/run tùy backend)
export function createBacktest(body: RunRequest) {
  // đổi path nếu backend của bạn khác
  return http.post<IdResponse>('/backtest/run', body);
}

// GET /api/backtest
export function listBacktests() {
  return http.get<BacktestListItem[]>('/backtest/');
}

export function getRunDetail(runId: string) {
  return http.get<BacktestDetailDTO>(`/backtest/${runId}/detail`);
}

export function getTrades(runId: string, page = 1, size = 200) {
  return http.get<{
    items: TradeDTO[];
    page: number;
    size: number;
    total: number;
    has_more: boolean;
  }>(`/backtest/${runId}/trades`, { params: { page, size } });
}

export function getEquity(runId: string) {
  return http.get<EquityPoint[]>(`/backtest/${runId}/equity`);
  // sau này có thể thêm params { from, to }
}
