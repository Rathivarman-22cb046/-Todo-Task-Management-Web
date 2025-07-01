import { useQuery } from "@tanstack/react-query";
import { UserStats, Team } from "@shared/schema";

interface SidebarProps {
  onFilterChange: (filter: string, value: string) => void;
}

export function Sidebar({ onFilterChange }: SidebarProps) {
  const { data: statsData } = useQuery<{ stats: UserStats }>({
    queryKey: ["/api/user/stats"],
  });

  const { data: teamsData } = useQuery<{ teams: Team[] }>({
    queryKey: ["/api/teams"],
  });

  const stats = statsData?.stats;
  const teams = teamsData?.teams || [];

  return (
    <aside className="lg:col-span-3">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Quick Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Active Tasks</span>
              </div>
              <span className="text-sm font-bold text-blue-600">{stats?.activeTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Completed</span>
              </div>
              <span className="text-sm font-bold text-green-600">{stats?.completedTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Due Today</span>
              </div>
              <span className="text-sm font-bold text-amber-600">{stats?.dueTodayTasks || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Filters</h3>
          <div className="space-y-2">
            <button 
              onClick={() => onFilterChange('reset', '')}
              className="w-full text-left px-3 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg font-medium"
            >
              All Tasks
            </button>
            <button 
              onClick={() => onFilterChange('dueDate', 'today')}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Due Today
            </button>
            <button 
              onClick={() => onFilterChange('dueDate', 'overdue')}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Overdue
            </button>
            <button 
              onClick={() => onFilterChange('priority', 'high')}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              High Priority
            </button>
            <button 
              onClick={() => onFilterChange('status', 'shared')}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Shared with Me
            </button>
          </div>
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Teams</h3>
            <div className="space-y-2">
              {teams.map((team) => (
                <div 
                  key={team.id}
                  className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                  onClick={() => onFilterChange('teamId', team.id.toString())}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <span className="text-sm text-slate-700">{team.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
