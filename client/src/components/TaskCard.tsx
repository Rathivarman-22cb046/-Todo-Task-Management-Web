import { TaskWithDetails } from "@shared/schema";
import { Calendar, User, Share2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface TaskCardProps {
  task: TaskWithDetails;
  onToggleComplete: (taskId: number, completed: boolean) => void;
  onEdit: (task: TaskWithDetails) => void;
  onShare: (task: TaskWithDetails) => void;
  onDelete: (taskId: number) => void;
}

export function TaskCard({ task, onToggleComplete, onEdit, onShare, onDelete }: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 ${isCompleted ? 'opacity-75' : ''}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <h3 className={`text-lg font-semibold text-slate-900 mb-2 ${isCompleted ? 'line-through' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-slate-600 text-sm mb-3 ${isCompleted ? 'line-through' : ''}`}>
                  {task.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </Badge>
                <Badge className={getStatusColor(task.status)}>
                  {isCompleted ? '✓ Completed' : task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                </Badge>
                {task.team && (
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: task.team.color }}
                  >
                    {task.team.name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-slate-500">
                {task.dueDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {isCompleted && task.completedAt 
                        ? `Completed ${format(new Date(task.completedAt), 'MMM d, yyyy')}`
                        : `Due ${format(new Date(task.dueDate), 'MMM d, yyyy')}`
                      }
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>Assigned to you</span>
                </div>
                {task.sharedWith && task.sharedWith.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Share2 className="w-4 h-4" />
                    <span>Shared with {task.sharedWith.length} {task.sharedWith.length === 1 ? 'person' : 'people'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShare(task)}
              disabled={isCompleted}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(task)}
              disabled={isCompleted}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
