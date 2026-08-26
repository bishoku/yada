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

  const timelineOpen = forceCollapsed ? false : _timelineOpen;
  const [activeTooltipSeqId, setActiveTooltipSeqId] = useState<string | null>(null);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Dynamic width tracking
  const rightPanelWidth = useTimelineWidth(rightPanelRef, timelineOpen);

  // High-performance memoized timeline calculations
  const { maxTime, pxPerMs, sortedSequences, nodeMap, edgeMap } = useTimelineCalculations({
    logicalData,
    visualData,
    schedules,
    rightPanelWidth,
  });

  // Playhead scrubbing interaction hook
  const { isScrubbing, handleTrackMouseDown } = usePlayheadScrub(
    rightPanelRef,
    playheadRef,
    maxTime,
    pxPerMs,
    setCurrentTime
  );

  // Isolated requestAnimationFrame playback loop
  usePlaybackLoop(isPlaying, maxTime);

  const handleOpenTooltip = useCallback((seqId: string) => {
    setActiveTooltipSeqId(seqId);
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltipSeqId(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 select-none font-sans">
      {/* Top Playback Controls Bar */}
      <TimelineHeader
        maxTime={maxTime}
        hasSequences={logicalData.sequences.length > 0}
      />

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
              rightPanelRef={rightPanelRef}
              playheadRef={playheadRef}
              maxTime={maxTime}
              pxPerMs={pxPerMs}
              sortedSequences={sortedSequences}
              isScrubbing={isScrubbing}
              onTrackMouseDown={handleTrackMouseDown}
              onOpenTooltip={handleOpenTooltip}
            />
          </div>
        </div>
      ) : (
        /* Video Slider when timeline tracks are collapsed */
        <CollapsedPlaybackSlider maxTime={maxTime} />
      )}

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
