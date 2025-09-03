// components/chart/ChartContext.ts
import { createContext, useContext } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

export type RealtimeHandler = (tSec: number, close: number) => void;

export type ChartContextValue = {
  chart: IChartApi;
  priceSeries: ISeriesApi<'Candlestick'>;

  // xin line series overlay trên main chart
  registerLineSeries: (
    opts?: Parameters<IChartApi['addSeries']>[1]
  ) => ISeriesApi<'Line'>;
  removeSeries: (s: ISeriesApi<any>) => void;

  // đọc buffer lịch sử (times ms + closes)
  getTimesMs: () => number[];
  getCloses: () => number[];

  // đăng ký nhận realtime (trả unsubscribe)
  onRealtime: (fn: RealtimeHandler) => () => void;
  onHistory: (fn: () => void) => () => void;
  // tiện ích khác nếu cần
  tickSize: number;
  //cung cấp overlay root để vẽ legend
  getOverlayRoot: () => HTMLDivElement | null;
};

export const ChartContext = createContext<ChartContextValue | null>(null);
export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx)
    throw new Error('useChart must be used within <ChartContext.Provider>');
  return ctx;
};
