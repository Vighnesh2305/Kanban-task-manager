import { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  User, 
  Flag,
  ArrowRight
} from 'lucide-react';
import { Task, useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';

interface DeadlinesPanelProps {
  onOpenTaskDetails: (task: Task) => void;
}

export const DeadlinesPanel = ({ onOpenTaskDetails }: DeadlinesPanelProps) => {
  const { tasks, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  const now = new Date();

  // Categorize tasks with deadlines
  const tasksWithDeadlines = tasks.filter(t => Boolean(t.due_date));

  const overdueTasks = tasksWithDeadlines.filter(t => 
    !t.is_completed && new Date(t.due_date!).getTime() < now.getTime()
  );

  const upcomingTasks = tasksWithDeadlines.filter(t => 
    !t.is_completed && new Date(t.due_date!).getTime() >= now.getTime()
  ).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const completedTasks = tasksWithDeadlines.filter(t => t.is_completed);

  const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    await updateTask(
      task.id, 
      { 
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null
      },
      user?.id,
      user?.full_name || user?.email
    );
  };

  const getDaysDiffText = (dueDateStr: string, isOverdue: boolean) => {
    const target = new Date(dueDateStr).getTime();
    const current = now.getTime();
    const diffDays = Math.ceil(Math.abs(target - current) / (1000 * 60 * 60 * 24));

    if (isOverdue) {
      return diffDays === 1 ? 'Overdue by 1 day' : `Overdue by ${diffDays} days`;
    } else {
      if (diffDays === 0) return 'Due today!';
      if (diffDays === 1) return 'Due tomorrow';
      return `Due in ${diffDays} days`;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overdue Card */}
        <div 
          onClick={() => setFilter('overdue')}
          className={`p-5 rounded-2xl border transition cursor-pointer shadow-soft ${
            filter === 'overdue' 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
              : 'bg-white border-neutral-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-700">{overdueTasks.length}</div>
          <p className="text-xs text-rose-600/80 mt-1 font-medium">Requires immediate action</p>
        </div>

        {/* Upcoming Deadlines */}
        <div 
          onClick={() => setFilter('upcoming')}
          className={`p-5 rounded-2xl border transition cursor-pointer shadow-soft ${
            filter === 'upcoming' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
              : 'bg-white border-neutral-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Upcoming Deadlines</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-700">{upcomingTasks.length}</div>
          <p className="text-xs text-blue-600/80 mt-1 font-medium">On track & in progress</p>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setFilter('all')}
          className={`p-5 rounded-2xl border transition cursor-pointer shadow-soft ${
            filter === 'all' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
              : 'bg-white border-neutral-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed Tasks</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">{completedTasks.length}</div>
          <p className="text-xs text-emerald-600/80 mt-1 font-medium">Successfully completed</p>
        </div>

        {/* Total Tasks with Deadlines */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Tracked Deadlines</span>
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-neutral-800">{tasksWithDeadlines.length}</div>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Across both collaborators</p>
        </div>
      </div>

      {/* Overdue Tasks Section (Highlighted in bold alert styling) */}
      {(filter === 'all' || filter === 'overdue') && overdueTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-lg">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            <span>Overdue Tasks ({overdueTasks.length})</span>
          </div>

          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTaskDetails(task)}
                className="p-4 rounded-2xl bg-rose-50/60 border-2 border-rose-300 hover:border-rose-400 hover:bg-rose-50 transition cursor-pointer flex items-center justify-between gap-4 group shadow-soft"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={(e) => handleToggleComplete(e, task)}
                    className="w-6 h-6 rounded-lg border-2 border-rose-400 hover:border-emerald-500 flex items-center justify-center transition shrink-0 group-hover:scale-105"
                    title="Mark task as complete"
                  >
                    <CheckCircle2 className="w-4 h-4 text-transparent hover:text-emerald-500" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-neutral-900 text-sm truncate group-hover:text-rose-700 transition">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-neutral-600 truncate mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                        {getDaysDiffText(task.due_date!, true)}
                      </span>
                      <span className="text-neutral-500">
                        Due: {new Date(task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {task.assignee_name && (
                        <span className="flex items-center gap-1 text-neutral-700 font-medium">
                          <User className="w-3.5 h-3.5 text-primary-500" />
                          {task.assignee_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase bg-rose-200 text-rose-800">
                    {task.priority}
                  </span>
                  <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines Schedule */}
      {(filter === 'all' || filter === 'upcoming') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 font-bold text-lg">
            <Clock className="w-5 h-5 text-primary-500" />
            <span>Upcoming Deadlines Schedule ({upcomingTasks.length})</span>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200">
              <Calendar className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No upcoming pending tasks</p>
              <p className="text-xs text-neutral-500 mt-1">All scheduled tasks have either been completed or are not due yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onOpenTaskDetails(task)}
                  className="p-4 rounded-2xl bg-white border border-neutral-200 hover:border-primary-300 shadow-soft hover:shadow-medium transition cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={(e) => handleToggleComplete(e, task)}
                      className="w-6 h-6 rounded-lg border-2 border-neutral-300 hover:border-emerald-500 flex items-center justify-center transition shrink-0"
                      title="Mark task as complete"
                    >
                      <CheckCircle2 className="w-4 h-4 text-transparent hover:text-emerald-500" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-neutral-900 text-sm truncate group-hover:text-primary-600 transition">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-neutral-600 truncate mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {getDaysDiffText(task.due_date!, false)}
                        </span>
                        <span className="text-neutral-500">
                          Deadline: {new Date(task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {task.assignee_name && (
                          <span className="flex items-center gap-1 text-neutral-700 font-medium">
                            <User className="w-3.5 h-3.5 text-primary-500" />
                            Assigned to: <strong className="text-neutral-800">{task.assignee_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-md font-medium capitalize bg-neutral-100 text-neutral-700">
                      {task.priority}
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

