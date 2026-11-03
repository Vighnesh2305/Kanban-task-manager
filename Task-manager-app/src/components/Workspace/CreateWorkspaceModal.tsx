import { useState } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

export const CreateWorkspaceModal = ({ onClose }: CreateWorkspaceModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createWorkspace, loading } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a workspace name');
      return;
    }

    if (!user) {
      setError('You must be signed in to create a collaborative workspace');
      return;
    }

    const result = await createWorkspace(name.trim(), description.trim(), user);
    if (!result) {
      setError('Failed to create collaborative workspace');
      return;
    }

    onClose();
    navigate(`/workspace/${result.workspace.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-neutral-100">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">New Collaborative Workspace</h2>
              <p className="text-xs text-neutral-500">Shared To-Do & Document Space for 2 Users</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="mb-4 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Workspace Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Sprint Team"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of goals and shared deliverables..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 resize-none"
            />
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 space-y-1 border border-neutral-200">
            <p className="font-semibold text-neutral-800">What's included in this workspace:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-neutral-600">
              <li>Common real-time To-Do list & Kanban board</li>
              <li>Two-collaborator task assignment & deadline tracking</li>
              <li>Shared document & attachment repository</li>
              <li>Real-time updates across both members</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-xl transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition shadow-soft disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create & Open Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

