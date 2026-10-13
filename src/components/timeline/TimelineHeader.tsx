import { formatMilliseconds } from '../../i18n/terminology';
import React, { memo } from 'react';
import { Clock, Play, Pause, Square, Repeat } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

import { simulationClock } from '../../store/simulationClock';

interface TimelineHeaderProps {
  maxTime: number;
  hasSequences: boolean;
  zoom?: number;
  onZoom?: (zoom: number) => void;
  onFit?: () => void;
  onGoToPlayhead?: () => void;
  onNavigate?: (direction: -1 | 1) => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

/**
 * Isolated timestamp display subscribing to simulationClock directly via DOM ref to prevent React re-renders.
 */
const TimeReadout = memo(({ maxTime }: { maxTime: number }) => {
  const language = useAppStore(s => s.language);
  const spanRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const update = (time: number) => {
      if (spanRef.current) {
        spanRef.current.textContent = `${formatMilliseconds(Math.round(time), language)} / ${formatMilliseconds(maxTime, language)}`;
      }
    };
    update(simulationClock.getTime());
    return simulationClock.subscribe(update);
  }, [maxTime, language]);

  return <span ref={spanRef}>{formatMilliseconds(Math.round(simulationClock.getTime()), language)} / {formatMilliseconds(maxTime, language)}</span>;
});


TimeReadout.displayName = 'TimeReadout';

/**
 * Top control bar containing playback buttons, loop toggle, time indicator, and rate selector.
 */
export const TimelineHeader: React.FC<TimelineHeaderProps> = memo(({
  maxTime,
  hasSequences, zoom, onZoom, onFit, onGoToPlayhead, onNavigate,
}) => {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const loopPlayback = useAppStore((s) => s.loopPlayback);
  const playbackRate = useAppStore((s) => s.playbackRate);
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const startPlayback = useAppStore((s) => s.startPlayback);
  const resumePlayback = useAppStore(s => s.resumePlayback);
  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const toggleLoopPlayback = useAppStore((s) => s.toggleLoopPlayback);
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate);

  return (
    <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md shrink-0">
      {/* Left: Section Label & Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {t.timelineTitle}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* PLAYBACK ACTIONS */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onNavigate && <><button disabled={!hasSequences} onClick={() => onNavigate(-1)} title={t.timelineUi.previous} aria-label={t.timelineUi.previous} className="p-1.5 disabled:opacity-40">◀│</button><button disabled={!hasSequences} onClick={() => onNavigate(1)} title={t.timelineUi.next} aria-label={t.timelineUi.next} className="p-1.5 disabled:opacity-40">│▶</button></>}
          {isPlaying ? (
            <button
              onClick={pausePlayback}
              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              title={t.pauseTooltip} aria-label={t.pauseTooltip}
            >
              <Pause className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
            </button>
          ) : (
            <button
              onClick={() => simulationClock.getTime() >= maxTime ? startPlayback() : resumePlayback()}
              disabled={!hasSequences}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
              title={t.playTooltip} aria-label={t.playTooltip}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          )}

          <button
            onClick={stopPlayback}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title={t.stopTooltip} aria-label={t.stopTooltip}
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
            title={t.loopPlaybackTooltip} aria-label={t.loopPlaybackTooltip} aria-pressed={loopPlayback}
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
                aria-pressed={playbackRate === rate}
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
      {zoom !== undefined && <div className="flex items-center gap-2 text-xs">
        <button onClick={() => onZoom?.(Math.max(1, zoom / 2))} disabled={zoom <= 1} aria-label={t.timelineUi.zoomOut} title={t.timelineUi.zoomOut} className="px-2 py-1 disabled:opacity-40">−</button>
        <span>{zoom}×</span>
        <button onClick={() => onZoom?.(Math.min(8, zoom * 2))} disabled={zoom >= 8} aria-label={t.timelineUi.zoomIn} title={t.timelineUi.zoomIn} className="px-2 py-1 disabled:opacity-40">+</button>
        <button onClick={onFit} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700">{t.timelineUi.fit}</button>
        <button onClick={onGoToPlayhead} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700">{t.timelineUi.goToPlayhead}</button>
      </div>}
    </div>
  );
});

TimelineHeader.displayName = 'TimelineHeader';
