import { LogicalDiagram, VisualDiagram, LogicalNode, VisualNode, LogicalEdge, VisualEdge, StickyNote, FreehandStroke, SequenceStep, TimelineTiming } from '../../types';

export interface CollabPeer {
  peerId: string;
  name: string;
  color: string;
  isHost?: boolean;
  cursor?: { x: number; y: number };
  selectedNodeIds?: string[];
  draggingNodeId?: string;
  lastActive?: number;
}

export type CollabConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

// ── Messages sent between peers (via WebRTC DataChannel or WebSocket relay) ───

export type CollabMessage =
  | { type: 'SYNC_SNAPSHOT'; logicalData: LogicalDiagram; visualData: VisualDiagram; diagramId?: string; diagramName?: string; workspaceName?: string; senderId: string }
  | { type: 'SYNC_CURSOR'; x: number; y: number; senderId: string }
  | { type: 'SYNC_SELECTION'; nodeIds: string[]; senderId: string }
  | { type: 'SYNC_NODE_DRAG'; id: string; x: number; y: number; senderId: string }
  | { type: 'SYNC_NODE_DROP'; id: string; x: number; y: number; senderId: string }
  | { type: 'SYNC_NODE_DIMENSIONS'; id: string; width: number; height: number; senderId: string }
  | { type: 'SYNC_NODE_ADD'; logical: LogicalNode; visual: VisualNode; senderId: string }
  | { type: 'SYNC_NODE_DELETE'; id: string; senderId: string }
  | { type: 'SYNC_NODE_UPDATE'; id: string; updates: Record<string, any>; senderId: string }
  | { type: 'SYNC_EDGE_ADD'; logical: LogicalEdge; visual: VisualEdge; senderId: string }
  | { type: 'SYNC_EDGE_DELETE'; id: string; senderId: string }
  | { type: 'SYNC_EDGE_RECONNECT'; edgeId: string; sourceId: string; targetId: string; sourceHandle?: string; targetHandle?: string; senderId: string }
  | { type: 'SYNC_EDGE_UPDATE'; edgeId: string; updates: Record<string, any>; senderId: string }
  | { type: 'SYNC_STICKY_ADD'; visual: VisualNode; annotation: StickyNote; senderId: string }
  | { type: 'SYNC_STICKY_UPDATE'; id: string; updates: Partial<StickyNote>; senderId: string }
  | { type: 'SYNC_STICKY_DELETE'; id: string; senderId: string }
  | { type: 'SYNC_FREEHAND_ADD'; stroke: FreehandStroke; senderId: string }
  | { type: 'SYNC_FREEHAND_UPDATE'; id: string; updates: Partial<FreehandStroke>; senderId: string }
  | { type: 'SYNC_FREEHAND_DELETE'; id: string; senderId: string }
  | { type: 'SYNC_FREEHAND_CLEAR'; senderId: string }
  | { type: 'SYNC_SEQUENCE_ADD'; step: SequenceStep; timing: TimelineTiming; senderId: string }
  | { type: 'SYNC_SEQUENCE_DELETE'; seqId: string; senderId: string }
  | { type: 'SYNC_SEQUENCE_TIMING'; seqId: string; duration: number; delay: number; senderId: string }
  | { type: 'SYNC_SEQUENCE_UPDATE'; seqId: string; stepUpdates?: Partial<SequenceStep>; timingUpdates?: Partial<TimelineTiming>; senderId: string }
  | { type: 'SYNC_CLEAR_CANVAS'; senderId: string };

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type OutgoingCollabMessage = DistributiveOmit<CollabMessage, 'senderId'>;

// ── Signaling messages between Client and Cloudflare CollabRoom DO ───────────

export interface RoomWelcomeData {
  type: 'room_welcome';
  yourPeerId: string;
  peers: Array<{ peerId: string; name: string; color: string }>;
  isHost: boolean;
  timeRemainingMs: number;
}

export interface PeerJoinedData {
  type: 'peer_joined';
  peer: { peerId: string; name: string; color: string };
}

export interface PeerLeftData {
  type: 'peer_left';
  peerId: string;
}

export interface SignalData {
  type: 'signal';
  fromPeerId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface RelayData {
  type: 'relay';
  fromPeerId: string;
  data: CollabMessage;
}

export type ServerToClientSignalingMsg =
  | RoomWelcomeData
  | PeerJoinedData
  | PeerLeftData
  | SignalData
  | RelayData
  | { type: 'pong'; time: number };
