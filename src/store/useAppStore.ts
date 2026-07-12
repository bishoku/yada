import { create } from 'zustand';
import { AppState, WorkspaceMeta, LogicalNode, LogicalEdge, VisualNode, SequenceStep, TimelineTiming } from '../types';
import { Language, Theme } from '../i18n/translations';
import { invoke } from '@tauri-apps/api/core';
import { calculateSchedules } from './scheduler';

// Helper to apply theme to document element
const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  currentDiagram: null,
  isDirty: false,
  language: 'en',
  theme: 'dark',
  
  // Phase 2 Canvas Initial State
  logicalData: { nodes: [], edges: [], sequences: [] },
  visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, timelines: {} },
  pendingDrop: null,

  // Phase 3 Playback State
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  activeSequenceIds: [],
  selectedSequenceId: null,

  // Layout State
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  timelineHeight: 250,

  setWorkspace: (ws) => set({ currentWorkspace: ws }),
  setDiagram: (diagram) => set({ currentDiagram: diagram }),
  setDirty: (status) => set({ isDirty: status }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),

  createWorkspace: async (name: string, description: string) => {
    try {
      const resJson = await invoke<string>('create_workspace', { name, description });
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      set({ 
        currentWorkspace: ws, 
        logicalData: { nodes: [], edges: [], sequences: [] },
        visualData: { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, timelines: {} },
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null
      });
      await get().fetchRecentWorkspaces();
      return ws;
    } catch (err) {
      console.error('Error creating workspace:', err);
      throw err;
    }
  },

  loadWorkspace: async (path: string) => {
    try {
      const resJson = await invoke<string>('load_workspace', { path });
      const ws: WorkspaceMeta = JSON.parse(resJson);
      
      // Load diagram files (logical.json and visual.json) from disk
      let logicalData = { nodes: [], edges: [], sequences: [] };
      let visualData = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, timelines: {} };
      try {
        const diagJson = await invoke<string>('load_diagram', { path });
        const diag = JSON.parse(diagJson);
        if (diag.logical && Array.isArray(diag.logical.nodes) && Array.isArray(diag.logical.edges)) {
          logicalData = {
            nodes: diag.logical.nodes,
            edges: diag.logical.edges,
            sequences: Array.isArray(diag.logical.sequences) ? diag.logical.sequences : []
          };
        }
        if (diag.visual) {
          visualData = {
            canvas: {
              zoom: diag.visual.canvas?.zoom ?? 1,
              pan: {
                x: diag.visual.canvas?.pan?.x ?? 0,
                y: diag.visual.canvas?.pan?.y ?? 0
              }
            },
            layoutNodes: diag.visual.layoutNodes || {},
            timelines: diag.visual.timelines || {}
          };
        }
      } catch (diagErr) {
        console.error('Error loading diagram data from disk, using empty defaults:', diagErr);
      }
      
      set({ 
        currentWorkspace: ws, 
        logicalData,
        visualData,
        isDirty: false,
        isPlaying: false,
        currentTime: 0,
        activeSequenceIds: [],
        selectedSequenceId: null
      });
      await get().fetchRecentWorkspaces();
      return ws;
    } catch (err) {
      console.error('Error loading workspace:', err);
      throw err;
    }
  },

  fetchRecentWorkspaces: async () => {
    try {
      const resJson = await invoke<string>('get_recent_workspaces');
      const list: WorkspaceMeta[] = JSON.parse(resJson);
      set({ recentWorkspaces: list });
    } catch (err) {
      console.error('Error fetching recent workspaces:', err);
    }
  },

  saveWorkspaceDetails: async (name: string, description: string) => {
    const ws = get().currentWorkspace;
    if (!ws) return;
    const updatedWs = { ...ws, name, description, lastAccessed: new Date().toISOString() };
    set({ currentWorkspace: updatedWs, isDirty: true });
  },

  changeLanguage: async (lang: Language) => {
    try {
      set({ language: lang });
      const prefObj = { language: lang, theme: get().theme };
      await invoke('save_preferences', { preferencesJson: JSON.stringify(prefObj) });
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  },

  changeTheme: async (theme: Theme) => {
    try {
      set({ theme });
      applyTheme(theme);
      const prefObj = { language: get().language, theme };
      await invoke('save_preferences', { preferencesJson: JSON.stringify(prefObj) });
    } catch (err) {
      console.error('Error saving theme preference:', err);
    }
  },

  loadAppPreferences: async () => {
    try {
      const resJson = await invoke<string>('load_preferences');
      const prefObj = JSON.parse(resJson);
      
      let finalLang: Language = 'en';
      if (prefObj.language === 'system') {
        const sysLang = navigator.language || 'en';
        finalLang = sysLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
      } else if (prefObj.language === 'tr' || prefObj.language === 'en') {
        finalLang = prefObj.language;
      }
      
      const finalTheme: Theme = prefObj.theme === 'light' ? 'light' : 'dark';
      
      set({ language: finalLang, theme: finalTheme });
      applyTheme(finalTheme);
    } catch (err) {
      console.error('Error loading app preferences:', err);
      const sysLang = navigator.language || 'en';
      const finalLang: Language = sysLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
      set({ language: finalLang, theme: 'dark' });
      applyTheme('dark');
    }
  },

  // Phase 2 Canvas Action Implementations
  addNode: (logical: LogicalNode, visual: VisualNode) => {
    set((state) => {
      const nodes = [...state.logicalData.nodes, logical];
      const layoutNodes = { ...state.visualData.layoutNodes, [visual.id]: visual };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodePosition: (id: string, x: number, y: number) => {
    set((state) => {
      const layoutNode = state.visualData.layoutNodes[id];
      if (!layoutNode) return {};
      const updatedNode = { ...layoutNode, x, y };
      const layoutNodes = { ...state.visualData.layoutNodes, [id]: updatedNode };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  addEdge: (edge: LogicalEdge) => {
    set((state) => {
      // Avoid duplicate edges (same source, target, source port, target port)
      const duplicate = state.logicalData.edges.some(
        (e) => e.from === edge.from && 
               e.to === edge.to && 
               e.fromPort === edge.fromPort && 
               e.toPort === edge.toPort
      );
      if (duplicate) return {};

      const edges = [...state.logicalData.edges, edge];
      return {
        logicalData: { ...state.logicalData, edges },
        isDirty: true
      };
    });
  },

  deleteNode: (id: string) => {
    set((state) => {
      const nodes = state.logicalData.nodes.filter((n) => n.id !== id);
      const deletedEdgeIds = state.logicalData.edges
        .filter((e) => e.from === id || e.to === id)
        .map((e) => e.id);
      
      const edges = state.logicalData.edges.filter((e) => e.from !== id && e.to !== id);
      
      // Filter out sequences referencing deleted edges
      const sequences = state.logicalData.sequences.filter((s) => !deletedEdgeIds.includes(s.edgeId));
      
      // Clean layout nodes
      const layoutNodes = { ...state.visualData.layoutNodes };
      delete layoutNodes[id];
      
      // Clean timelines
      const timelines = { ...state.visualData.timelines };
      state.logicalData.sequences.forEach((s) => {
        if (deletedEdgeIds.includes(s.edgeId)) {
          delete timelines[s.id];
        }
      });

      return {
        logicalData: { nodes, edges, sequences },
        visualData: { ...state.visualData, layoutNodes, timelines },
        isDirty: true
      };
    });
  },

  deleteEdge: (id: string) => {
    set((state) => {
      const edges = state.logicalData.edges.filter((e) => e.id !== id);
      const deletedSeqIds = state.logicalData.sequences
        .filter((s) => s.edgeId === id)
        .map((s) => s.id);
      
      const sequences = state.logicalData.sequences.filter((s) => s.edgeId !== id);
      
      const timelines = { ...state.visualData.timelines };
      deletedSeqIds.forEach((seqId) => {
        delete timelines[seqId];
      });

      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => {
    set((state) => {
      return {
        visualData: {
          ...state.visualData,
          canvas: { zoom, pan }
        },
        isDirty: true
      };
    });
  },

  startDrag: (type: string, name: string) => {
    set({ pendingDrop: { type, name } });
  },

  cancelDrag: () => {
    set({ pendingDrop: null });
  },

  // Phase 3 Playback Action Implementations
  startPlayback: () => set({ isPlaying: true }),
  pausePlayback: () => set({ isPlaying: false }),
  stopPlayback: () => set({ isPlaying: false, currentTime: 0, activeSequenceIds: [] }),
  setCurrentTime: (time) => {
    set((state) => {
      const schedules = calculateSchedules(state.logicalData.sequences, state.visualData.timelines);
      const activeSequenceIds: string[] = [];
      
      Object.entries(schedules).forEach(([seqId, sched]) => {
        if (time >= sched.start && time < sched.end) {
          activeSequenceIds.push(seqId);
        }
      });

      return {
        currentTime: time,
        activeSequenceIds
      };
    });
  },
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setSelectedSequenceId: (id) => set({ selectedSequenceId: id }),

  addSequenceStep: (step: SequenceStep, timing: TimelineTiming) => {
    set((state) => {
      const sequences = [...state.logicalData.sequences, step];
      const timelines = { ...state.visualData.timelines, [timing.sequenceId]: timing };
      return {
        logicalData: { ...state.logicalData, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateSequenceTiming: (seqId: string, duration: number, delay: number) => {
    set((state) => {
      const timing = state.visualData.timelines[seqId] || { sequenceId: seqId, duration: 1000, delay: 0 };
      const updatedTiming = { ...timing, duration, delay };
      const timelines = { ...state.visualData.timelines, [seqId]: updatedTiming };
      return {
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  updateSequenceProcess: (seqId: string, text: string, duration: number) => {
    set((state) => {
      const timing = state.visualData.timelines[seqId] || { sequenceId: seqId, duration: 1000, delay: 0 };
      const updatedTiming = {
        ...timing,
        internalProcess: text ? { text, duration } : undefined
      };
      const timelines = { ...state.visualData.timelines, [seqId]: updatedTiming };
      return {
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  },

  deleteSequenceStep: (seqId: string) => {
    set((state) => {
      const sequences = state.logicalData.sequences.filter((s) => s.id !== seqId);
      const timelines = { ...state.visualData.timelines };
      delete timelines[seqId];
      
      const selectedSequenceId = state.selectedSequenceId === seqId ? null : state.selectedSequenceId;
      const activeSequenceIds = state.activeSequenceIds.filter((id) => id !== seqId);
      
      return {
        logicalData: { ...state.logicalData, sequences },
        visualData: { ...state.visualData, timelines },
        selectedSequenceId,
        activeSequenceIds,
        isDirty: true
      };
    });
  },

  setSequenceStepOrder: (seqId: string, stepNumber: number) => {
    set((state) => {
      const sequences = state.logicalData.sequences.map((s) => 
        s.id === seqId ? { ...s, stepNumber } : s
      );
      return {
        logicalData: { ...state.logicalData, sequences },
        isDirty: true
      };
    });
  },

  toggleSequenceAsync: (seqId: string) => {
    set((state) => {
      const sequences = state.logicalData.sequences.map((s) => 
        s.id === seqId ? { ...s, isAsync: !s.isAsync } : s
      );
      return {
        logicalData: { ...state.logicalData, sequences },
        isDirty: true
      };
    });
  },

  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setTimelineHeight: (height) => set({ timelineHeight: height }),
  clearCanvas: () => set((state) => ({
    logicalData: { nodes: [], edges: [], sequences: [] },
    visualData: { 
      canvas: state.visualData.canvas, 
      layoutNodes: {}, 
      timelines: {} 
    },
    isDirty: true,
    isPlaying: false,
    currentTime: 0,
    activeSequenceIds: [],
    selectedSequenceId: null
  })),

  updateNodeDetails: (id, name, type, theme) => {
    set((state) => {
      const nodes = state.logicalData.nodes.map((n) => 
        n.id === id ? { ...n, name, type } : n
      );
      const existingVisual = state.visualData.layoutNodes[id] ?? { id, x: 0, y: 0 };
      const layoutNodes = {
        ...state.visualData.layoutNodes,
        [id]: { ...existingVisual, theme }
      };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateEdgeDetails: (edgeId, protocol, isAsync, duration, delay, tooltipText, tooltipDuration) => {
    set((state) => {
      const edges = state.logicalData.edges.map((e) => 
        e.id === edgeId ? { ...e, protocol, isAsync } : e
      );
      const sequences = state.logicalData.sequences.map((s) => 
        s.edgeId === edgeId ? { ...s, isAsync } : s
      );
      const timelines = { ...state.visualData.timelines };
      state.logicalData.sequences
        .filter((s) => s.edgeId === edgeId)
        .forEach((seq) => {
          const existing = timelines[seq.id] ?? { sequenceId: seq.id, duration: 1000, delay: 0 };
          timelines[seq.id] = {
            ...existing,
            duration,
            delay,
            internalProcess: tooltipText 
              ? { text: tooltipText, duration: tooltipDuration ?? 1000 }
              : undefined
          };
        });
      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, timelines },
        isDirty: true
      };
    });
  }
}));

// Throttled Auto-Save Loop
let autoSaveInterval: any = null;

export const startAutoSave = () => {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(async () => {
    const state = useAppStore.getState();
    if (state.isDirty && state.currentWorkspace) {
      console.log('[AutoSave] Saving workspace config and diagrams...');
      try {
        const path = state.currentWorkspace.path;
        
        // 1. Save workspace.json
        await invoke('save_workspace', { metaJson: JSON.stringify(state.currentWorkspace) });
        
        // 2. Save logical.json and visual.json
        await invoke('save_diagram', { 
          path,
          logicalJson: JSON.stringify(state.logicalData),
          visualJson: JSON.stringify(state.visualData)
        });
        
        state.setDirty(false);
        console.log('[AutoSave] Saved successfully.');
      } catch (err) {
        console.error('[AutoSave] Save failed:', err);
      }
    }
  }, 5000);
};

export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
};
