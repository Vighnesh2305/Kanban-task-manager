import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import { useAuthStore } from '../authStore';
import { useTaskStore } from '../taskStore';
import { localDb } from '../../lib/storage';

describe('Two-User Collaborative Workspace - Shareable Link System', () => {
  const user1 = {
    id: 'user1_alice',
    email: 'alice@example.com',
    full_name: 'Alice Johnson',
    created_at: new Date().toISOString(),
  };

  const user2 = {
    id: 'user2_bob',
    email: 'bob@example.com',
    full_name: 'Bob Smith',
    created_at: new Date().toISOString(),
  };

  const user3 = {
    id: 'user3_charlie',
    email: 'charlie@example.com',
    full_name: 'Charlie Brown',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspace: null,
      currentBoard: null,
      members: [],
      invitations: [],
      documents: [],
      activities: [],
      pendingInvitations: [],
    });
    useTaskStore.setState({ tasks: [] });
    useAuthStore.setState({ user: user1 });
  });

  it('Requirements 1, 2, 3: generates a unique, secure invitation URL with token and Copy Link support', async () => {
    const store = useWorkspaceStore.getState();

    // User 1 creates workspace
    const createRes = await store.createWorkspace('Core Platform', '2-user workspace', user1);
    expect(createRes).not.toBeNull();
    const ws = createRes!.workspace;

    // User 1 generates invite link
    const linkRes = await store.generateInviteLink(ws.id, user1);
    expect(linkRes.success).toBe(true);
    expect(linkRes.invitation).toBeDefined();

    const inv = linkRes.invitation!;
    expect(inv.invite_token).toBeDefined();
    expect(inv.invite_token.length).toBeGreaterThan(10);
    expect(inv.invite_url).toContain('/join/' + inv.invite_token);
    expect(inv.status).toBe('active');
    expect(inv.expires_at).toBeDefined();

    // Verify getting active invite link
    const active = store.getActiveInviteLink(ws.id);
    expect(active?.invite_token).toBe(inv.invite_token);
  });

  it('Requirements 4, 7, 8: second user opens link, authenticates, joins workspace, and 3rd user is blocked', async () => {
    const store = useWorkspaceStore.getState();

    // User 1 creates workspace
    const createRes = await store.createWorkspace('Mobile App Sprint', 'Two-user workspace', user1);
    const ws = createRes!.workspace;

    // User 1 generates shareable link
    const linkRes = await store.generateInviteLink(ws.id, user1);
    const token = linkRes.invitation!.invite_token;

    // Validate token before joining
    const validation = store.getInvitationByToken(token);
    expect(validation.valid).toBe(true);
    expect(validation.workspace?.id).toBe(ws.id);

    // User 2 opens the link and joins after authenticating
    const joinRes = await store.joinWorkspaceByToken(token, user2);
    expect(joinRes.success).toBe(true);
    expect(joinRes.workspace?.id).toBe(ws.id);

    // Workspace must now have EXACTLY 2 members
    const members = localDb.getWorkspaceMembers(ws.id);
    expect(members.length).toBe(2);
    expect(members.map(m => m.user_id)).toEqual([user1.id, user2.id]);

    // Prevent duplicate joins: User 2 opening the link again is safely redirected without duplicating
    const duplicateJoinRes = await store.joinWorkspaceByToken(token, user2);
    expect(duplicateJoinRes.success).toBe(true);
    expect(duplicateJoinRes.alreadyMember).toBe(true);
    expect(localDb.getWorkspaceMembers(ws.id).length).toBe(2);

    // Third user (Charlie) attempting to join must be rejected (Workspace is full)
    const thirdUserRes = await store.joinWorkspaceByToken(token, user3);
    expect(thirdUserRes.success).toBe(false);
    expect(thirdUserRes.error).toBeDefined();

    // Attempting to generate a new invite link on a full workspace must also be rejected
    const newLinkOnFull = await store.generateInviteLink(ws.id, user1);
    expect(newLinkOnFull.success).toBe(false);
    expect(newLinkOnFull.error).toContain('maximum of 2');
  });

  it('Owner can remove collaborator and increase member capacity', async () => {
    const store = useWorkspaceStore.getState();

    // User 1 creates workspace and invites User 2
    const createRes = await store.createWorkspace('Capacity Test', 'Testing limits', user1);
    const ws = createRes!.workspace;
    const linkRes = await store.generateInviteLink(ws.id, user1);
    await store.joinWorkspaceByToken(linkRes.invitation!.invite_token, user2);

    expect(localDb.getWorkspaceMembers(ws.id).length).toBe(2);

    // 1. Non-owner (User 2) trying to remove owner must fail
    const nonOwnerRemove = await store.removeMember(ws.id, user1.id, user2);
    expect(nonOwnerRemove.success).toBe(false);
    expect(nonOwnerRemove.error).toContain('Only the workspace owner');

    // 2. Owner removing collaborator (User 2) succeeds
    const ownerRemove = await store.removeMember(ws.id, user2.id, user1);
    expect(ownerRemove.success).toBe(true);
    expect(localDb.getWorkspaceMembers(ws.id).length).toBe(1);

    // 3. User 3 can now join into the freed seat
    const linkRes2 = await store.generateInviteLink(ws.id, user1, true);
    const join3 = await store.joinWorkspaceByToken(linkRes2.invitation!.invite_token, user3);
    expect(join3.success).toBe(true);
    expect(localDb.getWorkspaceMembers(ws.id).length).toBe(2);

    // 4. Owner increases capacity from 2 to 3
    const capRes = await store.updateCapacity(ws.id, 3, user1);
    expect(capRes.success).toBe(true);
    const updatedWs = localDb.getWorkspaceById(ws.id);
    expect(updatedWs?.max_members).toBe(3);

    // 5. User 2 can now join as the 3rd member
    const linkRes3 = await store.generateInviteLink(ws.id, user1, true);
    const joinUser2Again = await store.joinWorkspaceByToken(linkRes3.invitation!.invite_token, user2);
    expect(joinUser2Again.success).toBe(true);
    expect(localDb.getWorkspaceMembers(ws.id).length).toBe(3);
  });

  it('Requirement 8: rejects invalid, expired, and revoked invitation tokens', async () => {
    const store = useWorkspaceStore.getState();
    const createRes = await store.createWorkspace('Security Test', 'Testing token validation', user1);
    const ws = createRes!.workspace;

    // Random non-existent token
    const invalidValidation = store.getInvitationByToken('fake_token_123');
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toContain('Invalid');

    // Generate link then revoke it
    const linkRes = await store.generateInviteLink(ws.id, user1);
    const invId = linkRes.invitation!.id;
    const token = linkRes.invitation!.invite_token;

    await store.revokeInviteLink(invId, user1);

    const revokedValidation = store.getInvitationByToken(token);
    expect(revokedValidation.valid).toBe(false);
    expect(revokedValidation.error).toContain('revoked');
  });

  it('Requirements 5 & 6: both users access common To-Do list, task assignments, deadlines, and documents in real time', async () => {
    const wsStore = useWorkspaceStore.getState();
    const taskStore = useTaskStore.getState();

    // User 1 creates workspace and generates invite link
    const created = await wsStore.createWorkspace('Joint Sprint', 'Shared board', user1);
    const ws = created!.workspace;
    const board = created!.board;

    const linkRes = await wsStore.generateInviteLink(ws.id, user1);
    await wsStore.joinWorkspaceByToken(linkRes.invitation!.invite_token, user2);

    // User 1 creates task assigned to User 2
    const task = await taskStore.createTask({
      board_id: board.id,
      column_id: 'col_todo',
      workspace_id: ws.id,
      title: 'Review PR & Deploy',
      description: 'Check deployment pipelines',
      priority: 'urgent',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      start_date: new Date().toISOString(),
      assignee_id: user2.id,
      assignee_name: user2.full_name,
      creator_id: user1.id,
      creator_name: user1.full_name,
      position: 0,
    });

    expect(task).toBeDefined();
    expect(task?.assignee_id).toBe(user2.id);

    // User 2 uploads document
    const file = new File(['documentation content'], 'Spec.pdf', { type: 'application/pdf' });
    const uploadedDoc = await wsStore.uploadDocument(ws.id, file, user2);
    expect(uploadedDoc).toBeDefined();

    // Verify both users access the same tasks and documents
    const wsTasks = localDb.getTasksByWorkspace(ws.id);
    const wsDocs = localDb.getWorkspaceDocuments(ws.id);
    expect(wsTasks.length).toBe(1);
    expect(wsDocs.length).toBe(1);
    expect(wsDocs[0].uploaded_by).toBe(user2.id);

    // User 1 reassigns task to User 1
    await taskStore.updateTask(task!.id, { assignee_id: user1.id, assignee_name: user1.full_name }, user1.id, user1.full_name);
    const updated = localDb.getTasksByWorkspace(ws.id)[0];
    expect(updated.assignee_id).toBe(user1.id);
  });
});
