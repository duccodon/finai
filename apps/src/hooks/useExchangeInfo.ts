// hooks/useExchangeInfo.ts
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toNumberSafe } from '@/lib/utils';

export type SymbolMeta = { tickSize: number; stepSize: number };

export const useExchangeInfo = (symbol: string) => {
  const [meta, setMeta] = useState<SymbolMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await axios.get(
          'https://api.binance.com/api/v3/exchangeInfo',
          {
            params: { symbol: symbol.toUpperCase() },
          }
        );
        const info = res.data?.symbols?.[0];
        if (!info) return;

        const priceFilter = info.filters?.find(
          (f: any) => f.filterType === 'PRICE_FILTER'
        );
        const lotFilter = info.filters?.find(
          (f: any) => f.filterType === 'LOT_SIZE'
        );

        const tickSize = toNumberSafe(priceFilter?.tickSize ?? '0.01');
        const stepSize = toNumberSafe(lotFilter?.stepSize ?? '1');

        if (!cancelled) setMeta({ tickSize, stepSize });
      } catch {
        if (!cancelled) setMeta({ tickSize: 0.01, stepSize: 1 });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return meta;
};
