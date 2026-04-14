"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, isThisWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { toast } from "sonner";
import Link from "next/link";

interface TaskRow { id: string; title: string; project: string | null; dueDate?: string | null; }
interface WeekData {
  weekStart: string;
  weekEnd: string;
  done: TaskRow[];
  inProgress: TaskRow[];
  stuck: TaskRow[];
  overdue: TaskRow[];
}

function Section({ title, tasks, status, empty }: { title: string; tasks: TaskRow[]; status: string; empty: string }) {
  if (tasks.length === 0) return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground italic">{empty}</p>
    </div>
  );
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title} <span className="text-muted-foreground/60 font-normal normal-case">({tasks.length})</span></p>
      <div className="space-y-1">
        {tasks.map((t) => (
          <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
            <TaskStatusBadge status={status} />
            <span className="text-sm flex-1 truncate">{t.title}</span>
            {t.project && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-[#e3f0ff] text-[#1e6ec1] shrink-0">{t.project}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function WeeklySummaryPage() {
  const [refDate, setRefDate] = useState(new Date());
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const isCurrentWeek = isThisWeek(refDate, { weekStartsOn: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(null);
    const res = await fetch(`/api/weekly-summary?week=${refDate.toISOString()}`);
    const json = await res.json();
    setData(json.data ?? null);
    setLoading(false);
  }, [refDate]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!data) return;
    setGenerating(true);
    const res = await fetch("/api/weekly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to generate"); return; }
    setSummary(json.data.summary);
  };

  const copy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTasks = data ? data.done.length + data.inProgress.length + data.stuck.length : 0;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            {isCurrentWeek && <span className="ml-2 text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">This week</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => { setRefDate(subWeeks(refDate, 1)); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={() => setRefDate(new Date())}>Today</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => { setRefDate(addWeeks(refDate, 1)); }} disabled={isCurrentWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Task sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Task Activity
                {totalTasks === 0 && <span className="text-sm font-normal text-muted-foreground ml-2">— no tasks this week</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Section title="Completed" tasks={data.done} status="done" empty="Nothing completed yet" />
              <Section title="In progress" tasks={data.inProgress} status="in_progress" empty="Nothing in progress" />
              {data.stuck.length > 0 && (
                <Section title="Blocked" tasks={data.stuck} status="stuck" empty="" />
              )}
              {data.overdue.length > 0 && (
                <Section title="Overdue" tasks={data.overdue} status="todo" empty="" />
              )}
            </CardContent>
          </Card>

          {/* AI Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Manager Update
                </CardTitle>
                {summary && (
                  <Button variant="outline" size="sm" onClick={copy}>
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!summary && !generating && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">
                    Generate a professional summary of this week's activity, ready to send to your manager.
                  </p>
                  <Button onClick={generate} disabled={totalTasks === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate summary
                  </Button>
                </div>
              )}
              {generating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Writing your update…
                </div>
              )}
              {summary && (
                <div className="space-y-3">
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{summary}</pre>
                  <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
                    Regenerate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
