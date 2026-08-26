import React, { memo } from 'react';
import type { StickyNote } from '../../../types';

interface AnnotationTrackRowProps {
  id: string;
  note: StickyNote;
  pxPerMs: number;
  onBarMouseDown: (e: React.MouseEvent, id: string, start: number, end: number) => void;
  onResizeLeftMouseDown: (e: React.MouseEvent, id: string, start: number, end: number) => void;
  onResizeRightMouseDown: (e: React.MouseEvent, id: string, start: number, end: number) => void;
}

/**
 * Memoized timing track for an annotation / sticky note with left and right resize handles.
 */
export const AnnotationTrackRow: React.FC<AnnotationTrackRowProps> = memo(({
  id,
  note,
  pxPerMs,
  onBarMouseDown,
  onResizeLeftMouseDown,
  onResizeRightMouseDown,
}) => {
  const left = note.startTime * pxPerMs;
  const width = (note.endTime - note.startTime) * pxPerMs;
  const noteStyle = note.style || {};

  return (
    <div className="h-16 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center w-full">
      <div
        onMouseDown={(e) => onBarMouseDown(e, id, note.startTime, note.endTime)}
        className="h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center px-2 group border shadow-sm"
        style={{
          left,
          width,
          backgroundColor: noteStyle.backgroundColor || '#0f172a',
          borderColor: noteStyle.borderColor || '#6366f1',
          color: noteStyle.textColor || '#e2e8f0',
          opacity: note.alwaysVisible ? 0.5 : 1,
        }}
      >
        {!note.alwaysVisible && (
          <>
            <div
              className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-l transition-colors"
              onMouseDown={(e) => onResizeLeftMouseDown(e, id, note.startTime, note.endTime)}
            />
            <div
              className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 rounded-r transition-colors"
              onMouseDown={(e) => onResizeRightMouseDown(e, id, note.startTime, note.endTime)}
            />
          </>
        )}
      </div>
    </div>
  );
});

AnnotationTrackRow.displayName = 'AnnotationTrackRow';
