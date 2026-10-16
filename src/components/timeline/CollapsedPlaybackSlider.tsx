import { translations } from '../../i18n/translations';
import { formatMilliseconds } from '../../i18n/terminology';
import React, { memo } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface CollapsedPlaybackSliderProps {
  maxTime: number;
}

/**
 * Minimized playback range slider shown when the timeline panel is closed.
 */
export const CollapsedPlaybackSlider: React.FC<CollapsedPlaybackSliderProps> = memo(({ maxTime }) => {
  const language = useAppStore(s => s.language);
  const t = translations[language];
  const currentTime = useAppStore((state) => state.currentTime);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);

  return (
    <div className="px-4 py-1.5 flex items-center gap-3 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-150 dark:border-slate-850">
      <input
        type="range"
        aria-label={t.timelineUi.seek}
        aria-valuetext={formatMilliseconds(currentTime, language)}
        step={1}
        min={0}
        max={maxTime}
        value={currentTime}
        onChange={(e) => { useAppStore.getState().pausePlayback(); setCurrentTime(Number(e.target.value)); }}
        className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
      />
      <span className="text-xs font-mono text-slate-550 dark:text-slate-400">
        <span className="sm:hidden">{formatMilliseconds(currentTime, language)} / </span>{formatMilliseconds(maxTime, language)}
      </span>
    </div>
  );
});

CollapsedPlaybackSlider.displayName = 'CollapsedPlaybackSlider';
