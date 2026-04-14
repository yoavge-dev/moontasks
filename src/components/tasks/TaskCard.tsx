"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar, FolderKanban, MessageSquare } from "lucide-react";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const statusBorderColor: Record<string, string> = {
  todo:        "border-l-slate-300",
  in_progress: "border-l-amber-400",
  done:        "border-l-emerald-500",
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
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== "done";
  const borderClass = statusBorderColor[task.status] ?? "border-l-slate-300";

  return (
    <Link href={`/tasks/${task.id}`}>
      {/* Desktop: table row */}
      <div className={cn(
        "group hidden sm:grid grid-cols-[1fr_120px_110px_90px_32px] gap-4 px-4 py-3.5 border-b last:border-0",
        "hover:bg-muted/40 transition-colors cursor-pointer items-center",
        "border-l-[3px]",
        borderClass
      )}>
        {/* Title col */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {task.title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {task.project && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                <FolderKanban className="h-2.5 w-2.5" />
                {task.project.name}
              </span>
            )}
            {(task._count?.comments ?? 0) > 0 && (
              <span className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {task._count!.comments}
              </span>
            )}
          </div>
        </div>

        {/* Status col */}
        <TaskStatusBadge status={task.status} />

        {/* Priority col */}
        <TaskPriorityBadge priority={task.priority} />

        {/* Due date col */}
        <span className={cn(
          "text-xs",
          isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
        )}>
          {dueDate ? (
            <span className="flex items-center gap-1">
              {isOverdue && <Calendar className="h-3 w-3" />}
              {format(dueDate, "MMM d")}
            </span>
          ) : "—"}
        </span>

        {/* Assignee col */}
        {task.assignee ? (
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
              {initials(task.assignee.name, task.assignee.email)}
            </AvatarFallback>
          </Avatar>
        ) : <span />}
      </div>

      {/* Mobile: compact card */}
      <div className={cn(
        "group sm:hidden flex items-center gap-3 px-4 py-3.5 border-b last:border-0",
        "hover:bg-muted/40 transition-colors cursor-pointer",
        "border-l-[3px]",
        borderClass
      )}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <TaskStatusBadge status={task.status} />
            {dueDate && (
              <span className={cn("text-xs", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                {format(dueDate, "MMM d")}
              </span>
            )}
          </div>
        </div>
        <TaskPriorityBadge priority={task.priority} />
      </div>
    </Link>
  );
}
