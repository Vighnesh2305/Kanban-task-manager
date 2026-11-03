import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MessageCircle,
  Bell,
  Paperclip,
  User,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Send,
  Trash2,
  Download,
  Eye,
  Plus
} from 'lucide-react';
import { Task, useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useBoardStore } from '../../stores/boardStore';
import { TaskAttachments } from './TaskAttachments';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
  const { user } = useAuthStore();
  const {
    comments,
    reminders,
    attachments,
    fetchComments,
    fetchReminders,
    fetchAttachments,
    addComment,
    addReminder,
    deleteReminder,
    updateTask,
    deleteTask
  } = useTaskStore();
  const { members, currentWorkspace, documents } = useWorkspaceStore();
  const { columns } = useBoardStore();

  const [newComment, setNewComment] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'reminders' | 'attachments'>('comments');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [currentColumnId, setCurrentColumnId] = useState(task.column_id || '');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const taskComments = comments[task.id] || [];
  const taskReminders = reminders[task.id] || [];
  const taskAttachments = attachments[task.id] || [];

  const isOverdue = Boolean(task.due_date && !task.is_completed && new Date(task.due_date).getTime() < Date.now());

  useEffect(() => {
    fetchComments(task.id);
    fetchReminders(task.id);
    fetchAttachments(task.id);
  }, [task.id, fetchComments, fetchReminders, fetchAttachments]);

  const handleAssigneeChange = async (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    const assignedMember = members.find(m => m.user_id === newAssigneeId);
    const assigneeName = assignedMember ? assignedMember.full_name : null;

    await updateTask(
      task.id,
      { assignee_id: newAssigneeId || null, assignee_name: assigneeName },
      user?.id,
      user?.full_name || user?.email
    );
  };

  const handleColumnChange = async (newColId: string) => {
    setCurrentColumnId(newColId);
    const col = columns.find(c => c.id === newColId);
    const isDone = col ? col.name.toLowerCase().includes('done') : false;

    await updateTask(
      task.id,
      {
        column_id: newColId,
        is_completed: isDone,
        completed_at: isDone ? new Date().toISOString() : null
      },
      user?.id,
      user?.full_name || user?.email
    );
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    await addComment(task.id, newComment.trim(), user.id, user.full_name || user.email.split('@')[0]);
    setNewComment('');
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTime || !user) return;

    await addReminder(task.id, user.id, reminderTime);
    setReminderTime('');
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (window.confirm('Delete this reminder?')) {
      await deleteReminder(reminderId);
    }
  };

  const handleDeleteTask = async () => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      await deleteTask(task.id, user?.id, user?.full_name || user?.email);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-100">

        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Overdue alert */}
              {isOverdue && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                  TASK OVERDUE — Deadline was {new Date(task.due_date!).toLocaleDateString()}
                </div>
              )}

              <h2 className="text-2xl font-bold text-neutral-900 leading-snug">
                {task.title}
              </h2>

              <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                {/* Priority */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityColors[task.priority] || priorityColors.medium}`}>
                  <Flag className="w-3.5 h-3.5 mr-1" />
                  {priorityLabels[task.priority] || 'Medium'} Priority
                </span>

                {/* Deadline */}
                {task.due_date && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${isOverdue
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}

                {/* Status */}
                {task.is_completed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteTask}
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Delete task"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Edit Bar: Assignee & Column Status */}
          <div className="mt-4 pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assigned User Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-200">
              <User className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-xs font-medium text-neutral-600 shrink-0">Assigned To:</span>
              <select
                value={assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full text-xs font-semibold text-neutral-900 bg-transparent outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
                {members.length === 0 && user && (
                  <option value={user.id}>{user.full_name || user.email} (You)</option>
                )}
              </select>
            </div>

            {/* Column / Status Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-medium text-neutral-600 shrink-0">Status:</span>
              <select
                value={currentColumnId}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="w-full text-xs font-semibold text-neutral-900 bg-transparent outline-none cursor-pointer"
              >
                {columns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {task.description ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Description</h3>
              <p className="text-sm text-neutral-800 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          ) : (
            <p className="text-xs italic text-neutral-400">No description provided.</p>
          )}

          {/* Tabs: Comments, Attachments, Reminders */}
          <div>
            <div className="flex border-b border-neutral-200 mb-4">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition -mb-px ${activeTab === 'comments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
              >
                <MessageCircle className="w-4 h-4" />
                Comments ({taskComments.length})
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition -mb-px ${activeTab === 'attachments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
              >
                <Paperclip className="w-4 h-4" />
                Attachments ({taskAttachments.length})
              </button>
              <button
                onClick={() => setActiveTab('reminders')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition -mb-px ${activeTab === 'reminders'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
              >
                <Bell className="w-4 h-4" />
                Reminders ({taskReminders.length})
              </button>
            </div>

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a message to your collaborator..."
                    className="flex-1 px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-soft"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>

                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {taskComments.map((comment) => (
                    <div key={comment.id} className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                        <span className="font-semibold text-neutral-800">
                          {comment.user_name || 'Member'}
                        </span>
                        <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-neutral-800">{comment.content}</p>
                    </div>
                  ))}
                  {taskComments.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-4">No comments yet. Start the conversation!</p>
                  )}
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <TaskAttachments taskId={task.id} />
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div className="space-y-4">
                <form onSubmit={handleAddReminder} className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-soft"
                  >
                    <Plus className="w-4 h-4" />
                    Set Reminder
                  </button>
                </form>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {taskReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                      <div className="flex items-center gap-2 text-sm text-neutral-800">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>{new Date(reminder.reminder_time).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {taskReminders.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-4">No reminders set for this task.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl font-semibold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
