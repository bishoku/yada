import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore, setDiagramDataInStore } from '../../store/useAppStore';
import { StorageService } from '../storage';
import { decodeRoute, encodeRoute, hostOwnsNavigation, workspaceRouteId } from './routes';
import { startBrowserNavigation, type HistoryPort } from './browserNavigation';

const platform = vi.hoisted(() => ({ confluence: false }));
vi.mock('../platformCapabilities', () => ({ getPlatformCapabilities: () => ({ canCreateDiagram: !platform.confluence, canCollaborate: !platform.confluence }), assertCanCollaborate: vi.fn(), assertCanCreateDiagram: vi.fn() }));

class FakeHistory implements HistoryPort {
  entries: { url: string; state: unknown }[];
  cursor = 0;
  listeners = new Set<() => void>();
  constructor(url = 'https://example.test/yada/') { this.entries = [{ url, state: null }]; }
  url = () => this.entries[this.cursor].url;
  state = () => this.entries[this.cursor].state;
  push = (state: unknown, url: string) => { this.entries.splice(++this.cursor); this.entries.push({ state, url: new URL(url, this.urlBeforePush()).href }); };
  private urlBeforePush() { return this.entries[Math.max(0, this.cursor - 1)].url; }
  replace = (state: unknown, url: string) => { this.entries[this.cursor] = { state, url: new URL(url, this.url()).href }; };
  go = (delta: number) => { const next = this.cursor + delta; if (next < 0 || next >= this.entries.length) return; this.cursor = next; for (const listener of this.listeners) listener(); };
  listen = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
}
const workspace = { id: 'one', path: 'virtual://ws/one', name: 'Existing', description: '', createdAt: '', lastAccessed: '' };
const logical = { schemaVersion: 2, nodes: [{ id: 'n', name: 'Existing', type: 'server' }], edges: [], sequences: [] };
const visual = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} };
const initial = useAppStore.getInitialState();
const controllers: ReturnType<typeof startBrowserNavigation>[] = [];
const start = (history: FakeHistory) => { const controller = startBrowserNavigation(history); controllers.push(controller); return controller; };
beforeEach(() => {
  platform.confluence = false; useAppStore.setState(initial, true);
  vi.spyOn(StorageService, 'save_workspace').mockResolvedValue();
  vi.spyOn(StorageService, 'save_diagram').mockResolvedValue();
  vi.spyOn(StorageService, 'get_recent_workspaces').mockResolvedValue(JSON.stringify([workspace]));
  vi.spyOn(StorageService, 'load_workspace').mockResolvedValue(JSON.stringify(workspace));
  vi.spyOn(StorageService, 'read_text_file').mockResolvedValue(JSON.stringify({ diagrams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }));
  vi.spyOn(StorageService, 'load_diagram').mockResolvedValue(JSON.stringify({ logical, visual }));
  useAppStore.setState({ loadLibrary: async () => {} });
});
afterEach(() => { for (const controller of controllers.splice(0)) controller.dispose(); vi.restoreAllMocks(); useAppStore.setState(initial, true); });
const open = (id: string) => { setDiagramDataInStore(structuredClone(logical), structuredClone(visual)); useAppStore.setState({ currentWorkspace: workspace, activeDiagramId: id, openDiagramIds: [id], diagrams: [{ id: 'a', name: 'A', updatedAt: '' }, { id: 'b', name: 'B', updatedAt: '' }] }); };

describe('route compatibility', () => {
  it('round trips diagram routes without exposing filesystem paths', () => {
    const route = { kind: 'diagram', workspace: workspaceRouteId({ path: '/Users/private/Architecture' }), diagram: 'a/b #?', view: 'sequence' } as const;
    expect(decodeRoute(encodeRoute(route))).toEqual(route);
    expect(encodeRoute(route)).not.toContain('Users');
    expect(encodeRoute(route)).not.toContain('private');
  });
  it.each(['#share=legacy+payload', '#ref=abcdef', '#collab=room', '#yada=diagram&w=invalid&d=a', '#yada=home&share=legacy'])('does not interpret legacy or invalid hash %s as an app route', hash => {
    expect(decodeRoute(hash)).toBeNull();
  });
  it.each(['?embed=true', '?embed=1', '?integration=iframe', '?mode=modal', '?embed_editor=true'])('leaves host navigation alone for %s', search => expect(hostOwnsNavigation(search)).toBe(true));
});

describe('browser navigation', () => {
  it('restores A → B → sequence through Back/Forward without adding duplicate entries', async () => {
    const history = new FakeHistory(); const controller = start(history);
    open('a'); open('b'); useAppStore.getState().setViewMode('sequence');
    expect(history.entries).toHaveLength(4);
    history.go(-1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().viewMode).toBe('freeform');
    history.go(-1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('a');
    history.go(1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    history.go(1); await controller.ready;
    expect(useAppStore.getState().viewMode).toBe('sequence');
    expect(history.entries).toHaveLength(4);
  });
  it('restores a deep link from existing storage on reload', async () => {
    const route = { kind: 'diagram', workspace: workspaceRouteId(workspace), diagram: 'b', view: 'sequence' } as const;
    const history = new FakeHistory(`https://example.test/yada/${encodeRoute(route)}`);
    const controller = start(history); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().viewMode).toBe('sequence');
    expect(useAppStore.getState().logicalData).toEqual(logical);
    expect(history.entries).toHaveLength(1);
  });
  it('keeps current edits and restores the previous history position when saving fails', async () => {
    const history = new FakeHistory(); const controller = start(history);
    open('a'); open('b');
    useAppStore.setState({ isDirty: true });
    const before = useAppStore.getState().logicalData;
    vi.mocked(StorageService.save_diagram).mockRejectedValue(new Error('write denied'));
    history.go(-1); await controller.ready;
    expect(history.cursor).toBe(2);
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().logicalData).toBe(before);
    expect(useAppStore.getState().isDirty).toBe(true);
    expect(useAppStore.getState().saveError).toBe('write denied');
    expect(useAppStore.getState().navigationError).toBe('CHANGES_NOT_SAVED');
    expect(history.entries).toHaveLength(3);
  });
  it('retains newer edits that arrive while a navigation save is pending', async () => {
    let release!: () => void;
    const history = new FakeHistory(); const controller = start(history);
    open('a'); open('b'); useAppStore.setState({ isDirty: true });
    vi.mocked(StorageService.save_diagram).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    history.go(-1);
    await Promise.resolve(); await Promise.resolve();
    const newer = { ...logical, nodes: [{ id: 'n', name: 'Newer edit', type: 'server' }] };
    useAppStore.setState({ logicalData: newer, isDirty: true });
    release(); await controller.ready;
    expect(useAppStore.getState().logicalData).toBe(newer);
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().isDirty).toBe(true);
  });
  it('rolls back the editor if the target workspace/diagram is unavailable', async () => {
    const history = new FakeHistory(); const controller = start(history);
    open('a'); open('b');
    const before = useAppStore.getState().logicalData;
    vi.mocked(StorageService.load_diagram).mockRejectedValue(new Error('missing file'));
    history.go(-1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().logicalData).toBe(before);
    expect(useAppStore.getState().navigationError).toBe('DIAGRAM_UNAVAILABLE');
    expect(history.cursor).toBe(2);
  });
  it('serializes rapid history changes and ends at the requested destination', async () => {
    const history = new FakeHistory(); const controller = start(history);
    open('a'); open('b'); useAppStore.getState().setViewMode('sequence');
    history.go(-1); history.go(-1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('a');
    expect(decodeRoute(new URL(history.url()).hash)).toMatchObject({ diagram: 'a' });
    history.go(1); await controller.ready;
    expect(useAppStore.getState().activeDiagramId).toBe('b');
    expect(useAppStore.getState().viewMode).toBe('freeform');
  });
  it('does not create history entries for playback, timing edits or selection', () => {
    const history = new FakeHistory(); start(history); open('a');
    const count = history.entries.length;
    useAppStore.getState().setCurrentTime(50);
    useAppStore.getState().setSelectedSequenceId('anything');
    useAppStore.setState({ isDirty: true });
    expect(history.entries).toHaveLength(count);
  });
  it.each(['share=legacy+payload', 'ref=abcdef', 'collab=room'])('preserves existing %s links during initialization', hash => {
    const history = new FakeHistory(`https://example.test/yada/#${hash}`); start(history);
    expect(history.url()).toBe(`https://example.test/yada/#${hash}`);
    expect(history.state()).toBeNull();
  });
  it('does not attach listeners or change history in Confluence', () => {
    platform.confluence = true;
    const history = new FakeHistory('https://example.test/confluence?target=confluence-dc'); start(history); open('a');
    expect(history.entries).toHaveLength(1);
    expect(history.listeners.size).toBe(0);
  });
});
