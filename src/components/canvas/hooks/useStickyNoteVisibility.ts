import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useStickyNoteVisibility = (id: string) => {
  const str = useAppStore((s) => {
    const isPlaying = s.isPlaying;
    const annotation = s.visualData.annotations?.[id];
    
    if (!annotation) return JSON.stringify({ isVisible: false, opacity: 0 });
    
    // If set to always visible or in design mode (not playing simulation), sticky note remains visible
    if (annotation.alwaysVisible || !isPlaying) {
      return JSON.stringify({ isVisible: true, opacity: annotation.style?.opacity || 1 });
    }

    // During simulation playback, check against current time range
    const inRange = s.currentTime >= annotation.startTime && s.currentTime <= annotation.endTime;
    return JSON.stringify({ isVisible: inRange, opacity: inRange ? (annotation.style?.opacity || 1) : 0 });
  });

  return useMemo(() => JSON.parse(str), [str]);
};
