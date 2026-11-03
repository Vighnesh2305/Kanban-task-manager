import { 
  Activity, 
  CheckCircle2, 
  FileText, 
  UserPlus, 
  Clock, 
  Move, 
  Trash2, 
  UserCheck,
  Edit3
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { WorkspaceActivity } from '../../lib/types';

function getActivityIcon(action: WorkspaceActivity['action']) {
  switch (action) {
    case 'create_task':
      return { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' };
    case 'assign_task':
      return { icon: UserCheck, color: 'text-blue-500 bg-blue-50 border-blue-200' };
    case 'move_task':
      return { icon: Move, color: 'text-purple-500 bg-purple-50 border-purple-200' };
    case 'update_task':
      return { icon: Edit3, color: 'text-amber-500 bg-amber-50 border-amber-200' };
    case 'delete_task':
      return { icon: Trash2, color: 'text-rose-500 bg-rose-50 border-rose-200' };
    case 'upload_doc':
      return { icon: FileText, color: 'text-sky-500 bg-sky-50 border-sky-200' };
    case 'delete_doc':
      return { icon: Trash2, color: 'text-rose-500 bg-rose-50 border-rose-200' };
    case 'join_workspace':
    case 'invite_user':
      return { icon: UserPlus, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' };
    default:
      return { icon: Activity, color: 'text-neutral-500 bg-neutral-50 border-neutral-200' };
  }
}

export const ActivityFeed = () => {
  const { activities } = useWorkspaceStore();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-primary-500" />
        <h3 className="font-bold text-neutral-900 text-lg">
          Recent Workspace Activity ({activities.length})
        </h3>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-soft">
          <Clock className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700">No recent activity yet</p>
          <p className="text-xs text-neutral-500 mt-1">Actions performed by either collaborator will appear here live.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 shadow-soft overflow-hidden">
          {activities.map((act) => {
            const { icon: Icon, color } = getActivityIcon(act.action);
            return (
              <div key={act.id} className="p-4 flex items-start gap-3 hover:bg-neutral-50/50 transition">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {act.user_name}
                    </span>
                    <span className="text-xs text-neutral-400 whitespace-nowrap">
                      {new Date(act.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 mt-0.5 leading-relaxed">
                    {act.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

