// Core type definitions for the Kanban and Collaborative Workspace application

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email_notifications?: boolean;
  created_at: string;
  updated_at?: string;
}

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface Board {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  name: string;
  description: string | null;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  color?: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  column_id: string | null;
  workspace_id?: string | null;
  title: string;
  description: string | null;
  priority: PriorityLevel;
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  creator_id: string | null;
  creator_name?: string | null;
  position: number;
  is_completed: boolean;
  is_deleted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  name: string;
  color?: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_time: string;
  is_sent: boolean;
  created_at: string;
  sent_at?: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  data_url: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
}

// Two-User Collaborative Workspace Types
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_name?: string;
  max_members?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'collaborator';
  user_email: string;
  full_name: string;
  avatar_url?: string | null;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  inviter_id: string;
  inviter_name: string;
  invite_token: string;
  invite_url: string;
  status: 'active' | 'used' | 'revoked' | 'expired' | 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  used_by?: string | null;
  used_by_name?: string | null;
  used_at?: string | null;
  invite_code?: string;
  invitee_email?: string;
}

export interface WorkspaceDocument {
  id: string;
  workspace_id: string;
  task_id?: string | null;
  task_title?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  data_url: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name: string;
  action: 'create_task' | 'update_task' | 'delete_task' | 'move_task' | 'assign_task' | 'upload_doc' | 'delete_doc' | 'join_workspace' | 'invite_user' | 'remove_member' | 'update_capacity';
  details: string;
  created_at: string;
}

export type Reminder = TaskReminder;
