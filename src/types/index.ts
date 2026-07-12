import { Language, Theme } from '../i18n/translations';

// --- LOGICAL DATA (Logical Flow - AI Readable) ---
export interface LogicalNode {
  id: string; // E.g., 'node-client-1'
  type: string; // E.g., 'client', 'gateway', 'server', 'database', 'cache', 'queue'
  name: string; // User-defined name
}

export interface LogicalEdge {
  id: string; // E.g., 'edge-1'
  step?: number; // Step order for simulations (Phase 3)
  from: string; // Source Node ID
  to: string; // Target Node ID
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  toPort: 'top' | 'right' | 'bottom' | 'left';
  isAsync: boolean;
  protocol?: string; // E.g., 'HTTP', 'gRPC', 'WebSocket' (Phase 4)
}

export interface SequenceStep {
  id: string; // E.g., 'seq-1'
  stepNumber: number; // Step execution order group (1, 2, 3...)
  edgeId: string; // Foreign Key pointing to LogicalEdge.id
  isAsync: boolean; // True = fire and forget, don't block subsequent stepNumbers
  direction?: 'forward' | 'reverse'; // Animating particle direction (forward or reverse)
  isRoundTrip?: boolean; // True = round-trip A -> B -> A for sync responses
}

export interface LogicalDiagram {
  nodes: LogicalNode[];
  edges: LogicalEdge[];
  sequences: SequenceStep[]; // Flow logical ordering
}

// --- VISUAL DATA (Visual and Layout Layer - Human Readable) ---
export interface VisualNode {
  id: string; // Matches LogicalNode.id
  x: number;
  y: number;
  width?: number;
  height?: number;
  theme?: string; // Optional future color palettes
}

export interface TimelineTiming {
  sequenceId: string; // Foreign Key pointing to SequenceStep.id
  duration: number; // Transition transition duration in milliseconds
  delay: number; // Transition start delay in milliseconds
  internalProcess?: {
    text: string; // Text to show in tooltip bubble
    duration: number; // Tooltip display duration in milliseconds
  };
}

export interface VisualDiagram {
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
  };
  layoutNodes: Record<string, VisualNode>; // Quick record access by Node ID
  timelines: Record<string, TimelineTiming>; // Visual details & timings of the animation sequences
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  path: string; // Absolute directory path on the OS
}

export interface DiagramMeta {
  id: string;
  name: string;
  updatedAt: string;
}

export interface AppState {
  currentWorkspace: WorkspaceMeta | null;
  recentWorkspaces: WorkspaceMeta[];
  currentDiagram: DiagramMeta | null;
  isDirty: boolean;
  
  // App Preferences
  language: Language;
  theme: Theme;
  
  // Phase 2 Canvas State
  logicalData: LogicalDiagram;
  visualData: VisualDiagram;
  
  // Custom Drag State (WKWebView doesn't support HTML5 drop)
  pendingDrop: { type: string; name: string } | null;

  // Phase 3 Playback State
  isPlaying: boolean;
  currentTime: number; // Current playback playhead time in ms
  playbackRate: number; // Rate: 0.5, 1, 1.5, 2
  activeSequenceIds: string[]; // Active animating sequence IDs
  selectedSequenceId: string | null; // Selected/focused sequence ID

  // Dynamic Layout State (Splitters & Toggle Sidebars)
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  timelineHeight: number;
  
  // Actions
  setWorkspace: (ws: WorkspaceMeta | null) => void;
  setDiagram: (diagram: DiagramMeta | null) => void;
  setDirty: (status: boolean) => void;
  setRecentWorkspaces: (workspaces: WorkspaceMeta[]) => void;
  
  // Async Operations
  createWorkspace: (name: string, description: string) => Promise<WorkspaceMeta>;
  loadWorkspace: (path: string) => Promise<WorkspaceMeta>;
  fetchRecentWorkspaces: () => Promise<void>;
  saveWorkspaceDetails: (name: string, description: string) => Promise<void>;
  
  // Preferences Operations
  changeLanguage: (lang: Language) => Promise<void>;
  changeTheme: (theme: Theme) => Promise<void>;
  loadAppPreferences: () => Promise<void>;
  
  // Phase 2 Canvas Actions
  addNode: (logical: LogicalNode, visual: VisualNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeDimensions: (id: string, width: number, height: number) => void;
  addEdge: (edge: LogicalEdge) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => void;
  startDrag: (type: string, name: string) => void;
  cancelDrag: () => void;

  // Phase 3 Actions
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSelectedSequenceId: (id: string | null) => void;

  addSequenceStep: (step: SequenceStep, timing: TimelineTiming) => void;
  updateSequenceTiming: (seqId: string, duration: number, delay: number) => void;
  updateSequenceProcess: (seqId: string, text: string, duration: number) => void;
  deleteSequenceStep: (seqId: string) => void;
  setSequenceStepOrder: (seqId: string, stepNumber: number) => void;
  setSequenceStepDirection: (seqId: string, direction: 'forward' | 'reverse') => void;
  setSequenceStepRoundTrip: (seqId: string, isRoundTrip: boolean) => void;
  toggleSequenceAsync: (seqId: string) => void;
  clearCanvas: () => void;
  updateNodeDetails: (id: string, name: string, type: string, theme?: string) => void;
  updateEdgeDetails: (edgeId: string, protocol: string, isAsync: boolean, duration: number, delay: number, tooltipText?: string, tooltipDuration?: number) => void;

  // Layout Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setTimelineHeight: (height: number) => void;
}
