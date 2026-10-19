import React, { memo } from 'react';
import type { StickyNote } from '../../../types';

interface AnnotationTrackRowProps {
  id: string;
  note: StickyNote;
  editable: boolean;
  pxPerMs: number;
  onBarMouseDown: (e: React.PointerEvent, id: string) => void;
  onResizeLeftMouseDown: (e: React.PointerEvent, id: string) => void;
  onResizeRightMouseDown: (e: React.PointerEvent, id: string) => void;
}

/**
 * Memoized timing track for an annotation / sticky note with left and right resize handles.
 */
export const AnnotationTrackRow: React.FC<AnnotationTrackRowProps> = memo(({
  id,
  note, editable,
  pxPerMs,
  onBarMouseDown,
  onResizeLeftMouseDown,
  onResizeRightMouseDown,
}) => {
  const left = note.startTime * pxPerMs;
  const width = (note.endTime - note.startTime) * pxPerMs;
  const noteStyle = note.style || {};

  return (
    <div className="h-14 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full">
      <div
        onPointerDown={(e) => {e.stopPropagation();if(editable)onBarMouseDown(e,id);}}
        className="h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center px-2 group border shadow-sm"
        style={{
          touchAction: editable ? 'none' : 'auto',
          left,
          width,
          backgroundColor: noteStyle.backgroundColor || '#0f172a',
          borderColor: noteStyle.borderColor || '#6366f1',
          color: noteStyle.textColor || '#e2e8f0',
          opacity: note.alwaysVisible ? 0.5 : 1,
        }}
      >
        {editable && !note.alwaysVisible && (
          <>
            <div
              className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-l transition-colors"
              onPointerDown={(e) => onResizeLeftMouseDown(e,id)}
            />
            <div
              className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-r transition-colors"
              onPointerDown={(e) => onResizeRightMouseDown(e,id)}
            />
          </>
        )}
      </div>
    </div>
  );
});

AnnotationTrackRow.displayName = 'AnnotationTrackRow';
