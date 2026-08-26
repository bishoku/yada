import React, { memo } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface CollapsedPlaybackSliderProps {
  maxTime: number;
}

/**
 * Minimized playback range slider shown when the timeline panel is closed.
 */
export const CollapsedPlaybackSlider: React.FC<CollapsedPlaybackSliderProps> = memo(({ maxTime }) => {
  const currentTime = useAppStore((state) => state.currentTime);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);

  return (
    <div className="px-4 py-1.5 flex items-center gap-3 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-150 dark:border-slate-850">
      <input
        type="range"
        min={0}
        max={maxTime}
        value={currentTime}
        onChange={(e) => setCurrentTime(Number(e.target.value))}
        className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
      />
      <span className="text-[10px] font-mono text-slate-550 dark:text-slate-400">
        {maxTime}ms
      </span>
    </div>
  );
});

CollapsedPlaybackSlider.displayName = 'CollapsedPlaybackSlider';
