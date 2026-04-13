"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JiraIssue } from "@/app/api/jira/issues/route";

const priorityDot: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-slate-300",
};

const statusLabel: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const JiraLogo = () => (
  <svg className="h-4 w-4 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.021-1.005zM23.013 0H11.442a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.486V1.005A1.005 1.005 0 0 0 23.013 0z" />
  </svg>
);

function IssueRow({ issue }: { issue: JiraIssue }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors group"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[issue.priorityNormalized] ?? "bg-slate-300"}`} />
      <span className="text-sm flex-1 truncate">{issue.title}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {statusLabel[issue.statusCategory] ?? issue.status}
        </span>
        <span className="text-[10px] font-semibold text-[#0052CC] dark:text-blue-400 bg-[#0052CC]/10 px-1.5 py-0.5 rounded">
          {issue.key}
        </span>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

function EmptyState({ tab }: { tab: "assigned" | "reported" }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      {tab === "assigned"
        ? <><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> No open issues assigned to you</>
        : <><FileText className="h-4 w-4 text-violet-400 shrink-0" /> No open issues reported by you</>
      }
    </div>
  );
}

interface Props {
  onCountChange?: (count: number) => void;
}

export function JiraDashboardPanel({ onCountChange }: Props) {
  const [allIssues, setAllIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [tab, setTab] = useState<"assigned" | "reported">("assigned");

  useEffect(() => {
    fetch("/api/jira/issues")
      .then((r) => r.json())
      .then((j) => {
        if (!j.configured) { setConfigured(false); setLoading(false); return; }
        setConfigured(true);
        if (j.error) { setError(j.error); } else {
          setAllIssues(j.data ?? []);
          onCountChange?.(j.data?.length ?? 0);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [onCountChange]);

  if (!loading && !configured) return null;

  const assigned = allIssues.filter((i) => i.role === "assignee" || i.role === "both");
  const reported = allIssues.filter((i) => i.role === "reporter" || i.role === "both");
  const visible = (tab === "assigned" ? assigned : reported).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <JiraLogo />
            Jira
          </CardTitle>
          <a
            href="#"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.preventDefault(); window.open("https://jira.atlassian.com", "_blank"); }}
          >
            Open Jira ↗
          </a>
        </div>

        {/* Pill tabs */}
        {!loading && !error && (
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setTab("assigned")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                tab === "assigned"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Assigned to me
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === "assigned"
                  ? "bg-primary text-white"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {loading ? "…" : assigned.length}
              </span>
            </button>
            <button
              onClick={() => setTab("reported")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                tab === "reported"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Reported by me
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === "reported"
                  ? "bg-violet-500 text-white"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {loading ? "…" : reported.length}
              </span>
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && <EmptyState tab={tab} />}

        {!loading && !error && visible.length > 0 && (
          <div className="space-y-0.5">
            {visible.map((issue) => <IssueRow key={issue.id} issue={issue} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Stat card — shows total Jira count
export function JiraStatCard() {
  const [count, setCount] = useState<number | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/jira/issues")
      .then((r) => r.json())
      .then((j) => {
        if (!j.configured) return;
        setConfigured(true);
        setCount(j.data?.length ?? 0);
      })
      .catch(() => {});
  }, []);

  if (!configured) return null;

  return (
    <a href="/tasks" className="block">
      <div className="rounded-lg border border-t-2 border-t-[#0052CC] bg-card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#0052CC]/10 mb-3">
          <svg className="h-4 w-4 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.021-1.005zM23.013 0H11.442a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.486V1.005A1.005 1.005 0 0 0 23.013 0z" />
          </svg>
        </div>
        <p className="text-3xl font-extrabold tracking-tight">
          {count === null ? <span className="text-muted-foreground text-lg">…</span> : count}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 font-medium">Jira Tasks</p>
      </div>
    </a>
  );
}
