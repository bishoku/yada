import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pencil, Repeat, SkipBack, SkipForward, Crosshair, X, CircleHelp, Info } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Dialog } from '../ui/Dialog';
import { editingCopy } from '../../i18n/editingCopy';
import { translations } from '../../i18n/translations';
import { formatMilliseconds } from '../../i18n/terminology';
import { formatPlaybackRate } from '../../i18n/formatters';
import { useAppStore } from '../../store/useAppStore';
import { simulationClock } from '../../store/simulationClock';
import { playbackEnd } from '../../store/playbackModel';
import { stepNavigationTarget } from '../timeline/timingModel';
import { TimelineHeader } from '../timeline/TimelineHeader';
import { SequenceTooltipModal } from '../timeline/SequenceTooltipModal';
import { InlineTimingField } from '../timeline/InlineTimingField';
import { TimelineStepList } from '../timeline/steps/TimelineStepList';
import { TimelineTrackList } from '../timeline/tracks/TimelineTrackList';
import { usePlayheadScrub } from '../timeline/usePlayheadScrub';
import { useTimelineCalculations } from '../timeline/hooks/useTimelineCalculations';
import { usePlaybackLoop } from '../timeline/hooks/usePlaybackLoop';
import { useTimelineWidth } from '../timeline/hooks/useTimelineWidth';

interface TimelinePanelProps {
  forceCollapsed?: boolean; forceExpanded?: boolean;
  onExpand?: () => void; onCollapse?: () => void;
}

/** Tuning rows, maps and drag listeners exist only while the advanced panel is open. */
const TimelineEditor = memo(({ onClose, showClose }: { onClose: () => void; showClose: boolean }) => {
  const logicalData = useAppStore(s => s.logicalData);
  const timelines = useAppStore(s => s.visualData.timelines);
  const schedules = useAppStore(s => s.schedules);
  const language = useAppStore(s => s.language);
  const selectedId = useAppStore(s => s.selectedSequenceId);
  const readOnly = useAppStore(s => s.isReadOnly);
  const loop = useAppStore(s => s.loopPlayback);
  const setCurrentTime = useAppStore(s => s.setCurrentTime);
  const t = translations[language], copy = editingCopy[language];
  const [editing, setEditing] = useState(false);
  const [help, setHelp] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeTooltipSeqId, setActiveTooltipSeqId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelWidth = useTimelineWidth(viewportRef, true);
  const { maxTime, pxPerMs, contentWidth, sortedSequences, nodeMap, edgeMap } = useTimelineCalculations({ logicalData, timelines, schedules, rightPanelWidth, zoom });
  const { isScrubbing, handleTrackPointerDown } = usePlayheadScrub(rightPanelRef, playheadRef, maxTime, pxPerMs, setCurrentTime);
  const handleOpenTooltip = useCallback((seqId: string) => {
    const state = useAppStore.getState(); state.pausePlayback(); state.setSelectedSequenceId(seqId);
    setActiveTooltipSeqId(seqId);
  }, []);
  const navigate = (direction: -1 | 1) => {
    const state = useAppStore.getState();
    const step = stepNavigationTarget(sortedSequences, schedules, state.selectedSequenceId, simulationClock.getTime(), direction);
    if (step) { state.pausePlayback(); state.setSelectedSequenceId(step.id); state.setCurrentTime(schedules[step.id].start); }
  };
  const goToPlayhead = () => {
    if (viewportRef.current) viewportRef.current.scrollLeft = Math.max(0, simulationClock.getTime() * pxPerMs - viewportRef.current.clientWidth / 2);
  };
  const selected = selectedId ? schedules[selectedId] : undefined;
  const selectedTiming = selectedId ? timelines[selectedId] : undefined;
  const selectedStep = sortedSequences.find(step => step.id === selectedId);
  const selectedEdge = selectedStep ? edgeMap.get(selectedStep.edgeId) : undefined;
  const selectedName = selectedEdge ? `${nodeMap.get(selectedEdge.sourceId)?.name ?? selectedEdge.sourceId} → ${nodeMap.get(selectedEdge.targetId)?.name ?? selectedEdge.targetId}` : '';

  return <div data-timeline-editor className="yada-timeline-editor">
    <div className="yada-tuning-toolbar" role="group" aria-label={copy.tuningHelp}>
      <span className="yada-tuning-title">{copy.tuning}</span>
      {!readOnly && <button type="button" className="yada-tuning-edit" aria-pressed={editing} aria-label={copy.timing} title={copy.timing}
        onClick={() => {useAppStore.getState().pausePlayback();setEditing(value => !value);}}><Pencil size={14} /><span>{copy.edit}</span></button>}
      <IconButton label={t.timelineUi.previous} disabled={!sortedSequences.length} onClick={() => navigate(-1)}><SkipBack size={14} /></IconButton>
      <IconButton label={t.timelineUi.next} disabled={!sortedSequences.length} onClick={() => navigate(1)}><SkipForward size={14} /></IconButton>
      <IconButton label={t.loopPlaybackTooltip} aria-pressed={loop} onClick={() => useAppStore.getState().toggleLoopPlayback()}><Repeat size={14} /></IconButton>
      <select className="yada-tuning-zoom" aria-label={copy.scale} title={t.timelineUi.fit} value={zoom} onChange={event => {setZoom(Number(event.target.value));if(Number(event.target.value) === 1 && viewportRef.current) viewportRef.current.scrollLeft = 0;}}>
        {[1,2,4,8].map(value => <option key={value} value={value}>{formatPlaybackRate(value,language)}</option>)}
      </select>
      <IconButton label={t.timelineUi.goToPlayhead} onClick={goToPlayhead}><Crosshair size={14} /></IconButton>
      <IconButton label={t.timelineUi.help} onClick={() => setHelp(true)}><CircleHelp size={14} /></IconButton>
      {showClose && <IconButton label={copy.closeTuning} onClick={onClose}><X size={15} /></IconButton>}
    </div>
        <div
          ref={trackAreaRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative bg-slate-50/20 dark:bg-slate-900/10"
        >
          <div className="flex min-h-full w-full relative">
            {/* Left Side: Step labels column */}
            <TimelineStepList
              editing={editing && !readOnly}
              sortedSequences={sortedSequences}
              nodeMap={nodeMap}
              edgeMap={edgeMap}
              onOpenTooltip={handleOpenTooltip}
            />

            {/* Right Side: Track Grid area */}
            <TimelineTrackList
              viewportRef={viewportRef}
              contentWidth={contentWidth}
              rightPanelRef={rightPanelRef}
              playheadRef={playheadRef}
              maxTime={maxTime}
              pxPerMs={pxPerMs}
              editing={editing && !readOnly}
              sortedSequences={sortedSequences}
              isScrubbing={isScrubbing}
              onTrackPointerDown={handleTrackPointerDown}
              onOpenTooltip={handleOpenTooltip}
            />
          </div>
        </div>
    {selectedId && selected && <div className="yada-tuning-selection">
      <span className="yada-tuning-name" title={selectedName}>{selectedName}</span>
      <div className="yada-timing-values">{readOnly ? <><span>{copy.shortDuration}: {formatMilliseconds(selectedTiming?.duration ?? 1000, language)}</span>
        <span>{copy.delay}: {formatMilliseconds(selectedTiming?.delay ?? 0, language)}</span></> :
        <><InlineTimingField key={`${selectedId}-duration`} seqId={selectedId} field="duration" />
          <InlineTimingField key={`${selectedId}-delay`} seqId={selectedId} field="delay" /></>}</div>
      <IconButton label={copy.seekStep} onClick={() => {useAppStore.getState().pausePlayback();setCurrentTime(selected.start);goToPlayhead();}}><SkipBack size={13} /></IconButton>
      <IconButton label={copy.details} onClick={() => handleOpenTooltip(selectedId)}><Info size={13} /></IconButton>
    </div>}
    {help && <Dialog title={copy.tuningHelp} onClose={() => setHelp(false)}><p className="text-sm leading-relaxed">{readOnly ? copy.inspectHint : copy.tuningGuide}</p><p className="text-sm leading-relaxed mt-3">{readOnly ? t.timelineUi.timingHelp : t.timelineUi.timingHint}</p></Dialog>}
    {activeTooltipSeqId && <SequenceTooltipModal seqId={activeTooltipSeqId} onClose={() => setActiveTooltipSeqId(null)} />}
  </div>;
});

export const TimelinePanel = memo(({ forceCollapsed, forceExpanded, onExpand, onCollapse }: TimelinePanelProps) => {
  const storedOpen = useAppStore(s => s.timelineOpen);
  const sequences = useAppStore(s => s.logicalData.sequences);
  const timelines = useAppStore(s => s.visualData.timelines);
  const schedules = useAppStore(s => s.schedules);
  const isPlaying = useAppStore(s => s.isPlaying);
  const expanded = !forceCollapsed && (forceExpanded || storedOpen);
  const maxTime = useMemo(() => playbackEnd(sequences, timelines, schedules), [sequences, timelines, schedules]);
  usePlaybackLoop(isPlaying, maxTime);
  const toggle = () => {
    if (expanded && onCollapse) onCollapse();
    else if (!expanded && onExpand) onExpand();
    else useAppStore.getState().toggleTimeline();
  };
  if (!expanded && !sequences.length) return null;
  return <div data-timeline-panel className="h-full min-h-0 flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none font-sans">
    {expanded && <TimelineEditor onClose={toggle} showClose={!forceExpanded} />}
    <TimelineHeader maxTime={maxTime} hasSequences={sequences.length > 0} expanded={!!expanded} onToggle={toggle} />
  </div>;
});
TimelinePanel.displayName = 'TimelinePanel';
