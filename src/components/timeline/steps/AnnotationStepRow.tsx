import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';
import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { StickyNote } from '../../../types';

interface AnnotationStepRowProps {
  editing: boolean;
  id: string;
  note: StickyNote;
  onDelete: (id: string) => void;
}

/**
 * Memoized row representing an annotation / sticky note in the left step list.
 */
export const AnnotationStepRow: React.FC<AnnotationStepRowProps> = memo(({
  editing, id,
  note,
  onDelete,
}) => {
  const language = useAppStore(s => s.language);
  const disabled = useAppStore(s => s.isReadOnly || s.isPlaying);
  const t = translations[language];
  return (
    <div className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 px-3 flex items-center justify-between group bg-amber-50/10 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 overflow-hidden">
        <div
          className="w-1.5 h-6 rounded-full shrink-0"
          style={{ backgroundColor: note.style?.backgroundColor || '#0f172a' }}
        />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
          {note.header || t.terms.stickyNote}
        </span>
      </div>
      {editing && <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-505 transition-colors cursor-pointer animate-none"
        disabled={disabled} title={t.timelineUi.deleteNote} aria-label={t.timelineUi.deleteNote}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>}
    </div>
  );
});

AnnotationStepRow.displayName = 'AnnotationStepRow';
