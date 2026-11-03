import { useState, useEffect } from 'react';
import { Mail, Check, X, Key, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export const PendingInvitesBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    pendingInvitations, 
    checkPendingInvitations, 
    acceptInvitation, 
    declineInvitation 
  } = useWorkspaceStore();

  const [manualCode, setManualCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');

  useEffect(() => {
    if (user?.email) {
      checkPendingInvitations(user.email);
    }
  }, [user, checkPendingInvitations]);

  const handleAccept = async (inviteCodeOrId: string) => {
    if (!user) return;
    const result = await acceptInvitation(inviteCodeOrId, user);
    if (result.success && result.workspace) {
      navigate(`/workspace/${result.workspace.id}`);
    } else {
      setCodeError(result.error || 'Failed to accept invitation');
    }
  };

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setCodeSuccess('');

    if (!manualCode.trim() || !user) return;

    let token = manualCode.trim();
    if (token.includes('/join/')) {
      token = token.split('/join/').pop()?.split('?')[0] || token;
    }

    const result = await acceptInvitation(token, user);
    if (result.success && result.workspace) {
      setCodeSuccess('Joined successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/workspace/${result.workspace!.id}`);
      }, 800);
    } else {
      setCodeError(result.error || 'Invalid or expired invitation link');
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Pending Invitations list for this user */}
      {pendingInvitations.map((inv) => (
        <div
          key={inv.id}
          className="p-4 rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-600 text-white shadow-medium flex items-center justify-between gap-4 animate-fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Workspace Invitation
              </div>
              <h4 className="font-bold text-base truncate">
                {inv.inviter_name} invited you to join "{inv.workspace_name}"
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAccept(inv.invite_code)}
              className="px-4 py-2 bg-white text-primary-600 hover:bg-neutral-100 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-soft transition"
            >
              <Check className="w-4 h-4" />
              Accept & Join
            </button>
            <button
              onClick={() => declineInvitation(inv.id)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              title="Decline"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Quick Join With Code Link */}
      <div className="flex items-center justify-between text-xs px-1">
        <button
          onClick={() => setShowCodeInput(!showCodeInput)}
          className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 transition"
        >
          <Key className="w-3.5 h-3.5" />
          {showCodeInput ? 'Hide Link Entry' : 'Have an invitation link or code? Join a workspace here'}
        </button>
      </div>

      {showCodeInput && (
        <form onSubmit={handleManualJoin} className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-soft animate-fade-in space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste invite link or code (e.g. /join/...)"
              className="flex-1 px-3.5 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-mono text-neutral-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-soft"
            >
              Join Workspace
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {codeError && (
            <p className="text-xs text-rose-600 font-medium">{codeError}</p>
          )}
          {codeSuccess && (
            <p className="text-xs text-emerald-600 font-medium">{codeSuccess}</p>
          )}
        </form>
      )}
    </div>
  );
};

