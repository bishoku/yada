import React, { memo, RefObject } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { TimelineRuler } from '../TimelineRuler';
import { TimelineGrid } from '../TimelineGrid';
import { ScrubLine } from '../ScrubLine';
import { SequenceTrackRow } from './SequenceTrackRow';
import { AnnotationTrackRow } from './AnnotationTrackRow';
import { useTimingBarDrag } from '../useTimingBarDrag';
import { useAnnotationBarDrag } from '../useAnnotationBarDrag';
import type { SequenceStep } from '../../../types';

interface TimelineTrackListProps {
  rightPanelRef: RefObject<HTMLDivElement | null>;
  playheadRef: RefObject<HTMLDivElement | null>;
  maxTime: number;
  pxPerMs: number;
  sortedSequences: SequenceStep[];
  isScrubbing: boolean;
  onTrackMouseDown: (e: React.MouseEvent) => void;
  onOpenTooltip: (seqId: string) => void;
}

/**
 * Right scrollable timeline track area containing Ruler, Grid, Timing Bars, and Playhead.
 */
export const TimelineTrackList: React.FC<TimelineTrackListProps> = memo(({
  rightPanelRef,
  playheadRef,
  maxTime,
  pxPerMs,
  sortedSequences,
  isScrubbing,
  onTrackMouseDown,
  onOpenTooltip,
}) => {
  const visualData = useAppStore((s) => s.visualData);
  const schedules = useAppStore((s) => s.schedules);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const updateSequenceTiming = useAppStore((s) => s.updateSequenceTiming);

  const { handleBarMouseDown, handleResizeMouseDown } = useTimingBarDrag(
    updateSequenceTiming,
    pxPerMs
  );

  const {
    handleBarMouseDown: handleAnnotationBarMouseDown,
    handleResizeLeftMouseDown,
    handleResizeRightMouseDown,
  } = useAnnotationBarDrag(pxPerMs);

  return (
    <div
      ref={rightPanelRef}
      className="flex-1 flex flex-col relative h-full min-w-0"
      onMouseDown={onTrackMouseDown}
    >
      {/* Ruler Header Spacer Row */}
      <TimelineRuler maxTime={maxTime} pxPerMs={pxPerMs} />

      {/* Tracks Container */}
      <div className="flex-1 relative w-full">
        {/* Timeline Grid Background */}
        <TimelineGrid maxTime={maxTime} pxPerMs={pxPerMs} />

        {/* Row Timing Tracks */}
        <div className="flex flex-col relative z-20 w-full">
          {sortedSequences.map((seq) => {
            const timing = visualData.timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
            const sched = schedules[seq.id];
            const isSelected = selectedSequenceId === seq.id;

            return (
              <SequenceTrackRow
                key={seq.id}
                seq={seq}
                timing={timing}
                schedule={sched}
                pxPerMs={pxPerMs}
                isSelected={isSelected}
                onSelect={setSelectedSequenceId}
                onOpenTooltip={onOpenTooltip}
                onBarMouseDown={handleBarMouseDown}
                onResizeMouseDown={handleResizeMouseDown}
              />
            );
          })}

          {/* Annotation Tracks */}
          {Object.entries(visualData.annotations || {}).map(([id, note]) => (
            <AnnotationTrackRow
              key={`track-ann-${id}`}
              id={id}
              note={note}
              pxPerMs={pxPerMs}
              onBarMouseDown={handleAnnotationBarMouseDown}
              onResizeLeftMouseDown={handleResizeLeftMouseDown}
              onResizeRightMouseDown={handleResizeRightMouseDown}
            />
          ))}
        </div>

        {/* Vertical Playhead Scrub Line Indicator */}
        <ScrubLine
          pxPerMs={pxPerMs}
          isPlaying={isPlaying}
          isScrubbing={isScrubbing}
          playheadRef={playheadRef}
        />
      </div>
    </div>
  );
});

TimelineTrackList.displayName = 'TimelineTrackList';
