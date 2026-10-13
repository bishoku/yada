import { simulationClock } from '../simulationClock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore, setDiagramDataInStore } from '../useAppStore';
import { StorageService } from '../../services/storage';
import { collabManager } from '../../services/collab/CollabManager';
import { getPlatformCapabilities } from '../../services/platformCapabilities';
import { DiagramTabBar } from '../../components/layout/DiagramTabBar';
import { CreateDiagramModal } from '../../components/layout/CreateDiagramModal';
import { StartCollabModal } from '../../components/collab/StartCollabModal';
import { CollabTopBar } from '../../components/collab/CollabTopBar';
import { CollabJoinModal } from '../../components/collab/CollabJoinModal';

const platform = vi.hoisted(() => ({ forge: false, dc: false }));
vi.mock('../../services/forgeBridge', () => ({ isForge: () => platform.forge }));
vi.mock('../../services/confluenceDcBridge', () => ({ isConfluenceDC: () => platform.dc }));

const initialState = { ...useAppStore.getInitialState() };

const logical = {
  schemaVersion: 2,
  nodes: [{ id: 'client', type: 'client', name: 'Existing client', properties: {} }, { id: 'api', type: 'server', name: 'Existing API', properties: {} }],
  edges: [{ id: 'request', sourceId: 'client', targetId: 'api', isAsync: false }],
  sequences: [{ id: 'call', edgeId: 'request', stepNumber: 1, isAsync: false, isRoundTrip: true }],
};
const visual = {
  canvas: { zoom: 1.2, pan: { x: 12, y: 24 } },
  layoutNodes: { client: { id: 'client', x: 10, y: 20 }, api: { id: 'api', x: 300, y: 20 } },
  layoutEdges: {},
  timelines: { call: { sequenceId: 'call', duration: 1400, delay: 250, internalProcess: { text: 'Existing work', duration: 300 } } },
  annotations: {}, freehandStrokes: {},
};

beforeEach(() => {
  platform.forge = false;
  platform.dc = false;
  useAppStore.setState(useAppStore.getInitialState(), true);
  useAppStore.setState({
    currentWorkspace: { id: 'macro', name: 'Existing macro', path: 'virtual://existing', description: 'Existing document', createdAt: '2025-01-01', lastAccessed: '2025-01-01' },
    activeDiagramId: 'default', openDiagramIds: ['default'],
    diagrams: [{ id: 'default', name: 'Existing diagram', updatedAt: '2025-01-01' }],
  });
  setDiagramDataInStore(structuredClone(logical), structuredClone(visual));
});
afterEach(() => {
  Object.assign(useAppStore.getInitialState(), initialState);
  vi.restoreAllMocks();
});

for (const mode of ['forge', 'dc'] as const) {
  describe(`${mode} restrictions`, () => {
    beforeEach(() => { platform[mode] = true; });

    it('hides tabs and all creation/collaboration dialogs even with forced open state', () => {
      useAppStore.setState({ isCreateDiagramModalOpen: true, isStartCollabModalOpen: true, isJoinCollabModalOpen: true, pendingJoinRoomId: 'room', isCollabActive: true });
      // SSR reads the server snapshot: expose the forced state there too.
      Object.assign(useAppStore.getInitialState(), useAppStore.getState());
      expect(renderToStaticMarkup(<DiagramTabBar />)).toBe('');
      expect(renderToStaticMarkup(<CreateDiagramModal />)).toBe('');
      expect(renderToStaticMarkup(<StartCollabModal />)).toBe('');
      expect(renderToStaticMarkup(<CollabJoinModal />)).toBe('');
      expect(renderToStaticMarkup(<CollabTopBar />)).toBe('');
    });

    it('blocks dialog opening and direct collaboration calls before storage/network side effects', async () => {
      const join = vi.spyOn(collabManager, 'joinRoom');
      const create = vi.spyOn(StorageService, 'create_workspace');
      const before = useAppStore.getState();
      before.setStartCollabModalOpen(true);
      before.setJoinCollabModalOpen(true, 'room');
      expect(useAppStore.getState().isStartCollabModalOpen).toBe(false);
      expect(useAppStore.getState().isJoinCollabModalOpen).toBe(false);
      expect(useAppStore.getState().pendingJoinRoomId).toBeNull();
      await expect(before.startCollabSession()).rejects.toThrow('unavailable in Confluence');
      await expect(before.joinCollabSession('room', 'Guest', '#fff')).rejects.toThrow('unavailable in Confluence');
      expect(join).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(useAppStore.getState().logicalData).toBe(before.logicalData);
      expect(useAppStore.getState().currentWorkspace).toBe(before.currentWorkspace);
    });

    it('blocks transport entry directly', async () => {
      await expect(collabManager.joinRoom('room', 'Guest', '#fff')).rejects.toThrow('unavailable in Confluence');
      expect(collabManager.isActive).toBe(false);
    });

    it('blocks creation, copying and import-as-new without changing the existing diagram', async () => {
      const save = vi.spyOn(StorageService, 'save_diagram');
      const before = useAppStore.getState();
      before.setCreateDiagramModalOpen(true);
      expect(useAppStore.getState().isCreateDiagramModalOpen).toBe(false);
      for (const action of [
        () => before.createDiagram('New'),
        () => before.copyDiagramToWorkspace('default', 'target'),
        () => before.cloneSharedToWorkspace('New'),
        () => before.saveSharedToWorkspace('target', false),
        () => before.importPreviewToWorkspace('target', 'New'),
        () => before.importPreviewToNewWorkspace('New', 'New'),
      ]) await expect(action()).rejects.toThrow('unavailable in Confluence');
      expect(save).not.toHaveBeenCalled();
      expect(useAppStore.getState().logicalData).toBe(before.logicalData);
      expect(useAppStore.getState().visualData).toBe(before.visualData);
      expect(useAppStore.getState().diagrams).toBe(before.diagrams);
    });

    it.each([1, 2])('loads and saves an existing schema v%s document with its IDs and timings intact', async (version) => {
      const inputLogical = { ...structuredClone(logical), schemaVersion: version };
      const inputVisual = structuredClone(visual);
      vi.spyOn(StorageService, 'load_diagram').mockResolvedValue(JSON.stringify({ logicalData: inputLogical, visualData: inputVisual }));
      const save = vi.spyOn(StorageService, 'save_diagram').mockResolvedValue();
      simulationClock.setTime(800);
      simulationClock.setIsPlaying(true);
      useAppStore.setState({ activeDiagramId: 'other' });
      await useAppStore.getState().switchDiagram('default');
      const loaded = useAppStore.getState();
      expect(simulationClock.getTime()).toBe(0);
      expect(simulationClock.getIsPlaying()).toBe(false);
      expect(loaded.logicalData).toEqual(logical);
      expect(loaded.visualData).toEqual(visual);
      expect(loaded.schedules.call).toBeDefined();
      loaded.updateSequenceTiming('call', 1600, 250);
      await useAppStore.getState().manualSave();
      const args = save.mock.calls[0];
      expect(args[1]).toBe('default');
      expect(JSON.parse(args[2]).sequences).toEqual(logical.sequences);
      expect(JSON.parse(args[3]).timelines.call).toMatchObject({ duration: 1600, delay: 250 });
    });
  });
}

it('preserves standalone creation and collaboration', async () => {
  expect(getPlatformCapabilities()).toEqual({ canCreateDiagram: true, canCollaborate: true });
  vi.spyOn(StorageService, 'save_diagram').mockResolvedValue();
  vi.spyOn(StorageService, 'save_text_file').mockResolvedValue();
  const join = vi.spyOn(collabManager, 'joinRoom').mockResolvedValue();
  await useAppStore.getState().createDiagram('New');
  expect(useAppStore.getState().diagrams).toHaveLength(2);
  useAppStore.getState().setStartCollabModalOpen(true);
  expect(useAppStore.getState().isStartCollabModalOpen).toBe(true);
  await useAppStore.getState().startCollabSession();
  expect(join).toHaveBeenCalledOnce();
});
