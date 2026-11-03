import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LogOut,
  LayoutGrid,
  BarChart3,
  Settings,
  User,
  Users,
  ArrowRight,
  ShieldCheck,
  FolderLock
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBoardStore } from '../../stores/boardStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { CreateBoardModal } from './CreateBoardModal';
import { StatsPanel } from './StatsPanel';
import { CreateWorkspaceModal } from '../Workspace/CreateWorkspaceModal';
import { PendingInvitesBanner } from '../Workspace/PendingInvitesBanner';
import { localDb } from '../../lib/storage';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { boards, fetchBoards, deleteBoard } = useBoardStore();
  const { workspaces, fetchWorkspaces } = useWorkspaceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'boards' | 'stats'>('boards');

  useEffect(() => {
    document.title = 'Dashboard - Task Manager';
  }, []);

  useEffect(() => {
    if (user) {
      fetchBoards(user.id);
      fetchWorkspaces(user.id);
    }
  }, [user, fetchBoards, fetchWorkspaces]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteBoard = async (boardId: string, boardName: string) => {
    if (window.confirm(`Are you sure you want to delete the board "${boardName}"? This action cannot be undone.`)) {
      await deleteBoard(boardId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/50 via-neutral-50 to-indigo-50/40">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-soft text-white">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Task Manager</h1>
                <p className="text-xs font-medium text-neutral-500">Collaborative Workspace & Kanban Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-neutral-700">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Pending Workspace Invitations Banner */}
        <PendingInvitesBanner />

        {/* Collaborative Workspaces Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Two-User Collaborative Workspaces ({workspaces.length})
                </h2>
                <p className="text-xs text-neutral-500">
                  Real-time shared To-Do list, task assignments, and document library
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateWsModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft hover:shadow-medium transition"
            >
              <Plus className="w-4 h-4" />
              New Collaborative Workspace
            </button>
          </div>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws) => {
              const members = localDb.getWorkspaceMembers(ws.id);
              const isFull = members.length >= 2;

              return (
                <div
                  key={ws.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/workspace/${ws.id}`)}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-medium transition-all cursor-pointer border border-neutral-200 hover:border-indigo-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-neutral-900 group-hover:text-indigo-600 transition truncate">
                        {ws.name}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isFull
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-primary-50 text-primary-700 border border-primary-200'
                        }`}>
                        {members.length}/2 Members
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 line-clamp-2 mb-4">
                      {ws.description || 'Collaborative workspace for task tracking and file sharing.'}
                    </p>

                    {/* Member Avatars */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-semibold text-neutral-500">Collaborators:</span>
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {members.map((m, idx) => (
                          <div
                            key={m.id}
                            className={`inline-block h-6 w-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white flex items-center justify-center ${idx === 0 ? 'bg-primary-500' : 'bg-indigo-500'
                              }`}
                            title={`${m.full_name} (${m.role})`}
                          >
                            {m.full_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {members.length < 2 && (
                          <div className="inline-block h-6 w-6 rounded-full border-2 border-dashed border-neutral-300 text-neutral-400 text-[10px] flex items-center justify-center bg-neutral-50" title="Seat available">
                            +
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-neutral-700 font-medium">
                        {members.map(m => m.full_name.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span>Active Workspace</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-bold group-hover:translate-x-1 transition">
                      Open Space <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}

            {workspaces.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl p-6 border border-dashed border-indigo-200 text-center">
                <Users className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <h4 className="font-bold text-neutral-800 text-sm">No collaborative workspaces yet</h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-3">
                  Create a Two-User Workspace to collaborate in real-time, share To-Do lists, assign tasks, and access joint documents.
                </p>
                <button
                  onClick={() => setShowCreateWsModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-soft"
                >
                  + Create First Workspace
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Personal Boards & Statistics Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab('boards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === 'boards'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Personal Boards ({boards.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === 'stats'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistics
          </button>
        </div>

        {/* Boards Tab */}
        {activeTab === 'boards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-neutral-900">
                My Personal Boards
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-soft"
              >
                <Plus className="w-4 h-4" />
                Create Board
              </button>
            </div>

            {/* Boards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {boards.map((board) => (
                <div
                  key={board.id}
                  role="button"
                  tabIndex={0}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-medium transition-all cursor-pointer border border-neutral-200 hover:border-primary-300 group flex flex-col justify-between"
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary-600 transition truncate">
                        {board.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBoard(board.id, board.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-lg text-neutral-400 hover:text-rose-600 transition"
                        aria-label="Delete"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {board.description && (
                      <p className="text-xs text-neutral-600 mb-4 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-100">
                    <span>
                      Created {new Date(board.created_at).toLocaleDateString('en-US')}
                    </span>
                    <span className="text-primary-600 font-semibold group-hover:translate-x-1 transition">
                      Open Board →
                    </span>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {boards.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-neutral-200">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                    <LayoutGrid className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mb-1">
                    No Boards Yet
                  </h3>
                  <p className="text-xs text-neutral-500 mb-4 text-center max-w-sm">
                    Create a personal board to organize individual tasks.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-soft"
                  >
                    Create Board
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <StatsPanel />
        )}
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Create Collaborative Workspace Modal */}
      {showCreateWsModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateWsModal(false)} />
      )}
    </div>
  );
};
