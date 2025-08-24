import http from '@/lib/http';
import type {
  RunRequest,
  BacktestDetailDTO,
  BacktestListItem,
  IdResponse,
} from '@/types/backtest';

// POST /api/backtest (hoặc /api/backtest/run tùy backend)
export function createBacktest(body: RunRequest) {
  // đổi path nếu backend của bạn khác
  return http.post<IdResponse>('/backtest/run', body);
}

// GET /api/backtest
export function listBacktests() {
  return http.get<BacktestListItem[]>('/backtest');
}

// GET /api/backtest/:id
export function getBacktestDetail(id: string) {
  return http.get<BacktestDetailDTO>(`/backtest/${id}`);
}
