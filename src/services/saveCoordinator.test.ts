import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore, setDiagramDataInStore, startAutoSave, stopAutoSave } from '../store/useAppStore';
import { ensureSavedForNavigation } from './saveCoordinator';
import { StorageService } from './storage';
import { LocalStorageDriver } from './storage/drivers/LocalStorageDriver';

const initial = useAppStore.getInitialState();
beforeEach(() => {
  useAppStore.setState(initial, true);
  setDiagramDataInStore({ schemaVersion: 2, nodes: [{ id: 'a', name: 'Existing', type: 'server' }], edges: [], sequences: [] }, { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} });
  useAppStore.setState({ currentWorkspace: { id: 'ws', path: 'virtual://ws', name: 'Workspace', description: '', createdAt: '', lastAccessed: '' }, activeDiagramId: 'default', openDiagramIds: ['default'], isDirty: true });
  vi.spyOn(StorageService, 'save_workspace').mockResolvedValue();
  vi.spyOn(StorageService, 'save_diagram').mockResolvedValue();
});
afterEach(() => { stopAutoSave(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });

describe('save coordination', () => {
  it('blocks collaboration replacement and leaving when a save fails', async () => {
    vi.mocked(StorageService.save_diagram).mockRejectedValue(new Error('write failed'));
    const logical = useAppStore.getState().logicalData;
    await expect(useAppStore.getState().joinCollabSession('room', 'Name', 'red')).rejects.toThrow('CHANGES_NOT_SAVED');
    expect(useAppStore.getState().logicalData).toBe(logical);
    useAppStore.setState({ isCollabActive: true });
    await expect(useAppStore.getState().leaveCollabSession()).rejects.toThrow('CHANGES_NOT_SAVED');
    expect(useAppStore.getState().isCollabActive).toBe(true);
  });
  it('keeps edits made while the next diagram is loading', async () => {
    useAppStore.setState({ isDirty: false });
    let finish!: (json: string) => void;
    vi.spyOn(StorageService, 'load_diagram').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const load = useAppStore.getState().switchDiagram('next');
    await Promise.resolve();
    const newer = { ...useAppStore.getState().logicalData, nodes: [{ id: 'new', name: 'Unsaved edit', type: 'server' }] };
    useAppStore.setState({ logicalData: newer, isDirty: true });
    finish(JSON.stringify({ logical: { schemaVersion: 2, nodes: [], edges: [], sequences: [] }, visual: useAppStore.getState().visualData }));
    await load;
    expect(useAppStore.getState().logicalData).toBe(newer);
    expect(useAppStore.getState().activeDiagramId).toBe('default');
    expect(useAppStore.getState().saveError).toBe('CHANGES_NOT_SAVED');
  });
  it('ignores an older diagram load that finishes after the latest request', async () => {
    useAppStore.setState({ isDirty: false });
    const finishes: Record<string, (json: string) => void> = {};
    vi.spyOn(StorageService, 'load_diagram').mockImplementation((_path, id) => new Promise(resolve => { finishes[id!] = resolve; }));
    const older = useAppStore.getState().switchDiagram('older');
    await Promise.resolve();
    const latest = useAppStore.getState().switchDiagram('latest');
    await Promise.resolve();
    const payload = JSON.stringify({ logical: useAppStore.getState().logicalData, visual: useAppStore.getState().visualData });
    finishes.latest(payload); await latest;
    finishes.older(payload); await older;
    expect(useAppStore.getState().activeDiagramId).toBe('latest');
  });
  it('preserves schemas and coalesces overlapping saves', async () => {
    let release!: () => void;
    vi.mocked(StorageService.save_diagram).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    const first = useAppStore.getState().manualSave(), second = useAppStore.getState().manualSave();
    expect(first).toBe(second);
    await Promise.resolve();
    expect(StorageService.save_diagram).toHaveBeenCalledOnce();
    const envelope = JSON.parse(vi.mocked(StorageService.save_diagram).mock.calls[0][4]!);
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.logical.nodes[0].id).toBe('a');
    release();
    expect(await first).toBe(true);
    expect(useAppStore.getState().isDirty).toBe(false);
  });
  it('keeps edits made during an in-flight save dirty and intact', async () => {
    let release!: () => void;
    vi.mocked(StorageService.save_diagram).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    const save = ensureSavedForNavigation();
    await Promise.resolve();
    const newer = { ...useAppStore.getState().logicalData, nodes: [{ id: 'a', name: 'Newer work', type: 'server' }] };
    useAppStore.setState({ logicalData: newer, isDirty: true });
    release();
    expect(await save).toBe(false);
    expect(useAppStore.getState().isDirty).toBe(true);
    expect(useAppStore.getState().logicalData).toBe(newer);
    expect(useAppStore.getState().saveError).toBe('CHANGES_NOT_SAVED');
    expect(await useAppStore.getState().manualSave()).toBe(true);
    expect(useAppStore.getState().isDirty).toBe(false);
  });
  it('cannot mark another document clean when a save finishes', async () => {
    let release!: () => void;
    vi.mocked(StorageService.save_diagram).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    const save = useAppStore.getState().manualSave();
    await Promise.resolve();
    useAppStore.setState({ activeDiagramId: 'another', isDirty: true });
    release(); await save;
    expect(useAppStore.getState().isDirty).toBe(true);
  });
  it('blocks leaving, switching, closing and workspace replacement on save failure', async () => {
    vi.mocked(StorageService.save_diagram).mockRejectedValue(new Error('quota exceeded'));
    const load = vi.spyOn(StorageService, 'load_diagram');
    const before = useAppStore.getState();
    expect(await before.setWorkspace(null)).toBe(false);
    await before.switchDiagram('another');
    await before.closeDiagram('default');
    await expect(before.loadWorkspace('other-workspace')).rejects.toThrow('CHANGES_NOT_SAVED');
    expect(load).not.toHaveBeenCalled();
    expect(useAppStore.getState().currentWorkspace).toBe(before.currentWorkspace);
    expect(useAppStore.getState().logicalData).toBe(before.logicalData);
    expect(useAppStore.getState().activeDiagramId).toBe('default');
    expect(useAppStore.getState().isDirty).toBe(true);
    expect(useAppStore.getState().saveError).toBe('quota exceeded');
  });
  it('requests unload protection synchronously rather than relying on an async write', () => {
    let handler!: (event: { preventDefault(): void; returnValue: string }) => void;
    vi.stubGlobal('window', { addEventListener: (name: string, callback: typeof handler) => { if (name === 'beforeunload') handler = callback; }, removeEventListener: vi.fn() });
    vi.spyOn(StorageService, 'getMode').mockReturnValue('localstorage');
    startAutoSave();
    const event = { preventDefault: vi.fn(), returnValue: 'unchanged' };
    handler(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe('');
    expect(StorageService.save_diagram).not.toHaveBeenCalled();
  });
  it('reports browser quota failures instead of silently saving to session memory', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } });
    const driver = new LocalStorageDriver();
    await expect(driver.save_diagram('virtual://ws', 'default', '{"schemaVersion":2}', '{}')).rejects.toThrow('quota exceeded');
    await expect(driver.load_diagram('virtual://ws', 'default')).rejects.toThrow('Diagram data not found');
  });
});
