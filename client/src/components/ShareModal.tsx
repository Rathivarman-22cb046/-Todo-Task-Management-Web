import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TaskWithDetails } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskWithDetails | null;
}

export function ShareModal({ open, onClose, task }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("edit");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();

  const shareTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const token = await firebaseUser?.getIdToken();
      return apiRequest("POST", `/api/tasks/${task.id}/share`, {
        email,
        permission,
        message,
      }, {
        'Authorization': `Bearer ${token}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task shared",
        description: `Task has been shared with ${email} successfully.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share task.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    shareTaskMutation.mutate();
  };

  const handleClose = () => {
    setEmail("");
    setPermission("edit");
    setMessage("");
    onClose();
  };

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Share Task</h3>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-slate-900 mb-2">Task: {task.title}</h4>
            <p className="text-sm text-slate-600">
              Share this task with team members to collaborate effectively.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Share with</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="permission">Permission Level</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                  <SelectItem value="admin">Admin Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 resize-none"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={shareTaskMutation.isPending}
              >
                {shareTaskMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
