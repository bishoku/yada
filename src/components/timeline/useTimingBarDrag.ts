import type { LogicalDiagram } from '../../types';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { commitStepTiming } from './timingActions';
import { timingFromDrag, type TimingValues } from './timingModel';

type Gesture = { document: LogicalDiagram; id: string; pointerId: number; startX: number; scale: number; initial: TimingValues; resize: boolean; preview: TimingValues };

/** Preview locally; save once on release. Escape/pointer cancellation writes nothing. */
export function useTimingBarDrag(pxPerMs: number) {
  const active = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<{ id: string; initial: TimingValues; values: TimingValues } | null>(null);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const gesture = active.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gesture.preview = timingFromDrag(gesture.initial, event.clientX - gesture.startX, gesture.scale, gesture.resize);
      setPreview({ id: gesture.id, initial: gesture.initial, values: gesture.preview });
    };
    const finish = (event: PointerEvent) => {
      const gesture = active.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const current = useAppStore.getState().visualData.timelines[gesture.id];
      // Do not overwrite a concurrent edit made while this gesture was in progress.
      if ((current?.duration ?? 1000) === gesture.initial.duration && (current?.delay ?? 0) === gesture.initial.delay) commitStepTiming(gesture.id, gesture.preview, undefined, gesture.document);
      active.current = null; setPreview(null);
    };
    const cancel = (event?: PointerEvent) => { if (event && active.current?.pointerId !== event.pointerId) return; active.current = null; setPreview(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) { event.preventDefault(); cancel(); } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', key);
    return () => { active.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', key); };
  }, []);
  const begin = (event: React.PointerEvent, id: string, delay: number, duration: number, resize: boolean) => {
    event.stopPropagation();
    if (event.button !== 0 || (active.current && active.current.pointerId !== event.pointerId) || useAppStore.getState().isPlaying || useAppStore.getState().isReadOnly) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const initial = { duration, delay };
    active.current = { document: useAppStore.getState().logicalData, id, pointerId: event.pointerId, startX: event.clientX, scale: pxPerMs, initial, resize, preview: initial };
  };
  return {
    preview,
    handleBarPointerDown: (event: React.PointerEvent, id: string, delay: number, duration: number) => begin(event, id, delay, duration, false),
    handleResizePointerDown: (event: React.PointerEvent, id: string, delay: number, duration: number) => begin(event, id, delay, duration, true),
  };
}
