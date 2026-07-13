import React, { useState, useCallback, useEffect } from 'react';

export const useTimingBarDrag = (
  updateSequenceTiming: (seqId: string, duration: number, delay: number) => void,
  pxPerMs: number
) => {
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: 'drag' | 'resize';
    startX: number;
    initialDelay: number;
    initialDuration: number;
  } | null>(null);

  const msPerPx = 1 / pxPerMs;

  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    seqId: string,
    initialDelay: number,
    initialDuration: number
  ) => {
    e.stopPropagation();
    setActiveDrag({
      id: seqId,
      type: 'drag',
      startX: e.clientX,
      initialDelay,
      initialDuration,
    });
  }, []);

  const handleResizeMouseDown = useCallback((
    e: React.MouseEvent,
    seqId: string,
    initialDelay: number,
    initialDuration: number
  ) => {
    e.stopPropagation();
    setActiveDrag({
      id: seqId,
      type: 'resize',
      startX: e.clientX,
      initialDelay,
      initialDuration,
    });
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!activeDrag) return;

    const deltaX = e.clientX - activeDrag.startX;
    // Snap to 50ms grid ticks
    const deltaMs = Math.round((deltaX * msPerPx) / 50) * 50;

    if (activeDrag.type === 'drag') {
      const newDelay = Math.max(0, activeDrag.initialDelay + deltaMs);
      updateSequenceTiming(activeDrag.id, activeDrag.initialDuration, newDelay);
    } else if (activeDrag.type === 'resize') {
      const newDuration = Math.max(100, activeDrag.initialDuration + deltaMs);
      updateSequenceTiming(activeDrag.id, newDuration, activeDrag.initialDelay);
    }
  }, [activeDrag, updateSequenceTiming, msPerPx]);

  const handleGlobalMouseUp = useCallback(() => {
    if (activeDrag) {
      setActiveDrag(null);
    }
  }, [activeDrag]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  return {
    activeDrag,
    handleBarMouseDown,
    handleResizeMouseDown,
  };
};
