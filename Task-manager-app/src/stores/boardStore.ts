import { create } from 'zustand';
import { Board, Column } from '../lib/types';
import { localDb } from '../lib/storage';
import { workspaceRealtime } from '../lib/realtime';

export type { Board, Column };

interface BoardState {
  boards: Board[];
  columns: Column[];
  loading: boolean;
  error: string | null;
  columnsChannel: any | null;
  realtimeUnsub: (() => void) | null;

  // Board CRUD
  fetchBoards: (userId: string) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (board: Omit<Board, 'id' | 'created_at' | 'updated_at'>) => Promise<Board | null>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;

  // Column CRUD
  fetchColumns: (boardId: string) => Promise<void>;
  createColumn: (column: Omit<Column, 'id' | 'created_at' | 'updated_at'>) => Promise<Column | null>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  // Realtime
  subscribeToColumns: (boardId: string) => void;
  unsubscribeFromColumns: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  columns: [],
  loading: false,
  error: null,
  columnsChannel: null,
  realtimeUnsub: null,

  fetchBoards: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getBoards(userId);
      set({ boards: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchBoard: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getBoardById(boardId);
      if (!data) {
        throw new Error('Board not found');
      }

      set(state => {
        const existingIndex = state.boards.findIndex(b => b.id === boardId);
        const updatedBoards = existingIndex >= 0
          ? state.boards.map(b => b.id === boardId ? data : b)
          : [...state.boards, data];

        return { boards: updatedBoards, loading: false };
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createBoard: async (board) => {
    set({ loading: true, error: null });
    try {
      const { board: data, defaultColumns } = localDb.createBoard(board);

      set(state => ({
        boards: [data, ...state.boards],
        columns: [...state.columns, ...defaultColumns],
        loading: false
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateBoard: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = localDb.updateBoard(id, updates);
      if (updated) {
        set(state => ({
          boards: state.boards.map(b => b.id === id ? { ...b, ...updates } : b),
          loading: false
        }));
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteBoard: async (id) => {
    set({ loading: true, error: null });
    try {
      localDb.deleteBoard(id);
      set(state => ({
        boards: state.boards.filter(b => b.id !== id),
        columns: state.columns.filter(c => c.board_id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchColumns: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getColumns(boardId);
      set({ columns: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createColumn: async (column) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.createColumn(column);
      set(state => ({
        columns: [...state.columns, data],
        loading: false
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateColumn: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = localDb.updateColumn(id, updates);
      if (updated) {
        set(state => ({
          columns: state.columns.map(c => c.id === id ? { ...c, ...updates } : c),
          loading: false
        }));
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteColumn: async (id) => {
    set({ loading: true, error: null });
    try {
      localDb.deleteColumn(id);
      set(state => ({
        columns: state.columns.filter(c => c.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  subscribeToColumns: (boardId: string) => {
    if (get().realtimeUnsub) {
      get().realtimeUnsub!();
    }

    const unsub = workspaceRealtime.subscribe('*', (event: { type: string; payload: any }) => {
      const { type } = event;
      if (
        type === 'COLUMN_CREATED' ||
        type === 'COLUMN_UPDATED' ||
        type === 'COLUMN_DELETED' ||
        type === 'STORAGE_CHANGE'
      ) {
        const cols = localDb.getColumns(boardId);
        set({ columns: cols });
      }
    });

    set({ realtimeUnsub: unsub });
  },

  unsubscribeFromColumns: () => {
    const { realtimeUnsub } = get();
    if (realtimeUnsub) {
      realtimeUnsub();
      set({ realtimeUnsub: null });
    }
  },
}));
