import { editingCopy } from '../../i18n/editingCopy';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { formatPlaybackRate } from '../../i18n/formatters';
import { formatMilliseconds } from '../../i18n/terminology';
import React, { memo } from 'react';
import { Clock, Play, Pause, Square, Repeat, SkipBack, SkipForward, ZoomIn, ZoomOut, Maximize2, Crosshair } from 'lucide-react';
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

  const copy = editingCopy[language];
  return <div className="yada-timeline-controls px-2 py-1 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 items-center justify-between bg-slate-50/50 dark:bg-slate-900/60 shrink-0">
    <div role="group" aria-label={copy.playback} className="flex flex-wrap items-center gap-1">
      <Clock size={16} className="hidden sm:block text-indigo-500" aria-hidden="true" />
      <span className="hidden sm:inline text-xs font-bold mr-1">{t.timelineTitle}</span>
      {onNavigate && <>
        <IconButton label={t.timelineUi.previous} disabled={!hasSequences} onClick={() => onNavigate(-1)}><SkipBack size={16} aria-hidden="true" /></IconButton>
        <IconButton label={t.timelineUi.next} disabled={!hasSequences} onClick={() => onNavigate(1)}><SkipForward size={16} aria-hidden="true" /></IconButton>
      </>}
      <Button disabled={!hasSequences} onClick={isPlaying ? pausePlayback : () => simulationClock.getTime() >= maxTime ? startPlayback() : resumePlayback()}>
        {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{isPlaying ? t.pauseTooltip : t.playTooltip}
      </Button>
      <IconButton label={t.stopTooltip} disabled={!hasSequences} onClick={stopPlayback}><Square size={16} aria-hidden="true" /></IconButton>
      <IconButton label={t.loopPlaybackTooltip} aria-pressed={loopPlayback} onClick={toggleLoopPlayback}><Repeat size={16} aria-hidden="true" /></IconButton>
      <span className="hidden sm:inline text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 px-2"><TimeReadout maxTime={maxTime} /></span>
      <select aria-label={copy.speed} value={playbackRate} onChange={event => setPlaybackRate(Number(event.target.value))} className="yada-input sm:hidden w-auto text-xs px-1">
        {PLAYBACK_RATES.map(rate => <option key={rate} value={rate}>{formatPlaybackRate(rate, language)}</option>)}
      </select>
      <div className="hidden sm:flex gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
        {PLAYBACK_RATES.map(rate=><Button key={rate} variant={playbackRate===rate?'primary':'ghost'} aria-pressed={playbackRate===rate} onClick={()=>setPlaybackRate(rate)} className="px-2 text-xs">{formatPlaybackRate(rate,language)}</Button>)}
      </div>
    </div>
    {zoom!==undefined && <div role="group" aria-label={copy.view} className="flex flex-wrap items-center gap-1">
      <IconButton label={t.timelineUi.zoomOut} disabled={zoom<=1} onClick={()=>onZoom?.(Math.max(1,zoom/2))}><ZoomOut size={16} aria-hidden="true" /></IconButton>
      <span className="text-xs tabular-nums">{formatPlaybackRate(zoom,language)}</span>
      <IconButton label={t.timelineUi.zoomIn} disabled={zoom>=8} onClick={()=>onZoom?.(Math.min(8,zoom*2))}><ZoomIn size={16} aria-hidden="true" /></IconButton>
      <IconButton label={t.timelineUi.fit} onClick={onFit}><Maximize2 size={16} aria-hidden="true" /></IconButton>
      <IconButton label={t.timelineUi.goToPlayhead} onClick={onGoToPlayhead}><Crosshair size={16} aria-hidden="true" /></IconButton>
    </div>}
  </div>;

});

TimelineHeader.displayName = 'TimelineHeader';
