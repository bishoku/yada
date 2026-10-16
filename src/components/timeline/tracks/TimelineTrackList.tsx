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
  editing: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  contentWidth: number;
  rightPanelRef: RefObject<HTMLDivElement | null>;
  playheadRef: RefObject<HTMLDivElement | null>;
  maxTime: number;
  pxPerMs: number;
  sortedSequences: SequenceStep[];
  isScrubbing: boolean;
  onTrackPointerDown: (e: React.PointerEvent) => void;
  onOpenTooltip: (seqId: string) => void;
}

/**
 * Right scrollable timeline track area containing Ruler, Grid, Timing Bars, and Playhead.
 */
export const TimelineTrackList: React.FC<TimelineTrackListProps> = memo(({
  editing, viewportRef, contentWidth, rightPanelRef,
  playheadRef,
  maxTime,
  pxPerMs,
  sortedSequences,
  isScrubbing,
  onTrackPointerDown,
  onOpenTooltip,
}) => {
  const timelines = useAppStore(s => s.visualData.timelines);
  const annotations = useAppStore(s => s.visualData.annotations);
  const schedules = useAppStore((s) => s.schedules);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const isReadOnly = useAppStore(s => s.isReadOnly);

  const { preview, handleBarPointerDown, handleResizePointerDown } = useTimingBarDrag(pxPerMs, editing && !isPlaying && !isReadOnly);

  const {
    preview: annotationPreview,
    handleBarMouseDown: handleAnnotationBarMouseDown,
    handleResizeLeftMouseDown,
    handleResizeRightMouseDown,
  } = useAnnotationBarDrag(pxPerMs, editing && !isPlaying && !isReadOnly);

  return (
    <div ref={viewportRef} className="flex-1 min-w-0 overflow-x-auto">
    <div
      ref={rightPanelRef}
      className="flex flex-col relative min-h-full"
      style={{ width: contentWidth, touchAction: 'pan-y' }}
      onPointerDown={onTrackPointerDown}
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
            const timing = timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
            const sched = schedules[seq.id];
            const isSelected = selectedSequenceId === seq.id;

            return (
              <SequenceTrackRow
                key={seq.id}
                seq={seq}
                timing={timing}
                schedule={sched}
                editable={editing && !isPlaying && !isReadOnly}
                preview={preview?.id === seq.id ? preview : undefined}
                pxPerMs={pxPerMs}
                isSelected={isSelected}
                onSelect={setSelectedSequenceId}
                onOpenTooltip={onOpenTooltip}
                onBarPointerDown={handleBarPointerDown}
                onResizePointerDown={handleResizePointerDown}
              />
            );
          })}

          {/* Annotation Tracks */}
          {Object.entries(annotations || {}).map(([id, note]) => (
            <AnnotationTrackRow
              key={`track-ann-${id}`}
              id={id}
              note={annotationPreview?.id === id ? {...note,...annotationPreview} : note}
              editable={editing && !isPlaying && !isReadOnly}
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
    </div>
  );
});

TimelineTrackList.displayName = 'TimelineTrackList';
