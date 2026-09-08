import { CollabMessage, ServerToClientSignalingMsg, OutgoingCollabMessage } from './types';
import { CollabSignalingClient } from './CollabSignalingClient';
import { useAppStore, setDiagramDataInStore } from '../../store/useAppStore';
import { StorageService } from '../storage';
import { DiagramMeta, WorkspaceMeta } from '../../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type RemoteDragListener = (id: string, x: number, y: number, peerId: string) => void;
export type RemoteDropListener = (id: string, x: number, y: number, peerId: string) => void;

class CollabManagerService {
  private signaling: CollabSignalingClient | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private reliableChannels = new Map<string, RTCDataChannel>();
  private unreliableChannels = new Map<string, RTCDataChannel>();
  private peerMeta = new Map<string, { name: string; color: string; useRelay: boolean }>();

  public myPeerId: string = '';
  public myName: string = 'Architect';
  public myColor: string = '#3B82F6';
  public roomId: string = '';
  public isHost: boolean = false;
  public isActive: boolean = false;

  private dragListeners = new Set<RemoteDragListener>();
  private dropListeners = new Set<RemoteDropListener>();

  private lastCursorSent = 0;
  private lastDragSent = new Map<string, number>();

  /**
   * Initializes and connects to a collaboration room
   */
  async joinRoom(
    roomId: string,
    name: string,
    color: string,
    durationMinutes: number = 30
  ): Promise<void> {
    this.leaveRoom();

    this.roomId = roomId;
    this.myName = name;
    this.myColor = color;
    this.myPeerId = `peer-${Math.random().toString(36).substring(2, 9)}`;

    this.signaling = new CollabSignalingClient(
      undefined,
      roomId,
      this.myPeerId,
      name,
      color,
      durationMinutes
    );

    this.signaling.onMessage((msg) => this.handleSignalingMessage(msg));

    await this.signaling.connect();
    this.isActive = true;
  }

  /**
   * Closes the active room and tears down all connections
   */
  leaveRoom() {
    this.isActive = false;

    for (const [_, pc] of this.peerConnections) {
      try { pc.close(); } catch {}
    }
    this.peerConnections.clear();
    this.reliableChannels.clear();
    this.unreliableChannels.clear();
    this.peerMeta.clear();

    if (this.signaling) {
      this.signaling.close();
      this.signaling = null;
    }

    useAppStore.getState().setCollabActive(false, null, null, null);
  }

  // ── Signaling Handler ───────────────────────────────────────────────────────

  private async handleSignalingMessage(msg: ServerToClientSignalingMsg) {
    switch (msg.type) {
      case 'room_welcome': {
        this.myPeerId = msg.yourPeerId;
        this.isHost = msg.isHost;

        useAppStore.getState().setCollabActive(true, this.roomId, this.myPeerId, this.isHost ? 'host' : 'guest');
        useAppStore.getState().setCollabTimeRemaining(msg.timeRemainingMs);

        // Add existing peers to store
        for (const p of msg.peers) {
          this.peerMeta.set(p.peerId, { name: p.name, color: p.color, useRelay: false });
          useAppStore.getState().addCollabPeer({
            peerId: p.peerId,
            name: p.name,
            color: p.color,
          });
          // Initiate WebRTC connection to existing peers
          this.initiatePeerConnection(p.peerId, true);
        }
        break;
      }

      case 'peer_joined': {
        const { peerId, name, color } = msg.peer;
        this.peerMeta.set(peerId, { name, color, useRelay: false });
        useAppStore.getState().addCollabPeer({ peerId, name, color });

        // Existing peer prepares to receive connection from joining peer
        this.initiatePeerConnection(peerId, false);

        // If we are host, send current snapshot to the newcomer
        if (this.isHost) {
          setTimeout(() => {
            const { logicalData, visualData, activeDiagramId, diagrams, currentWorkspace } = useAppStore.getState();
            const activeDiagram = diagrams.find((d) => d.id === activeDiagramId);
            this.sendToPeer(peerId, {
              type: 'SYNC_SNAPSHOT',
              logicalData,
              visualData,
              diagramId: activeDiagramId || undefined,
              diagramName: activeDiagram?.name,
              workspaceName: currentWorkspace?.name,
              senderId: this.myPeerId,
            });
          }, 300);
        }
        break;
      }

      case 'peer_left': {
        this.closePeer(msg.peerId);
        useAppStore.getState().removeCollabPeer(msg.peerId);
        break;
      }

      case 'signal': {
        await this.handleRemoteSignal(msg.fromPeerId, msg.data);
        break;
      }

      case 'relay': {
        // Fallback message relayed via WebSocket
        this.handleCollabMessage(msg.data);
        break;
      }
    }
  }

  // ── WebRTC Peer Connection ──────────────────────────────────────────────────

  private initiatePeerConnection(targetPeerId: string, isInitiator: boolean) {
    if (this.peerConnections.has(targetPeerId)) {
      return;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(targetPeerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.signaling) {
        this.signaling.sendSignal(targetPeerId, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[CollabManager] Peer ${targetPeerId} connectionState:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        const meta = this.peerMeta.get(targetPeerId);
        if (meta) meta.useRelay = false;
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        const meta = this.peerMeta.get(targetPeerId);
        if (meta) meta.useRelay = true;
      }
    };

    // Fallback: If not connected within 4s, mark for relay
    setTimeout(() => {
      if (pc.connectionState !== 'connected') {
        const meta = this.peerMeta.get(targetPeerId);
        if (meta) {
          meta.useRelay = true;
          console.warn(`[CollabManager] P2P with ${targetPeerId} not ready after 4s; fallback to WebSocket relay enabled.`);
        }
      }
    }, 4000);

    if (isInitiator) {
      // Create Reliable DataChannel (mutations)
      const rel = pc.createDataChannel('reliable', { ordered: true });
      this.setupDataChannel(targetPeerId, rel, 'reliable');

      // Create Unreliable DataChannel (cursors / live drags)
      const unrel = pc.createDataChannel('unreliable', { ordered: false, maxRetransmits: 0 });
      this.setupDataChannel(targetPeerId, unrel, 'unreliable');

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription && this.signaling) {
            this.signaling.sendSignal(targetPeerId, pc.localDescription);
          }
        })
        .catch((err) => console.error('[CollabManager] Error creating offer:', err));
    } else {
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        this.setupDataChannel(targetPeerId, channel, channel.label as 'reliable' | 'unreliable');
      };
    }
  }

  private setupDataChannel(targetPeerId: string, channel: RTCDataChannel, type: 'reliable' | 'unreliable') {
    if (type === 'reliable') {
      this.reliableChannels.set(targetPeerId, channel);
    } else {
      this.unreliableChannels.set(targetPeerId, channel);
    }

    channel.onopen = () => {
      console.log(`[CollabManager] ${type} channel opened with ${targetPeerId}`);
      const meta = this.peerMeta.get(targetPeerId);
      if (meta) meta.useRelay = false;

      if (this.isHost && type === 'reliable') {
        const { logicalData, visualData, activeDiagramId, diagrams, currentWorkspace } = useAppStore.getState();
        const activeDiagram = diagrams.find((d) => d.id === activeDiagramId);
        this.sendToPeer(targetPeerId, {
          type: 'SYNC_SNAPSHOT',
          logicalData,
          visualData,
          diagramId: activeDiagramId || undefined,
          diagramName: activeDiagram?.name,
          workspaceName: currentWorkspace?.name,
          senderId: this.myPeerId,
        });
      }
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CollabMessage;
        this.handleCollabMessage(data);
      } catch (err) {
        console.error('[CollabManager] Error parsing data channel message:', err);
      }
    };

    channel.onclose = () => {
      if (type === 'reliable') this.reliableChannels.delete(targetPeerId);
      else this.unreliableChannels.delete(targetPeerId);
    };
  }

  private async handleRemoteSignal(fromPeerId: string, data: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    let pc = this.peerConnections.get(fromPeerId);
    if (!pc) {
      this.initiatePeerConnection(fromPeerId, false);
      pc = this.peerConnections.get(fromPeerId)!;
    }

    try {
      if ('sdp' in data) {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        if (data.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.signaling?.sendSignal(fromPeerId, answer);
        }
      } else if ('candidate' in data) {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      }
    } catch (err) {
      console.error('[CollabManager] Error handling remote signal:', err);
    }
  }

  private closePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try { pc.close(); } catch {}
      this.peerConnections.delete(peerId);
    }
    this.reliableChannels.delete(peerId);
    this.unreliableChannels.delete(peerId);
    this.peerMeta.delete(peerId);
  }

  // ── Message Dispatch & Store Synchronization ───────────────────────────────

  private handleCollabMessage(msg: CollabMessage) {
    if (msg.senderId === this.myPeerId) return;

    const store = useAppStore.getState();

    switch (msg.type) {
      case 'SYNC_SNAPSHOT': {
        // Initial snapshot from host
        const diagramId = msg.diagramId || 'collab-diagram';
        const diagramName = msg.diagramName || 'Live Architecture Diagram';
        const workspaceName = msg.workspaceName || 'Live Collaboration Workspace';

        const curWs = store.currentWorkspace;
        const targetWs: WorkspaceMeta = curWs
          ? {
              ...curWs,
              name: workspaceName,
              lastAccessed: new Date().toISOString(),
            }
          : {
              id: `collab-ws-${this.roomId}`,
              name: workspaceName,
              path: `virtual://workspace/collab-${this.roomId}`,
              description: 'Live Collaboration Workspace',
              createdAt: new Date().toISOString(),
              lastAccessed: new Date().toISOString(),
            };

        const targetDiagrams: DiagramMeta[] = [
          { id: diagramId, name: diagramName, updatedAt: new Date().toISOString() },
        ];

        setDiagramDataInStore(msg.logicalData, msg.visualData, false);

        useAppStore.setState({
          currentWorkspace: targetWs,
          diagrams: targetDiagrams,
          activeDiagramId: diagramId,
          openDiagramIds: [diagramId],
          collabDiagramId: diagramId,
          collabDiagramName: diagramName,
          collabWorkspaceName: workspaceName,
          isReadOnly: false,
          isDirty: false,
          currentView: 'diagram',
          viewMode: 'freeform',
        });

        // Immediately persist snapshot to storage
        (async () => {
          try {
            await StorageService.save_workspace(JSON.stringify(targetWs));
            await StorageService.save_text_file(
              `${targetWs.path}/diagrams/index.json`,
              JSON.stringify({ diagrams: targetDiagrams })
            );
            const diagramFile = {
              schemaVersion: msg.logicalData.schemaVersion ?? 2,
              logical: msg.logicalData,
              visual: msg.visualData,
            };
            await StorageService.save_diagram(
              targetWs.path,
              diagramId,
              JSON.stringify(msg.logicalData),
              JSON.stringify(msg.visualData),
              JSON.stringify(diagramFile)
            );
            await useAppStore.getState().fetchRecentWorkspaces();
            console.log('[CollabManager] Initial snapshot persisted successfully to', targetWs.path);
          } catch (err) {
            console.error('[CollabManager] Error persisting initial snapshot:', err);
          }
        })();

        break;
      }

      case 'SYNC_CURSOR': {
        store.updateCollabPeer(msg.senderId, { cursor: { x: msg.x, y: msg.y } });
        break;
      }

      case 'SYNC_SELECTION': {
        store.updateCollabPeer(msg.senderId, { selectedNodeIds: msg.nodeIds });
        break;
      }

      case 'SYNC_NODE_DRAG': {
        store.updateCollabPeer(msg.senderId, { draggingNodeId: msg.id });
        for (const listener of this.dragListeners) {
          listener(msg.id, msg.x, msg.y, msg.senderId);
        }
        break;
      }

      case 'SYNC_NODE_DROP': {
        store.updateCollabPeer(msg.senderId, { draggingNodeId: undefined });
        for (const listener of this.dropListeners) {
          listener(msg.id, msg.x, msg.y, msg.senderId);
        }
        // Commit position to visualData and mark dirty for auto-save
        useAppStore.setState((state) => {
          const ln = state.visualData.layoutNodes[msg.id];
          if (!ln) return {};
          return {
            visualData: {
              ...state.visualData,
              layoutNodes: {
                ...state.visualData.layoutNodes,
                [msg.id]: { ...ln, x: msg.x, y: msg.y },
              },
            },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_NODE_DIMENSIONS': {
        useAppStore.setState((state) => {
          const ln = state.visualData.layoutNodes[msg.id];
          if (!ln) return {};
          return {
            visualData: {
              ...state.visualData,
              layoutNodes: {
                ...state.visualData.layoutNodes,
                [msg.id]: { ...ln, width: msg.width, height: msg.height },
              },
            },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_NODE_ADD': {
        useAppStore.setState((state) => ({
          logicalData: { ...state.logicalData, nodes: [...state.logicalData.nodes, msg.logical] },
          visualData: { ...state.visualData, layoutNodes: { ...state.visualData.layoutNodes, [msg.visual.id]: msg.visual } },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_NODE_DELETE': {
        useAppStore.setState((state) => {
          const nodes = state.logicalData.nodes.filter((n) => n.id !== msg.id);
          const layoutNodes = { ...state.visualData.layoutNodes };
          delete layoutNodes[msg.id];
          const edges = state.logicalData.edges.filter((e) => e.sourceId !== msg.id && e.targetId !== msg.id);
          return {
            logicalData: { ...state.logicalData, nodes, edges },
            visualData: { ...state.visualData, layoutNodes },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_NODE_UPDATE': {
        useAppStore.setState((state) => {
          const nodes = state.logicalData.nodes.map((n) => (n.id === msg.id ? { ...n, ...msg.updates } : n));
          const currentVisual = state.visualData.layoutNodes[msg.id];
          const layoutNodes = currentVisual
            ? { ...state.visualData.layoutNodes, [msg.id]: { ...currentVisual, ...msg.updates } }
            : state.visualData.layoutNodes;
          return {
            logicalData: { ...state.logicalData, nodes },
            visualData: { ...state.visualData, layoutNodes },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_EDGE_ADD': {
        useAppStore.setState((state) => ({
          logicalData: { ...state.logicalData, edges: [...state.logicalData.edges, msg.logical] },
          visualData: { ...state.visualData, layoutEdges: { ...state.visualData.layoutEdges, [msg.visual.id]: msg.visual } },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_EDGE_DELETE': {
        useAppStore.setState((state) => {
          const edges = state.logicalData.edges.filter((e) => e.id !== msg.id);
          const layoutEdges = { ...state.visualData.layoutEdges };
          delete layoutEdges[msg.id];
          return {
            logicalData: { ...state.logicalData, edges },
            visualData: { ...state.visualData, layoutEdges },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_EDGE_RECONNECT': {
        useAppStore.setState((state) => {
          const edges = state.logicalData.edges.map((e) =>
            e.id === msg.edgeId ? { ...e, sourceId: msg.sourceId, targetId: msg.targetId } : e
          );
          const currentVisual = state.visualData.layoutEdges[msg.edgeId];
          const layoutEdges = currentVisual
            ? {
                ...state.visualData.layoutEdges,
                [msg.edgeId]: {
                  ...currentVisual,
                  sourceHandle: msg.sourceHandle,
                  targetHandle: msg.targetHandle,
                },
              }
            : state.visualData.layoutEdges;
          return {
            logicalData: { ...state.logicalData, edges },
            visualData: { ...state.visualData, layoutEdges },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_EDGE_UPDATE': {
        useAppStore.setState((state) => {
          const edges = state.logicalData.edges.map((e) => (e.id === msg.edgeId ? { ...e, ...msg.updates } : e));
          const currentVisual = state.visualData.layoutEdges[msg.edgeId];
          const layoutEdges = currentVisual
            ? { ...state.visualData.layoutEdges, [msg.edgeId]: { ...currentVisual, ...msg.updates } }
            : state.visualData.layoutEdges;
          return {
            logicalData: { ...state.logicalData, edges },
            visualData: { ...state.visualData, layoutEdges },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_STICKY_ADD': {
        useAppStore.setState((state) => ({
          visualData: {
            ...state.visualData,
            layoutNodes: { ...state.visualData.layoutNodes, [msg.visual.id]: msg.visual },
            annotations: { ...(state.visualData.annotations || {}), [msg.annotation.id]: msg.annotation },
          },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_STICKY_UPDATE': {
        useAppStore.setState((state) => {
          const existing = state.visualData.annotations?.[msg.id];
          if (!existing) return {};
          return {
            visualData: {
              ...state.visualData,
              annotations: { ...state.visualData.annotations, [msg.id]: { ...existing, ...msg.updates } },
            },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_STICKY_DELETE': {
        useAppStore.setState((state) => {
          const annotations = { ...(state.visualData.annotations || {}) };
          delete annotations[msg.id];
          const layoutNodes = { ...state.visualData.layoutNodes };
          delete layoutNodes[msg.id];
          return { visualData: { ...state.visualData, annotations, layoutNodes }, isDirty: true };
        });
        break;
      }

      case 'SYNC_FREEHAND_ADD': {
        useAppStore.setState((state) => ({
          visualData: {
            ...state.visualData,
            freehandStrokes: { ...(state.visualData.freehandStrokes || {}), [msg.stroke.id]: msg.stroke },
          },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_FREEHAND_UPDATE': {
        useAppStore.setState((state) => {
          const existing = state.visualData.freehandStrokes?.[msg.id];
          if (!existing) return {};
          return {
            visualData: {
              ...state.visualData,
              freehandStrokes: {
                ...state.visualData.freehandStrokes,
                [msg.id]: { ...existing, ...msg.updates },
              },
            },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_FREEHAND_DELETE': {
        useAppStore.setState((state) => {
          const freehandStrokes = { ...(state.visualData.freehandStrokes || {}) };
          delete freehandStrokes[msg.id];
          return { visualData: { ...state.visualData, freehandStrokes }, isDirty: true };
        });
        break;
      }

      case 'SYNC_FREEHAND_CLEAR': {
        useAppStore.setState((state) => ({
          visualData: { ...state.visualData, freehandStrokes: {} },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_SEQUENCE_ADD': {
        useAppStore.setState((state) => ({
          logicalData: { ...state.logicalData, sequences: [...state.logicalData.sequences, msg.step] },
          visualData: { ...state.visualData, timelines: { ...state.visualData.timelines, [msg.timing.sequenceId]: msg.timing } },
          isDirty: true,
        }));
        break;
      }

      case 'SYNC_SEQUENCE_DELETE': {
        useAppStore.setState((state) => {
          const sequences = state.logicalData.sequences.filter((s) => s.id !== msg.seqId);
          const timelines = { ...state.visualData.timelines };
          delete timelines[msg.seqId];
          return {
            logicalData: { ...state.logicalData, sequences },
            visualData: { ...state.visualData, timelines },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_SEQUENCE_TIMING': {
        useAppStore.setState((state) => {
          const existing = state.visualData.timelines[msg.seqId];
          if (!existing) return {};
          return {
            visualData: {
              ...state.visualData,
              timelines: {
                ...state.visualData.timelines,
                [msg.seqId]: { ...existing, duration: msg.duration, delay: msg.delay },
              },
            },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_SEQUENCE_UPDATE': {
        useAppStore.setState((state) => {
          const sequences = msg.stepUpdates
            ? state.logicalData.sequences.map((s) => (s.id === msg.seqId ? { ...s, ...msg.stepUpdates } : s))
            : state.logicalData.sequences;
          const currentTiming = state.visualData.timelines[msg.seqId];
          const timelines = (msg.timingUpdates && currentTiming)
            ? { ...state.visualData.timelines, [msg.seqId]: { ...currentTiming, ...msg.timingUpdates } }
            : state.visualData.timelines;
          return {
            logicalData: { ...state.logicalData, sequences },
            visualData: { ...state.visualData, timelines },
            isDirty: true,
          };
        });
        break;
      }

      case 'SYNC_CLEAR_CANVAS': {
        useAppStore.setState({
          logicalData: { schemaVersion: 2, nodes: [], edges: [], sequences: [] },
          visualData: {
            canvas: { zoom: 1, pan: { x: 0, y: 0 } },
            layoutNodes: {},
            layoutEdges: {},
            timelines: {},
            annotations: {},
            freehandStrokes: {},
          },
          isDirty: true,
        });
        break;
      }
    }
  }

  // ── Outgoing Broadcast Methods ──────────────────────────────────────────────

  sendCursor(x: number, y: number) {
    if (!this.isActive) return;
    const now = performance.now();
    if (now - this.lastCursorSent < 25) return; // Cap at ~40fps
    this.lastCursorSent = now;

    this.broadcast({ type: 'SYNC_CURSOR', x, y, senderId: this.myPeerId }, true);
  }

  sendSelection(nodeIds: string[]) {
    if (!this.isActive) return;
    this.broadcast({ type: 'SYNC_SELECTION', nodeIds, senderId: this.myPeerId }, true);
  }

  sendNodeDrag(id: string, x: number, y: number) {
    if (!this.isActive) return;
    const now = performance.now();
    const last = this.lastDragSent.get(id) || 0;
    if (now - last < 16) return; // Cap at ~60fps
    this.lastDragSent.set(id, now);

    this.broadcast({ type: 'SYNC_NODE_DRAG', id, x, y, senderId: this.myPeerId }, true);
  }

  sendNodeDrop(id: string, x: number, y: number) {
    if (!this.isActive) return;
    this.lastDragSent.delete(id);
    this.broadcast({ type: 'SYNC_NODE_DROP', id, x, y, senderId: this.myPeerId }, false);
  }

  sendMutation(msg: OutgoingCollabMessage) {
    if (!this.isActive) return;
    this.broadcast({ ...msg, senderId: this.myPeerId } as CollabMessage, false);
  }

  // ── Transport Dispatcher (P2P DataChannel vs WebSocket Relay) ───────────────

  private broadcast(msg: CollabMessage, unreliable: boolean) {
    const raw = JSON.stringify(msg);
    let sentCount = 0;

    for (const [peerId, meta] of this.peerMeta) {
      if (meta.useRelay) continue;

      const channel = unreliable ? this.unreliableChannels.get(peerId) : this.reliableChannels.get(peerId);
      if (channel && channel.readyState === 'open') {
        try {
          channel.send(raw);
          sentCount++;
        } catch {}
      }
    }

    // If any peer uses relay or if no P2P channel succeeded, send via WebSocket relay
    const hasRelayPeers = Array.from(this.peerMeta.values()).some((m) => m.useRelay);
    if (hasRelayPeers || sentCount === 0) {
      this.signaling?.sendRelay(msg);
    }
  }

  private sendToPeer(targetPeerId: string, msg: CollabMessage) {
    const raw = JSON.stringify(msg);
    const meta = this.peerMeta.get(targetPeerId);

    if (meta && !meta.useRelay) {
      const channel = this.reliableChannels.get(targetPeerId);
      if (channel && channel.readyState === 'open') {
        try {
          channel.send(raw);
          return;
        } catch {}
      }
    }

    this.signaling?.sendRelay(msg);
  }

  // ── Drag / Drop Event Subscriptions for React Flow ─────────────────────────

  onRemoteDrag(listener: RemoteDragListener): () => void {
    this.dragListeners.add(listener);
    return () => this.dragListeners.delete(listener);
  }

  onRemoteDrop(listener: RemoteDropListener): () => void {
    this.dropListeners.add(listener);
    return () => this.dropListeners.delete(listener);
  }
}

export const collabManager = new CollabManagerService();
