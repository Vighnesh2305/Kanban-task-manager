import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  FolderLock,
  Activity,
  CheckSquare,
  UserPlus,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  LogOut,
  User,
  Link2,
  Copy,
  Check
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useBoardStore, Column as ColumnType } from '../../stores/boardStore';
import { useTaskStore, Task } from '../../stores/taskStore';
import { Column } from '../Board/Column';
import { TaskCard } from '../Board/TaskCard';
import { CreateColumnModal } from '../Board/CreateColumnModal';
import { CreateTaskModal } from '../Board/CreateTaskModal';
import { TaskDetailModal } from '../Board/TaskDetailModal';
import { SharedDocuments } from './SharedDocuments';
import { DeadlinesPanel } from './DeadlinesPanel';
import { ActivityFeed } from './ActivityFeed';
import { InviteMemberModal } from './InviteMemberModal';
import { localDb } from '../../lib/storage';

export const WorkspaceView = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const { user, switchUser } = useAuthStore();
  const {
    currentWorkspace,
    currentBoard,
    members,
    documents,
    activities,
    selectWorkspace,
    unsubscribeWorkspace,
    loading: wsLoading
  } = useWorkspaceStore();

  const {
    columns,
    fetchColumns,
    deleteColumn,
    subscribeToColumns,
    unsubscribeFromColumns
  } = useBoardStore();

  const {
    tasks,
    fetchAllTasksForBoard,
    moveTask,
    deleteTask,
    subscribeToTasks,
    unsubscribeFromTasks
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<'todo' | 'deadlines' | 'documents' | 'activity'>('todo');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnType | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  // Initialize workspace and board
  useEffect(() => {
    if (workspaceId) {
      selectWorkspace(workspaceId);
    }
    return () => {
      unsubscribeWorkspace();
    };
  }, [workspaceId, selectWorkspace, unsubscribeWorkspace]);

  // When currentBoard is loaded, subscribe to columns & tasks
  useEffect(() => {
    if (currentBoard) {
      fetchColumns(currentBoard.id);
      subscribeToColumns(currentBoard.id);
      fetchAllTasksForBoard(currentBoard.id);
      subscribeToTasks(currentBoard.id);
    }
    return () => {
      unsubscribeFromColumns();
      unsubscribeFromTasks();
    };
  }, [currentBoard, fetchColumns, subscribeToColumns, fetchAllTasksForBoard, subscribeToTasks, unsubscribeFromColumns, unsubscribeFromTasks]);

  // Page title
  useEffect(() => {
    if (currentWorkspace) {
      document.title = `${currentWorkspace.name} - Collaborative Workspace`;
    }
  }, [currentWorkspace]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveDragTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overColumn = columns.find(c => c.id === over.id);

    if (!activeTask) return;

    if (overColumn) {
      const isDone = overColumn.name.toLowerCase().includes('done');
      const newPos = tasks.filter(t => t.column_id === overColumn.id).length;
      await moveTask(activeTask.id, overColumn.id, newPos, isDone, user?.id, user?.full_name || user?.email);
    }
  };

  const boardColumns = currentBoard ? columns.filter(c => c.board_id === currentBoard.id) : [];

  // Overdue count for badge
  const now = new Date();
  const overdueCount = tasks.filter(t => t.due_date && !t.is_completed && new Date(t.due_date).getTime() < now.getTime()).length;

  const ownerMember = members.find(m => m.role === 'owner') || members[0];
  const collaboratorMembers = members.filter(m => m.role === 'collaborator');
  const maxMembers = currentWorkspace?.max_members || 2;
  const isFull = members.length >= maxMembers;
  const isOwner = Boolean(user && currentWorkspace && user.id === currentWorkspace.owner_id);

  // Registered accounts for testing/switching between User 1 and User 2
  const allUsers = localDb.getRegisteredUsers();

  if (currentWorkspace && members.length > 0 && user && !members.some(m => m.user_id === user.id)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Access Removed</h2>
          <p className="text-sm text-neutral-600">
            You are no longer a collaborator in this workspace.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/40 via-neutral-50 to-indigo-50/30 flex flex-col">
      {/* Top Workspace Header */}
      <header className="bg-white border-b border-neutral-200 shadow-soft sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            {/* Title & Back button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-neutral-100 rounded-xl transition text-neutral-500 hover:text-neutral-900"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                    {currentWorkspace?.name || 'Collaborative Workspace'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-100 text-primary-700 border border-primary-200">
                    {maxMembers}-Member Collaborative Workspace
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {currentWorkspace?.description || 'Real-time collaborative task board & document space'}
                </p>
              </div>
            </div>

            {/* Profile Bar: Displays All Workspace Members */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-1.5 rounded-2xl flex-wrap">

                {/* Owner Profile */}
                {ownerMember && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200/80 shadow-soft">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-xs flex items-center justify-center">
                        {ownerMember.full_name ? ownerMember.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" title="Active" />
                    </div>
                    <div className="text-left text-xs">
                      <div className="font-bold text-neutral-900 leading-tight">
                        {ownerMember.full_name}
                      </div>
                      <div className="text-[10px] text-primary-600 font-semibold uppercase">
                        {ownerMember.role}
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaborator Profiles */}
                {collaboratorMembers.map(c => (
                  <div key={c.id || c.user_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200/80 shadow-soft">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                        {c.full_name ? c.full_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" title="Active" />
                    </div>
                    <div className="text-left text-xs">
                      <div className="font-bold text-neutral-900 leading-tight">
                        {c.full_name}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold uppercase">
                        Collaborator
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate Invite Link / Capacity button */}
              {!isFull ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition shadow-soft flex items-center gap-1.5"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Generate Invite Link</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>{members.length}/{maxMembers} Members ({isOwner ? 'Manage' : 'Full'})</span>
                </button>
              )}

              {/* Quick User Identity Switcher (for demonstration and pair testing) */}
              {members.length > 1 && (
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
                  <span className="text-[10px] font-bold text-neutral-500 px-1">Act as:</span>
                  {members.map(m => (
                    <button
                      key={m.user_id}
                      onClick={() => switchUser({
                        id: m.user_id,
                        email: m.user_email,
                        full_name: m.full_name,
                        created_at: m.joined_at
                      })}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition ${user?.id === m.user_id
                        ? 'bg-white text-primary-600 shadow-soft'
                        : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                      {m.full_name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('todo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shrink-0 ${activeTab === 'todo'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              <CheckSquare className="w-4 h-4" />
              Common To-Do List ({tasks.length})
            </button>

            <button
              onClick={() => setActiveTab('deadlines')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shrink-0 ${activeTab === 'deadlines'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              <Calendar className="w-4 h-4" />
              Deadlines & Overdue
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                  {overdueCount} Overdue
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shrink-0 ${activeTab === 'documents'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              <FolderLock className="w-4 h-4" />
              Shared Documents ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shrink-0 ${activeTab === 'activity'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              <Activity className="w-4 h-4" />
              Activity Log ({activities.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">

        {/* Tab 1: Common To-Do List (Kanban Board) */}
        {activeTab === 'todo' && (
          <div className="space-y-4">
            {/* Board Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500">
                  Shared columns ({boardColumns.length}) • Both users can edit, drag & assign tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingColumn(null);
                    setShowColumnModal(true);
                  }}
                  className="px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-semibold transition shadow-soft flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setSelectedColumnId(boardColumns[0]?.id || '');
                    setShowTaskModal(true);
                  }}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition shadow-soft hover:shadow-medium flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
              </div>
            </div>

            {/* Kanban Board DND Area */}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[500px]">
                {boardColumns.map((column) => (
                  <Column
                    key={column.id}
                    column={column}
                    onEditColumn={(col) => {
                      setEditingColumn(col);
                      setShowColumnModal(true);
                    }}
                    onDeleteColumn={deleteColumn}
                    onCreateTask={(colId) => {
                      setSelectedColumnId(colId);
                      setEditingTask(null);
                      setShowTaskModal(true);
                    }}
                    onEditTask={(task) => {
                      setEditingTask(task);
                      setSelectedColumnId(task.column_id || '');
                      setShowTaskModal(true);
                    }}
                    onDeleteTask={(taskId) => deleteTask(taskId, user?.id, user?.full_name || user?.email)}
                    onOpenTaskDetails={(task) => {
                      setSelectedTask(task);
                      setShowTaskDetail(true);
                    }}
                  />
                ))}

                {boardColumns.length === 0 && (
                  <div className="w-full text-center py-16 bg-white rounded-2xl border border-neutral-200">
                    <p className="text-sm font-semibold text-neutral-700">No columns in this collaborative board yet</p>
                    <button
                      onClick={() => setShowColumnModal(true)}
                      className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold"
                    >
                      Create First Column
                    </button>
                  </div>
                )}
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeDragTask ? (
                  <div className="rotate-2 opacity-90 shadow-2xl">
                    <TaskCard
                      task={activeDragTask}
                      onEdit={() => { }}
                      onDelete={() => { }}
                      onOpenDetails={() => { }}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Tab 2: Deadlines & Overdue Tasks */}
        {activeTab === 'deadlines' && (
          <DeadlinesPanel
            onOpenTaskDetails={(task) => {
              setSelectedTask(task);
              setShowTaskDetail(true);
            }}
          />
        )}

        {/* Tab 3: Shared Documents */}
        {activeTab === 'documents' && (
          <SharedDocuments />
        )}

        {/* Tab 4: Activity Log */}
        {activeTab === 'activity' && (
          <ActivityFeed />
        )}
      </main>

      {/* Modals */}
      {showInviteModal && (
        <InviteMemberModal onClose={() => setShowInviteModal(false)} />
      )}

      {showColumnModal && currentBoard && (
        <CreateColumnModal
          boardId={currentBoard.id}
          column={editingColumn}
          onClose={() => {
            setShowColumnModal(false);
            setEditingColumn(null);
          }}
        />
      )}

      {showTaskModal && currentBoard && (
        <CreateTaskModal
          boardId={currentBoard.id}
          columnId={selectedColumnId || boardColumns[0]?.id || ''}
          workspaceId={workspaceId}
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
        />
      )}

      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};
