import {
  Board,
  Column,
  Task,
  TaskAttachment,
  TaskComment,
  TaskReminder,
  UserProfile,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceDocument,
  WorkspaceActivity
} from './types';
import { workspaceRealtime } from './realtime';
import { serverSync } from './serverSync';

// Initialize cross-device server sync
if (typeof window !== 'undefined') {
  serverSync.init();
}

const STORAGE_KEYS = {
  USERS: 'kanban_users',
  REGISTERED_ACCOUNTS: 'kanban_registered_accounts',
  BOARDS: 'kanban_boards',
  COLUMNS: 'kanban_columns',
  TASKS: 'kanban_tasks',
  COMMENTS: 'kanban_comments',
  REMINDERS: 'kanban_reminders',
  ATTACHMENTS: 'kanban_attachments',
  WORKSPACES: 'kanban_workspaces',
  WORKSPACE_MEMBERS: 'kanban_workspace_members',
  WORKSPACE_INVITATIONS: 'kanban_workspace_invitations',
  WORKSPACE_DOCUMENTS: 'kanban_workspace_documents',
  WORKSPACE_ACTIVITIES: 'kanban_workspace_activities',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    serverSync.pushKey(key, value);
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Initial demo data seeding for new users
export function seedInitialDataForUser(userId: string): Board {
  const now = new Date().toISOString();
  const boardId = generateId();

  const demoBoard: Board = {
    id: boardId,
    user_id: userId,
    name: 'Project Roadmap',
    description: 'Manage development sprints, milestones, and task deliverables',
    color: '#3B82F6',
    created_at: now,
    updated_at: now,
  };

  const colTodoId = generateId();
  const colProgressId = generateId();
  const colDoneId = generateId();

  const demoColumns: Column[] = [
    { id: colTodoId, board_id: boardId, name: 'To Do', color: '#3B82F6', position: 0, created_at: now, updated_at: now },
    { id: colProgressId, board_id: boardId, name: 'In Progress', color: '#F59E0B', position: 1, created_at: now, updated_at: now },
    { id: colDoneId, board_id: boardId, name: 'Done', color: '#10B981', position: 2, created_at: now, updated_at: now },
  ];

  const demoTasks: Task[] = [
    {
      id: generateId(),
      board_id: boardId,
      column_id: colTodoId,
      title: 'Design high-converting Landing Page',
      description: 'Create responsive mockups for the product showcase and dashboard preview.',
      priority: 'high',
      due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      start_date: now,
      assignee_id: userId,
      creator_id: userId,
      position: 0,
      is_completed: false,
      is_deleted: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      board_id: boardId,
      column_id: colTodoId,
      title: 'Write automated unit & integration tests',
      description: 'Cover all critical drag-and-drop state transitions and localStorage persistence.',
      priority: 'medium',
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      start_date: now,
      assignee_id: userId,
      creator_id: userId,
      position: 1,
      is_completed: false,
      is_deleted: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      board_id: boardId,
      column_id: colProgressId,
      title: 'Optimize offline local storage data layer',
      description: 'Replace backend reliance with instant, synchronized client storage.',
      priority: 'urgent',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      start_date: now,
      assignee_id: userId,
      creator_id: userId,
      position: 0,
      is_completed: false,
      is_deleted: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      board_id: boardId,
      column_id: colDoneId,
      title: 'Initialize repository structure',
      description: 'Set up Vite, React, TypeScript, and shadcn UI component library.',
      priority: 'low',
      due_date: now,
      start_date: now,
      assignee_id: userId,
      creator_id: userId,
      position: 0,
      is_completed: true,
      is_deleted: false,
      completed_at: now,
      created_at: now,
      updated_at: now,
    },
  ];

  const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
  const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
  const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);

  setItem(STORAGE_KEYS.BOARDS, [demoBoard, ...boards]);
  setItem(STORAGE_KEYS.COLUMNS, [...columns, ...demoColumns]);
  setItem(STORAGE_KEYS.TASKS, [...tasks, ...demoTasks]);

  return demoBoard;
}

// Full database access layer
export const localDb = {
  // Registered Accounts Registry (to allow multiple actual registered users)
  getRegisteredUsers(): UserProfile[] {
    return getItem<UserProfile[]>(STORAGE_KEYS.REGISTERED_ACCOUNTS, []);
  },

  registerUser(profile: UserProfile): void {
    const users = this.getRegisteredUsers();
    if (!users.some(u => u.email.toLowerCase() === profile.email.toLowerCase())) {
      setItem(STORAGE_KEYS.REGISTERED_ACCOUNTS, [...users, profile]);
    }
  },

  findUserByEmail(email: string): UserProfile | null {
    const users = this.getRegisteredUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // -------------------------------------------------------------
  // Workspaces (Two-User Collaborative Workspace System)
  // -------------------------------------------------------------
  getWorkspaces(userId: string): Workspace[] {
    const members = getItem<WorkspaceMember[]>(STORAGE_KEYS.WORKSPACE_MEMBERS, []);
    const memberWorkspaceIds = new Set(members.filter(m => m.user_id === userId).map(m => m.workspace_id));
    const allWorkspaces = getItem<Workspace[]>(STORAGE_KEYS.WORKSPACES, []);
    return allWorkspaces.filter(w => w.owner_id === userId || memberWorkspaceIds.has(w.id));
  },

  getWorkspaceById(id: string): Workspace | null {
    const workspaces = getItem<Workspace[]>(STORAGE_KEYS.WORKSPACES, []);
    return workspaces.find(w => w.id === id) || null;
  },

  createWorkspace(data: { name: string; description?: string | null; owner: UserProfile }): {
    workspace: Workspace;
    board: Board;
    members: WorkspaceMember[];
  } {
    const now = new Date().toISOString();
    const workspaceId = generateId();

    const workspace: Workspace = {
      id: workspaceId,
      name: data.name,
      description: data.description || null,
      owner_id: data.owner.id,
      owner_name: data.owner.full_name || data.owner.email.split('@')[0],
      created_at: now,
      updated_at: now,
    };

    const ownerMember: WorkspaceMember = {
      id: generateId(),
      workspace_id: workspaceId,
      user_id: data.owner.id,
      user_email: data.owner.email,
      full_name: data.owner.full_name || data.owner.email.split('@')[0],
      avatar_url: data.owner.avatar_url || null,
      role: 'owner',
      joined_at: now,
    };

    // Save workspace & member
    const workspaces = getItem<Workspace[]>(STORAGE_KEYS.WORKSPACES, []);
    setItem(STORAGE_KEYS.WORKSPACES, [workspace, ...workspaces]);

    const members = getItem<WorkspaceMember[]>(STORAGE_KEYS.WORKSPACE_MEMBERS, []);
    setItem(STORAGE_KEYS.WORKSPACE_MEMBERS, [...members, ownerMember]);

    // Create a shared Kanban Board for this workspace
    const boardId = generateId();
    const sharedBoard: Board = {
      id: boardId,
      user_id: data.owner.id,
      workspace_id: workspaceId,
      name: `${data.name} Board`,
      description: `Collaborative To-Do list for ${data.name}`,
      color: '#0087FF',
      created_at: now,
      updated_at: now,
    };

    const defaultColumns: Column[] = [
      { id: generateId(), board_id: boardId, name: 'To Do', color: '#3B82F6', position: 0, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'In Progress', color: '#F59E0B', position: 1, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'Review', color: '#8B5CF6', position: 2, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'Done', color: '#10B981', position: 3, created_at: now, updated_at: now },
    ];

    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    setItem(STORAGE_KEYS.BOARDS, [sharedBoard, ...boards]);

    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
    setItem(STORAGE_KEYS.COLUMNS, [...columns, ...defaultColumns]);

    // Log activity
    this.logActivity(
      workspaceId,
      data.owner.id,
      data.owner.full_name || data.owner.email.split('@')[0],
      'join_workspace',
      `Created collaborative workspace "${data.name}"`
    );

    workspaceRealtime.broadcast('WORKSPACE_CREATED', { workspaceId });

    return {
      workspace,
      board: sharedBoard,
      members: [ownerMember],
    };
  },

  getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    const members = getItem<WorkspaceMember[]>(STORAGE_KEYS.WORKSPACE_MEMBERS, []);
    return members.filter(m => m.workspace_id === workspaceId);
  },

  getBoardForWorkspace(workspaceId: string): Board | null {
    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    return boards.find(b => b.workspace_id === workspaceId) || null;
  },

  // -------------------------------------------------------------
  // Shareable Collaboration Link Invitation System
  // -------------------------------------------------------------
  generateInviteLink(
    workspaceId: string,
    inviter: UserProfile,
    forceNew: boolean = false
  ): { success: boolean; invitation?: WorkspaceInvitation; error?: string } {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
    }

    const maxMembers = workspace.max_members || 2;
    const members = this.getWorkspaceMembers(workspaceId);
    if (members.length >= maxMembers) {
      return { success: false, error: `Workspace already has the maximum of ${maxMembers} members.` };
    }

    const now = new Date();
    const origin = typeof window !== 'undefined' && window.location && window.location.origin 
      ? window.location.origin 
      : 'http://localhost:5173';
    let invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);

    // If not forcing a new link, check if there is an active non-expired link
    if (!forceNew) {
      const existingIndex = invitations.findIndex(
        i => i.workspace_id === workspaceId &&
          (i.status === 'active' || i.status === 'pending') &&
          new Date(i.expires_at).getTime() > now.getTime()
      );

      if (existingIndex !== -1) {
        const existing = invitations[existingIndex];
        const token = existing.invite_token || existing.invite_code || existing.id;
        const inviteUrl = existing.invite_url || `${origin}/join/${token}`;
        const repaired: WorkspaceInvitation = {
          ...existing,
          status: 'active',
          invite_token: token,
          invite_url: inviteUrl
        };
        invitations[existingIndex] = repaired;
        setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, invitations);
        return { success: true, invitation: repaired };
      }
    }

    // Revoke any existing active/pending links for this workspace
    invitations = invitations.map(i => {
      if (i.workspace_id === workspaceId && (i.status === 'active' || i.status === 'pending')) {
        return { ...i, status: 'revoked' as const };
      }
      return i;
    });

    // Generate fresh secure token
    let token = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    } else {
      token = 'link_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    const inviteUrl = `${origin}/join/${token}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invitation: WorkspaceInvitation = {
      id: generateId(),
      workspace_id: workspaceId,
      workspace_name: workspace.name,
      inviter_id: inviter.id,
      inviter_name: inviter.full_name || inviter.email.split('@')[0],
      invite_token: token,
      invite_url: inviteUrl,
      invite_code: token.substring(0, 8).toUpperCase(),
      status: 'active',
      created_at: now.toISOString(),
      expires_at: expiresAt,
    };

    setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, [invitation, ...invitations]);

    this.logActivity(
      workspaceId,
      inviter.id,
      invitation.inviter_name,
      'invite_user',
      `Generated shareable collaboration link (Valid for 7 days)`
    );

    workspaceRealtime.broadcast('INVITATION_CREATED', { workspaceId, invitation });

    return { success: true, invitation };
  },

  getInvitationByToken(token: string): {
    valid: boolean;
    invitation?: WorkspaceInvitation;
    workspace?: Workspace;
    members?: WorkspaceMember[];
    error?: string;
  } {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    const cleanToken = token.trim();
    const inv = invitations.find(
      i => i.invite_token === cleanToken ||
        i.invite_code?.toUpperCase() === cleanToken.toUpperCase() ||
        i.id === cleanToken
    );

    if (!inv) {
      return { valid: false, error: 'Invalid or expired invitation link.' };
    }

    if (inv.status === 'used' || inv.status === 'accepted') {
      return { valid: false, error: 'This invitation link has already been used.' };
    }

    if (inv.status === 'revoked' || inv.status === 'declined') {
      return { valid: false, error: 'This invitation link has been revoked by the workspace owner.' };
    }

    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      return { valid: false, error: 'This invitation link has expired.' };
    }

    const workspace = this.getWorkspaceById(inv.workspace_id);
    if (!workspace) {
      return { valid: false, error: 'The workspace associated with this link no longer exists.' };
    }

    const maxMembers = workspace.max_members || 2;
    const members = this.getWorkspaceMembers(inv.workspace_id);
    if (members.length >= maxMembers) {
      return { valid: false, error: `This workspace is already full (maximum ${maxMembers} members reached).` };
    }

    return { valid: true, invitation: inv, workspace, members };
  },

  joinWorkspaceByToken(
    token: string,
    user: UserProfile
  ): { success: boolean; workspace?: Workspace; alreadyMember?: boolean; error?: string } {
    const validation = this.getInvitationByToken(token);

    // If not valid, check if user is already a member
    if (!validation.valid) {
      // Check if invitation exists and user is already a member of that workspace
      const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
      const cleanToken = token.trim();
      const rawInv = invitations.find(
        i => i.invite_token === cleanToken ||
          i.invite_code?.toUpperCase() === cleanToken.toUpperCase() ||
          i.id === cleanToken
      );

      if (rawInv) {
        const workspace = this.getWorkspaceById(rawInv.workspace_id);
        const members = this.getWorkspaceMembers(rawInv.workspace_id);
        if (workspace && members.some(m => m.user_id === user.id)) {
          return { success: true, workspace, alreadyMember: true };
        }
      }

      return { success: false, error: validation.error || 'Invalid invitation link' };
    }

    const { invitation: inv, workspace } = validation;

    // Verify user is not already in this workspace
    const currentMembers = this.getWorkspaceMembers(inv!.workspace_id);
    if (currentMembers.some(m => m.user_id === user.id)) {
      return { success: true, workspace: workspace!, alreadyMember: true };
    }

    const maxMembers = workspace!.max_members || 2;
    if (currentMembers.length >= maxMembers) {
      return { success: false, error: `This workspace is already full (maximum ${maxMembers} members reached).` };
    }

    const now = new Date().toISOString();
    const newMember: WorkspaceMember = {
      id: generateId(),
      workspace_id: inv!.workspace_id,
      user_id: user.id,
      user_email: user.email,
      full_name: user.full_name || user.email.split('@')[0],
      avatar_url: user.avatar_url || null,
      role: 'collaborator',
      joined_at: now,
    };

    // Add member
    const allMembers = getItem<WorkspaceMember[]>(STORAGE_KEYS.WORKSPACE_MEMBERS, []);
    setItem(STORAGE_KEYS.WORKSPACE_MEMBERS, [...allMembers, newMember]);

    // Mark invitation as used
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    const updatedInvs = invitations.map(i =>
      i.id === inv!.id
        ? {
          ...i,
          status: 'used' as const,
          used_by: user.id,
          used_by_name: newMember.full_name,
          used_at: now
        }
        : i
    );
    setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, updatedInvs);

    // Log activity
    this.logActivity(
      inv!.workspace_id,
      user.id,
      newMember.full_name,
      'join_workspace',
      `Joined the workspace via shareable invite link`
    );

    workspaceRealtime.broadcast('MEMBER_JOINED', { workspaceId: inv!.workspace_id, userId: user.id });

    return { success: true, workspace: workspace! };
  },

  revokeInviteLink(invitationId: string, user: UserProfile): void {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    const inv = invitations.find(i => i.id === invitationId);
    if (!inv) return;

    const updated = invitations.map(i => i.id === invitationId ? { ...i, status: 'revoked' as const } : i);
    setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, updated);

    this.logActivity(
      inv.workspace_id,
      user.id,
      user.full_name || user.email,
      'update_task',
      `Revoked shareable invitation link`
    );

    workspaceRealtime.broadcast('INVITATION_UPDATED', { invitationId });
  },

  getActiveInviteLink(workspaceId: string): WorkspaceInvitation | null {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    const now = Date.now();
    const origin = typeof window !== 'undefined' && window.location && window.location.origin 
      ? window.location.origin 
      : 'http://localhost:5173';

    const index = invitations.findIndex(
      i => i.workspace_id === workspaceId &&
        (i.status === 'active' || i.status === 'pending') &&
        (!i.expires_at || new Date(i.expires_at).getTime() > now)
    );

    if (index === -1) return null;

    const active = invitations[index];
    const token = active.invite_token || active.invite_code || active.id;
    const inviteUrl = active.invite_url || `${origin}/join/${token}`;

    if (!active.invite_url || !active.invite_token) {
      const repaired: WorkspaceInvitation = {
        ...active,
        status: 'active',
        invite_token: token,
        invite_url: inviteUrl
      };
      invitations[index] = repaired;
      setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, invitations);
      return repaired;
    }

    return active;
  },

  removeWorkspaceMember(
    workspaceId: string,
    memberIdOrUserId: string,
    operator: UserProfile
  ): { success: boolean; removedMember?: WorkspaceMember; error?: string } {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
    }

    if (workspace.owner_id !== operator.id) {
      return { success: false, error: 'Only the workspace owner can remove collaborators.' };
    }

    const allMembers = getItem<WorkspaceMember[]>(STORAGE_KEYS.WORKSPACE_MEMBERS, []);
    const memberToRemove = allMembers.find(
      m => m.workspace_id === workspaceId && (m.id === memberIdOrUserId || m.user_id === memberIdOrUserId)
    );

    if (!memberToRemove) {
      return { success: false, error: 'Member not found in this workspace.' };
    }

    if (memberToRemove.role === 'owner' || memberToRemove.user_id === workspace.owner_id) {
      return { success: false, error: 'The workspace owner cannot be removed.' };
    }

    // Remove member from workspace
    const updatedMembers = allMembers.filter(m => m.id !== memberToRemove.id);
    setItem(STORAGE_KEYS.WORKSPACE_MEMBERS, updatedMembers);

    // Unassign tasks assigned to this removed member in this workspace
    const allTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    const updatedTasks = allTasks.map(t => {
      if (t.workspace_id === workspaceId && t.assignee_id === memberToRemove.user_id) {
        return { ...t, assignee_id: null, assignee_name: null };
      }
      return t;
    });
    setItem(STORAGE_KEYS.TASKS, updatedTasks);

    // Log activity
    this.logActivity(
      workspaceId,
      operator.id,
      operator.full_name || operator.email,
      'remove_member',
      `Removed collaborator "${memberToRemove.full_name}" from workspace`
    );

    // Broadcast realtime event
    workspaceRealtime.broadcast('MEMBER_REMOVED', {
      workspaceId,
      memberId: memberToRemove.id,
      userId: memberToRemove.user_id,
      operatorId: operator.id
    });

    return { success: true, removedMember: memberToRemove };
  },

  updateWorkspaceCapacity(
    workspaceId: string,
    maxMembers: number,
    operator: UserProfile
  ): { success: boolean; max_members?: number; error?: string } {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
    }

    if (workspace.owner_id !== operator.id) {
      return { success: false, error: 'Only the workspace owner can update member capacity.' };
    }

    const currentMembers = this.getWorkspaceMembers(workspaceId);
    if (maxMembers < currentMembers.length) {
      return {
        success: false,
        error: `Capacity cannot be lower than current member count (${currentMembers.length}). Remove a collaborator first.`
      };
    }

    if (maxMembers < 2) {
      return { success: false, error: 'Minimum workspace capacity is 2 members.' };
    }

    if (maxMembers > 50) {
      return { success: false, error: 'Maximum workspace capacity is 50 members.' };
    }

    const allWorkspaces = getItem<Workspace[]>(STORAGE_KEYS.WORKSPACES, []);
    const updated = allWorkspaces.map(w =>
      w.id === workspaceId
        ? { ...w, max_members: maxMembers, updated_at: new Date().toISOString() }
        : w
    );
    setItem(STORAGE_KEYS.WORKSPACES, updated);

    this.logActivity(
      workspaceId,
      operator.id,
      operator.full_name || operator.email,
      'update_capacity',
      `Updated workspace capacity limit to ${maxMembers} members`
    );

    workspaceRealtime.broadcast('WORKSPACE_UPDATED', { workspaceId, max_members: maxMembers });

    return { success: true, max_members: maxMembers };
  },

  // Backwards compatibility wrappers
  createInvitation(
    workspaceId: string,
    inviter: UserProfile,
    _inviteeEmail?: string
  ): { success: boolean; invitation?: WorkspaceInvitation; error?: string } {
    return this.generateInviteLink(workspaceId, inviter);
  },

  acceptInvitation(
    inviteCodeOrId: string,
    user: UserProfile
  ): { success: boolean; workspace?: Workspace; error?: string } {
    return this.joinWorkspaceByToken(inviteCodeOrId, user);
  },

  getInvitations(workspaceId: string): WorkspaceInvitation[] {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    return invitations.filter(inv => inv.workspace_id === workspaceId);
  },

  getPendingInvitationsForEmail(email: string): WorkspaceInvitation[] {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    return invitations.filter(
      inv => (inv.status === 'active' || inv.status === 'pending') &&
        (!inv.invitee_email || inv.invitee_email.toLowerCase() === email.toLowerCase())
    );
  },

  declineInvitation(invitationId: string): void {
    const invitations = getItem<WorkspaceInvitation[]>(STORAGE_KEYS.WORKSPACE_INVITATIONS, []);
    const updated = invitations.map(i => i.id === invitationId ? { ...i, status: 'declined' as const } : i);
    setItem(STORAGE_KEYS.WORKSPACE_INVITATIONS, updated);
    workspaceRealtime.broadcast('INVITATION_UPDATED', { invitationId });
  },

  // -------------------------------------------------------------
  // Workspace Shared Documents
  // -------------------------------------------------------------
  getWorkspaceDocuments(workspaceId: string): WorkspaceDocument[] {
    const docs = getItem<WorkspaceDocument[]>(STORAGE_KEYS.WORKSPACE_DOCUMENTS, []);
    return docs
      .filter(d => d.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addWorkspaceDocument(data: {
    workspace_id: string;
    task_id?: string | null;
    task_title?: string | null;
    file_name: string;
    file_type: string;
    file_size: number;
    data_url: string;
    user: UserProfile;
  }): WorkspaceDocument {
    const now = new Date().toISOString();
    const doc: WorkspaceDocument = {
      id: generateId(),
      workspace_id: data.workspace_id,
      task_id: data.task_id || null,
      task_title: data.task_title || null,
      file_name: data.file_name,
      file_type: data.file_type,
      file_size: data.file_size,
      data_url: data.data_url,
      uploaded_by: data.user.id,
      uploaded_by_name: data.user.full_name || data.user.email.split('@')[0],
      created_at: now,
    };

    const docs = getItem<WorkspaceDocument[]>(STORAGE_KEYS.WORKSPACE_DOCUMENTS, []);
    setItem(STORAGE_KEYS.WORKSPACE_DOCUMENTS, [doc, ...docs]);

    // If attached to a task, also create an attachment record for backwards compatibility
    if (data.task_id) {
      this.addAttachment(data.task_id, data.file_name, data.file_type, data.file_size, data.data_url);
    }

    this.logActivity(
      data.workspace_id,
      data.user.id,
      doc.uploaded_by_name,
      'upload_doc',
      `Uploaded document "${data.file_name}"${data.task_title ? ` to task "${data.task_title}"` : ''}`
    );

    workspaceRealtime.broadcast('DOCUMENT_UPLOADED', { workspaceId: data.workspace_id, docId: doc.id });

    return doc;
  },

  deleteWorkspaceDocument(id: string, user: UserProfile): void {
    const docs = getItem<WorkspaceDocument[]>(STORAGE_KEYS.WORKSPACE_DOCUMENTS, []);
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    setItem(STORAGE_KEYS.WORKSPACE_DOCUMENTS, docs.filter(d => d.id !== id));

    this.logActivity(
      doc.workspace_id,
      user.id,
      user.full_name || user.email.split('@')[0],
      'delete_doc',
      `Deleted document "${doc.file_name}"`
    );

    workspaceRealtime.broadcast('DOCUMENT_DELETED', { workspaceId: doc.workspace_id, docId: id });
  },

  // -------------------------------------------------------------
  // Workspace Activities
  // -------------------------------------------------------------
  getWorkspaceActivities(workspaceId: string): WorkspaceActivity[] {
    const activities = getItem<WorkspaceActivity[]>(STORAGE_KEYS.WORKSPACE_ACTIVITIES, []);
    return activities
      .filter(a => a.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  },

  logActivity(
    workspaceId: string,
    userId: string,
    userName: string,
    action: WorkspaceActivity['action'],
    details: string
  ): WorkspaceActivity {
    const activity: WorkspaceActivity = {
      id: generateId(),
      workspace_id: workspaceId,
      user_id: userId,
      user_name: userName,
      action,
      details,
      created_at: new Date().toISOString(),
    };

    const activities = getItem<WorkspaceActivity[]>(STORAGE_KEYS.WORKSPACE_ACTIVITIES, []);
    setItem(STORAGE_KEYS.WORKSPACE_ACTIVITIES, [activity, ...activities.slice(0, 99)]);

    workspaceRealtime.broadcast('ACTIVITY_LOGGED', { workspaceId, activity });

    return activity;
  },

  // -------------------------------------------------------------
  // Boards
  // -------------------------------------------------------------
  getBoards(userId: string): Board[] {
    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    // Include user boards and shared boards from workspaces user belongs to
    const workspaces = this.getWorkspaces(userId);
    const workspaceIds = new Set(workspaces.map(w => w.id));

    const userBoards = boards.filter(b => b.user_id === userId || (b.workspace_id && workspaceIds.has(b.workspace_id)));
    if (userBoards.length === 0) {
      const seeded = seedInitialDataForUser(userId);
      return [seeded];
    }
    return userBoards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getBoardById(id: string): Board | null {
    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    return boards.find(b => b.id === id) || null;
  },

  createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): { board: Board; defaultColumns: Column[] } {
    const now = new Date().toISOString();
    const boardId = generateId();
    const newBoard: Board = {
      ...boardData,
      id: boardId,
      created_at: now,
      updated_at: now,
    };

    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    setItem(STORAGE_KEYS.BOARDS, [newBoard, ...boards]);

    // Create default columns
    const defaultColumns: Column[] = [
      { id: generateId(), board_id: boardId, name: 'To Do', color: '#3B82F6', position: 0, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'In Progress', color: '#F59E0B', position: 1, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'Review', color: '#8B5CF6', position: 2, created_at: now, updated_at: now },
      { id: generateId(), board_id: boardId, name: 'Done', color: '#10B981', position: 3, created_at: now, updated_at: now },
    ];

    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
    setItem(STORAGE_KEYS.COLUMNS, [...columns, ...defaultColumns]);

    workspaceRealtime.broadcast('BOARD_CREATED', { boardId });

    return { board: newBoard, defaultColumns };
  },

  updateBoard(id: string, updates: Partial<Board>): Board | null {
    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []);
    let updated: Board | null = null;
    const newBoards = boards.map(b => {
      if (b.id === id) {
        updated = { ...b, ...updates, updated_at: new Date().toISOString() };
        return updated;
      }
      return b;
    });
    setItem(STORAGE_KEYS.BOARDS, newBoards);
    workspaceRealtime.broadcast('BOARD_UPDATED', { boardId: id });
    return updated;
  },

  deleteBoard(id: string): void {
    const boards = getItem<Board[]>(STORAGE_KEYS.BOARDS, []).filter(b => b.id !== id);
    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []).filter(c => c.board_id !== id);
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []).filter(t => t.board_id !== id);
    setItem(STORAGE_KEYS.BOARDS, boards);
    setItem(STORAGE_KEYS.COLUMNS, columns);
    setItem(STORAGE_KEYS.TASKS, tasks);
    workspaceRealtime.broadcast('BOARD_DELETED', { boardId: id });
  },

  // -------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------
  getColumns(boardId: string): Column[] {
    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
    return columns
      .filter(c => c.board_id === boardId)
      .sort((a, b) => a.position - b.position);
  },

  createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Column {
    const now = new Date().toISOString();
    const newCol: Column = {
      ...columnData,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
    setItem(STORAGE_KEYS.COLUMNS, [...columns, newCol]);
    workspaceRealtime.broadcast('COLUMN_CREATED', { columnId: newCol.id, boardId: columnData.board_id });
    return newCol;
  },

  updateColumn(id: string, updates: Partial<Column>): Column | null {
    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []);
    let updated: Column | null = null;
    const newCols = columns.map(c => {
      if (c.id === id) {
        updated = { ...c, ...updates, updated_at: new Date().toISOString() };
        return updated;
      }
      return c;
    });
    setItem(STORAGE_KEYS.COLUMNS, newCols);
    workspaceRealtime.broadcast('COLUMN_UPDATED', { columnId: id });
    return updated;
  },

  deleteColumn(id: string): void {
    const columns = getItem<Column[]>(STORAGE_KEYS.COLUMNS, []).filter(c => c.id !== id);
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []).map(t =>
      t.column_id === id ? { ...t, column_id: null, is_deleted: true } : t
    );
    setItem(STORAGE_KEYS.COLUMNS, columns);
    setItem(STORAGE_KEYS.TASKS, tasks);
    workspaceRealtime.broadcast('COLUMN_DELETED', { columnId: id });
  },

  // -------------------------------------------------------------
  // Tasks (Enhanced for Collaboration & Deadlines)
  // -------------------------------------------------------------
  getTasksByBoard(boardId: string): Task[] {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    return tasks
      .filter(t => t.board_id === boardId && !t.is_deleted)
      .sort((a, b) => a.position - b.position);
  },

  getTasksByWorkspace(workspaceId: string): Task[] {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    return tasks
      .filter(t => t.workspace_id === workspaceId && !t.is_deleted)
      .sort((a, b) => a.position - b.position);
  },

  getTasksByColumn(columnId: string): Task[] {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    return tasks
      .filter(t => t.column_id === columnId && !t.is_deleted)
      .sort((a, b) => a.position - b.position);
  },

  createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'is_completed' | 'completed_at'>): Task {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      is_completed: false,
      is_deleted: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    setItem(STORAGE_KEYS.TASKS, [...tasks, newTask]);

    if (newTask.workspace_id) {
      this.logActivity(
        newTask.workspace_id,
        newTask.creator_id || 'system',
        newTask.creator_name || 'Member',
        'create_task',
        `Created task "${newTask.title}"${newTask.assignee_name ? ` (Assigned to ${newTask.assignee_name})` : ''}`
      );
    }

    workspaceRealtime.broadcast('TASK_CREATED', { task: newTask, boardId: newTask.board_id });
    return newTask;
  },

  updateTask(id: string, updates: Partial<Task>, currentUserId?: string, currentUserName?: string): Task | null {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    let updated: Task | null = null;
    let oldTask: Task | null = null;

    const newTasks = tasks.map(t => {
      if (t.id === id) {
        oldTask = t;
        updated = { ...t, ...updates, updated_at: new Date().toISOString() };
        return updated;
      }
      return t;
    });
    setItem(STORAGE_KEYS.TASKS, newTasks);

    if (updated && (updated as Task).workspace_id) {
      const uTask = updated as Task;
      if (updates.assignee_id !== undefined && updates.assignee_id !== oldTask?.assignee_id) {
        this.logActivity(
          uTask.workspace_id!,
          currentUserId || 'user',
          currentUserName || 'Member',
          'assign_task',
          `Reassigned task "${uTask.title}" to ${uTask.assignee_name || 'Unassigned'}`
        );
      } else {
        this.logActivity(
          uTask.workspace_id!,
          currentUserId || 'user',
          currentUserName || 'Member',
          'update_task',
          `Updated task "${uTask.title}"`
        );
      }
    }

    workspaceRealtime.broadcast('TASK_UPDATED', { taskId: id, updates });
    return updated;
  },

  deleteTask(id: string, currentUserId?: string, currentUserName?: string): void {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    const taskToDelete = tasks.find(t => t.id === id);

    const newTasks = tasks.map(t =>
      t.id === id ? { ...t, is_deleted: true, updated_at: new Date().toISOString() } : t
    );
    setItem(STORAGE_KEYS.TASKS, newTasks);
    this.deleteAttachmentsByTask(id);

    if (taskToDelete?.workspace_id) {
      this.logActivity(
        taskToDelete.workspace_id,
        currentUserId || 'user',
        currentUserName || 'Member',
        'delete_task',
        `Deleted task "${taskToDelete.title}"`
      );
    }

    workspaceRealtime.broadcast('TASK_DELETED', { taskId: id, boardId: taskToDelete?.board_id });
  },

  moveTask(taskId: string, newColumnId: string, newPosition: number, isDoneColumn: boolean, currentUserId?: string, currentUserName?: string): Task | null {
    const updates: Partial<Task> = {
      column_id: newColumnId,
      position: newPosition,
      is_completed: isDoneColumn,
      completed_at: isDoneColumn ? new Date().toISOString() : null,
    };
    const updated = this.updateTask(taskId, updates, currentUserId, currentUserName);
    if (updated?.workspace_id) {
      this.logActivity(
        updated.workspace_id,
        currentUserId || 'user',
        currentUserName || 'Member',
        'move_task',
        `Moved task "${updated.title}" to ${isDoneColumn ? 'Done' : 'new column'}`
      );
    }
    return updated;
  },

  batchUpdateTasks(updates: Array<{ id: string; position: number }>): void {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
    const updateMap = new Map(updates.map(u => [u.id, u.position]));
    const newTasks = tasks.map(t => {
      if (updateMap.has(t.id)) {
        return { ...t, position: updateMap.get(t.id)!, updated_at: new Date().toISOString() };
      }
      return t;
    });
    setItem(STORAGE_KEYS.TASKS, newTasks);
    workspaceRealtime.broadcast('TASKS_REORDERED', { count: updates.length });
  },

  // -------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------
  getComments(taskId: string): TaskComment[] {
    const comments = getItem<TaskComment[]>(STORAGE_KEYS.COMMENTS, []);
    return comments
      .filter(c => c.task_id === taskId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  addComment(taskId: string, content: string, userId: string, userName?: string): TaskComment {
    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id: generateId(),
      task_id: taskId,
      user_id: userId,
      user_name: userName,
      content,
      created_at: now,
    };
    const comments = getItem<TaskComment[]>(STORAGE_KEYS.COMMENTS, []);
    setItem(STORAGE_KEYS.COMMENTS, [...comments, newComment]);
    workspaceRealtime.broadcast('COMMENT_ADDED', { taskId, comment: newComment });
    return newComment;
  },

  // -------------------------------------------------------------
  // Reminders
  // -------------------------------------------------------------
  getReminders(taskId: string): TaskReminder[] {
    const reminders = getItem<TaskReminder[]>(STORAGE_KEYS.REMINDERS, []);
    return reminders
      .filter(r => r.task_id === taskId)
      .sort((a, b) => new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime());
  },

  addReminder(taskId: string, userId: string, reminderTime: string): TaskReminder {
    const now = new Date().toISOString();
    const newReminder: TaskReminder = {
      id: generateId(),
      task_id: taskId,
      user_id: userId,
      reminder_time: reminderTime,
      is_sent: false,
      created_at: now,
    };
    const reminders = getItem<TaskReminder[]>(STORAGE_KEYS.REMINDERS, []);
    setItem(STORAGE_KEYS.REMINDERS, [...reminders, newReminder]);
    workspaceRealtime.broadcast('REMINDER_ADDED', { taskId, reminder: newReminder });
    return newReminder;
  },

  deleteReminder(id: string): void {
    const reminders = getItem<TaskReminder[]>(STORAGE_KEYS.REMINDERS, []).filter(r => r.id !== id);
    setItem(STORAGE_KEYS.REMINDERS, reminders);
  },

  // -------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------
  getAttachments(taskId: string): TaskAttachment[] {
    const attachments = getItem<TaskAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []);
    return attachments
      .filter(a => a.task_id === taskId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addAttachment(
    taskId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    dataUrl: string,
    uploadedBy?: string,
    uploadedByName?: string
  ): TaskAttachment {
    const now = new Date().toISOString();
    const newAttachment: TaskAttachment = {
      id: generateId(),
      task_id: taskId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      data_url: dataUrl,
      uploaded_by: uploadedBy,
      uploaded_by_name: uploadedByName,
      created_at: now,
    };
    const attachments = getItem<TaskAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []);
    setItem(STORAGE_KEYS.ATTACHMENTS, [...attachments, newAttachment]);
    workspaceRealtime.broadcast('ATTACHMENT_ADDED', { taskId, attachment: newAttachment });
    return newAttachment;
  },

  deleteAttachment(id: string): void {
    const attachments = getItem<TaskAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []).filter(a => a.id !== id);
    setItem(STORAGE_KEYS.ATTACHMENTS, attachments);
    workspaceRealtime.broadcast('ATTACHMENT_DELETED', { attachmentId: id });
  },

  deleteAttachmentsByTask(taskId: string): void {
    const attachments = getItem<TaskAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []).filter(a => a.task_id !== taskId);
    setItem(STORAGE_KEYS.ATTACHMENTS, attachments);
  },

  getAttachmentCount(taskId: string): number {
    const attachments = getItem<TaskAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []);
    return attachments.filter(a => a.task_id === taskId).length;
  },

  // -------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------
  getUserStats(userId: string) {
    const userBoards = this.getBoards(userId);
    const boardIds = new Set(userBoards.map(b => b.id));
    const allTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []).filter(t => boardIds.has(t.board_id) && !t.is_deleted);

    return {
      boards: userBoards,
      tasks: allTasks,
    };
  }
};
