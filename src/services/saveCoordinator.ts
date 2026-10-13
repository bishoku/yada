import { useAppStore } from '../store/useAppStore';
import { StorageService } from './storage';

let pendingSave: Promise<boolean> | null = null;

/** Manual/autosave share one operation and only acknowledge the captured document. */
export function saveCurrentDiagram(force = false): Promise<boolean> {
  if (pendingSave) return pendingSave;
  const snapshot = useAppStore.getState();
  if (!force && !snapshot.isDirty) return Promise.resolve(true);
  if (!snapshot.currentWorkspace || !snapshot.activeDiagramId || snapshot.isReadOnly || snapshot.currentWorkspace.path.startsWith('memory://')) return Promise.resolve(false);
  useAppStore.setState({ isSaving: true, saveError: null });
  const operation = (async () => {
    try {
      const envelope = { schemaVersion: snapshot.logicalData.schemaVersion ?? 1, logical: snapshot.logicalData, visual: snapshot.visualData };
      await StorageService.save_workspace(JSON.stringify(snapshot.currentWorkspace));
      await StorageService.save_diagram(snapshot.currentWorkspace!.path, snapshot.activeDiagramId!, JSON.stringify(snapshot.logicalData), JSON.stringify(snapshot.visualData), JSON.stringify(envelope));
      const current = useAppStore.getState();
      const sameDocument = current.currentWorkspace?.path === snapshot.currentWorkspace!.path && current.activeDiagramId === snapshot.activeDiagramId;
      if (sameDocument) {
        if (current.logicalData === snapshot.logicalData && current.visualData === snapshot.visualData) useAppStore.setState({ isDirty: false });
        if (current.googleUser) useAppStore.setState({ hasUnsyncedChanges: true });
      }
      return true;
    } catch (error) {
      useAppStore.setState({ saveError: error instanceof Error ? error.message : String(error) });
      return false;
    } finally {
      useAppStore.setState({ isSaving: false });
    }
  })();
  pendingSave = operation;
  void operation.finally(() => { if (pendingSave === operation) pendingSave = null; });
  return operation;
}

export async function ensureSavedForNavigation(): Promise<boolean> {
  const before = useAppStore.getState();
  if (before.isReadOnly || before.viewMode === 'import-preview' || (!before.isDirty && !pendingSave)) return true;
  const saved = await saveCurrentDiagram();
  const after = useAppStore.getState();
  if (saved && !after.isDirty) return true;
  useAppStore.setState({ saveError: after.saveError ?? 'CHANGES_NOT_SAVED' });
  return false;
}
