import { useAppStore } from '../../../store/useAppStore';

export const useStickyNoteVisibility = (id: string) => {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const currentTime = useAppStore((s) => s.currentTime);
  const annotation = useAppStore((s) => s.visualData.annotations?.[id]);

  if (!annotation) return { isVisible: false, opacity: 0 };

  // If set to always visible or in design mode (not playing simulation), sticky note remains visible
  if (annotation.alwaysVisible || !isPlaying) return { isVisible: true, opacity: annotation.style.opacity || 1 };

  // During simulation playback, check against current time range
  const inRange = currentTime >= annotation.startTime && currentTime <= annotation.endTime;
  return { isVisible: inRange, opacity: inRange ? (annotation.style.opacity || 1) : 0 };
};
