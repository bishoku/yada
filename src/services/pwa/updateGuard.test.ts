import { describe, expect, it, vi } from 'vitest';
import { applySavedUpdate, ensureSavedForUpdate } from './updateGuard';
import { ensureSavedForNavigation } from '../saveCoordinator';
import { useAppStore } from '../../store/useAppStore';
import { StorageService } from '../storage';

describe('PWA update save boundary', () => {
  it('never activates or reloads after failed or unacknowledged writes', async () => {
    const apply = vi.fn();
    expect(await applySavedUpdate(async () => false, apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    await expect(applySavedUpdate(async () => { throw Error('disk'); }, apply)).rejects.toThrow('disk');
    expect(apply).not.toHaveBeenCalled();
  });
  it('waits for the write before activation and rechecks before reload', async () => {
    let release!: (saved: boolean) => void;
    const apply = vi.fn();
    const pending = applySavedUpdate(() => new Promise(resolve => { release = resolve; }), apply);
    expect(apply).not.toHaveBeenCalled();
    release(true); expect(await pending).toBe(true); expect(apply).toHaveBeenCalledOnce();
    const reload = vi.fn();
    expect(await applySavedUpdate(async () => false, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it('retains a dirty document on quota failure and allows retry before updating', async () => {
    const initial = useAppStore.getState();
    const workspace = vi.spyOn(StorageService, 'save_workspace').mockResolvedValue();
    const write = vi.spyOn(StorageService, 'save_diagram').mockRejectedValueOnce(Error('quota')).mockResolvedValue();
    try {
      useAppStore.setState({currentWorkspace:{id:'pwa',path:'virtual://pwa',name:'İstek',description:'',createdAt:'',lastAccessed:''},activeDiagramId:'default',isDirty:true,isReadOnly:false});
      const apply = vi.fn();
      expect(await applySavedUpdate(ensureSavedForNavigation, apply)).toBe(false);
      expect(useAppStore.getState().isDirty).toBe(true); expect(apply).not.toHaveBeenCalled();
      expect(await applySavedUpdate(ensureSavedForNavigation, apply)).toBe(true);
      expect(useAppStore.getState().isDirty).toBe(false); expect(apply).toHaveBeenCalledOnce();
    } finally { workspace.mockRestore(); write.mockRestore(); useAppStore.setState(initial,true); }
  });
  it('keeps component drafts, import previews and live sessions open', async () => {
    const initial=useAppStore.getState();
    try {
      for (const blocked of [{currentView:'studio' as const},{viewMode:'import-preview' as const},{isCollabActive:true}]) {
        useAppStore.setState({...initial,...blocked},true);
        expect(await ensureSavedForUpdate()).toBe(false);
      }
    } finally { useAppStore.setState(initial,true); }
  });

});
