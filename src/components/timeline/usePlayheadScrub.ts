import React, { useState, useRef, useCallback, useEffect } from 'react';

export const usePlayheadScrub = (
  trackAreaRef: React.RefObject<HTMLDivElement | null>,
  playheadRef: React.RefObject<HTMLDivElement | null>,
  maxTime: number,
  pxPerMs: number,
  setCurrentTime: (time: number) => void
) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTimeRef = useRef<number | null>(null);
  const lastDispatchedTimeRef = useRef<number>(0);

  const msPerPx = 1 / pxPerMs;

  // High-Performance Scrubbing Frame-Throttle Loop
  useEffect(() => {
    if (!isScrubbing) return;

    let active = true;
    const dispatchTick = () => {
      if (!active) return;
      if (scrubTimeRef.current !== null && scrubTimeRef.current !== lastDispatchedTimeRef.current) {
        setCurrentTime(scrubTimeRef.current);
        lastDispatchedTimeRef.current = scrubTimeRef.current;
      }
      requestAnimationFrame(dispatchTick);
    };

    requestAnimationFrame(dispatchTick);
    return () => {
      active = false;
    };
  }, [isScrubbing, setCurrentTime]);

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    if (!trackAreaRef.current) return;
    
    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    setIsScrubbing(true);
    const time = Math.min(Math.max(0, x * msPerPx), maxTime);
    
    scrubTimeRef.current = time;
    setCurrentTime(time);
  }, [trackAreaRef, maxTime, setCurrentTime, msPerPx]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isScrubbing || !trackAreaRef.current) return;

    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.min(Math.max(0, x * msPerPx), maxTime);

    scrubTimeRef.current = time;

    if (playheadRef.current) {
      playheadRef.current.style.left = `${time * pxPerMs}px`;
    }
  }, [isScrubbing, trackAreaRef, maxTime, playheadRef, pxPerMs, msPerPx]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!isScrubbing) return;
    setIsScrubbing(false);

    if (scrubTimeRef.current !== null) {
      setCurrentTime(scrubTimeRef.current);
      scrubTimeRef.current = null;
    }
  }, [isScrubbing, setCurrentTime]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  return {
    isScrubbing,
    handleTrackMouseDown,
  };
};
