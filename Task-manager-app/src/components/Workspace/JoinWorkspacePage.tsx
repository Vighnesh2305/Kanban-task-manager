import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  Kanban,
  LogIn,
  UserPlus,
  Loader2
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { serverSync } from '../../lib/serverSync';

export const JoinWorkspacePage = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { getInvitationByToken, joinWorkspaceByToken } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    invitation?: any;
    workspace?: any;
    members?: any[];
    error?: string;
  }>({ valid: false });
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    document.title = 'Join Collaborative Workspace - Task Manager';
  }, []);

  useEffect(() => {
    let isMounted = true;
    const validateToken = async () => {
      if (!inviteToken) return;
      setLoading(true);

      // Pull latest server sync state first for cross-device support
      try {
        await serverSync.pullAll();
      } catch {
        // ignore offline / fallback to local
      }

      if (isMounted) {
        const res = getInvitationByToken(inviteToken);
        setValidation(res);
        setLoading(false);
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [inviteToken, getInvitationByToken]);

  const handleJoin = async () => {
    if (!user || !inviteToken) return;
    setJoinError('');
    setJoining(true);

    try {
      const result = await joinWorkspaceByToken(inviteToken, user);
      if (result.success && result.workspace) {
        navigate(`/workspace/${result.workspace.id}`);
      } else {
        setJoinError(result.error || 'Failed to join workspace');
      }
    } catch (err: any) {
      setJoinError(err.message || 'An unexpected error occurred while joining');
    } finally {
      setJoining(false);
    }
  };

  const handleAuthRedirect = (path: '/login' | '/register') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect', window.location.pathname);
    }
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-600">Validating collaboration link...</p>
        </div>
      </div>
    );
  }

  // Case 1: Invalid, expired, or full link
  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-neutral-200 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Unable to Join Workspace</h2>
          <p className="text-sm text-neutral-600 mb-6">
            {validation.error || 'This collaboration link is either invalid, expired, or has reached its 2-user limit.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { invitation, workspace, members = [] } = validation;
  const isAlreadyMember = user && members.some((m: any) => m.user_id === user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/60 via-neutral-50 to-indigo-50/50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden animate-fade-in">

        {/* Banner Header */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-soft">
            <Users className="w-7 h-7 text-white" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white mb-2">
            Collaborative Workspace
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            You're Invited to Collaborate!
          </h1>
          <p className="text-xs text-white/80 mt-1">
            Invited by <strong className="text-white">{invitation.inviter_name}</strong>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Workspace Info Card */}
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-lg font-bold text-neutral-900">{workspace.name}</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
                {Math.max(0, (workspace.max_members || 2) - members.length)} Seat{((workspace.max_members || 2) - members.length) === 1 ? '' : 's'} Available
              </span>
            </div>
            {workspace.description && (
              <p className="text-xs text-neutral-600 mb-3">{workspace.description}</p>
            )}

            <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Link valid for 7 days
              </span>
              <span>Capacity: {workspace.max_members || 2} Users Max</span>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              What you will share together:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 font-medium">
                <Kanban className="w-4 h-4 text-primary-500 shrink-0" />
                <span>Common To-Do List</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Assign tasks to each other</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 font-medium">
                <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Shared Document Vault</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Instant Real-time Sync</span>
              </div>
            </div>
          </div>

          {/* Error Message if any */}
          {joinError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {joinError}
            </div>
          )}

          {/* Action Area based on Authentication State */}
          {!user ? (
            /* Unauthenticated user flow */
            <div className="space-y-3 pt-2">
              <p className="text-xs text-neutral-500 text-center">
                Please sign in or create an account to accept this invitation and join.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAuthRedirect('/login')}
                  className="py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-soft transition"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Join
                </button>
                <button
                  onClick={() => handleAuthRedirect('/register')}
                  className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </button>
              </div>
            </div>
          ) : isAlreadyMember ? (
            /* User already in workspace */
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center font-medium">
                You are already a member of this collaborative workspace.
              </div>
              <button
                onClick={() => navigate(`/workspace/${workspace.id}`)}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-soft transition"
              >
                Open Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Authenticated second user ready to join */
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                <span className="font-semibold">Joining as:</span>
                <span className="font-bold text-neutral-900">{user.full_name || user.email}</span>
                <span className="text-neutral-400">({user.email})</span>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-soft hover:shadow-medium transition disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining Workspace...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Accept & Join Collaborative Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

