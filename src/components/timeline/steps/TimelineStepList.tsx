import React, { memo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';
import { SequenceStepRow } from './SequenceStepRow';
import { AnnotationStepRow } from './AnnotationStepRow';
import { TimelineEmptyState } from './TimelineEmptyState';
import type { SequenceStep, LogicalNode, LogicalEdge } from '../../../types';

interface TimelineStepListProps {
  sortedSequences: SequenceStep[];
  nodeMap: Map<string, LogicalNode>;
  edgeMap: Map<string, LogicalEdge>;
  onOpenTooltip: (seqId: string) => void;
}

/**
 * Left sidebar column rendering the list of flow steps and sticky note annotations.
 */
export const TimelineStepList: React.FC<TimelineStepListProps> = memo(({
  sortedSequences,
  nodeMap,
  edgeMap,
  onOpenTooltip,
}) => {
  const visualData = useAppStore((s) => s.visualData);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const toggleSequenceAsync = useAppStore((s) => s.toggleSequenceAsync);
  const deleteSequenceStep = useAppStore((s) => s.deleteSequenceStep);
  const deleteStickyNote = useAppStore((s) => s.deleteStickyNote);

  return (
    <div
      className="w-[340px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-850 flex flex-col shrink-0"
      onMouseDown={(e) => e.stopPropagation()} // Prevent setting playhead when clicking left panel
    >
      {/* Header Spacer Row */}
      <div className="h-6 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest sticky top-0 z-30">
        {t.flowSteps}
      </div>

      {/* Sequence Steps or Empty State */}
      {sortedSequences.length === 0 ? (
        <TimelineEmptyState />
      ) : (
        sortedSequences.map((seq) => {
          const edge = edgeMap.get(seq.edgeId);
          const srcName = edge ? (nodeMap.get(edge.sourceId)?.name ?? edge.sourceId) : '?';
          const dstName = edge ? (nodeMap.get(edge.targetId)?.name ?? edge.targetId) : '?';
          const isSelected = selectedSequenceId === seq.id;
          const timing = visualData.timelines[seq.id];

          return (
            <SequenceStepRow
              key={seq.id}
              seq={seq}
              edge={edge}
              srcName={srcName}
              dstName={dstName}
              timing={timing}
              isSelected={isSelected}
              isPlaying={isPlaying}
              maxSteps={maxSteps}
              onSelect={setSelectedSequenceId}
              onOrderChange={setSequenceStepOrder}
              onToggleAsync={toggleSequenceAsync}
              onOpenTooltip={onOpenTooltip}
              onDelete={deleteSequenceStep}
            />
          );
        })
      )}

      {/* Annotations List */}
      {Object.entries(visualData.annotations || {}).map(([id, note]) => (
        <AnnotationStepRow
          key={`left-ann-${id}`}
          id={id}
          note={note}
          onDelete={deleteStickyNote}
        />
      ))}
    </div>
  );
});

TimelineStepList.displayName = 'TimelineStepList';
