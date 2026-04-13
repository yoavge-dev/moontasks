import { z } from "zod";

export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
  assigneeId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const TaskUpdateSchema = TaskSchema.partial();

export type TaskInput = z.infer<typeof TaskSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
