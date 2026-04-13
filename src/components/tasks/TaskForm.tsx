"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "done"]),
  dueDate: z.string().optional(),
  tagsInput: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface TaskFormProps {
  initialValues?: Partial<FormValues>;
  taskId?: string;
  teams?: { id: string; name: string }[];
  teammates?: { id: string; name: string | null; email: string }[];
  projects?: { id: string; name: string }[];
}

export function TaskForm({ initialValues, taskId, teams = [], teammates = [], projects = [] }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!taskId;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: "medium",
      status: "todo",
      ...initialValues,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const tags = values.tagsInput
      ? values.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      tags,
      assigneeId: values.assigneeId || null,
      teamId: values.teamId || null,
      projectId: values.projectId || null,
    };

    const url = isEdit ? `/api/tasks/${taskId}` : "/api/tasks";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save task");
      return;
    }

    toast.success(isEdit ? "Task updated" : "Task created");
    router.push(`/tasks/${json.data.id}`);
    router.refresh();
  };

  const priority = watch("priority");
  const status = watch("status");
  const teamId = watch("teamId");
  const projectId = watch("projectId");


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Task" : "New Task"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="What needs to be done?" {...register("title")} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Add more context…" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setValue("priority", v as FormValues["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tagsInput">Tags</Label>
            <Input id="tagsInput" placeholder="design, ux, bug (comma-separated)" {...register("tagsInput")} />
          </div>

          <div className="space-y-1">
            <Label>Project (optional)</Label>
            <Select value={projectId ?? ""} onValueChange={(v: string | null) => setValue("projectId", v || undefined)}>
              <SelectTrigger>
                <SelectValue>
                  {projectId ? (projects.find((p) => p.id === projectId)?.name ?? "No project") : <span className="text-muted-foreground">No project</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {teams.length > 0 && (
            <div className="space-y-1">
              <Label>Team (optional)</Label>
              <Select value={teamId ?? ""} onValueChange={(v: string | null) => setValue("teamId", v ?? undefined)}>
                <SelectTrigger>
                  <SelectValue>
                    {teamId ? (teams.find((t) => t.id === teamId)?.name ?? "Personal task") : <span className="text-muted-foreground">Personal task</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Personal task</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {teamId && teammates.length > 0 && (
            <div className="space-y-1">
              <Label>Assignee (optional)</Label>
              <Select onValueChange={(v: string | null) => setValue("assigneeId", v ?? undefined)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teammates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
