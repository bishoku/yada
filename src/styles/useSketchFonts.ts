import { useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { loadSketchFonts } from './loadSketchFonts';

export function useSketchFonts() {
  const view = useAppStore(state => state.currentView);
  const style = useAppStore(state => state.visualData.canvas.renderStyle);
  const tool = useAppStore(state => state.activeDrawingTool);
  const strokes = useAppStore(state => state.visualData.freehandStrokes);
  const notes = useAppStore(state => state.visualData.annotations);
  const library = useAppStore(state => state.libraryComponents);
  const needed = useMemo(() => view === 'studio' || style === 'sketchy' || tool === 'text' || Object.values(strokes ?? {}).some(stroke => stroke.tool === 'text' || /caveat|kalam/i.test(stroke.fontFamily ?? '')) || Object.values(notes ?? {}).some(note => /caveat|kalam/i.test(note.style.fontFamily)) || library.some(template => template.layers.some(layer => /caveat|kalam/i.test(layer.style.fontFamily ?? ''))), [view,style,tool,strokes,notes,library]);
  useEffect(() => { if (needed) void loadSketchFonts().catch(() => { /* System cursive remains usable; a subsequent use retries. */ }); }, [needed]);
}
