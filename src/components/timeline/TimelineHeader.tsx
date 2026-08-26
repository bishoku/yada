import React, { memo } from 'react';
import { Clock, Play, Pause, Square, Repeat } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

interface TimelineHeaderProps {
  maxTime: number;
  hasSequences: boolean;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

/**
 * Isolated timestamp display subscribing only to currentTime to prevent parent re-renders.
 */
const TimeReadout = memo(({ maxTime }: { maxTime: number }) => {
  const currentTime = useAppStore((state) => state.currentTime);
  return <>{currentTime.toFixed(0)}ms / {maxTime}ms</>;
});

TimeReadout.displayName = 'TimeReadout';

/**
 * Top control bar containing playback buttons, loop toggle, time indicator, and rate selector.
 */
export const TimelineHeader: React.FC<TimelineHeaderProps> = memo(({
  maxTime,
  hasSequences,
}) => {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const loopPlayback = useAppStore((s) => s.loopPlayback);
  const playbackRate = useAppStore((s) => s.playbackRate);
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const startPlayback = useAppStore((s) => s.startPlayback);
  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const toggleLoopPlayback = useAppStore((s) => s.toggleLoopPlayback);
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate);

  return (
    <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md shrink-0">
      {/* Left: Section Label & Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {t.timelineTitle}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* PLAYBACK ACTIONS */}
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <button
              onClick={pausePlayback}
              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              title={t.pauseTooltip}
            >
              <Pause className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
            </button>
          ) : (
            <button
              onClick={startPlayback}
              disabled={!hasSequences}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
              title={t.playTooltip}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          )}

          <button
            onClick={stopPlayback}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title={t.stopTooltip}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={toggleLoopPlayback}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              loopPlayback
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-400'
            }`}
            title={t.loopPlaybackTooltip}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono text-slate-550 dark:text-slate-400 min-w-[85px] text-center bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800/50">
            <TimeReadout maxTime={maxTime} />
          </span>

          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200/50 dark:border-slate-800/50">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 ${
                  playbackRate === rate
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

TimelineHeader.displayName = 'TimelineHeader';
