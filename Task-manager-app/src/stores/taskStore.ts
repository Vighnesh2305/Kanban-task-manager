import { create } from 'zustand';
import { Task, TaskAttachment, TaskComment, TaskReminder } from '../lib/types';
import { localDb } from '../lib/storage';
import { workspaceRealtime } from '../lib/realtime';

export type { Task, TaskAttachment, TaskComment, TaskReminder };

interface TaskState {
  tasks: Task[];
  comments: Record<string, TaskComment[]>;
  reminders: Record<string, TaskReminder[]>;
  attachments: Record<string, TaskAttachment[]>;
  loading: boolean;
  error: string | null;
  realtimeUnsub: (() => void) | null;

  // Task CRUD
  fetchTasks: (columnId: string) => Promise<void>;
  fetchAllTasksForBoard: (boardId: string) => Promise<void>;
  fetchAllTasksForWorkspace: (workspaceId: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'is_completed' | 'completed_at'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>, userId?: string, userName?: string) => Promise<void>;
  deleteTask: (id: string, userId?: string, userName?: string) => Promise<void>;
  moveTask: (taskId: string, newColumnId: string, newPosition: number, isDoneColumn?: boolean, userId?: string, userName?: string) => Promise<void>;

  // Realtime subscriptions
  subscribeToTasks: (boardId: string) => void;
  unsubscribeFromTasks: () => void;

  // Comments
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, userId: string, userName?: string) => Promise<void>;

  // Reminders
  fetchReminders: (taskId: string) => Promise<void>;
  addReminder: (taskId: string, userId: string, reminderTime: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Attachments
  fetchAttachments: (taskId: string) => Promise<void>;
  addAttachment: (taskId: string, file: File, userId?: string, userName?: string) => Promise<void>;
  deleteAttachment: (id: string, taskId: string) => Promise<void>;
  getAttachmentCount: (taskId: string) => number;

  // Batch operations
  batchUpdateTasks: (updates: Array<{ id: string; position: number }>) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  comments: {},
  reminders: {},
  attachments: {},
  loading: false,
  error: null,
  realtimeUnsub: null,

  fetchTasks: async (columnId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getTasksByColumn(columnId);
      set(state => {
        const otherTasks = state.tasks.filter(t => t.column_id !== columnId);
        const newTasks = [...otherTasks, ...(data || [])];
        return { tasks: newTasks, loading: false };
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAllTasksForBoard: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getTasksByBoard(boardId);
      set({ tasks: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAllTasksForWorkspace: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getTasksByWorkspace(workspaceId);
      set({ tasks: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (task) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.createTask(task);
      set(state => ({ 
        tasks: [...state.tasks.filter(t => t.id !== data.id), data],
        loading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateTask: async (id, updates, userId, userName) => {
    set({ loading: true, error: null });
    try {
      const updated = localDb.updateTask(id, updates, userId, userName);
      if (updated) {
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
          loading: false
        }));
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteTask: async (id, userId, userName) => {
    set({ loading: true, error: null });
    try {
      localDb.deleteTask(id, userId, userName);
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  moveTask: async (taskId, newColumnId, newPosition, isDoneColumn = false, userId, userName) => {
    try {
      // Optimistic update
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, column_id: newColumnId, position: newPosition, is_completed: isDoneColumn, completed_at: isDoneColumn ? new Date().toISOString() : null }
            : t
        )
      }));

      localDb.moveTask(taskId, newColumnId, newPosition, isDoneColumn, userId, userName);
    } catch (error: any) {
      console.error('Error moving task:', error);
    }
  },

  batchUpdateTasks: async (updates) => {
    try {
      localDb.batchUpdateTasks(updates);
    } catch (error: any) {
      console.error('Error batch updating tasks:', error);
    }
  },

  subscribeToTasks: (boardId: string) => {
    if (get().realtimeUnsub) {
      get().realtimeUnsub!();
    }

    const unsub = workspaceRealtime.subscribe('*', (event: { type: string; payload: any }) => {
      const { type } = event;
      if (
        type === 'TASK_CREATED' || 
        type === 'TASK_UPDATED' || 
        type === 'TASK_DELETED' || 
        type === 'TASKS_REORDERED' || 
        type === 'STORAGE_CHANGE'
      ) {
        const currentBoardTasks = localDb.getTasksByBoard(boardId);
        set({ tasks: currentBoardTasks });
      }
    });

    set({ realtimeUnsub: unsub });
  },

  unsubscribeFromTasks: () => {
    const { realtimeUnsub } = get();
    if (realtimeUnsub) {
      realtimeUnsub();
      set({ realtimeUnsub: null });
    }
  },

  fetchComments: async (taskId: string) => {
    try {
      const data = localDb.getComments(taskId);
      set(state => ({
        comments: { ...state.comments, [taskId]: data }
      }));
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  },

  addComment: async (taskId: string, content: string, userId: string, userName?: string) => {
    try {
      const data = localDb.addComment(taskId, content, userId, userName);
      set(state => ({
        comments: {
          ...state.comments,
          [taskId]: [...(state.comments[taskId] || []), data]
        }
      }));
    } catch (error: any) {
      console.error('Error adding comment:', error);
    }
  },

  fetchReminders: async (taskId: string) => {
    try {
      const data = localDb.getReminders(taskId);
      set(state => ({
        reminders: { ...state.reminders, [taskId]: data }
      }));
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
    }
  },

  addReminder: async (taskId: string, userId: string, reminderTime: string) => {
    try {
      const data = localDb.addReminder(taskId, userId, reminderTime);
      set(state => ({
        reminders: {
          ...state.reminders,
          [taskId]: [...(state.reminders[taskId] || []), data]
        }
      }));
    } catch (error: any) {
      console.error('Error adding reminder:', error);
    }
  },

  deleteReminder: async (id: string) => {
    try {
      localDb.deleteReminder(id);
      set(state => {
        const newReminders: Record<string, TaskReminder[]> = {};
        Object.entries(state.reminders).forEach(([taskId, list]) => {
          newReminders[taskId] = list.filter(r => r.id !== id);
        });
        return { reminders: newReminders };
      });
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
    }
  },

  fetchAttachments: async (taskId: string) => {
    try {
      const data = localDb.getAttachments(taskId);
      set(state => ({
        attachments: { ...state.attachments, [taskId]: data }
      }));
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
    }
  },

  addAttachment: async (taskId: string, file: File, userId?: string, userName?: string) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          const data = localDb.addAttachment(taskId, file.name, file.type, file.size, dataUrl, userId, userName);
          set(state => ({
            attachments: {
              ...state.attachments,
              [taskId]: [...(state.attachments[taskId] || []), data]
            }
          }));
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  deleteAttachment: async (id: string, taskId: string) => {
    try {
      localDb.deleteAttachment(id);
      set(state => ({
        attachments: {
          ...state.attachments,
          [taskId]: (state.attachments[taskId] || []).filter(a => a.id !== id)
        }
      }));
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
    }
  },

  getAttachmentCount: (taskId: string) => {
    return localDb.getAttachmentCount(taskId);
  },
}));
