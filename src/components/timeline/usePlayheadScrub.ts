import React, { useState, useRef, useCallback, useEffect } from 'react';

const PX_PER_MS = 0.2;
const MS_PER_PX = 1 / PX_PER_MS;

export const usePlayheadScrub = (
  trackAreaRef: React.RefObject<HTMLDivElement | null>,
  playheadRef: React.RefObject<HTMLDivElement | null>,
  maxTime: number,
  setCurrentTime: (time: number) => void
) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTimeRef = useRef<number | null>(null);
  const lastDispatchedTimeRef = useRef<number>(0);

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
    if (x <= 280) return; // Do not seek if clicking left label sidebar

    setIsScrubbing(true);
    const scrollLeft = trackAreaRef.current.scrollLeft;
    const trackX = x - 280 + scrollLeft;
    const time = Math.min(Math.max(0, trackX * MS_PER_PX), maxTime);
    
    scrubTimeRef.current = time;
    setCurrentTime(time);
  }, [trackAreaRef, maxTime, setCurrentTime]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isScrubbing || !trackAreaRef.current) return;

    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft;
    const x = e.clientX - rect.left - 280 + scrollLeft;
    const time = Math.min(Math.max(0, x * MS_PER_PX), maxTime);

    scrubTimeRef.current = time;

    if (playheadRef.current) {
      playheadRef.current.style.left = `${time * PX_PER_MS}px`;
    }
  }, [isScrubbing, trackAreaRef, maxTime, playheadRef]);

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
