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
}

/**
 * Main Timeline Panel Component.
 * High-performance, modular orchestrator adhering to Clean Code & SOLID principles.
 */
export const TimelinePanel: React.FC<TimelinePanelProps> = memo(({ forceCollapsed }) => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const schedules = useAppStore((s) => s.schedules);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const _timelineOpen = useAppStore((s: any) => s.timelineOpen);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);

  const language = useAppStore(s => s.language);
  const selectedId = useAppStore(s => s.selectedSequenceId);
  const t = translations[language];
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineOpen = forceCollapsed ? false : _timelineOpen;
  const [activeTooltipSeqId, setActiveTooltipSeqId] = useState<string | null>(null);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Dynamic width tracking
  const rightPanelWidth = useTimelineWidth(viewportRef, timelineOpen);

  // High-performance memoized timeline calculations
  const { maxTime, pxPerMs, contentWidth, sortedSequences, nodeMap, edgeMap } = useTimelineCalculations({
    logicalData,
    visualData,
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
    useAppStore.getState().setSelectedSequenceId(seqId);
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 select-none font-sans">
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
      {timelineOpen && <div className="px-3 py-1 flex flex-wrap items-center gap-3 text-[11px] border-b border-slate-200 dark:border-slate-800">
        <span>{selected ? `${t.terms.start}: ${formatMilliseconds(selected.start, language)} · ${t.terms.end}: ${formatMilliseconds(selected.end, language)}` : t.timelineUi.noSelection}</span>
        {selectedId && <button className="text-indigo-600 dark:text-indigo-400 underline" onClick={() => handleOpenTooltip(selectedId)}>{t.timelineUi.editStep}</button>}
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
