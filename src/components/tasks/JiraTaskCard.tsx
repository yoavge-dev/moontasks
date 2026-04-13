import { ExternalLink, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { format } from "date-fns";
import type { JiraIssue } from "@/app/api/jira/issues/route";

interface Props {
  issue: JiraIssue;
}

const statusMap: Record<string, string> = {
  todo: "todo",
  in_progress: "in_progress",
  done: "done",
};

export function JiraTaskCard({ issue }: Props) {
  const dueDate = issue.dueDate ? new Date(issue.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && issue.statusCategory !== "done";

  return (
    <a href={issue.url} target="_blank" rel="noopener noreferrer">
      <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
              {issue.title}
            </p>
            <TaskPriorityBadge priority={issue.priorityNormalized} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <TaskStatusBadge status={statusMap[issue.statusCategory] ?? "todo"} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {issue.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {format(dueDate, "MMM d")}
                </span>
              )}
              <span className="text-muted-foreground/70">{issue.projectKey}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {issue.role !== "assignee" && (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {issue.role === "both" ? "assignee + reporter" : "reporter"}
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-[#0052CC]/10 text-[#0052CC] dark:bg-[#0052CC]/20 dark:text-blue-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.021-1.005zM23.013 0H11.442a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.486V1.005A1.005 1.005 0 0 0 23.013 0z"/>
                </svg>
                {issue.key}
              </span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60">
            Created {format(new Date(issue.createdAt), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    </a>
  );
}
