import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTaskSchema, insertTaskShareSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoURL } = req.body;
      
      if (!firebaseUid || !email || !displayName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user exists
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          firebaseUid,
          email,
          displayName,
          photoURL: photoURL || null,
        });
      } else {
        // Update user info
        user = await storage.updateUser(user.id, {
          displayName,
          photoURL: photoURL || null,
        });
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        teamId: req.query.teamId ? parseInt(req.query.teamId as string) : undefined,
        search: req.query.search as string,
        dueDate: req.query.dueDate as string,
      };

      const tasks = await storage.getTasks(user.id, filters);
      res.json({ tasks });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdBy: user.id,
      });

      const { sharedEmails, ...taskInsert } = taskData;
      const task = await storage.createTask(taskInsert);

      // Handle sharing
      if (sharedEmails && sharedEmails.length > 0) {
        for (const email of sharedEmails) {
          const sharedUser = await storage.getUserByEmail(email);
          if (sharedUser && sharedUser.id !== user.id) {
            await storage.shareTask({
              taskId: task.id,
              sharedWithUserId: sharedUser.id,
              sharedByUserId: user.id,
              permission: "edit",
            });
          }
        }
      }

      const enrichedTask = await storage.getTask(task.id, user.id);
      res.json({ task: enrichedTask });
    } catch (error) {
      console.error("Create task error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const taskId = parseInt(req.params.id);
      const updates = req.body;

      const updatedTask = await storage.updateTask(taskId, user.id, updates);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found or no permission" });
      }

      const enrichedTask = await storage.getTask(taskId, user.id);
      res.json({ task: enrichedTask });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const taskId = parseInt(req.params.id);
      const deleted = await storage.deleteTask(taskId, user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found or no permission" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task sharing routes
  app.post("/api/tasks/:id/share", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const taskId = parseInt(req.params.id);
      const { email, permission = "edit" } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const sharedUser = await storage.getUserByEmail(email);
      if (!sharedUser) {
        return res.status(404).json({ message: "User not found with this email" });
      }

      if (sharedUser.id === user.id) {
        return res.status(400).json({ message: "Cannot share with yourself" });
      }

      // Check if task exists and user has permission
      const task = await storage.getTask(taskId, user.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found or no permission" });
      }

      await storage.shareTask({
        taskId,
        sharedWithUserId: sharedUser.id,
        sharedByUserId: user.id,
        permission,
      });

      res.json({ success: true, message: `Task shared with ${email}` });
    } catch (error) {
      console.error("Share task error:", error);
      res.status(500).json({ message: "Failed to share task" });
    }
  });

  // User stats
  app.get("/api/user/stats", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getUserStats(user.id);
      res.json({ stats });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    try {
      const firebaseUid = req.headers.authorization?.replace("Bearer ", "");
      
      if (!firebaseUid) {
        return res.status(401).json({ message: "No authentication token" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const teams = await storage.getTeams(user.id);
      res.json({ teams });
    } catch (error) {
      console.error("Get teams error:", error);
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
