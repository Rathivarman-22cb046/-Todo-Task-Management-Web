import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  photoURL: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").default(""),
  status: varchar("status", { length: 20 }).default("todo").notNull(), // todo, in-progress, completed
  priority: varchar("priority", { length: 10 }).default("medium").notNull(), // low, medium, high
  dueDate: timestamp("due_date"),
  teamId: integer("team_id"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const taskShares = pgTable("task_shares", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  sharedWithUserId: integer("shared_with_user_id").references(() => users.id).notNull(),
  sharedByUserId: integer("shared_by_user_id").references(() => users.id).notNull(),
  permission: varchar("permission", { length: 10 }).default("edit").notNull(), // view, edit, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 10 }).default("member").notNull(), // member, admin
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  sharedEmails: z.array(z.string().email()).optional(),
});

export const insertTaskShareSchema = createInsertSchema(taskShares).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskShare = typeof taskShares.$inferSelect;
export type InsertTaskShare = z.infer<typeof insertTaskShareSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

// Extended types for API responses
export type TaskWithDetails = Task & {
  createdByUser: Pick<User, 'displayName' | 'email' | 'photoURL'>;
  sharedWith?: Array<Pick<User, 'id' | 'displayName' | 'email' | 'photoURL'> & { permission: string }>;
  team?: Pick<Team, 'name' | 'color'>;
};

export type UserStats = {
  activeTasks: number;
  completedTasks: number;
  dueTodayTasks: number;
  overdueTasks: number;
};

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  taskShares: many(taskShares),
  teams: many(teams),
  teamMemberships: many(teamMembers),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [tasks.teamId],
    references: [teams.id],
  }),
  shares: many(taskShares),
}));

export const taskSharesRelations = relations(taskShares, ({ one }) => ({
  task: one(tasks, {
    fields: [taskShares.taskId],
    references: [tasks.id],
  }),
  sharedWithUser: one(users, {
    fields: [taskShares.sharedWithUserId],
    references: [users.id],
  }),
  sharedByUser: one(users, {
    fields: [taskShares.sharedByUserId],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  tasks: many(tasks),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
