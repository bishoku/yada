import { useAppStore } from '../../store/useAppStore';
import { ensureSavedForNavigation } from '../saveCoordinator';

/** Both activation and reload must independently acknowledge the latest edits. */
export async function applySavedUpdate(save: () => Promise<boolean>, apply: () => void | Promise<void>): Promise<boolean> {
  if (!await save()) return false;
  await apply();
  return true;
}

/** Transient editors/previews and live sessions cannot be reconstructed by reload. */
export async function ensureSavedForUpdate(): Promise<boolean> {
  const safe = () => {
    const state = useAppStore.getState();
    return state.currentView !== 'studio' && state.viewMode !== 'import-preview' && !state.isCollabActive;
  };
  return safe() && await ensureSavedForNavigation() && safe();
}
