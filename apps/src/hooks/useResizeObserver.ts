// hooks/useResizeObserver.ts
import { useEffect, useState } from 'react';

export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<T | null>
) {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { inlineSize: width, blockSize: height } =
        // @ts-ignore
        entry.contentBoxSize?.[0] || entry.contentRect;
      setSize({
        width: Math.round(width || entry.contentRect.width),
        height: Math.round(height || entry.contentRect.height),
      });
      console.log('resize', width, height);
    });

    ro.observe(el);
    // kích hoạt 1 lần lúc mount
    setSize({
      width: el.clientWidth,
      height: el.clientHeight,
    });

    return () => ro.disconnect();
  }, [ref]);

  return size;
}
