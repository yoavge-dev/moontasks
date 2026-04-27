import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { format, differenceInDays, addDays, isPast } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Separator } from "@/components/ui/separator";
import { ABStatusControls } from "@/components/ab-tests/ABStatusControls";
import { ResultsPanel } from "@/components/ab-tests/ResultsPanel";
import { ArrowLeft, FlaskConical, Calendar, Clock, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  running:   { label: "Running",   className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  concluded: { label: "Concluded", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

function Timeline({ status, startedAt, concludedAt, plannedDays }: {
  status: string;
  startedAt: Date | null;
  concludedAt: Date | null;
  plannedDays: number;
}) {
  if (!startedAt && status === "draft") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        Not started yet · {plannedDays}-day test planned
      </div>
    );
  }

  const now = new Date();
  const expectedEnd = startedAt ? addDays(startedAt, plannedDays) : null;
  const actualEnd = concludedAt ?? (expectedEnd && isPast(expectedEnd) ? expectedEnd : null);
  const endDate = concludedAt ?? expectedEnd;

  const daysElapsed = startedAt ? differenceInDays(concludedAt ?? now, startedAt) : 0;
  const progress = Math.min(100, Math.round((daysElapsed / plannedDays) * 100));
  const daysRemaining = expectedEnd ? Math.max(0, differenceInDays(expectedEnd, concludedAt ?? now)) : null;

  return (
    <div className="space-y-3">
      {/* Date row */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Started {startedAt ? format(startedAt, "MMM d, yyyy") : "—"}</span>
        </div>
        <span className="text-muted-foreground/40">→</span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {concludedAt ? <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" /> : <Clock className="h-3.5 w-3.5" />}
          <span>{endDate ? format(endDate, "MMM d, yyyy") : `${plannedDays}d planned`}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700",
              status === "concluded" ? "bg-violet-500" : progress >= 100 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Day {daysElapsed}</span>
          {status === "running" && daysRemaining !== null && (
            <span className={cn(daysRemaining === 0 && "text-amber-600 font-medium")}>
              {daysRemaining === 0 ? "Planned end reached" : `${daysRemaining} days remaining`}
            </span>
          )}
          {status === "concluded" && actualEnd && (
            <span className="text-violet-600">Ran for {daysElapsed} days</span>
          )}
          <span>Day {plannedDays}</span>
        </div>
      </div>
    </div>
  );
}

export default async function ABTestDetailPage({ params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const test = await prisma.aBTest.findFirst({
    where: { id: testId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      variants: {
        include: { metrics: { orderBy: { recordedAt: "desc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!test) notFound();

  const status = STATUS_CONFIG[test.status as keyof typeof STATUS_CONFIG] ?? { label: test.status, className: "" };
  const isOwner = test.ownerId === userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton href="/ab-tests" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Experiments
        </LinkButton>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0" />
            <h1 className="text-2xl font-bold tracking-tight">{test.name}</h1>
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", status.className)}>
              {status.label}
            </span>
            {test.result === "won" && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" /> Won
              </span>
            )}
            {test.result === "lost" && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <TrendingDown className="h-3.5 w-3.5" /> Lost
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            By {test.owner.name ?? test.owner.email} · Created {format(new Date(test.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ABStatusControls testId={test.id} status={test.status} isOwner={isOwner} />
        </div>
      </div>

      {/* Timeline card */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <Timeline
            status={test.status}
            startedAt={test.startedAt}
            concludedAt={test.concludedAt}
            plannedDays={test.plannedDays}
          />
        </CardContent>
      </Card>

      {/* Hypothesis */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {(test.kpi || test.targetUplift) && (
            <div className="flex items-center gap-6 pb-4 border-b">
              {test.kpi && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">KPI</p>
                  <p className="text-sm font-medium">{test.kpi}</p>
                </div>
              )}
              {test.targetUplift && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Target uplift</p>
                  <p className="text-sm font-medium">{test.targetUplift}</p>
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Hypothesis</p>
            <p className="text-sm leading-relaxed">{test.hypothesis}</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Variants */}
      <div>
        <h2 className="font-semibold mb-4">Variants ({test.variants.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {test.variants.map((variant) => {
            const metricsByName = variant.metrics.reduce<Record<string, number[]>>((acc, m) => {
              if (!acc[m.metricName]) acc[m.metricName] = [];
              acc[m.metricName].push(m.value);
              return acc;
            }, {});
            const isWinner = test.winner === variant.id || test.winner === variant.name;

            return (
              <Card key={variant.id} className={cn(isWinner && "border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-900/10")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isWinner && <span className="text-amber-500">🏆</span>}
                    {variant.name}
                    {isWinner && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Winner</span>}
                  </CardTitle>
                  {variant.description && <p className="text-xs text-muted-foreground">{variant.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {variant.screenshotUrl && (
                    <img
                      src={variant.screenshotUrl}
                      alt={`${variant.name} screenshot`}
                      className="w-full rounded-md object-cover border"
                    />
                  )}
                  {Object.keys(metricsByName).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No metrics logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(metricsByName).map(([name, values]) => (
                        <div key={name} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-medium">
                            {values[0].toFixed(2)}
                            {values.length > 1 && <span className="text-xs text-muted-foreground ml-1">({values.length} readings)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Results & Analysis */}
      <ResultsPanel
        testId={test.id}
        variants={test.variants}
        winner={test.winner}
        resultsSummary={test.resultsSummary}
        resultsImages={(() => {
          try { return JSON.parse(test.resultsImages ?? "[]"); } catch { return []; }
        })()}
        isOwner={isOwner}
        status={test.status}
      />
    </div>
  );
}
