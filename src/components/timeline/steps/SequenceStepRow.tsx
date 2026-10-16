import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';
import React, { memo } from 'react';
import { ArrowRightLeft, Settings, Trash2 } from 'lucide-react';
import type { SequenceStep, LogicalEdge, TimelineTiming } from '../../../types';

interface SequenceStepRowProps {
  editing: boolean;
  seq: SequenceStep;
  edge?: LogicalEdge;
  srcName: string;
  dstName: string;
  timing?: TimelineTiming;
  isSelected: boolean;
  isPlaying: boolean;
  maxSteps: number;
  onSelect: (seqId: string) => void;
  onOrderChange: (seqId: string, stepNumber: number) => void;
  onToggleAsync: (seqId: string) => void;
  onOpenTooltip: (seqId: string) => void;
  onDelete: (seqId: string) => void;
}

/**
 * Memoized row representing a sequence step in the left step list.
 */
export const SequenceStepRow: React.FC<SequenceStepRowProps> = memo(({
  editing, seq,
  edge,
  srcName,
  dstName,
  timing,
  isSelected,
  isPlaying,
  maxSteps,
  onSelect,
  onOrderChange,
  onToggleAsync,
  onOpenTooltip,
  onDelete,
}) => {
  const language = useAppStore(s => s.language);
  const isReadOnly = useAppStore(s => s.isReadOnly);
  const t = translations[language];
  const hasProcess = !!timing?.internalProcess;

  return (
    <div
      className={`h-16 overflow-hidden py-1.5 px-3 border-b border-slate-200/50 dark:border-slate-800/50 flex ${editing ? "flex-col items-stretch justify-center sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between"} transition-colors duration-150 group ${
        isPlaying ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        isSelected
          ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-l-4 border-l-indigo-600'
          : isPlaying ? '' : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
      }`}
    >
      <button type="button" aria-pressed={isSelected} onClick={() => onSelect(seq.id)} className={`yada-timeline-step-select flex flex-col gap-0.5 min-w-0 text-left ${editing ? "flex-none sm:flex-1 [&>span]:hidden sm:[&>span]:block" : "flex-1"}`} title={`${srcName} → ${dstName}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold whitespace-nowrap bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded">
            {t.terms.step} {seq.stepNumber}
          </span>
          <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">
            {srcName} → {dstName}
          </span>
        </div>
        {hasProcess && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 truncate pl-1">
            ↳ {t.terms.process}: {timing?.internalProcess?.text}
          </span>
        )}
        {edge?.description && (
          <span className="text-xs font-medium text-slate-550 dark:text-slate-400 pl-1 leading-normal break-words">
            ↳ {edge.description}
          </span>
        )}
      </button>

      {/* Row Actions */}
      {editing && <div className="yada-timeline-step-actions flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <select
          aria-label={t.timelineUi.order}
          disabled={isPlaying || isReadOnly}
          value={seq.stepNumber}
          onChange={(e) => onOrderChange(seq.id, Number(e.target.value))}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 font-bold cursor-pointer focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{t.terms.step} {n}</option>
          ))}
        </select>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAsync(seq.id);
          }}
          disabled={isPlaying || isReadOnly}
          aria-pressed={seq.isAsync}
          title={seq.isAsync ? t.terms.asynchronous : t.terms.synchronous}
          aria-label={seq.isAsync ? t.terms.asynchronous : t.terms.synchronous}
          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer animate-none ${
            seq.isAsync ? 'text-emerald-500' : 'text-slate-400'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTooltip(seq.id);
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer animate-none"
          title={t.timelineUi.editStep} aria-label={t.timelineUi.editStep}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(seq.id);
          }}
          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-505 transition-colors cursor-pointer animate-none"
          disabled={isPlaying || isReadOnly}
          title={t.timelineUi.deleteStep} aria-label={t.timelineUi.deleteStep}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>}
    </div>
  );
});

SequenceStepRow.displayName = 'SequenceStepRow';
