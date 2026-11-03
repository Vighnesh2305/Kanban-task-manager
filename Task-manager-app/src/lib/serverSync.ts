// Cross-device synchronization engine
// Bridges localStorage with the shared Vite dev server backend (/api/sync & /api/events)

const SYNC_KEYS = [
  'kanban_users',
  'kanban_registered_accounts',
  'kanban_boards',
  'kanban_columns',
  'kanban_tasks',
  'kanban_comments',
  'kanban_reminders',
  'kanban_attachments',
  'kanban_workspaces',
  'kanban_workspace_members',
  'kanban_workspace_invitations',
  'kanban_workspace_documents',
  'kanban_workspace_activities',
];

let isInitialized = false;
let sseSource: EventSource | null = null;
const listeners: Array<(event: string, data: any) => void> = [];

export const serverSync = {
  // Push local data for a specific key to server
  async pushKey(key: string, data: any) {
    if (typeof window === 'undefined' || !window.fetch) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: data }),
      });
    } catch {
      // Offline or in test environment, ignore
    }
  },

  // Push all existing local data from this browser to server (initial seed)
  async pushAllLocal() {
    if (typeof window === 'undefined' || !window.localStorage || !window.fetch) return;
    const payload: Record<string, any> = {};
    let hasData = false;

    for (const key of SYNC_KEYS) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          payload[key] = JSON.parse(item);
          hasData = true;
        }
      } catch {
        // ignore JSON parse error
      }
    }

    if (!hasData) return;

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore
    }
  },

  // Pull all data from server and update local storage
  async pullAll(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage || !window.fetch) return false;
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || typeof data !== 'object') return false;

      let updated = false;
      for (const [key, val] of Object.entries(data)) {
        if (SYNC_KEYS.includes(key) && val !== undefined) {
          const localStr = localStorage.getItem(key);
          const newStr = JSON.stringify(val);
          if (localStr !== newStr) {
            localStorage.setItem(key, newStr);
            updated = true;
          }
        }
      }
      return updated;
    } catch {
      return false;
    }
  },

  // Subscribe to real-time events from server
  subscribe(callback: (event: string, data: any) => void) {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  broadcastLocal(event: string, data: any) {
    for (const cb of listeners) {
      try {
        cb(event, data);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    }
  },

  // Initialize SSE and initial sync
  init() {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // 1. Initial push & pull sync
    this.pushAllLocal().then(() => this.pullAll());

    // 2. Connect Server-Sent Events (SSE) for live cross-device sync
    if (typeof EventSource !== 'undefined') {
      try {
        sseSource = new EventSource('/api/events');
        sseSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === 'SYNC_UPDATE' && payload.data) {
              for (const [key, val] of Object.entries(payload.data)) {
                if (SYNC_KEYS.includes(key)) {
                  localStorage.setItem(key, JSON.stringify(val));
                }
              }
              // Notify components of update
              this.broadcastLocal('SERVER_SYNC_UPDATE', payload.data);
            }
          } catch {
            // ignore malformed event
          }
        };
        sseSource.onerror = () => {
          // Reconnection is handled automatically by EventSource
        };
      } catch {
        // SSE unsupported or offline
      }
    }
  }
};

