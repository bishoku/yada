import { editingCopy } from '../../../i18n/editingCopy';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';
import { formatMilliseconds } from '../../../i18n/terminology';
import type { TimingValues } from '../timingModel';
import React, { memo } from 'react';
import type { SequenceStep, TimelineTiming } from '../../../types';

interface SequenceTrackRowProps {
  seq: SequenceStep;
  timing?: TimelineTiming;
  schedule?: { start: number; end: number };
  pxPerMs: number;
  isSelected: boolean;
  editable: boolean;
  preview?: { initial: TimingValues; values: TimingValues };
  onSelect: (seqId: string) => void;
  onOpenTooltip: (seqId: string) => void;
  onBarPointerDown: (e: React.PointerEvent, seqId: string, delay: number, duration: number) => void;
  onResizePointerDown: (e: React.PointerEvent, seqId: string, delay: number, duration: number) => void;
}

/**
 * Memoized timing bar track for a sequence step.
 */
export const SequenceTrackRow: React.FC<SequenceTrackRowProps> = memo(({
  seq,
  timing,
  schedule,
  pxPerMs,
  isSelected, editable, preview,
  onSelect,
  onOpenTooltip,
  onBarPointerDown,
  onResizePointerDown,
}) => {
  const language = useAppStore(s => s.language);
  const t = translations[language];
  const copy = editingCopy[language];
  if (!schedule) return <div className="h-14" />;

  const duration = preview?.values.duration ?? timing?.duration ?? 1000;
  const delay = preview?.values.delay ?? timing?.delay ?? 0;
  const left = (schedule.start + (preview ? preview.values.delay - preview.initial.delay : 0)) * pxPerMs;
  const width = duration * pxPerMs;

  return (
    <div className="h-14 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full">
      {/* Interactive Drag Bar */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${t.terms.step} ${seq.stepNumber}: ${editable ? t.timelineUi.editStep : copy.selectStep}`}
        title={editable ? t.timelineUi.timingHint : copy.inspectHint}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(seq.id); if (editable) onOpenTooltip(seq.id); } }}
        onPointerDown={(e) => {
          onSelect(seq.id);
          if (editable) onBarPointerDown(e, seq.id, delay, duration);
          else e.stopPropagation();
        }}
        onDoubleClick={() => onOpenTooltip(seq.id)}
        className={`${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} h-7 rounded-lg absolute transition-shadow flex items-center justify-between px-2 text-xs font-bold text-white group border ${
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
          width: Math.max(width, 4),
          touchAction: 'none',
        }}
      >
        <span className="truncate pr-4 pointer-events-none select-none">
          {formatMilliseconds(duration, language)}
        </span>

        {/* Resize handle on right */}
        {editable && (
          <div
            className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 rounded-r transition-colors"
            onPointerDown={(e) => {
              onSelect(seq.id);
              onResizePointerDown(e, seq.id, delay, duration);
            }}
          />
        )}
      </div>
    </div>
  );
});

SequenceTrackRow.displayName = 'SequenceTrackRow';
