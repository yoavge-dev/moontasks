"use client";

import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare, Calendar, FolderKanban } from "lucide-react";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Monday-style colored left border by status
const statusBorder: Record<string, string> = {
  todo: "border-l-slate-400",
  in_progress: "border-l-amber-400",
  done: "border-l-emerald-500",
};

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | Date | null;
    createdAt: string | Date;
    tags: string;
    owner: { id: string; name: string | null; email: string };
    assignee?: { id: string; name: string | null; email: string } | null;
    team?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
    _count?: { comments: number };
  };
}

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

export function TaskCard({ task }: TaskCardProps) {
  const tags: string[] = (() => { try { return JSON.parse(task.tags); } catch { return []; } })();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== "done";
  const borderClass = statusBorder[task.status] ?? "border-l-slate-300";

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className={`group bg-card border border-border border-l-4 ${borderClass} rounded-lg p-4 hover:shadow-md transition-all cursor-pointer space-y-3`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {task.title}
          </p>
          <TaskPriorityBadge priority={task.priority} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <TaskStatusBadge status={task.status} />
          {task.project && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <FolderKanban className="h-3 w-3" />
              {task.project.name}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            {dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                <Calendar className="h-3 w-3" />
                {format(dueDate, "MMM d")}
              </span>
            )}
            {(task._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task._count!.comments}
              </span>
            )}
            {task.team && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-medium">{task.team.name}</span>
            )}
          </div>
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                {initials(task.assignee.name, task.assignee.email)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          Created {format(new Date(task.createdAt), "MMM d, yyyy")}
        </p>
      </div>
    </Link>
  );
}
