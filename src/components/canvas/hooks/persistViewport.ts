import { useAppStore } from '../../../store/useAppStore';

/** An animated fit can finish after its document has been closed or replaced. */
export function persistViewport(owner: { workspacePath?: string; diagramId: string | null }, viewport: { x: number; y: number; zoom: number }) {
  const state = useAppStore.getState();
  if (!owner.workspacePath || !owner.diagramId || state.isReadOnly || state.currentWorkspace?.path !== owner.workspacePath || state.activeDiagramId !== owner.diagramId) return false;
  state.updateCanvasViewport(viewport.zoom, { x: viewport.x, y: viewport.y });
  return true;
}
