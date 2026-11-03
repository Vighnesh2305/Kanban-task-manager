import { serverSync } from './serverSync';

// Real-time synchronization layer for multi-tab / multi-user collaborative workspace
type EventCallback = (payload: any) => void;

class RealtimeChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kanban_collaborative_workspace_sync');
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or failed to initialize:', err);
      }
    }

    // Fallback or auxiliary listener for storage events across tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('kanban_')) {
          this.notify('STORAGE_CHANGE', { key: e.key });
        }
      });

      // Cross-device Server-Sent Events sync
      serverSync.subscribe((event, data) => {
        this.notify('STORAGE_CHANGE', { event, data });
        this.notify('*', { event, data });
      });
    }
  }

  private handleIncoming(message: { type: string; payload: any; timestamp: number }) {
    if (!message || !message.type) return;
    this.notify(message.type, message.payload);
  }

  public broadcast(type: string, payload: any = {}) {
    const message = { type, payload, timestamp: Date.now() };

    // Broadcast to other tabs/windows
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.error('Error broadcasting message:', err);
      }
    }

    // Also notify local listeners in the current tab
    this.notify(type, payload);
  }

  public subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  private notify(eventType: string, payload: any) {
    // Notify specific event listeners
    const specificSet = this.listeners.get(eventType);
    if (specificSet) {
      specificSet.forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in realtime subscriber for ${eventType}:`, e);
        }
      });
    }

    // Notify wildcard '*' listeners
    const allSet = this.listeners.get('*');
    if (allSet) {
      allSet.forEach(cb => {
        try {
          cb({ type: eventType, payload });
        } catch (e) {
          console.error('Error in realtime wildcard subscriber:', e);
        }
      });
    }
  }
}

export const workspaceRealtime = new RealtimeChannel();

