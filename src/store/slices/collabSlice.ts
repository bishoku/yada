import { StateCreator } from 'zustand';
import { AppState, WorkspaceMeta } from '../../types';
import { CollabPeer } from '../../services/collab/types';
import { collabManager } from '../../services/collab/CollabManager';
import { StorageService } from '../../services/storage';

const PEER_COLORS = [
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export interface CollabSlice {
  isCollabActive: boolean;
  collabRoomId: string | null;
  collabMyPeerId: string | null;
  collabRole: 'host' | 'guest' | null;
  collabDiagramId: string | null;
  collabDiagramName: string | null;
  collabWorkspaceName: string | null;
  collabPeers: Record<string, CollabPeer>;
  collabTimeRemainingMs: number;
  isStartCollabModalOpen: boolean;
  isJoinCollabModalOpen: boolean;
  pendingJoinRoomId: string | null;

  setCollabActive: (
    active: boolean,
    roomId: string | null,
    myPeerId: string | null,
    role: 'host' | 'guest' | null
  ) => void;
  setCollabTimeRemaining: (ms: number) => void;
  addCollabPeer: (peer: CollabPeer) => void;
  removeCollabPeer: (peerId: string) => void;
  updateCollabPeer: (peerId: string, updates: Partial<CollabPeer>) => void;
  setStartCollabModalOpen: (open: boolean) => void;
  setJoinCollabModalOpen: (open: boolean, roomId?: string | null) => void;
  startCollabSession: (durationMinutes?: number) => Promise<string>;
  joinCollabSession: (roomId: string, name: string, color: string) => Promise<void>;
  leaveCollabSession: () => Promise<void>;
}

export const createCollabSlice: StateCreator<AppState, [], [], CollabSlice> = (set, get) => ({
  isCollabActive: false,
  collabRoomId: null,
  collabMyPeerId: null,
  collabRole: null,
  collabDiagramId: null,
  collabDiagramName: null,
  collabWorkspaceName: null,
  collabPeers: {},
  collabTimeRemainingMs: 30 * 60 * 1000,
  isStartCollabModalOpen: false,
  isJoinCollabModalOpen: false,
  pendingJoinRoomId: null,

  setCollabActive: (active, roomId, myPeerId, role) =>
    set({
      isCollabActive: active,
      collabRoomId: roomId,
      collabMyPeerId: myPeerId,
      collabRole: role,
      collabPeers: active ? get().collabPeers : {},
    }),

  setCollabTimeRemaining: (ms) => set({ collabTimeRemainingMs: ms }),

  addCollabPeer: (peer) =>
    set((state) => ({
      collabPeers: { ...state.collabPeers, [peer.peerId]: peer },
    })),

  removeCollabPeer: (peerId) =>
    set((state) => {
      const peers = { ...state.collabPeers };
      delete peers[peerId];
      return { collabPeers: peers };
    }),

  updateCollabPeer: (peerId, updates) =>
    set((state) => {
      const existing = state.collabPeers[peerId];
      if (!existing) return {};
      return {
        collabPeers: {
          ...state.collabPeers,
          [peerId]: { ...existing, ...updates },
        },
      };
    }),

  setStartCollabModalOpen: (open) => set({ isStartCollabModalOpen: open }),
  setJoinCollabModalOpen: (open, roomId = null) =>
    set({ isJoinCollabModalOpen: open, pendingJoinRoomId: roomId }),

  startCollabSession: async (durationMinutes = 30) => {
    const state = get();
    const activeDiagramId = state.activeDiagramId;
    const currentWorkspace = state.currentWorkspace;
    const diagrams = state.diagrams;
    const activeDiagram = diagrams.find((d) => d.id === activeDiagramId);

    if (!activeDiagramId || !activeDiagram || !currentWorkspace) {
      throw new Error('Please open a diagram before starting a collaboration session.');
    }

    const roomId = `collab-${Math.random().toString(36).substring(2, 10)}`;
    const googleUser = state.googleUser;
    const name = googleUser?.name || 'Host Architect';
    const color = PEER_COLORS[0];

    // Lock open diagram tabs strictly to the active diagram
    set({
      collabDiagramId: activeDiagramId,
      collabDiagramName: activeDiagram.name,
      collabWorkspaceName: currentWorkspace.name,
      openDiagramIds: [activeDiagramId],
    });

    await collabManager.joinRoom(roomId, name, color, durationMinutes);
    return roomId;
  },

  joinCollabSession: async (roomId, name, color) => {
    // 1. If the user currently has an open dirty workspace, save it before switching
    const existingWs = get().currentWorkspace;
    if (existingWs && !existingWs.path.startsWith('memory://')) {
      try {
        await get().manualSave();
      } catch (e) {
        console.warn('[Collab] Failed to auto-save existing workspace before joining:', e);
      }
    }

    // 2. Create a persistent workspace in storage for this session
    const wsName = 'Collaborative Workspace';
    let realWs: WorkspaceMeta;
    try {
      const resJson = await StorageService.create_workspace(wsName, 'Live Collaboration Session');
      realWs = JSON.parse(resJson);
    } catch (err) {
      console.warn('[Collab] Failed to create workspace via StorageService, using fallback:', err);
      realWs = {
        id: `collab-ws-${roomId}`,
        name: wsName,
        path: `virtual://workspace/collab-${roomId}`,
        description: 'Live Collaboration Session',
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };
    }

    const initialDiagramId = 'collab-diagram';
    const initialDiagram = {
      id: initialDiagramId,
      name: 'Collaborative Diagram',
      updatedAt: new Date().toISOString(),
    };

    try {
      await StorageService.save_text_file(
        `${realWs.path}/diagrams/index.json`,
        JSON.stringify({ diagrams: [initialDiagram] })
      );
    } catch (_) {}

    // Mount persistent workspace and openDiagramIds so DiagramCanvas mounts instantly!
    set({
      currentWorkspace: realWs,
      diagrams: [initialDiagram],
      activeDiagramId: initialDiagramId,
      openDiagramIds: [initialDiagramId],
      collabDiagramId: initialDiagramId,
      collabDiagramName: initialDiagram.name,
      collabWorkspaceName: realWs.name,
      currentView: 'diagram',
      viewMode: 'freeform',
      isReadOnly: false,
    });

    await collabManager.joinRoom(roomId, name, color);
  },

  leaveCollabSession: async () => {
    const { isCollabActive } = get();
    if (!isCollabActive) return;

    // Persist final diagram and workspace state to storage before disconnecting
    try {
      await get().manualSave();
    } catch (e) {
      console.warn('[Collab] Failed to save before leaving session:', e);
    }

    collabManager.leaveRoom();

    set({
      isCollabActive: false,
      collabRoomId: null,
      collabMyPeerId: null,
      collabRole: null,
      collabDiagramId: null,
      collabDiagramName: null,
      collabWorkspaceName: null,
      collabPeers: {},
    });

    // Clean URL hash so refreshing doesn't prompt to join again
    if (typeof window !== 'undefined' && window.location.hash.includes('collab=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Refresh recent workspaces so this workspace appears in the list
    try {
      await get().fetchRecentWorkspaces();
    } catch (_) {}
  },
});
