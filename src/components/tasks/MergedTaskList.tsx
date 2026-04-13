"use client";

import { useEffect, useState } from "react";
import { TaskCard } from "./TaskCard";
import { JiraTaskCard } from "./JiraTaskCard";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import type { JiraIssue } from "@/app/api/jira/issues/route";

interface LocalTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | Date | null;
  tags: string;
  createdAt: Date;
  owner: { id: string; name: string | null; email: string };
  assignee?: { id: string; name: string | null; email: string } | null;
  team?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  _count?: { comments: number };
}

interface MergedItem {
  type: "local" | "jira";
  sortKey: number;
  localTask?: LocalTask;
  jiraIssue?: JiraIssue;
}

interface Props {
  localTasks: LocalTask[];
  hasJiraConfigured: boolean;
}

export function MergedTaskList({ localTasks, hasJiraConfigured }: Props) {
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [jiraLoading, setJiraLoading] = useState(hasJiraConfigured);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!hasJiraConfigured) return;

    setJiraLoading(true);
    setJiraError(null);

    fetch("/api/jira/issues")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          setJiraError(j.error);
        } else {
          setJiraIssues(j.data ?? []);
        }
        setJiraLoading(false);
      })
      .catch(() => {
        setJiraError("Failed to load Jira issues");
        setJiraLoading(false);
      });
  }, [hasJiraConfigured, refreshKey]);

  // Merge and sort: local tasks by createdAt desc, jira by updatedAt desc
  const merged: MergedItem[] = [
    ...localTasks.map((t) => ({
      type: "local" as const,
      sortKey: new Date(t.createdAt).getTime(),
      localTask: t,
    })),
    ...jiraIssues.map((i) => ({
      type: "jira" as const,
      sortKey: new Date(i.updatedAt).getTime(),
      jiraIssue: i,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  const totalCount = localTasks.length + jiraIssues.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} task{totalCount !== 1 ? "s" : ""}
            {hasJiraConfigured && !jiraLoading && jiraIssues.length > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                · {localTasks.length} local · {jiraIssues.length} from Jira
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasJiraConfigured && (
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh Jira issues"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${jiraLoading ? "animate-spin" : ""}`} />
            </button>
          )}
          <LinkButton href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </LinkButton>
        </div>
      </div>

      {jiraError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{jiraError} — check your <a href="/settings" className="underline">Jira settings</a>.</span>
        </div>
      )}

      {merged.length === 0 && !jiraLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">No tasks yet. Create your first one!</p>
          <LinkButton href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {merged.map((item) =>
            item.type === "local" ? (
              <TaskCard key={`local-${item.localTask!.id}`} task={item.localTask!} />
            ) : (
              <JiraTaskCard key={`jira-${item.jiraIssue!.id}`} issue={item.jiraIssue!} />
            )
          )}

          {/* Jira loading skeletons */}
          {jiraLoading &&
            [1, 2, 3].map((i) => (
              <div key={`skel-${i}`} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
