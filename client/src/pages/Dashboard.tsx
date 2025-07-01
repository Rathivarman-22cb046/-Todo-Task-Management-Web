import { useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { TaskList } from "@/components/TaskList";
import { TaskModal } from "@/components/TaskModal";
import { ShareModal } from "@/components/ShareModal";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { TaskWithDetails } from "@shared/schema";

export default function Dashboard() {
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    teamId?: string;
    search?: string;
    dueDate?: string;
  }>({});
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [sharingTask, setSharingTask] = useState<TaskWithDetails | null>(null);

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'reset') {
      setFilters({});
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value === 'all' ? undefined : value,
      }));
    }
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search: search || undefined,
    }));
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task: TaskWithDetails) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleShareTask = (task: TaskWithDetails) => {
    setSharingTask(task);
    setShareModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSharingTask(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        onSearchChange={handleSearchChange}
        searchValue={filters.search || ""}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Sidebar onFilterChange={handleFilterChange} />
          <TaskList
            filters={filters}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onShareTask={handleShareTask}
          />
        </div>
      </main>

      <MobileNav />

      {/* Floating Action Button (Mobile) */}
      <Button
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-30"
        onClick={handleCreateTask}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <TaskModal
        open={taskModalOpen}
        onClose={handleCloseTaskModal}
        task={editingTask}
      />

      <ShareModal
        open={shareModalOpen}
        onClose={handleCloseShareModal}
        task={sharingTask}
      />
    </div>
  );
}
