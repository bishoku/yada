import { ServerToClientSignalingMsg, CollabMessage } from './types';

export const DEFAULT_SHARE_URL =
  import.meta.env.VITE_SHARE_API_URL || 'https://yada-share.barishoku.workers.dev';

export type CollabSignalingEventHandler = (event: ServerToClientSignalingMsg) => void;

export class CollabSignalingClient {
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private isExplicitlyClosed = false;
  private handlers = new Set<CollabSignalingEventHandler>();

  constructor(
    private serverUrl: string = DEFAULT_SHARE_URL,
    private roomId: string,
    private peerId: string,
    private name: string,
    private color: string,
    private durationMinutes: number = 30
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isExplicitlyClosed = false;
      let settled = false;

      let wsBase = this.serverUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
      const query = new URLSearchParams({
        peerId: this.peerId,
        name: this.name,
        color: this.color,
        duration: String(this.durationMinutes),
      });

      const wsUrl = `${wsBase}/collab/ws/${encodeURIComponent(this.roomId)}?${query.toString()}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        reject(err);
        return;
      }

      const timer = setTimeout(() => {
        if (!settled && this.ws?.readyState !== WebSocket.OPEN) {
          settled = true;
          try {
            this.ws?.close();
          } catch {}
          reject(new Error('Signaling connection timed out (10s)'));
        }
      }, 10000);

      this.ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this.startHeartbeat();
          resolve();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const msg = JSON.parse(raw) as ServerToClientSignalingMsg;
          for (const handler of this.handlers) {
            try {
              handler(msg);
            } catch (err) {
              console.error('[SignalingClient] Handler error:', err);
            }
          }
        } catch (e) {
          console.warn('[SignalingClient] Failed to parse message:', event.data, e);
        }
      };

      this.ws.onerror = (_e) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error('WebSocket connection error'));
        }
      };

      this.ws.onclose = (e) => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          console.warn('[SignalingClient] Disconnected:', e.code, e.reason);
        }
      };
    });
  }

  onMessage(handler: CollabSignalingEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  sendSignal(targetPeerId: string, data: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'signal', targetPeerId, data }));
    }
  }

  sendRelay(data: CollabMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'relay', data }));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {}
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  close() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.handlers.clear();
    if (this.ws) {
      try {
        this.ws.close(1000, 'User left room');
      } catch {}
      this.ws = null;
    }
  }
}
