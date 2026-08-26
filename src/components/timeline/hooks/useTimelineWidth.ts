import { useState, useEffect, RefObject } from 'react';

/**
 * Hook to dynamically track and observe the width of the right timeline track area.
 */
export const useTimelineWidth = (
  ref: RefObject<HTMLDivElement | null>,
  isEnabled: boolean,
  initialWidth: number = 600
): number => {
  const [width, setWidth] = useState<number>(initialWidth);

  useEffect(() => {
    if (!ref.current || !isEnabled) return;

    if (ref.current.clientWidth > 0) {
      setWidth(ref.current.clientWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, isEnabled]);

  return width;
};
