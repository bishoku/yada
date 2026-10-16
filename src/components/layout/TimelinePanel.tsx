import { editingCopy } from '../../i18n/editingCopy';
import { Button } from '../ui/Button';
import { simulationClock } from '../../store/simulationClock';
import { stepNavigationTarget } from '../timeline/timingModel';
import { translations } from '../../i18n/translations';
import { formatMilliseconds } from '../../i18n/terminology';
import React, { useRef, useState, useCallback, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TimelineHeader } from '../timeline/TimelineHeader';
import { CollapsedPlaybackSlider } from '../timeline/CollapsedPlaybackSlider';
import { SequenceTooltipModal } from '../timeline/SequenceTooltipModal';
import { TimelineStepList } from '../timeline/steps/TimelineStepList';
import { TimelineTrackList } from '../timeline/tracks/TimelineTrackList';
import { usePlayheadScrub } from '../timeline/usePlayheadScrub';
import { useTimelineCalculations } from '../timeline/hooks/useTimelineCalculations';
import { usePlaybackLoop } from '../timeline/hooks/usePlaybackLoop';
import { useTimelineWidth } from '../timeline/hooks/useTimelineWidth';

interface TimelinePanelProps {
  forceCollapsed?: boolean;
  forceExpanded?: boolean;
}

/**
 * Main Timeline Panel Component.
 * High-performance, modular orchestrator adhering to Clean Code & SOLID principles.
 */
export const TimelinePanel: React.FC<TimelinePanelProps> = memo(({ forceCollapsed, forceExpanded }) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const timelines = useAppStore(s => s.visualData.timelines);
  const schedules = useAppStore((s) => s.schedules);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const _timelineOpen = useAppStore((s: any) => s.timelineOpen);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);

  const language = useAppStore(s => s.language);
  const selectedId = useAppStore(s => s.selectedSequenceId);
  const t = translations[language];
  const copy = editingCopy[language];
  const readOnly = useAppStore(s => s.isReadOnly);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineOpen = forceCollapsed ? false : (forceExpanded || _timelineOpen);
  const [activeTooltipSeqId, setActiveTooltipSeqId] = useState<string | null>(null);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Dynamic width tracking
  const rightPanelWidth = useTimelineWidth(viewportRef, timelineOpen);

  // High-performance memoized timeline calculations
  const { maxTime, pxPerMs, contentWidth, sortedSequences, nodeMap, edgeMap } = useTimelineCalculations({
    logicalData,
    timelines,
    schedules,
    rightPanelWidth,
    zoom,
  });

  // Playhead scrubbing interaction hook
  const { isScrubbing, handleTrackPointerDown } = usePlayheadScrub(
    rightPanelRef,
    playheadRef,
    maxTime,
    pxPerMs,
    setCurrentTime
  );

  // Isolated requestAnimationFrame playback loop
  usePlaybackLoop(isPlaying, maxTime);

  const handleOpenTooltip = useCallback((seqId: string) => {
    useAppStore.getState().pausePlayback();
    useAppStore.getState().setSelectedSequenceId(seqId);
    setEditing(true);
    setActiveTooltipSeqId(seqId);
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltipSeqId(null);
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

  return (
    <div data-timeline-panel className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 select-none font-sans">
      {/* Top Playback Controls Bar */}
      <TimelineHeader
        maxTime={maxTime}
        hasSequences={logicalData.sequences.length > 0}
        zoom={timelineOpen ? zoom : undefined}
        onZoom={setZoom}
        onFit={() => { setZoom(1); if (viewportRef.current) viewportRef.current.scrollLeft = 0; }}
        onGoToPlayhead={goToPlayhead}
        onNavigate={navigate}
      />

      <CollapsedPlaybackSlider maxTime={maxTime} />
      {timelineOpen && <div className="px-3 py-1 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <div role="group" aria-label={copy.view} className="flex gap-1 shrink-0">
          <Button variant={!editing ? "primary" : "secondary"} aria-pressed={!editing} onClick={() => setEditing(false)}>{copy.inspect}</Button>
          {!readOnly && <Button variant={editing ? "primary" : "secondary"} aria-pressed={editing} onClick={() => {useAppStore.getState().pausePlayback();setEditing(true);}}>{copy.timing}</Button>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 min-w-48">{editing && !readOnly ? copy.timingHint : copy.inspectHint}</p>
      </div>}
      {timelineOpen && <div className="px-3 py-1 flex flex-wrap items-center gap-3 text-xs border-b border-slate-200 dark:border-slate-800">
        {selectedName && <span className="font-semibold truncate max-w-64">{selectedName}</span>}
        <span>{selected ? `${t.terms.start}: ${formatMilliseconds(selected.start, language)} · ${t.terms.end}: ${formatMilliseconds(selected.end, language)}` : t.timelineUi.noSelection}</span>
        {selected && <span className="font-mono">{copy.duration}: {formatMilliseconds(selectedTiming?.duration ?? 1000, language)} · {copy.delay}: {formatMilliseconds(selectedTiming?.delay ?? 0, language)}</span>}
        {selectedId && selected && <button className="text-indigo-600 dark:text-indigo-400 underline" onClick={() => {useAppStore.getState().pausePlayback();setCurrentTime(selected.start);goToPlayhead();}}>{copy.seekStep}</button>}
        {selectedId && <button className="text-indigo-600 dark:text-indigo-400 underline" onClick={() => handleOpenTooltip(selectedId)}>{readOnly ? copy.details : t.timelineUi.editStep}</button>}
        <details className="ml-auto"><summary className="cursor-pointer">{t.timelineUi.help}</summary><p className="max-w-xl py-2">{t.timelineUi.timingHelp} {t.timelineUi.timingHint}</p></details>
      </div>}
      {/* Main Unified Scrollable Timeline Workspace */}
      {timelineOpen ? (
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
      ) : null}

      {/* Tooltip Internal Process Modal */}
      {activeTooltipSeqId && (
        <SequenceTooltipModal
          seqId={activeTooltipSeqId}
          onClose={handleCloseTooltip}
        />
      )}
    </div>
  );
});

TimelinePanel.displayName = 'TimelinePanel';
