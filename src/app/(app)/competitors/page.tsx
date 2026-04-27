"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, ExternalLink, Loader2, RefreshCw, Zap, AlertTriangle,
  BarChart2, CheckCircle2, ListTodo, FlaskConical, Lightbulb, Home, Users,
  ChevronDown, ChevronRight, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis } from "recharts";
import { detectFeatureGaps, type FeatureGap } from "@/lib/cro";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CroAudit {
  id: string;
  score: number;
  breakdown: Record<string, number>;
  abTests: Array<{
    title: string;
    hypothesis: string;
    priority: "high" | "medium" | "low";
    effort: "easy" | "medium" | "hard";
    impact: string;
    category: string;
  }>;
  findings: Array<{
    category: string;
    issue: string;
    recommendation: string;
    impact: "high" | "medium" | "low";
  }>;
  createdAt: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  isControl: boolean;
  croAudits: CroAudit[];
  snapshots?: Array<{ extracted: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BREAKDOWN_LABELS: Record<string, string> = {
  hero:         "Hero / Value Prop",
  cta:          "CTA Strength",
  clarity:      "Message Clarity",
  social_proof: "Social Proof",
  structure:    "Page Structure",
  urgency:      "Urgency Signals",
  mobile:       "Mobile Optimisation",
  visuals:      "Visual Impact",
};

const STEAL_ADVICE: Record<string, string> = {
  hero:         "Their headline likely communicates a clearer outcome. Test rewriting your H1 to lead with the user's benefit, not your product name.",
  cta:          "Their CTA copy is probably more specific and action-oriented. A/B test your primary button with benefit-led copy ('Get My Free X' vs what you have).",
  clarity:      "Their page is more scannable — likely better H2 structure and section flow. Add descriptive subheadings that explain each section's value.",
  social_proof: "They're showing stronger trust signals — customer counts, star ratings, or testimonials. Add similar signals directly above or below your CTA.",
  structure:    "Their page hierarchy is cleaner. Review how they order sections and whether they use a logical hero → benefits → proof → CTA flow.",
  urgency:      "They reduce friction better — likely 'No credit card required', 'Free trial', or 'Cancel anytime' near their CTA. Add similar reassurance copy.",
  mobile:       "Their mobile experience is more optimised. Check viewport meta, button tap targets, and nav usability on a real mobile device.",
  visuals:      "They use stronger visual storytelling — hero image, product video, or better alt text coverage. Add a hero visual or short explainer video above the fold.",
};

const PRIORITY_STYLE = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const EFFORT_STYLE = {
  easy:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  hard:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const IMPACT_STYLE = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const GAP_TYPE_STYLE = {
  page:    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  feature: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  content: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreRingColor(score: number) {
  if (score >= 70) return "#10b981";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

function screenshotUrl(url: string) {
  return `/api/screenshot?url=${encodeURIComponent(url)}`;
}

function faviconUrl(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ""; }
}

function parseAudit(a: CroAudit & { breakdown: string | Record<string, number>; abTests: string | CroAudit["abTests"]; findings: string | CroAudit["findings"] }): CroAudit {
  return {
    ...a,
    breakdown: typeof a.breakdown === "string" ? JSON.parse(a.breakdown) : a.breakdown,
    abTests:   typeof a.abTests   === "string" ? JSON.parse(a.abTests)   : a.abTests,
    findings:  typeof a.findings  === "string" ? JSON.parse(a.findings)  : a.findings,
  };
}

function parseExtracted(raw: string | null | undefined): { nav: string[]; sections: string[]; h2: string[]; title: string } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return { nav: p.nav ?? [], sections: p.sections ?? [], h2: p.h2 ?? [], title: p.title ?? "" };
  } catch { return null; }
}

// ─── Site screenshot ──────────────────────────────────────────────────────────

function SiteScreenshot({ url, className }: { url: string; className?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className={cn("relative overflow-hidden bg-muted/50", className)}>
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <ImageOff className="h-5 w-5 text-muted-foreground/30" />
          <span className="text-[10px] text-muted-foreground/50">No preview</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshotUrl(url)}
        alt=""
        loading="lazy"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={cn("w-full h-full object-cover object-top transition-opacity duration-300", state === "loaded" ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 108 }: { score: number; size?: number }) {
  const r = size * 0.407;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.074} className="text-muted/20" />
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={scoreRingColor(score)} strokeWidth={size * 0.074}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (score / 100) * circumference}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("font-black tabular-nums", scoreColor(score), size >= 100 ? "text-3xl" : "text-xl")}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

// ─── Score trend ──────────────────────────────────────────────────────────────

function ScoreTrend({ audits }: { audits: CroAudit[] }) {
  if (audits.length < 2) return null;
  const data = audits.map((a) => ({ date: format(new Date(a.createdAt), "MMM d"), score: a.score }));
  const delta = audits[audits.length - 1].score - audits[0].score;
  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score trend</span>
        <span className={cn("text-xs font-semibold", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground")}>
          {delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : "→ No change"} since first audit
        </span>
      </div>
      <ResponsiveContainer width="100%" height={64}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} hide />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 10px" }} formatter={(v) => [`${v}/100`, "Score"]} />
          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({ label, value, compareValue }: { label: string; value: number; compareValue?: number }) {
  const delta = compareValue !== undefined ? value - compareValue : null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {delta !== null && delta !== 0 && (
            <span className={cn("text-[10px] font-semibold", delta > 0 ? "text-emerald-600" : "text-amber-600")}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          <span className={cn("font-semibold tabular-nums", scoreColor(value))}>{value}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: scoreRingColor(value) }} />
      </div>
    </div>
  );
}

// ─── Screenshot score card ────────────────────────────────────────────────────

function ScreenshotScoreCard({ competitor, audit, label, isControl, onRerun, loading }: {
  competitor: Competitor;
  audit: CroAudit | undefined;
  label: string;
  isControl: boolean;
  onRerun: () => void;
  loading: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", !isControl && audit && "border-amber-200 dark:border-amber-800/50")}>
      {/* Screenshot */}
      <div className="relative">
        <SiteScreenshot url={competitor.url} className="h-40 w-full" />
        {/* Label badge */}
        <div className={cn(
          "absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm",
          isControl
            ? "bg-emerald-500/90 text-white"
            : "bg-amber-500/90 text-white"
        )}>
          {label}
        </div>
        {/* Score badge overlay */}
        {audit && (
          <div className="absolute top-2 right-2 flex items-center justify-center rounded-full shadow-lg"
            style={{ width: 44, height: 44, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <span className={cn("text-sm font-black tabular-nums", scoreColor(audit.score))}>{audit.score}</span>
          </div>
        )}
      </div>

      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 mb-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconUrl(competitor.url)} alt="" width={16} height={16} className="rounded-sm shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
          <p className="font-semibold text-sm truncate">{competitor.name}</p>
        </div>

        {audit ? (
          <div className="space-y-1.5">
            {Object.entries(audit.breakdown).map(([key, val]) => (
              <BreakdownBar key={key} label={BREAKDOWN_LABELS[key] ?? key} value={val} />
            ))}
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={onRerun} disabled={loading} className="h-6 text-xs">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <p className="text-xs text-muted-foreground">Not audited yet</p>
            <Button size="sm" onClick={onRerun} disabled={loading} className="h-7 text-xs">
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
              Audit now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── This Sprint panel ────────────────────────────────────────────────────────

function SprintPanel({ audit, onCreateAbTest, onAddTask, createdTests, createdTasks, competitorId }: {
  audit: CroAudit;
  onCreateAbTest: (test: CroAudit["abTests"][0], key: string) => void;
  onAddTask: (finding: CroAudit["findings"][0], key: string) => void;
  createdTests: Set<string>;
  createdTasks: Set<string>;
  competitorId: string;
}) {
  type Win = { kind: "test"; item: CroAudit["abTests"][0]; idx: number } | { kind: "task"; item: CroAudit["findings"][0]; idx: number };
  const wins: Win[] = [
    ...audit.findings.map((f, idx) => ({ kind: "task" as const, item: f, idx })).filter(({ item }) => item.impact === "high"),
    ...audit.abTests.map((t, idx) => ({ kind: "test" as const, item: t, idx })).filter(({ item }) => item.priority === "high" && item.effort === "easy"),
  ].slice(0, 5);

  if (wins.length === 0) return null;
  return (
    <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <span className="font-bold text-sm text-violet-700 dark:text-violet-300">This Sprint — Quick Wins</span>
        </div>
        <div className="space-y-2">
          {wins.map((w) => {
            if (w.kind === "test") {
              const key = `${competitorId}-ab-${w.idx}`;
              const done = createdTests.has(key);
              return (
                <div key={key} className="flex items-center gap-2">
                  <FlaskConical className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="flex-1 text-xs truncate">{w.item.title}</span>
                  <button onClick={() => !done && onCreateAbTest(w.item, key)} disabled={done}
                    className={cn("text-[10px] font-semibold px-2 py-0.5 rounded shrink-0",
                      done ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                           : "text-violet-600 bg-violet-100 hover:bg-violet-200 dark:text-violet-400 dark:bg-violet-900/30")}>
                    {done ? "✓" : "→ Test"}
                  </button>
                </div>
              );
            } else {
              const key = `${competitorId}-task-${w.idx}`;
              const done = createdTasks.has(key);
              return (
                <div key={key} className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="flex-1 text-xs truncate">{w.item.issue}</span>
                  <button onClick={() => !done && onAddTask(w.item, key)} disabled={done}
                    className={cn("text-[10px] font-semibold px-2 py-0.5 rounded shrink-0",
                      done ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                           : "text-amber-600 bg-amber-100 hover:bg-amber-200 dark:text-amber-400 dark:bg-amber-900/30")}>
                    {done ? "✓" : "→ Task"}
                  </button>
                </div>
              );
            }
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── A/B test card ────────────────────────────────────────────────────────────

function AbTestCard({ test, idx, competitorId, onCreateAbTest, createdTests }: {
  test: CroAudit["abTests"][0];
  idx: number;
  competitorId: string;
  onCreateAbTest: (test: CroAudit["abTests"][0], key: string) => void;
  createdTests: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const key = `${competitorId}-ab-${idx}`;
  const done = createdTests.has(key);
  return (
    <Card className="border-l-2 border-l-violet-400">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="shrink-0 text-muted-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <span className="font-semibold text-sm flex-1 cursor-pointer" onClick={() => setOpen((v) => !v)}>{test.title}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0", PRIORITY_STYLE[test.priority])}>{test.priority}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0", EFFORT_STYLE[test.effort])}>{test.effort}</span>
          <Button variant="outline" size="sm" onClick={() => !done && onCreateAbTest(test, key)} disabled={done}
            className={cn("h-6 text-[10px] px-2 gap-1 shrink-0", done && "text-emerald-600 border-emerald-300")}>
            {done ? <><CheckCircle2 className="h-3 w-3" />Done</> : <><FlaskConical className="h-3 w-3" />Create</>}
          </Button>
        </div>
        {open && (
          <div className="mt-2.5 pl-5 space-y-1.5">
            <p className="text-xs text-muted-foreground leading-relaxed">{test.hypothesis}</p>
            <p className="text-[11px] text-muted-foreground/70 italic">{test.impact}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Finding card ─────────────────────────────────────────────────────────────

function FindingCard({ finding, idx, competitorId, onAddTask, createdTasks }: {
  finding: CroAudit["findings"][0];
  idx: number;
  competitorId: string;
  onAddTask: (f: CroAudit["findings"][0], key: string) => void;
  createdTasks: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const key = `${competitorId}-task-${idx}`;
  const done = createdTasks.has(key);
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="shrink-0 text-muted-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <span className="flex-1 text-sm font-medium cursor-pointer truncate" onClick={() => setOpen((v) => !v)}>{finding.issue}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0", IMPACT_STYLE[finding.impact])}>{finding.impact}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{finding.category}</span>
          <Button variant="outline" size="sm" onClick={() => !done && onAddTask(finding, key)} disabled={done}
            className={cn("h-6 text-[10px] px-2 gap-1 shrink-0", done && "text-emerald-600 border-emerald-300")}>
            {done ? <><CheckCircle2 className="h-3 w-3" />Added</> : <><ListTodo className="h-3 w-3" />Task</>}
          </Button>
        </div>
        {open && (
          <p className="mt-2.5 pl-5 text-xs text-muted-foreground leading-relaxed">→ {finding.recommendation}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Your site audit view ─────────────────────────────────────────────────────

function YourSiteAudit({ competitor, audit, allAudits, onRerun, loading, onCreateAbTest, onAddTask, createdTests, createdTasks }: {
  competitor: Competitor;
  audit: CroAudit;
  allAudits: CroAudit[];
  onRerun: () => void;
  loading: boolean;
  onCreateAbTest: (test: CroAudit["abTests"][0], key: string) => void;
  onAddTask: (finding: CroAudit["findings"][0], key: string) => void;
  createdTests: Set<string>;
  createdTasks: Set<string>;
}) {
  return (
    <div className="space-y-5">
      {/* Hero card */}
      <Card className="overflow-hidden">
        <div className="relative">
          <SiteScreenshot url={competitor.url} className="h-44 w-full" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Home className="h-3 w-3" /> Your Site
            </div>
            <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full max-w-[240px] truncate">
              {competitor.url.replace(/^https?:\/\//, "")}
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <ScoreRing score={audit.score} size={72} />
          </div>
        </div>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {Object.entries(audit.breakdown).map(([key, val]) => (
              <BreakdownBar key={key} label={BREAKDOWN_LABELS[key] ?? key} value={val} />
            ))}
          </div>
          <ScoreTrend audits={allAudits} />
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              Audited {formatDistanceToNow(new Date(audit.createdAt), { addSuffix: true })}
            </span>
            <Button variant="outline" size="sm" onClick={onRerun} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Re-run audit
            </Button>
          </div>
        </CardContent>
      </Card>

      <SprintPanel audit={audit} onCreateAbTest={onCreateAbTest} onAddTask={onAddTask}
        createdTests={createdTests} createdTasks={createdTasks} competitorId={competitor.id} />

      {/* A/B Tests */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm">A/B Test Ideas</span>
          <span className="text-xs text-muted-foreground">({audit.abTests.length})</span>
        </div>
        {audit.abTests.map((test, i) => (
          <AbTestCard key={i} test={test} idx={i} competitorId={competitor.id}
            onCreateAbTest={onCreateAbTest} createdTests={createdTests} />
        ))}
      </div>

      {/* Findings */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-sm">Findings</span>
          <span className="text-xs text-muted-foreground">({audit.findings.length})</span>
        </div>
        {audit.findings.map((f, i) => (
          <FindingCard key={i} finding={f} idx={i} competitorId={competitor.id}
            onAddTask={onAddTask} createdTasks={createdTasks} />
        ))}
      </div>
    </div>
  );
}

// ─── Competitor vs your site view ─────────────────────────────────────────────

function CompetitorView({ control, competitor, onRerunControl, onRerunCompetitor, loadingControl, loadingCompetitor, onAddTask, createdTasks }: {
  control: Competitor;
  competitor: Competitor;
  onRerunControl: () => void;
  onRerunCompetitor: () => void;
  loadingControl: boolean;
  loadingCompetitor: boolean;
  onAddTask: (item: { title: string; description: string }, key: string) => void;
  createdTasks: Set<string>;
}) {
  const auditYours = control.croAudits[control.croAudits.length - 1];
  const auditTheirs = competitor.croAudits[competitor.croAudits.length - 1];

  const categories = auditYours && auditTheirs
    ? Object.keys({ ...auditYours.breakdown, ...auditTheirs.breakdown })
    : [];

  const stealOps = auditYours && auditTheirs
    ? categories.map((key) => ({ key, gap: (auditTheirs.breakdown[key] ?? 0) - (auditYours.breakdown[key] ?? 0) }))
        .filter(({ gap }) => gap >= 10).sort((a, b) => b.gap - a.gap)
    : [];

  const yourWins = auditYours && auditTheirs
    ? categories.map((key) => ({ key, gap: (auditYours.breakdown[key] ?? 0) - (auditTheirs.breakdown[key] ?? 0) }))
        .filter(({ gap }) => gap >= 10).sort((a, b) => b.gap - a.gap)
    : [];

  const yourExtracted = parseExtracted(control.snapshots?.[0]?.extracted);
  const theirExtracted = parseExtracted(competitor.snapshots?.[0]?.extracted);
  const featureGaps: FeatureGap[] = yourExtracted && theirExtracted
    ? detectFeatureGaps(yourExtracted, theirExtracted) : [];

  return (
    <div className="space-y-5">
      {/* Screenshot score cards */}
      <div className="grid grid-cols-2 gap-4">
        <ScreenshotScoreCard competitor={control} audit={auditYours} label="Your Site"
          isControl onRerun={onRerunControl} loading={loadingControl} />
        <ScreenshotScoreCard competitor={competitor} audit={auditTheirs} label="Competitor"
          isControl={false} onRerun={onRerunCompetitor} loading={loadingCompetitor} />
      </div>

      {/* What to steal */}
      {stealOps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">What to steal from {competitor.name}</span>
            <span className="text-xs text-muted-foreground">({stealOps.length})</span>
          </div>
          {stealOps.map(({ key, gap }) => {
            const vYours = auditYours!.breakdown[key] ?? 0;
            const vTheirs = auditTheirs!.breakdown[key] ?? 0;
            return (
              <Card key={key} className="border-l-2 border-l-amber-400">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-sm flex-1">{BREAKDOWN_LABELS[key] ?? key}</span>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className={cn("font-bold tabular-nums", scoreColor(vYours))}>{vYours}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className={cn("font-bold tabular-nums", scoreColor(vTheirs))}>{vTheirs}</span>
                      <span className="text-amber-600 font-bold">+{gap}</span>
                    </div>
                  </div>
                  {/* Visual bar comparison */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[{ label: control.name, val: vYours }, { label: competitor.name, val: vTheirs }].map(({ label, val }) => (
                      <div key={label} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="truncate">{label}</span><span className={cn("font-bold", scoreColor(val))}>{val}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: scoreRingColor(val), transition: "width 0.7s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{STEAL_ADVICE[key] ?? "Review what the competitor does differently in this area."}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feature gaps */}
      {featureGaps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm">Features they have, you don&apos;t</span>
            <span className="text-xs text-muted-foreground">({featureGaps.length})</span>
          </div>
          {featureGaps.map((gap, i) => {
            const key = `gap-task-${competitor.id}-${i}`;
            const done = createdTasks.has(key);
            return (
              <Card key={i} className="border-l-2 border-l-blue-400">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm flex-1">{gap.label}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0", GAP_TYPE_STYLE[gap.type])}>{gap.type}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0", EFFORT_STYLE[gap.effort])}>{gap.effort}</span>
                    <Button variant="outline" size="sm"
                      onClick={() => !done && onAddTask({ title: `Add ${gap.label}`, description: gap.description }, key)}
                      disabled={done} className={cn("h-6 text-[10px] px-2 gap-1 shrink-0", done && "text-emerald-600 border-emerald-300")}>
                      {done ? <><CheckCircle2 className="h-3 w-3" />Added</> : <><ListTodo className="h-3 w-3" />Task</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed pl-0.5">{gap.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Your advantages */}
      {yourWins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span className="font-semibold text-sm">Your advantages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {yourWins.map(({ key, gap }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg">
                <span className="font-medium">{BREAKDOWN_LABELS[key] ?? key}</span>
                <span className="font-bold">+{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {auditYours && auditTheirs && stealOps.length === 0 && yourWins.length === 0 && featureGaps.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Scores are close — no significant gaps detected.</p>
      )}
    </div>
  );
}

// ─── Left panel list item ─────────────────────────────────────────────────────

function CompetitorListItem({ c, isSelected, isControl, onSelect, onDelete, onSetControl, auditing }: {
  c: Competitor; isSelected: boolean; isControl: boolean;
  onSelect: () => void; onDelete: () => void; onSetControl: () => void; auditing: boolean;
}) {
  const latestAudit = c.croAudits[c.croAudits.length - 1];
  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-2 rounded-lg transition-all group cursor-pointer",
      isSelected ? (isControl ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-primary/10") : "hover:bg-muted"
    )}>
      {/* Favicon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={faviconUrl(c.url)} alt="" width={16} height={16} className="rounded-sm shrink-0"
        onError={(e) => (e.currentTarget.style.display = "none")} />
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <p className={cn("text-sm font-medium truncate",
          isSelected && isControl ? "text-emerald-700 dark:text-emerald-400" : isSelected ? "text-primary" : "")}>{c.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{c.url.replace(/^https?:\/\//, "")}</p>
      </div>
      {auditing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
      {!auditing && latestAudit && (
        <span className={cn("text-xs font-bold tabular-nums shrink-0", scoreColor(latestAudit.score))}>{latestAudit.score}</span>
      )}
      {!isControl && (
        <button onClick={onSetControl} title="Set as my site"
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 shrink-0">
          <Home className="h-3 w-3" />
        </button>
      )}
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isControlAdd, setIsControlAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditing, setAuditing] = useState<Set<string>>(new Set());
  const [createdTests, setCreatedTests] = useState<Set<string>>(new Set());
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/competitors");
    const json = await res.json();
    const list: Competitor[] = (json.data ?? []).map((c: Competitor) => ({
      ...c,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      croAudits: (c.croAudits as any[]).map(parseAudit),
    }));
    setCompetitors(list);
    setLoading(false);
    setSelectedId((prev) => {
      if (prev) return prev;
      return list.find((c) => c.isControl)?.id ?? list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    const res = await fetch("/api/competitors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to add"); setAdding(false); return; }
    if (isControlAdd) {
      await fetch(`/api/competitors/${json.data.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isControl: true }),
      });
    }
    setName(""); setUrl(""); setIsControlAdd(false); setAdding(false);
    await load();
    setSelectedId(json.data.id);
    toast.success(`${json.data.name} added`);
  };

  const remove = async (id: string) => {
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    const remaining = competitors.filter((c) => c.id !== id);
    setCompetitors(remaining);
    if (selectedId === id) setSelectedId(remaining.find((c) => c.isControl)?.id ?? remaining[0]?.id ?? null);
    toast.success("Removed");
  };

  const setControl = async (id: string) => {
    await fetch(`/api/competitors/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isControl: true }),
    });
    await load();
    toast.success("Set as your site");
  };

  const runAudit = async (id: string) => {
    setAuditing((prev) => new Set(prev).add(id));
    const res = await fetch(`/api/competitors/${id}/cro-audit`, { method: "POST" });
    const json = await res.json();
    setAuditing((prev) => { const s = new Set(prev); s.delete(id); return s; });
    if (!res.ok) { toast.error(json.error ?? "Audit failed"); return; }
    await load();
    toast.success("CRO audit complete");
  };

  const createAbTest = async (test: CroAudit["abTests"][0], key: string) => {
    const res = await fetch("/api/ab-tests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: test.title, hypothesis: test.hypothesis }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
    setCreatedTests((prev) => new Set(prev).add(key));
    toast.success("A/B test created");
  };

  const addTask = async (item: CroAudit["findings"][0] | { title: string; description: string }, key: string) => {
    const isFinding = (x: typeof item): x is CroAudit["findings"][0] => "issue" in x;
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isFinding(item) ? item.issue : item.title,
        description: isFinding(item) ? item.recommendation : item.description,
        priority: "medium",
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
    setCreatedTasks((prev) => new Set(prev).add(key));
    toast.success("Task added");
  };

  const control = competitors.find((c) => c.isControl) ?? null;
  const competitorList = competitors.filter((c) => !c.isControl);
  const selected = competitors.find((c) => c.id === selectedId) ?? null;

  if (loading) return null;

  const showYourSite    = selected?.isControl && selected.croAudits.length > 0;
  const showNoAuditYet  = selected?.isControl && selected.croAudits.length === 0;
  const showCompare     = selected && !selected.isControl && control;
  const showEmptyAudit  = selected && !selected.isControl;

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left panel */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">CRO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Score your site, spy on competitors</p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-8 text-xs" />
            <button type="button" onClick={() => setIsControlAdd((v) => !v)}
              className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all",
                isControlAdd
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400"
                  : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted")}>
              <Home className={cn("h-3.5 w-3.5", isControlAdd ? "text-emerald-600" : "")} />
              {isControlAdd ? "This is my site ✓" : "This is my site"}
            </button>
            <Button onClick={add} disabled={adding || !name.trim() || !url.trim()} size="sm" className="w-full h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add URL
            </Button>
          </CardContent>
        </Card>

        {/* Your site */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-1">Your Site</p>
          {control ? (
            <CompetitorListItem c={control} isSelected={selectedId === control.id} isControl
              onSelect={() => setSelectedId(control.id)} onDelete={() => remove(control.id)}
              onSetControl={() => {}} auditing={auditing.has(control.id)} />
          ) : (
            <p className="text-[10px] text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
              <Home className="h-3 w-3 shrink-0" /> Hover a URL below and click <Home className="inline h-2.5 w-2.5" />
            </p>
          )}
        </div>

        {/* Competitors */}
        {competitorList.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-1">
              <Users className="inline h-3 w-3 mr-1" />Competitors
            </p>
            <div className="space-y-0.5 overflow-y-auto flex-1">
              {competitorList.map((c) => (
                <CompetitorListItem key={c.id} c={c} isSelected={selectedId === c.id} isControl={false}
                  onSelect={() => setSelectedId(c.id)} onDelete={() => remove(c.id)}
                  onSetControl={() => setControl(c.id)} auditing={auditing.has(c.id)} />
              ))}
            </div>
          </div>
        )}

        {competitors.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">Add your first URL above</p>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-6">
        {!selected ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Select a URL on the left</div>

        ) : showYourSite ? (
          <YourSiteAudit competitor={selected} audit={selected.croAudits[selected.croAudits.length - 1]}
            allAudits={selected.croAudits} onRerun={() => runAudit(selected.id)} loading={auditing.has(selected.id)}
            onCreateAbTest={createAbTest} onAddTask={addTask} createdTests={createdTests} createdTasks={createdTasks} />

        ) : showNoAuditYet ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Card className="overflow-hidden w-full max-w-sm">
              <SiteScreenshot url={selected.url} className="h-40 w-full" />
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faviconUrl(selected.url)} alt="" width={16} height={16} className="rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <p className="font-semibold">{selected.name}</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Your Site</span>
                </div>
                <p className="text-xs text-muted-foreground">Run a CRO audit to get your score, quick wins, and A/B test ideas.</p>
                <Button onClick={() => runAudit(selected.id)} disabled={auditing.has(selected.id)}>
                  {auditing.has(selected.id) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  {auditing.has(selected.id) ? "Auditing…" : "Run CRO Audit"}
                </Button>
              </CardContent>
            </Card>
          </div>

        ) : showCompare ? (
          <CompetitorView control={control!} competitor={selected}
            onRerunControl={() => runAudit(control!.id)} onRerunCompetitor={() => runAudit(selected.id)}
            loadingControl={auditing.has(control!.id)} loadingCompetitor={auditing.has(selected.id)}
            onAddTask={addTask} createdTasks={createdTasks} />

        ) : showEmptyAudit ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <Card className="overflow-hidden w-full max-w-sm">
              <SiteScreenshot url={selected.url} className="h-40 w-full" />
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faviconUrl(selected.url)} alt="" width={16} height={16} className="rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <p className="font-semibold">{selected.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Audit this competitor to compare against your site.
                  {!control && " Mark your own URL as 'Your Site' first to enable comparison."}
                </p>
                <Button onClick={() => runAudit(selected.id)} disabled={auditing.has(selected.id)}>
                  {auditing.has(selected.id) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart2 className="h-4 w-4 mr-2" />}
                  {auditing.has(selected.id) ? "Auditing…" : "Run CRO Audit"}
                </Button>
              </CardContent>
            </Card>
          </div>

        ) : null}
      </div>
    </div>
  );
}
