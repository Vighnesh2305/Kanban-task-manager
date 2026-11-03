import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  MessageCircle, 
  Bell, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Clock, 
  Paperclip,
  User,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Task } from '../../stores/taskStore';
import { useTaskStore } from '../../stores/taskStore';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TaskCard = ({ task, onEdit, onDelete, onOpenDetails }: TaskCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const attachmentCount = useTaskStore(state => state.getAttachmentCount(task.id));
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = Boolean(task.due_date && !task.is_completed && new Date(task.due_date).getTime() < Date.now());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      className={`bg-white rounded-xl p-4 shadow-soft hover:shadow-medium transition-all cursor-move border group relative ${
        isOverdue 
          ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20' 
          : 'border-neutral-200 hover:border-primary-300'
      } ${task.is_completed ? 'opacity-80 bg-neutral-50/60' : ''}`}
      onClick={() => onOpenDetails(task)}
    >
      {/* Overdue Alert Banner if task is overdue */}
      {isOverdue && (
        <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-100 text-rose-800 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span>OVERDUE</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-semibold flex-1 pr-2 text-sm line-clamp-2 ${
          task.is_completed
            ? 'text-neutral-500 line-through'
            : isOverdue ? 'text-rose-950' : 'text-neutral-900'
        }`}>
          {task.title}
        </h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-100 rounded text-neutral-500"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-large border border-neutral-200 py-1 z-20 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4 text-neutral-500" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Badges: Priority + Assignee */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityColors[task.priority] || priorityColors.medium}`}>
          {priorityLabels[task.priority] || 'Medium'}
        </span>

        {task.assignee_name && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <User className="w-3 h-3 text-blue-500" />
            <span className="truncate max-w-[120px]">{task.assignee_name}</span>
          </span>
        )}

        {task.is_completed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-neutral-600'}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-neutral-400">
          {attachmentCount > 0 && (
            <div className="flex items-center gap-1 text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="font-medium">{attachmentCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
