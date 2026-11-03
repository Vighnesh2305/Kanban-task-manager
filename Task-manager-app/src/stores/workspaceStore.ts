import { create } from 'zustand';
import { 
  Workspace, 
  WorkspaceMember, 
  WorkspaceInvitation, 
  WorkspaceDocument, 
  WorkspaceActivity, 
  UserProfile,
  Board
} from '../lib/types';
import { localDb } from '../lib/storage';
import { workspaceRealtime } from '../lib/realtime';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentBoard: Board | null;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  documents: WorkspaceDocument[];
  activities: WorkspaceActivity[];
  pendingInvitations: WorkspaceInvitation[];
  loading: boolean;
  error: string | null;
  realtimeUnsub: (() => void) | null;

  // Actions
  fetchWorkspaces: (userId: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (
    name: string, 
    description: string, 
    owner: UserProfile
  ) => Promise<{ workspace: Workspace; board: Board } | null>;
  
  fetchMembers: (workspaceId: string) => Promise<void>;
  removeMember: (workspaceId: string, memberIdOrUserId: string, operator: UserProfile) => Promise<{ success: boolean; error?: string }>;
  updateCapacity: (workspaceId: string, maxMembers: number, operator: UserProfile) => Promise<{ success: boolean; error?: string }>;
  generateInviteLink: (
    workspaceId: string, 
    inviter: UserProfile,
    forceNew?: boolean
  ) => Promise<{ success: boolean; invitation?: WorkspaceInvitation; error?: string }>;
  getActiveInviteLink: (workspaceId: string) => WorkspaceInvitation | null;
  joinWorkspaceByToken: (
    token: string, 
    user: UserProfile
  ) => Promise<{ success: boolean; workspace?: Workspace; alreadyMember?: boolean; error?: string }>;
  getInvitationByToken: (token: string) => { valid: boolean; invitation?: WorkspaceInvitation; workspace?: Workspace; members?: WorkspaceMember[]; error?: string };
  revokeInviteLink: (invitationId: string, user: UserProfile) => Promise<void>;
  sendInvitation: (
    workspaceId: string, 
    inviter: UserProfile, 
    inviteeEmail?: string
  ) => Promise<{ success: boolean; invitation?: WorkspaceInvitation; error?: string }>;
  acceptInvitation: (
    inviteCodeOrId: string, 
    user: UserProfile
  ) => Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
  declineInvitation: (invitationId: string) => Promise<void>;
  checkPendingInvitations: (email: string) => Promise<void>;

  // Documents
  fetchDocuments: (workspaceId: string) => Promise<void>;
  uploadDocument: (
    workspaceId: string, 
    file: File, 
    user: UserProfile, 
    taskId?: string | null, 
    taskTitle?: string | null
  ) => Promise<WorkspaceDocument | null>;
  deleteDocument: (documentId: string, user: UserProfile) => Promise<void>;

  // Activities
  fetchActivities: (workspaceId: string) => Promise<void>;

  // Realtime subscription
  subscribeToWorkspace: (workspaceId: string) => void;
  unsubscribeWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  currentBoard: null,
  members: [],
  invitations: [],
  documents: [],
  activities: [],
  pendingInvitations: [],
  loading: false,
  error: null,
  realtimeUnsub: null,

  fetchWorkspaces: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const data = localDb.getWorkspaces(userId);
      set({ workspaces: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  selectWorkspace: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const workspace = localDb.getWorkspaceById(workspaceId);
      if (!workspace) throw new Error('Workspace not found');

      const board = localDb.getBoardForWorkspace(workspaceId);
      const members = localDb.getWorkspaceMembers(workspaceId);
      const invitations = localDb.getInvitations(workspaceId);
      const documents = localDb.getWorkspaceDocuments(workspaceId);
      const activities = localDb.getWorkspaceActivities(workspaceId);

      set({
        currentWorkspace: workspace,
        currentBoard: board,
        members,
        invitations,
        documents,
        activities,
        loading: false,
      });

      get().subscribeToWorkspace(workspaceId);
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createWorkspace: async (name: string, description: string, owner: UserProfile) => {
    set({ loading: true, error: null });
    try {
      const result = localDb.createWorkspace({ name, description, owner });
      set(state => ({
        workspaces: [result.workspace, ...state.workspaces],
        currentWorkspace: result.workspace,
        currentBoard: result.board,
        members: result.members,
        loading: false,
      }));
      return { workspace: result.workspace, board: result.board };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  fetchMembers: async (workspaceId: string) => {
    try {
      const members = localDb.getWorkspaceMembers(workspaceId);
      set({ members });
    } catch (err: any) {
      console.error('Error fetching members:', err);
    }
  },

  removeMember: async (workspaceId: string, memberIdOrUserId: string, operator: UserProfile) => {
    try {
      const res = localDb.removeWorkspaceMember(workspaceId, memberIdOrUserId, operator);
      if (res.success) {
        const members = localDb.getWorkspaceMembers(workspaceId);
        set({ members });
        get().fetchActivities(workspaceId);
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateCapacity: async (workspaceId: string, maxMembers: number, operator: UserProfile) => {
    try {
      const res = localDb.updateWorkspaceCapacity(workspaceId, maxMembers, operator);
      if (res.success) {
        const updated = localDb.getWorkspaceById(workspaceId);
        if (updated) {
          set({ currentWorkspace: updated });
        }
        get().fetchActivities(workspaceId);
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  generateInviteLink: async (workspaceId: string, inviter: UserProfile, forceNew?: boolean) => {
    try {
      const result = localDb.generateInviteLink(workspaceId, inviter, forceNew);
      if (result.success && result.invitation) {
        set(state => ({
          invitations: [result.invitation!, ...state.invitations.filter(i => i.id !== result.invitation!.id)],
        }));
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getActiveInviteLink: (workspaceId: string) => {
    return localDb.getActiveInviteLink(workspaceId);
  },

  getInvitationByToken: (token: string) => {
    return localDb.getInvitationByToken(token);
  },

  joinWorkspaceByToken: async (token: string, user: UserProfile) => {
    try {
      const result = localDb.joinWorkspaceByToken(token, user);
      if (result.success && result.workspace) {
        await get().fetchWorkspaces(user.id);
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  revokeInviteLink: async (invitationId: string, user: UserProfile) => {
    try {
      localDb.revokeInviteLink(invitationId, user);
      set(state => ({
        invitations: state.invitations.map(i => i.id === invitationId ? { ...i, status: 'revoked' as const } : i),
      }));
    } catch (err: any) {
      console.error('Error revoking invite link:', err);
    }
  },

  sendInvitation: async (workspaceId: string, inviter: UserProfile, inviteeEmail?: string) => {
    return get().generateInviteLink(workspaceId, inviter);
  },

  acceptInvitation: async (inviteCodeOrId: string, user: UserProfile) => {
    return get().joinWorkspaceByToken(inviteCodeOrId, user);
  },

  declineInvitation: async (invitationId: string) => {
    try {
      localDb.declineInvitation(invitationId);
      set(state => ({
        pendingInvitations: state.pendingInvitations.filter(i => i.id !== invitationId),
        invitations: state.invitations.map(i => i.id === invitationId ? { ...i, status: 'declined' } : i),
      }));
    } catch (err: any) {
      console.error('Error declining invitation:', err);
    }
  },

  checkPendingInvitations: async (email: string) => {
    try {
      const pending = localDb.getPendingInvitationsForEmail(email);
      set({ pendingInvitations: pending });
    } catch (err: any) {
      console.error('Error checking pending invitations:', err);
    }
  },

  fetchDocuments: async (workspaceId: string) => {
    try {
      const documents = localDb.getWorkspaceDocuments(workspaceId);
      set({ documents });
    } catch (err: any) {
      console.error('Error fetching documents:', err);
    }
  },

  uploadDocument: async (
    workspaceId: string, 
    file: File, 
    user: UserProfile, 
    taskId?: string | null, 
    taskTitle?: string | null
  ) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          const doc = localDb.addWorkspaceDocument({
            workspace_id: workspaceId,
            task_id: taskId,
            task_title: taskTitle,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            data_url: dataUrl,
            user,
          });

          set(state => ({
            documents: [doc, ...state.documents.filter(d => d.id !== doc.id)],
          }));

          resolve(doc);
        } catch (e: any) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  deleteDocument: async (documentId: string, user: UserProfile) => {
    try {
      localDb.deleteWorkspaceDocument(documentId, user);
      set(state => ({
        documents: state.documents.filter(d => d.id !== documentId),
      }));
    } catch (err: any) {
      console.error('Error deleting document:', err);
    }
  },

  fetchActivities: async (workspaceId: string) => {
    try {
      const activities = localDb.getWorkspaceActivities(workspaceId);
      set({ activities });
    } catch (err: any) {
      console.error('Error fetching activities:', err);
    }
  },

  subscribeToWorkspace: (workspaceId: string) => {
    // Unsubscribe existing
    if (get().realtimeUnsub) {
      get().realtimeUnsub!();
    }

    const unsub = workspaceRealtime.subscribe('*', (event: { type: string; payload: any }) => {
      const { type, payload } = event;
      if (!payload) return;

      // Check if event belongs to current workspace or general
      if (!payload.workspaceId || payload.workspaceId === workspaceId) {
        if (
          type === 'MEMBER_JOINED' || 
          type === 'MEMBER_REMOVED' ||
          type === 'INVITATION_CREATED' || 
          type === 'INVITATION_UPDATED'
        ) {
          get().fetchMembers(workspaceId);
          set({ invitations: localDb.getInvitations(workspaceId) });
        } else if (type === 'WORKSPACE_UPDATED') {
          const ws = localDb.getWorkspaceById(workspaceId);
          if (ws) set({ currentWorkspace: ws });
          get().fetchMembers(workspaceId);
        } else if (type === 'DOCUMENT_UPLOADED' || type === 'DOCUMENT_DELETED') {
          get().fetchDocuments(workspaceId);
        } else if (type === 'ACTIVITY_LOGGED') {
          get().fetchActivities(workspaceId);
        } else if (type === 'STORAGE_CHANGE') {
          get().fetchMembers(workspaceId);
          get().fetchDocuments(workspaceId);
          get().fetchActivities(workspaceId);
        }
      }
    });

    set({ realtimeUnsub: unsub });
  },

  unsubscribeWorkspace: () => {
    const { realtimeUnsub } = get();
    if (realtimeUnsub) {
      realtimeUnsub();
      set({ realtimeUnsub: null });
    }
  },
}));

