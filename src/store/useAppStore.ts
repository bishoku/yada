import { saveCurrentDiagram } from '../services/saveCoordinator';
import { simulationClock } from './simulationClock';
import { create } from 'zustand';
import { AppState } from '../types';
import { StorageService } from '../services/storage';

import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createStudioSlice } from './slices/studioSlice';
import { createHistorySlice } from './slices/historySlice';
import { createCollabSlice } from './slices/collabSlice';

import { calculateSchedules, deriveTopologyIndices } from './scheduler';

// Try to load persisted Google User
let savedGoogleUser = null;
if (typeof localStorage !== 'undefined') {
  try {
    const savedGoogleUserStr = localStorage.getItem('diagramer_google_user');
    if (savedGoogleUserStr) {
      const parsed = JSON.parse(savedGoogleUserStr);
      if (parsed.expiresAt > Date.now()) {
        savedGoogleUser = parsed;
      } else {
        localStorage.removeItem('diagramer_google_user');
      }
    }
  } catch (e) {}
}

export const useAppStore = create<AppState>()((set, get, store) => {
  const wrappedSet: typeof set = (partial, replace) => {
    set((state) => {
      const nextState = typeof partial === 'function' ? (partial as Function)(state) : partial;
      
      const logicalChanged = nextState.logicalData !== undefined && nextState.logicalData !== state.logicalData;
      const visualChanged = nextState.visualData !== undefined && nextState.visualData !== state.visualData;
      const timelinesChanged = visualChanged && 
                               nextState.visualData.timelines !== undefined && 
                               nextState.visualData.timelines !== state.visualData.timelines;
      const layoutEdgesChanged = visualChanged &&
                                 nextState.visualData.layoutEdges !== undefined &&
                                 nextState.visualData.layoutEdges !== state.visualData.layoutEdges;

      if (logicalChanged || timelinesChanged || layoutEdgesChanged) {
        const mergedLogical = nextState.logicalData !== undefined ? nextState.logicalData : state.logicalData;
        const mergedVisual = nextState.visualData !== undefined ? nextState.visualData : state.visualData;
        const schedules = calculateSchedules(
          mergedLogical.sequences || [],
          mergedVisual.timelines || {},
          mergedLogical.edges || [],
          mergedLogical.nodes || []
        );
        const { connectedPortsByNode, nodeSchedules } = deriveTopologyIndices(
          mergedLogical.nodes || [],
          mergedLogical.edges || [],
          mergedVisual.layoutEdges || {},
          mergedLogical.sequences || [],
          mergedVisual.timelines || {},
          schedules
        );
        nextState.schedules = schedules;
        nextState.derivedConnectedPorts = connectedPortsByNode;
        nextState.derivedNodeSchedules = nodeSchedules;
      }
      return nextState;
    }, replace as any);
  };

  const a: [any, any, any] = [wrappedSet, get, store];

  return {
    ...createWorkspaceSlice(...a),
    ...createCanvasSlice(...a),
    ...createTimelineSlice(...a),
    ...createStudioSlice(...a),
    ...createHistorySlice(...a),
    ...createCollabSlice(...a),

    // Phase 2 Canvas Initial State
    logicalData: { schemaVersion: 2, nodes: [], edges: [], sequences: [] },
    visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {}, annotations: {}, freehandStrokes: {} },
    schedules: {},
    derivedConnectedPorts: {},
    derivedNodeSchedules: {},
    
    // Confirm/Alert State
    confirmState: null,
    alertState: null,

    openConfirm: (options) => {
      return new Promise<boolean>((resolve) => {
        wrappedSet({
          confirmState: {
            isOpen: true,
            title: options.title,
            message: options.message,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
            type: options.type || 'info',
            resolve,
          },
        });
      });
    },
    closeConfirm: (value) => {
      const state = get();
      if (state.confirmState) {
        state.confirmState.resolve(value);
      }
      wrappedSet({ confirmState: null });
    },
    openAlert: (options) => {
      return new Promise<void>((resolve) => {
        wrappedSet({
          alertState: {
            isOpen: true,
            title: options.title,
            message: options.message,
            okText: options.okText,
            resolve,
          },
        });
      });
    },
    closeAlert: () => {
      const state = get();
      if (state.alertState) {
        state.alertState.resolve();
      }
      wrappedSet({ alertState: null });
    },
    
    // Google Drive Sync Initial State
    googleUser: savedGoogleUser,
    syncState: 'idle',
    lastSyncedAt: null,
    hasUnsyncedChanges: false,
    
    setGoogleUser: (user) => {
      if (typeof localStorage !== 'undefined') {
        if (user) {
          localStorage.setItem('diagramer_google_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('diagramer_google_user');
        }
      }
      wrappedSet({ googleUser: user });
    },
    setSyncState: (state) => wrappedSet({ syncState: state }),
    setLastSyncedAt: (timestamp) => wrappedSet({ lastSyncedAt: timestamp }),
    setHasUnsyncedChanges: (hasUnsynced) => wrappedSet({ hasUnsyncedChanges: hasUnsynced }),
  };
});

export const setDiagramDataInStore = (logicalData: any, visualData: any, autoPlay: boolean = false) => {
  simulationClock.reset();
  const schedules = calculateSchedules(
    logicalData.sequences || [],
    visualData.timelines || {},
    logicalData.edges || [],
    logicalData.nodes || []
  );
  const { connectedPortsByNode, nodeSchedules } = deriveTopologyIndices(
    logicalData.nodes || [],
    logicalData.edges || [],
    visualData.layoutEdges || {},
    logicalData.sequences || [],
    visualData.timelines || {},
    schedules
  );
  useAppStore.setState({
    logicalData,
    visualData,
    schedules,
    derivedConnectedPorts: connectedPortsByNode,
    derivedNodeSchedules: nodeSchedules,
    isDirty: false,
    isPlaying: autoPlay && ((logicalData.sequences || []).length > 0),
    currentTime: 0,
  });
};

// ── Auto-Save Loop ────────────────────────────────────────────────────────
let autoSaveInterval: any = null;
let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;

export const startAutoSave = () => {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(async () => {
    const state = useAppStore.getState();
    const mode = StorageService.getMode();
    const isEmbedOrModal = mode === 'embed' || mode === 'confluence-dc' || mode === 'forge';
    if (state.isDirty && state.currentWorkspace && !state.isReadOnly && !state.isSaving && !isEmbedOrModal) {
      console.log('[AutoSave] Triggering save...');
      await saveCurrentDiagram();
    }
  }, 5000);

  if (typeof window !== 'undefined' && !beforeUnloadHandler) {
    beforeUnloadHandler = (event) => {
      const state = useAppStore.getState();
      const mode = StorageService.getMode();
      const isEmbedOrModal = mode === 'embed' || mode === 'confluence-dc' || mode === 'forge';
      if (state.isDirty && state.currentWorkspace && !state.isReadOnly && !isEmbedOrModal) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
};

export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (typeof window !== 'undefined' && beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
};
