import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toNumberSafe = (s: string) => Number(s);

export const decimalsFromTick = (tick: number) => {
  if (!isFinite(tick) || tick <= 0) return 2;
  const s = tick.toString();
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
};

export const roundToTick = (price: number | null | undefined, tick = 0.01) => {
  if (price == null || !isFinite(price)) return null;
  if (!tick || tick <= 0) return price;
  const n = Math.round(price / tick) * tick;
  return Number(n.toFixed(decimalsFromTick(tick)));
};

export const formatByTick = (price: number | null | undefined, tick = 0.01) => {
  if (price == null || !isFinite(price)) return '-';
  const decimals = decimalsFromTick(tick);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundToTick(price, tick)!);
};
