import { ExternalLink, Calendar } from "lucide-react";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { JiraIssue } from "@/app/api/jira/issues/route";

const jiraStatusMap: Record<string, string> = {
  todo: "todo",
  in_progress: "in_progress",
  done: "done",
};

const JiraLogo = () => (
  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.021-1.005zM23.013 0H11.442a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.486V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

export function JiraTaskCard({ issue }: { issue: JiraIssue }) {
  const dueDate = issue.dueDate ? new Date(issue.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && issue.statusCategory !== "done";

  return (
    <a href={issue.url} target="_blank" rel="noopener noreferrer">
      {/* Desktop: table row */}
      <div className="group hidden sm:grid grid-cols-[1fr_120px_110px_90px_32px] gap-4 px-4 py-3.5 border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer items-center border-l-[3px] border-l-[#0052CC]/50">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {issue.title}
          </span>
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0052CC]/10 text-[#0052CC] dark:text-blue-400 shrink-0">
            <JiraLogo />
            {issue.key}
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* Status */}
        <TaskStatusBadge status={jiraStatusMap[issue.statusCategory] ?? "todo"} />

        {/* Priority */}
        <TaskPriorityBadge priority={issue.priorityNormalized} />

        {/* Due date */}
        <span className={cn("text-xs", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
          {dueDate ? (
            <span className="flex items-center gap-1">
              {isOverdue && <Calendar className="h-3 w-3" />}
              {format(dueDate, "MMM d")}
            </span>
          ) : "—"}
        </span>

        {/* Empty assignee col */}
        <span />
      </div>

      {/* Mobile: compact */}
      <div className="group sm:hidden flex items-center gap-3 px-4 py-3.5 border-b last:border-0 hover:bg-muted/40 transition-colors border-l-[3px] border-l-[#0052CC]/50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{issue.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <TaskStatusBadge status={jiraStatusMap[issue.statusCategory] ?? "todo"} />
            {dueDate && (
              <span className={cn("text-xs", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                {format(dueDate, "MMM d")}
              </span>
            )}
          </div>
        </div>
        <TaskPriorityBadge priority={issue.priorityNormalized} />
      </div>
    </a>
  );
}
