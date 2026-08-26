import React, { memo } from 'react';
import type { SequenceStep, TimelineTiming } from '../../../types';

interface SequenceTrackRowProps {
  seq: SequenceStep;
  timing?: TimelineTiming;
  schedule?: { start: number; end: number };
  pxPerMs: number;
  isSelected: boolean;
  onSelect: (seqId: string) => void;
  onOpenTooltip: (seqId: string) => void;
  onBarMouseDown: (e: React.MouseEvent, seqId: string, delay: number, duration: number) => void;
  onResizeMouseDown: (e: React.MouseEvent, seqId: string, delay: number, duration: number) => void;
}

/**
 * Memoized timing bar track for a sequence step.
 */
export const SequenceTrackRow: React.FC<SequenceTrackRowProps> = memo(({
  seq,
  timing,
  schedule,
  pxPerMs,
  isSelected,
  onSelect,
  onOpenTooltip,
  onBarMouseDown,
  onResizeMouseDown,
}) => {
  if (!schedule) return null;

  const duration = timing?.duration ?? 1000;
  const delay = timing?.delay ?? 0;
  const left = schedule.start * pxPerMs;
  const width = duration * pxPerMs;

  return (
    <div className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full">
      {/* Interactive Drag Bar */}
      <div
        onMouseDown={(e) => {
          onSelect(seq.id);
          onBarMouseDown(e, seq.id, delay, duration);
        }}
        onDoubleClick={() => onOpenTooltip(seq.id)}
        className={`h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center justify-between px-2 text-[10px] font-bold text-white group border ${
          isSelected
            ? 'ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-655/10'
            : 'shadow-sm'
        } ${
          seq.isAsync
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/30'
            : 'bg-gradient-to-r from-indigo-500 to-indigo-600 border-indigo-400/30'
        }`}
        style={{
          left,
          width,
        }}
      >
        <span className="truncate pr-4 pointer-events-none select-none">
          {duration}ms
        </span>

        {/* Resize handle on right */}
        {!seq.isAsync && (
          <div
            className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 rounded-r transition-colors"
            onMouseDown={(e) => {
              onSelect(seq.id);
              onResizeMouseDown(e, seq.id, delay, duration);
            }}
          />
        )}
      </div>
    </div>
  );
});

SequenceTrackRow.displayName = 'SequenceTrackRow';
