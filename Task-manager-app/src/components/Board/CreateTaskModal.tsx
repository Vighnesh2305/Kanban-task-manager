import { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, Flag, CheckSquare } from 'lucide-react';
import { useTaskStore, Task } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { PriorityLevel } from '../../lib/types';

interface CreateTaskModalProps {
  boardId: string;
  columnId: string;
  workspaceId?: string | null;
  task?: Task | null;
  onClose: () => void;
}

export const CreateTaskModal = ({
  boardId,
  columnId,
  workspaceId,
  task,
  onClose
}: CreateTaskModalProps) => {
  const { user } = useAuthStore();
  const { createTask, updateTask, loading } = useTaskStore();
  const { members, currentWorkspace } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [error, setError] = useState('');

  // Determine effective workspaceId
  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id || task?.workspace_id || null;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setAssigneeId(task.assignee_id || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter task title');
      return;
    }

    if (!user) {
      setError('User not logged in');
      return;
    }

    // Find assigned member name
    const assignedMember = members.find(m => m.user_id === assigneeId);
    const assigneeName = assignedMember ? assignedMember.full_name : null;

    if (task) {
      // Update existing task
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
        assignee_name: assigneeName,
      }, user.id, user.full_name || user.email);
    } else {
      // Create new task
      const result = await createTask({
        board_id: boardId,
        column_id: columnId,
        workspace_id: effectiveWorkspaceId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        start_date: new Date().toISOString(),
        assignee_id: assigneeId || null,
        assignee_name: assigneeName,
        creator_id: user.id,
        creator_name: user.full_name || user.email.split('@')[0],
        position: 0,
      });

      if (!result) {
        setError('Failed to create task');
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-neutral-100">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-neutral-900">
              {task ? 'Edit Collaborative Task' : 'Create New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement real-time document viewer"
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm text-neutral-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or links..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm text-neutral-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assignee Selection (User 1 or User 2) */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-neutral-500" />
                  Assignee
                </span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm text-neutral-900 bg-white"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
                {/* Fallback if user is creating on personal board without members */}
                {members.length === 0 && user && (
                  <option value={user.id}>
                    {user.full_name || user.email} (You)
                  </option>
                )}
              </select>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-neutral-500" />
                  Priority
                </span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm text-neutral-900 bg-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
          </div>

          {/* Deadline / Due Date */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-500" />
                Deadline
              </span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm text-neutral-900 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 rounded-xl transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition text-sm font-semibold shadow-soft hover:shadow-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
