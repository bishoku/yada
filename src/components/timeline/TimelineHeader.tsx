import React, { memo } from 'react';
import { Play, Pause, Square, SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { CollapsedPlaybackSlider } from './CollapsedPlaybackSlider';
import { useAppStore } from '../../store/useAppStore';
import { simulationClock } from '../../store/simulationClock';
import { translations } from '../../i18n/translations';
import { editingCopy } from '../../i18n/editingCopy';
import { formatPlaybackRate } from '../../i18n/formatters';
import { formatMilliseconds } from '../../i18n/terminology';

const TimeReadout = memo(({ maxTime }: { maxTime: number }) => {
  const language = useAppStore(s => s.language);
  const current = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const update = (time: number) => { if (current.current) current.current.textContent = formatMilliseconds(Math.round(time), language); };
    update(simulationClock.getTime());
    return simulationClock.subscribe(update);
  }, [language]);
  return <span className="yada-dock-time"><span ref={current}>{formatMilliseconds(Math.round(simulationClock.getTime()), language)}</span><span className="yada-dock-total"> / {formatMilliseconds(maxTime, language)}</span></span>;
});

/** Everyday playback stays in one quiet row; tuning is explicitly opened. */
export const TimelineHeader = memo(({ maxTime, hasSequences, expanded, onToggle }: {
  maxTime: number; hasSequences: boolean; expanded: boolean; onToggle: () => void;
}) => {
  const isPlaying = useAppStore(s => s.isPlaying);
  const rate = useAppStore(s => s.playbackRate);
  const language = useAppStore(s => s.language);
  const t = translations[language], copy = editingCopy[language];
  const play = () => {
    const state = useAppStore.getState();
    if (isPlaying) state.pausePlayback();
    else if (simulationClock.getTime() >= maxTime) state.startPlayback();
    else state.resumePlayback();
  };
  return <div data-playback-dock role="group" aria-label={copy.playback} className="yada-playback-dock">
    <IconButton label={isPlaying ? t.pauseTooltip : t.playTooltip} className="yada-dock-play" disabled={!hasSequences} onClick={play}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</IconButton>
    <IconButton label={t.stopTooltip} disabled={!hasSequences} onClick={() => useAppStore.getState().stopPlayback()}><Square size={14} /></IconButton>
    <select aria-label={copy.speed} value={rate} className="yada-dock-rate" onChange={event => useAppStore.getState().setPlaybackRate(Number(event.target.value))}>
      {[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{formatPlaybackRate(value, language)}</option>)}
    </select>
    <CollapsedPlaybackSlider maxTime={maxTime} disabled={!hasSequences} />
    <TimeReadout maxTime={maxTime} />
    <Button variant="ghost" className="yada-dock-toggle" aria-expanded={expanded} onClick={onToggle} title={expanded ? copy.closeTuning : copy.openTuning} aria-label={expanded ? copy.closeTuning : copy.openTuning}>
      <SlidersHorizontal size={15} /><span>{copy.tuning}</span>
    </Button>
  </div>;
});
TimelineHeader.displayName = 'TimelineHeader';
