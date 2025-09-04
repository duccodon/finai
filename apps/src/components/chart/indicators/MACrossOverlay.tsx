// components/overlays/MACrossOverlay.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChart } from '@/contexts/ChartContext';
import { emaArray } from '@/lib/indicators';

export const MACrossOverlay: React.FC<{
  fast?: number;
  slow?: number;
  visible?: boolean;
  fastColor?: string;
  slowColor?: string;
}> = ({
  fast = 12,
  slow = 26,
  visible = true,
  fastColor = '#1e88e5',
  slowColor = '#f9a825',
}) => {
  const {
    registerLineSeries,
    removeSeries,
    getTimesMs,
    getCloses,
    onRealtime,
    onHistory,
    getOverlayRoot,
  } = useChart();

  // ✅ chờ DOM gắn ref xong
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(getOverlayRoot());
    // phòng ngừa: thử lại 1 nhịp nếu lần đầu null
    if (!getOverlayRoot()) {
      const id = requestAnimationFrame(() => setPortalTarget(getOverlayRoot()));
      return () => cancelAnimationFrame(id);
    }
  }, [getOverlayRoot]);

  useEffect(() => {
    if (!visible) return;

    const fastSeries = registerLineSeries({ color: fastColor, lineWidth: 2 });
    const slowSeries = registerLineSeries({ color: slowColor, lineWidth: 2 });

    const computeAndSet = () => {
      const times = getTimesMs();
      const closes = getCloses();
      if (!times.length) return;
      const emaF = emaArray(closes, fast);
      const emaS = emaArray(closes, slow);
      fastSeries.setData(
        times.map((t, i) => ({
          time: Math.floor(t / 1000) as any,
          value: emaF[i],
        }))
      );
      slowSeries.setData(
        times.map((t, i) => ({
          time: Math.floor(t / 1000) as any,
          value: emaS[i],
        }))
      );
    };

    // vẽ ngay nếu có lịch sử
    computeAndSet();
    // vẽ lại khi bulk lịch sử về
    const offHistory = onHistory(computeAndSet);
    // update điểm cuối theo realtime
    const offRealtime = onRealtime((tSec) => {
      const closes = getCloses();
      const i = closes.length - 1;
      if (i < 0) return;
      const emaF = emaArray(closes, fast)[i];
      const emaS = emaArray(closes, slow)[i];
      fastSeries.update({ time: tSec as any, value: emaF });
      slowSeries.update({ time: tSec as any, value: emaS });
    });

    return () => {
      offRealtime?.();
      offHistory?.();
      removeSeries(fastSeries);
      removeSeries(slowSeries);
    };
  }, [
    visible,
    fast,
    slow,
    fastColor,
    slowColor,
    registerLineSeries,
    removeSeries,
    getTimesMs,
    getCloses,
    onRealtime,
    onHistory,
  ]);

  if (!visible || !portalTarget) return null;

  // Legend UI
  return createPortal(
    <div className="absolute top-1 left-1 pointer-events-auto p-3">
      <div className="flex items-center gap-3 rounded-md bg-white/85 backdrop-blur py-1 shadow text-[11px] leading-none">
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-4 rounded"
            style={{ background: fastColor }}
          />
          <span>EMA {fast}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-4 rounded"
            style={{ background: slowColor }}
          />
          <span>EMA {slow}</span>
        </div>
      </div>
    </div>,
    portalTarget
  );
};
