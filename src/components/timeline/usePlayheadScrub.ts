import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { seekFromPosition } from './timingModel';
import { useAppStore } from '../../store/useAppStore';

export function usePlayheadScrub(trackAreaRef: React.RefObject<HTMLDivElement | null>, _playheadRef: React.RefObject<HTMLDivElement | null>, maxTime: number, pxPerMs: number, setCurrentTime: (time: number) => void) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const active = useRef<{ pointerId: number; scale: number; limit: number } | null>(null);
  const pending = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    const update = (event: PointerEvent) => {
      const gesture = active.current;
      if (!gesture || gesture.pointerId !== event.pointerId || !trackAreaRef.current) return;
      pending.current = seekFromPosition(event.clientX, trackAreaRef.current.getBoundingClientRect().left, gesture.scale, gesture.limit);
      if (frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; if (pending.current !== null) setCurrentTime(pending.current); });
    };
    const end = (event: PointerEvent) => {
      if (!active.current || event.pointerId !== active.current.pointerId) return;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      if (pending.current !== null) setCurrentTime(pending.current);
      pending.current = null; active.current = null; setIsScrubbing(false);
    };
    window.addEventListener('pointermove', update); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
  }, [trackAreaRef, setCurrentTime]);
  const handleTrackPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || !trackAreaRef.current) return;
    useAppStore.getState().pausePlayback();
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = { pointerId: event.pointerId, scale: pxPerMs, limit: maxTime };
    const time = seekFromPosition(event.clientX, trackAreaRef.current.getBoundingClientRect().left, pxPerMs, maxTime);
    pending.current = time; setCurrentTime(time); setIsScrubbing(true);
  };
  return { isScrubbing, handleTrackPointerDown };
}
