"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Plus, FlaskConical, FolderKanban, Clock, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const statusConfig = {
  draft:     { label: "Draft",     dot: "bg-slate-400",   className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  running:   { label: "Running",   dot: "bg-emerald-500", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  concluded: { label: "Concluded", dot: "bg-violet-400",  className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

type Test = {
  id: string; name: string; hypothesis: string; status: string; createdAt: Date;
  startedAt: Date | null; concludedAt: Date | null;
  project: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  _count: { variants: number };
};

function TestCard({ test }: { test: Test }) {
  const sc = statusConfig[test.status as keyof typeof statusConfig] ?? statusConfig.draft;

  const daysBadge = (() => {
    if (test.status === "running" && test.startedAt) {
      const days = differenceInDays(new Date(), new Date(test.startedAt));
      return { label: `${days}d running`, icon: Clock, className: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" };
    }
    if (test.status === "concluded" && test.startedAt) {
      const end = test.concludedAt ? new Date(test.concludedAt) : new Date();
      const days = differenceInDays(end, new Date(test.startedAt));
      return { label: `Ran ${days}d`, icon: CheckCircle2, className: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20" };
    }
    return null;
  })();

  return (
    <Link href={`/ab-tests/${test.id}`}>
      <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
              {test.name}
            </CardTitle>
            <Badge className={`text-[10px] border-0 shrink-0 flex items-center gap-1 ${sc.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{test.hypothesis}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{test._count.variants} variant{test._count.variants !== 1 ? "s" : ""}</span>
            {daysBadge ? (
              <span className={`flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-md ${daysBadge.className}`}>
                <daysBadge.icon className="h-3 w-3" />
                {daysBadge.label}
              </span>
            ) : (
              <span>{format(new Date(test.createdAt), "MMM d, yyyy")}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ABTestsList({ tests }: { tests: Test[] }) {
  const [runningOnly, setRunningOnly] = useState(false);

  const displayed = runningOnly ? tests.filter((t) => t.status === "running") : tests;
  const runningCount = tests.filter((t) => t.status === "running").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tests.length} experiment{tests.length !== 1 ? "s" : ""}
            {runningCount > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                · {runningCount} running
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunningOnly((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${runningOnly ? "bg-emerald-500" : "bg-input"}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${runningOnly ? "translate-x-4" : "translate-x-0"}`} />
            </span>
            Running only
          </button>
          <LinkButton href="/ab-tests/new">
            <Plus className="h-4 w-4 mr-2" />
            New Experiment
          </LinkButton>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FlaskConical className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">No experiments yet</p>
          <p className="text-sm text-muted-foreground mb-5 mt-1">Create your first A/B test to get started</p>
          <LinkButton href="/ab-tests/new">
            <Plus className="h-4 w-4 mr-2" />
            New Experiment
          </LinkButton>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <p className="text-sm">No running experiments right now.</p>
          <button onClick={() => setRunningOnly(false)} className="text-xs underline mt-1">Show all</button>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const groups: { key: string; label: string; tests: Test[] }[] = [];
            const seen = new Map<string, number>();

            for (const test of displayed) {
              const key = test.project?.id ?? "__none__";
              const label = test.project?.name ?? "No Project";
              if (seen.has(key)) {
                groups[seen.get(key)!].tests.push(test);
              } else {
                seen.set(key, groups.length);
                groups.push({ key, label, tests: [test] });
              }
            }

            return groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderKanban className="h-4 w-4 text-violet-500" />
                  <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {group.tests.length} experiment{group.tests.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tests.map((test) => <TestCard key={test.id} test={test} />)}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
