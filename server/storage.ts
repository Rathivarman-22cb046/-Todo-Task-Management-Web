import { 
  users, tasks, taskShares, teams, teamMembers,
  type User, type InsertUser, type Task, type InsertTask, 
  type TaskShare, type InsertTaskShare, type Team, type InsertTeam,
  type TaskWithDetails, type UserStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, gte, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Task operations
  getTasks(userId: number, filters?: {
    status?: string;
    priority?: string;
    teamId?: number;
    search?: string;
    dueDate?: string;
  }): Promise<TaskWithDetails[]>;
  getTask(id: number, userId: number): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number, userId: number): Promise<boolean>;
  
  // Task sharing operations
  shareTask(taskShare: InsertTaskShare): Promise<TaskShare>;
  getTaskShares(taskId: number): Promise<TaskShare[]>;
  removeTaskShare(taskId: number, userId: number): Promise<boolean>;
  
  // Team operations
  getTeams(userId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  
  // Stats
  getUserStats(userId: number): Promise<UserStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private taskShares: Map<number, TaskShare>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, any>;
  private currentUserId: number;
  private currentTaskId: number;
  private currentTaskShareId: number;
  private currentTeamId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.taskShares = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.currentTaskShareId = 1;
    this.currentTeamId = 1;

    // Create default teams
    this.createDefaultTeams();
  }

  private createDefaultTeams() {
    const designTeam: Team = {
      id: this.currentTeamId++,
      name: "Design Team",
      color: "#8b5cf6",
      createdBy: 1,
      createdAt: new Date(),
    };
    
    const devTeam: Team = {
      id: this.currentTeamId++,
      name: "Development",
      color: "#6366f1",
      createdBy: 1,
      createdAt: new Date(),
    };

    this.teams.set(designTeam.id, designTeam);
    this.teams.set(devTeam.id, devTeam);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      photoURL: insertUser.photoURL || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTasks(userId: number, filters?: {
    status?: string;
    priority?: string;
    teamId?: number;
    search?: string;
    dueDate?: string;
  }): Promise<TaskWithDetails[]> {
    let userTasks = Array.from(this.tasks.values()).filter(task => {
      // Tasks created by user or shared with user
      const isOwner = task.createdBy === userId;
      const isShared = Array.from(this.taskShares.values()).some(
        share => share.taskId === task.id && share.sharedWithUserId === userId
      );
      return isOwner || isShared;
    });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        userTasks = userTasks.filter(task => task.status === filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        userTasks = userTasks.filter(task => task.priority === filters.priority);
      }
      if (filters.teamId) {
        userTasks = userTasks.filter(task => task.teamId === filters.teamId);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        userTasks = userTasks.filter(task => 
          task.title.toLowerCase().includes(search) || 
          task.description?.toLowerCase().includes(search)
        );
      }
      if (filters.dueDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        userTasks = userTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate >= today && taskDate < tomorrow;
        });
      }
      if (filters.dueDate === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        userTasks = userTasks.filter(task => {
          if (!task.dueDate || task.status === 'completed') return false;
          return new Date(task.dueDate) < today;
        });
      }
    }

    // Convert to TaskWithDetails
    return userTasks.map(task => this.enrichTask(task));
  }

  private enrichTask(task: Task): TaskWithDetails {
    const createdByUser = this.users.get(task.createdBy);
    const team = task.teamId ? this.teams.get(task.teamId) : undefined;
    
    const shares = Array.from(this.taskShares.values())
      .filter(share => share.taskId === task.id);
    
    const sharedWith = shares.map(share => {
      const user = this.users.get(share.sharedWithUserId);
      return user ? {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        permission: share.permission,
      } : null;
    }).filter(Boolean) as any[];

    return {
      ...task,
      createdByUser: {
        displayName: createdByUser?.displayName || 'Unknown',
        email: createdByUser?.email || '',
        photoURL: createdByUser?.photoURL || null,
      },
      sharedWith,
      team: team ? { name: team.name, color: team.color } : undefined,
    };
  }

  async getTask(id: number, userId: number): Promise<TaskWithDetails | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    // Check if user has access to this task
    const isOwner = task.createdBy === userId;
    const isShared = Array.from(this.taskShares.values()).some(
      share => share.taskId === id && share.sharedWithUserId === userId
    );

    if (!isOwner && !isShared) return undefined;

    return this.enrichTask(task);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const now = new Date();
    const task: Task = {
      id,
      title: insertTask.title,
      description: insertTask.description || "",
      status: insertTask.status || "todo",
      priority: insertTask.priority || "medium",
      dueDate: insertTask.dueDate || null,
      teamId: insertTask.teamId || null,
      createdBy: insertTask.createdBy,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, userId: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    // Check if user has edit permission
    const isOwner = task.createdBy === userId;
    const hasEditAccess = Array.from(this.taskShares.values()).some(
      share => share.taskId === id && share.sharedWithUserId === userId && 
      (share.permission === 'edit' || share.permission === 'admin')
    );

    if (!isOwner && !hasEditAccess) return undefined;

    const now = new Date();
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: now,
      completedAt: updates.status === 'completed' ? now : (updates.status === 'todo' || updates.status === 'in-progress') ? null : task.completedAt,
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number, userId: number): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.createdBy !== userId) return false;

    // Delete task and all its shares
    this.tasks.delete(id);
    Array.from(this.taskShares.entries()).forEach(([shareId, share]) => {
      if (share.taskId === id) {
        this.taskShares.delete(shareId);
      }
    });

    return true;
  }

  async shareTask(taskShare: InsertTaskShare): Promise<TaskShare> {
    const id = this.currentTaskShareId++;
    const share: TaskShare = {
      ...taskShare,
      id,
      permission: taskShare.permission || "edit",
      createdAt: new Date(),
    };
    this.taskShares.set(id, share);
    return share;
  }

  async getTaskShares(taskId: number): Promise<TaskShare[]> {
    return Array.from(this.taskShares.values()).filter(share => share.taskId === taskId);
  }

  async removeTaskShare(taskId: number, userId: number): Promise<boolean> {
    const share = Array.from(this.taskShares.entries()).find(
      ([, share]) => share.taskId === taskId && share.sharedWithUserId === userId
    );
    
    if (!share) return false;
    
    this.taskShares.delete(share[0]);
    return true;
  }

  async getTeams(userId: number): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentTeamId++;
    const team: Team = {
      ...insertTeam,
      id,
      color: insertTeam.color || "#6366f1",
      createdAt: new Date(),
    };
    this.teams.set(id, team);
    return team;
  }

  async getUserStats(userId: number): Promise<UserStats> {
    const userTasks = await this.getTasks(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      activeTasks: userTasks.filter(task => task.status !== 'completed').length,
      completedTasks: userTasks.filter(task => task.status === 'completed').length,
      dueTodayTasks: userTasks.filter(task => {
        if (!task.dueDate || task.status === 'completed') return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < tomorrow;
      }).length,
      overdueTasks: userTasks.filter(task => {
        if (!task.dueDate || task.status === 'completed') return false;
        return new Date(task.dueDate) < today;
      }).length,
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        photoURL: insertUser.photoURL || null,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getTasks(userId: number, filters?: {
    status?: string;
    priority?: string;
    teamId?: number;
    search?: string;
    dueDate?: string;
  }): Promise<TaskWithDetails[]> {
    let query = db
      .select({
        task: tasks,
        createdByUser: users,
        team: teams,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.createdBy, users.id))
      .leftJoin(teams, eq(tasks.teamId, teams.id))
      .where(
        or(
          eq(tasks.createdBy, userId),
          // Tasks shared with the user
          eq(
            tasks.id,
            db.select({ id: taskShares.taskId })
              .from(taskShares)
              .where(eq(taskShares.sharedWithUserId, userId))
          )
        )
      );

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.where(eq(tasks.status, filters.status));
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.where(eq(tasks.priority, filters.priority));
    }
    if (filters?.teamId) {
      query = query.where(eq(tasks.teamId, filters.teamId));
    }
    if (filters?.search) {
      query = query.where(
        or(
          like(tasks.title, `%${filters.search}%`),
          like(tasks.description, `%${filters.search}%`)
        )
      );
    }
    if (filters?.dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query = query.where(
        and(
          gte(tasks.dueDate, today),
          lt(tasks.dueDate, tomorrow)
        )
      );
    }
    if (filters?.dueDate === 'overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      query = query.where(
        and(
          lt(tasks.dueDate, today),
          eq(tasks.status, 'completed')
        )
      );
    }

    const results = await query.orderBy(desc(tasks.createdAt));

    // Enrich with shared users
    const enrichedTasks: TaskWithDetails[] = [];
    for (const result of results) {
      const sharedUsers = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          photoURL: users.photoURL,
          permission: taskShares.permission,
        })
        .from(taskShares)
        .innerJoin(users, eq(taskShares.sharedWithUserId, users.id))
        .where(eq(taskShares.taskId, result.task.id));

      enrichedTasks.push({
        ...result.task,
        createdByUser: {
          displayName: result.createdByUser?.displayName || 'Unknown',
          email: result.createdByUser?.email || '',
          photoURL: result.createdByUser?.photoURL || null,
        },
        sharedWith: sharedUsers,
        team: result.team ? { name: result.team.name, color: result.team.color } : undefined,
      });
    }

    return enrichedTasks;
  }

  async getTask(id: number, userId: number): Promise<TaskWithDetails | undefined> {
    const [result] = await db
      .select({
        task: tasks,
        createdByUser: users,
        team: teams,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.createdBy, users.id))
      .leftJoin(teams, eq(tasks.teamId, teams.id))
      .where(
        and(
          eq(tasks.id, id),
          or(
            eq(tasks.createdBy, userId),
            eq(
              tasks.id,
              db.select({ id: taskShares.taskId })
                .from(taskShares)
                .where(and(
                  eq(taskShares.taskId, id),
                  eq(taskShares.sharedWithUserId, userId)
                ))
            )
          )
        )
      );

    if (!result) return undefined;

    const sharedUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        photoURL: users.photoURL,
        permission: taskShares.permission,
      })
      .from(taskShares)
      .innerJoin(users, eq(taskShares.sharedWithUserId, users.id))
      .where(eq(taskShares.taskId, id));

    return {
      ...result.task,
      createdByUser: {
        displayName: result.createdByUser?.displayName || 'Unknown',
        email: result.createdByUser?.email || '',
        photoURL: result.createdByUser?.photoURL || null,
      },
      sharedWith: sharedUsers,
      team: result.team ? { name: result.team.name, color: result.team.color } : undefined,
    };
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, userId: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    // Check permissions first
    const task = await this.getTask(id, userId);
    if (!task) return undefined;

    const now = new Date();
    const updateData = {
      ...updates,
      updatedAt: now,
      completedAt: updates.status === 'completed' ? now : 
                   (updates.status === 'todo' || updates.status === 'in-progress') ? null : 
                   undefined,
    };

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    return updatedTask || undefined;
  }

  async deleteTask(id: number, userId: number): Promise<boolean> {
    // Check if user owns the task
    const [task] = await db
      .select({ createdBy: tasks.createdBy })
      .from(tasks)
      .where(eq(tasks.id, id));

    if (!task || task.createdBy !== userId) return false;

    // Delete task shares first
    await db.delete(taskShares).where(eq(taskShares.taskId, id));
    
    // Delete the task
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async shareTask(taskShare: InsertTaskShare): Promise<TaskShare> {
    const [share] = await db
      .insert(taskShares)
      .values({
        ...taskShare,
        permission: taskShare.permission || "edit",
      })
      .returning();
    return share;
  }

  async getTaskShares(taskId: number): Promise<TaskShare[]> {
    return await db
      .select()
      .from(taskShares)
      .where(eq(taskShares.taskId, taskId));
  }

  async removeTaskShare(taskId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(taskShares)
      .where(
        and(
          eq(taskShares.taskId, taskId),
          eq(taskShares.sharedWithUserId, userId)
        )
      );
    return result.rowCount > 0;
  }

  async getTeams(userId: number): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        ...insertTeam,
        color: insertTeam.color || "#6366f1",
      })
      .returning();
    return team;
  }

  async getUserStats(userId: number): Promise<UserStats> {
    const userTasks = await this.getTasks(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      activeTasks: userTasks.filter(task => task.status !== 'completed').length,
      completedTasks: userTasks.filter(task => task.status === 'completed').length,
      dueTodayTasks: userTasks.filter(task => {
        if (!task.dueDate || task.status === 'completed') return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < tomorrow;
      }).length,
      overdueTasks: userTasks.filter(task => {
        if (!task.dueDate || task.status === 'completed') return false;
        return new Date(task.dueDate) < today;
      }).length,
    };
  }
}

export const storage = new DatabaseStorage();
