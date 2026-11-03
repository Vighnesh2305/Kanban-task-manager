import { useState, useEffect } from 'react';
import { 
  X, 
  Link2, 
  Copy, 
  Check, 
  Users, 
  AlertCircle,
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles,
  UserMinus,
  Plus,
  Minus,
  Shield,
  Trash2,
  Globe
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

interface InviteMemberModalProps {
  onClose: () => void;
}

export const InviteMemberModal = ({ onClose }: InviteMemberModalProps) => {
  const { 
    currentWorkspace, 
    members, 
    invitations, 
    generateInviteLink, 
    getActiveInviteLink,
    removeMember,
    updateCapacity
  } = useWorkspaceStore();
  const { user } = useAuthStore();

  const [activeLink, setActiveLink] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [useLanUrl, setUseLanUrl] = useState<boolean>(false);

  const maxMembers = currentWorkspace?.max_members || 2;
  const isOwner = Boolean(user && currentWorkspace && user.id === currentWorkspace.owner_id);
  const isFull = members.length >= maxMembers;
  const seatsAvailable = Math.max(0, maxMembers - members.length);

  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const defaultOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173';
  const effectiveOrigin = (isLocalhost && useLanUrl && lanIp)
    ? `http://${lanIp}:${typeof window !== 'undefined' && window.location ? window.location.port || '5173' : '5173'}`
    : defaultOrigin;

  const rawToken = activeLink?.invite_token || activeLink?.invite_code || activeLink?.id;
  const inviteUrl = rawToken ? `${effectiveOrigin}/join/${rawToken}` : '';

  useEffect(() => {
    fetch('/api/network-ip')
      .then(res => res.json())
      .then(data => {
        if (data?.ip && data.ip !== 'localhost' && data.ip !== '127.0.0.1') {
          setLanIp(data.ip);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerateLink = async (forceNew = false) => {
    if (!currentWorkspace || !user) return;
    setError('');
    setLoading(true);

    try {
      const result = await generateInviteLink(currentWorkspace.id, user, forceNew);
      if (result.success && result.invitation) {
        setActiveLink(result.invitation);
      } else {
        setError(result.error || 'Failed to generate invite link');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating invite link');
    } finally {
      setLoading(false);
    }
  };

  // Find existing active invite link on mount or auto-generate
  useEffect(() => {
    if (currentWorkspace && !isFull) {
      const existing = getActiveInviteLink(currentWorkspace.id);
      if (existing) {
        setActiveLink(existing);
      } else if (user) {
        handleGenerateLink(false);
      }
    }
  }, [currentWorkspace?.id, isFull, user?.id, maxMembers]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace || !user) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await removeMember(currentWorkspace.id, memberId, user);
      if (res.success) {
        setSuccessMsg(`Collaborator removed from workspace.`);
        setConfirmRemoveId(null);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res.error || 'Failed to remove collaborator.');
      }
    } catch (err: any) {
      setError(err.message || 'Error removing collaborator.');
    }
  };

  const handleCapacityChange = async (newCapacity: number) => {
    if (!currentWorkspace || !user || updatingCapacity) return;
    if (newCapacity < members.length) {
      setError(`Cannot reduce capacity below current member count (${members.length}). Remove a collaborator first.`);
      return;
    }
    if (newCapacity < 2) return;
    if (newCapacity > 50) return;

    setError('');
    setSuccessMsg('');
    setUpdatingCapacity(true);

    try {
      const res = await updateCapacity(currentWorkspace.id, newCapacity, user);
      if (res.success) {
        setSuccessMsg(`Workspace capacity increased to ${newCapacity} members.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(res.error || 'Failed to update capacity.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating capacity.');
    } finally {
      setUpdatingCapacity(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-neutral-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-soft">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900">Share Collaboration Link</h2>
              <p className="text-xs text-neutral-500">Manage workspace members and invitation link</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-400 hover:text-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Capacity Status Indicator */}
        <div className={`p-4 rounded-2xl border mb-5 flex items-center justify-between ${
          isFull 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-primary-50/70 border-primary-200 text-primary-900'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Users className="w-4 h-4 text-primary-600" />
            <span>Workspace Capacity: <strong>{members.length} / {maxMembers} Members</strong></span>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider ${
            isFull ? 'bg-amber-200 text-amber-900' : 'bg-primary-200 text-primary-900'
          }`}>
            {isFull ? 'Workspace Full' : `${seatsAvailable} ${seatsAvailable === 1 ? 'Seat' : 'Seats'} Available`}
          </span>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-800 ml-2 font-bold">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800 ml-2 font-bold">&times;</button>
          </div>
        )}

        {/* Owner Capacity Controls */}
        {isOwner && (
          <div className="p-3.5 mb-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-neutral-800 block">Workspace Member Limit</span>
              <span className="text-[11px] text-neutral-500">Allow more users to collaborate in this workspace</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCapacityChange(maxMembers - 1)}
                disabled={updatingCapacity || maxMembers <= members.length || maxMembers <= 2}
                className="w-7 h-7 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-neutral-700 transition shadow-soft"
                title={maxMembers <= members.length ? 'Cannot reduce below current member count' : 'Decrease capacity'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono font-bold text-xs px-2 text-neutral-900">
                {maxMembers}
              </span>

              <button
                onClick={() => handleCapacityChange(maxMembers + 1)}
                disabled={updatingCapacity || maxMembers >= 50}
                className="w-7 h-7 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-30 text-white flex items-center justify-center font-bold transition shadow-soft"
                title="Increase capacity by 1 seat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Content based on Workspace Full or Space Available */}
        {isFull ? (
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-3 mb-5">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <div>
              <h4 className="font-bold text-neutral-900 text-sm">
                Maximum Collaborators Reached ({members.length}/{maxMembers})
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                All seats in this workspace are currently occupied. To invite new collaborators, you can remove an existing member below or increase the member limit.
              </p>
            </div>

            {isOwner && (
              <div className="pt-2">
                <button
                  onClick={() => handleCapacityChange(maxMembers + 1)}
                  disabled={updatingCapacity}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition shadow-soft inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Increase Limit to {maxMembers + 1} Members</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 mb-5">
            {!activeLink ? (
              /* State 1: No link generated yet -> "Generate Invite Link" button */
              <div className="p-6 bg-gradient-to-br from-neutral-50 to-primary-50/30 rounded-2xl border border-neutral-200 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-primary-500 mx-auto" />
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm">
                    Generate Invitation Link
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                    Generate a secure collaboration link. Anyone with this link can join until the {maxMembers}-member limit is reached.
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateLink(false)}
                  disabled={loading}
                  className="px-5 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition shadow-soft hover:shadow-medium inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  {loading ? 'Generating Link...' : 'Generate Invite Link'}
                </button>
              </div>
            ) : (
              /* State 2: Active link generated -> "Copy Link" button & URL box */
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Shareable Collaboration Link
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Active & Secure
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 font-mono truncate select-all">
                      {loading ? 'Generating collaboration link...' : (inviteUrl || 'No active link')}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      disabled={!inviteUrl || loading}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-soft shrink-0 disabled:opacity-50 ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary-500 hover:bg-primary-600 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>

                  {isLocalhost && lanIp && (
                    <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                        <span className="text-[11px]">
                          Sharing to another phone/laptop on Wi-Fi?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseLanUrl(!useLanUrl)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                          useLanUrl 
                            ? 'bg-primary-600 text-white shadow-soft' 
                            : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100/50'
                        }`}
                      >
                        {useLanUrl ? `Wi-Fi URL Active` : `Format for Wi-Fi`}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    <span>How it works:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-neutral-500">
                    <li>Share this link with a teammate (via chat, message, etc.)</li>
                    <li>They will open the link, log in or register, and join this workspace</li>
                    <li>The link remains valid until {maxMembers} total members join</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleGenerateLink(true)}
                    disabled={loading}
                    className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 font-semibold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Regenerate Link
                  </button>
                  
                  <span className="text-[11px] text-neutral-400">
                    Expires in 7 days
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Collaborators in this workspace */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Current Members ({members.length} / {maxMembers})
            </h4>
            {isOwner && (
              <span className="text-[10px] text-primary-600 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                You are Workspace Owner
              </span>
            )}
          </div>

          <div className="space-y-2">
            {members.map(m => {
              const isMemberOwner = m.role === 'owner' || m.user_id === currentWorkspace?.owner_id;
              const isConfirming = confirmRemoveId === m.id;

              return (
                <div key={m.id || m.user_id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs text-white shrink-0 ${
                      isMemberOwner ? 'bg-primary-600' : 'bg-indigo-600'
                    }`}>
                      {m.full_name ? m.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 truncate">{m.full_name}</span>
                        {m.user_id === user?.id && (
                          <span className="text-[10px] text-neutral-400">(You)</span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 block truncate">{m.user_email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      isMemberOwner 
                        ? 'bg-primary-50 border-primary-200 text-primary-700' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}>
                      {m.role}
                    </span>

                    {/* Owner can remove non-owner collaborator */}
                    {isOwner && !isMemberOwner && (
                      isConfirming ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-soft"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-medium transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(m.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove collaborator from workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
