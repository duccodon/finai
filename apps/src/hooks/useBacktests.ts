// hooks/useBacktests.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listBacktests,
  getRunDetail,
  getTrades,
  getEquity,
} from '@/services/backtestService';
import type {
  BacktestListItem,
  BacktestDetailDTO,
  TradeDTO,
  EquityPoint,
} from '@/types/backtest';

export function useBacktestList() {
  const [items, setItems] = useState<BacktestListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBacktests();
      setItems(res);
      console.log('Fetched backtests:', res);
      setError(null);
    } catch (e) {
      console.error('listBacktests failed:', e);
      // QUAN TRỌNG: đừng xoá items đang có
      setError('Failed to fetch backtests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { items, loading, error, refetch: fetchList };
}

export function useRunDetail(runId: string | null) {
  const [run, setRun] = useState<BacktestDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      setRun(await getRunDetail(runId));
      setErr(null);
    } catch {
      setErr('Failed to fetch run');
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);
  return { run, loading, err, refetch: fetchRun };
}

export function useTrades(runId: string | null, page = 1, size = 200) {
  const [items, setItems] = useState<TradeDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchTrades = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const res = await getTrades(runId, page, size);
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [runId, page, size]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);
  return { items, total, loading, refetch: fetchTrades };
}

export function useEquity(runId: string | null) {
  const [data, setData] = useState<EquityPoint[]>([]); // 👈 mặc định []
  const [loading, setLoading] = useState(false);

  const fetchEquity = useCallback(async () => {
    if (!runId) {
      setData([]);
      return;
    } // 👈 giữ [] khi chưa có id
    setLoading(true);
    try {
      const res = await getEquity(runId);
      setData(res ?? []); // 👈 phòng trường hợp BE trả null/undefined
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchEquity();
  }, [fetchEquity]);
  return { data, loading, refetch: fetchEquity };
}
