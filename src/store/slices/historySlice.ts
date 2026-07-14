import { StateCreator } from 'zustand';
import { AppState, LogicalDiagram, VisualDiagram } from '../../types';

export interface HistorySlice {
  pastStates: Array<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
  futureStates: Array<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
  layoutVersion: number;

  pushToHistory: () => void;
  /** Saves an explicit snapshot to history without changing current state.
   *  Used by live-preview apply to record the pre-preview state as the undo point. */
  pushStateToHistory: (logicalData: LogicalDiagram, visualData: VisualDiagram) => void;
  undo: () => void;
  redo: () => void;
}

export const createHistorySlice: StateCreator<AppState, [], [], HistorySlice> = (set, get) => ({
  pastStates: [],
  futureStates: [],
  layoutVersion: 0,

  pushToHistory: () => {
    const state = get();
    const snapshot = {
      logicalData: JSON.parse(JSON.stringify(state.logicalData)),
      visualData: JSON.parse(JSON.stringify(state.visualData)),
    };
    const pastStates = [...state.pastStates, snapshot];
    if (pastStates.length > 30) {
      pastStates.shift();
    }
    set({
      pastStates,
      futureStates: [],
    });
  },

  pushStateToHistory: (logicalData, visualData) => {
    const state = get();
    const snapshot = {
      logicalData: JSON.parse(JSON.stringify(logicalData)),
      visualData: JSON.parse(JSON.stringify(visualData)),
    };
    const pastStates = [...state.pastStates, snapshot];
    if (pastStates.length > 30) pastStates.shift();
    set({ pastStates, futureStates: [] });
  },

  undo: () => {
    const state = get();
    if (state.pastStates.length === 0) return;

    const pastStates = [...state.pastStates];
    const previous = pastStates.pop()!;
    const currentSnapshot = {
      logicalData: JSON.parse(JSON.stringify(state.logicalData)),
      visualData: JSON.parse(JSON.stringify(state.visualData)),
    };

    set({
      pastStates,
      futureStates: [currentSnapshot, ...state.futureStates],
      logicalData: previous.logicalData,
      visualData: previous.visualData,
      layoutVersion: state.layoutVersion + 1,
      isDirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.futureStates.length === 0) return;

    const futureStates = [...state.futureStates];
    const next = futureStates.shift()!;
    const currentSnapshot = {
      logicalData: JSON.parse(JSON.stringify(state.logicalData)),
      visualData: JSON.parse(JSON.stringify(state.visualData)),
    };

    set({
      pastStates: [...state.pastStates, currentSnapshot],
      futureStates,
      logicalData: next.logicalData,
      visualData: next.visualData,
      layoutVersion: state.layoutVersion + 1,
      isDirty: true,
    });
  }
});
