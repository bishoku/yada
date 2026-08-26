import React, { memo } from 'react';
import { ArrowRightLeft, Settings, Trash2 } from 'lucide-react';
import type { SequenceStep, LogicalEdge, TimelineTiming } from '../../../types';

interface SequenceStepRowProps {
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
  seq,
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
  const hasProcess = !!timing?.internalProcess;

  return (
    <div
      onClick={() => {
        if (!isPlaying) onSelect(seq.id);
      }}
      className={`h-16 overflow-hidden py-1.5 px-3 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between transition-colors duration-150 group ${
        isPlaying ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        isSelected
          ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-l-4 border-l-indigo-600'
          : isPlaying ? '' : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded">
            S{seq.stepNumber}
          </span>
          <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">
            {srcName} → {dstName}
          </span>
        </div>
        {hasProcess && (
          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-500 truncate pl-1">
            ↳ Process: {timing?.internalProcess?.text}
          </span>
        )}
        {edge?.description && (
          <span className="text-[9px] font-medium text-slate-550 dark:text-slate-400 pl-1 leading-normal break-words">
            ↳ {edge.description}
          </span>
        )}
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <select
          value={seq.stepNumber}
          onChange={(e) => onOrderChange(seq.id, Number(e.target.value))}
          className="text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 font-bold cursor-pointer focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>Step {n}</option>
          ))}
        </select>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAsync(seq.id);
          }}
          title={seq.isAsync ? 'Asynchronous flow' : 'Synchronous flow'}
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
          title="Configure tooltip"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(seq.id);
          }}
          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-505 transition-colors cursor-pointer animate-none"
          title="Delete step"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

SequenceStepRow.displayName = 'SequenceStepRow';
