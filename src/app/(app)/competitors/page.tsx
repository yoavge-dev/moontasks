"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Loader2, RefreshCw, Zap, AlertTriangle, BarChart2, GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis } from "recharts";

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
  croAudits: CroAudit[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BREAKDOWN_LABELS: Record<string, string> = {
  hero: "Hero / Value Prop",
  cta: "CTA Strength",
  clarity: "Message Clarity",
  social_proof: "Social Proof",
  structure: "Page Structure",
  urgency: "Urgency Signals",
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

function parseAudit(a: CroAudit & { breakdown: string | Record<string, number>; abTests: string | CroAudit["abTests"]; findings: string | CroAudit["findings"] }): CroAudit {
  return {
    ...a,
    breakdown: typeof a.breakdown === "string" ? JSON.parse(a.breakdown) : a.breakdown,
    abTests:   typeof a.abTests   === "string" ? JSON.parse(a.abTests)   : a.abTests,
    findings:  typeof a.findings  === "string" ? JSON.parse(a.findings)  : a.findings,
  };
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
        <circle
          cx={cx} cy={cx} r={r} fill="none"
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

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({ label, value, compareValue }: { label: string; value: number; compareValue?: number }) {
  const delta = compareValue !== undefined ? value - compareValue : null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {delta !== null && (
            <span className={cn("text-[10px] font-semibold", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground")}>
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

// ─── Score trend chart ────────────────────────────────────────────────────────

function ScoreTrend({ audits }: { audits: CroAudit[] }) {
  if (audits.length < 2) return null;
  const data = audits.map((a) => ({ date: format(new Date(a.createdAt), "MMM d"), score: a.score }));
  const latest = audits[audits.length - 1].score;
  const first = audits[0].score;
  const delta = latest - first;

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score trend</span>
        <span className={cn("text-xs font-semibold", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground")}>
          {delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : "→ No change"} since first audit
        </span>
      </div>
      <ResponsiveContainer width="100%" height={72}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 10px" }}
            formatter={(v: number) => [`${v}/100`, "Score"]}
          />
          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Single audit results ─────────────────────────────────────────────────────

function AuditResults({ competitor, audit, allAudits, onRerun, loading }: {
  competitor: Competitor;
  audit: CroAudit;
  allAudits: CroAudit[];
  onRerun: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="font-bold text-base">{competitor.name}</span>
        <a href={competitor.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
          {competitor.url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Score + breakdown */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-8">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <ScoreRing score={audit.score} />
              <span className="text-xs text-muted-foreground">CRO Score</span>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 pt-1">
              {Object.entries(audit.breakdown).map(([key, val]) => (
                <BreakdownBar key={key} label={BREAKDOWN_LABELS[key] ?? key} value={val} />
              ))}
            </div>
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

      {/* A/B Tests */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm">A/B Test Quick Wins</span>
          <span className="text-xs text-muted-foreground">({audit.abTests.length})</span>
        </div>
        {audit.abTests.map((test, i) => (
          <Card key={i} className="border-l-2 border-l-violet-400">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span className="font-semibold text-sm">{test.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_STYLE[test.priority])}>{test.priority}</span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", EFFORT_STYLE[test.effort])}>{test.effort}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{test.hypothesis}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{test.category}</span>
                <span className="text-[11px] text-muted-foreground">{test.impact}</span>
              </div>
            </CardContent>
          </Card>
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
          <Card key={i}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{f.category}</span>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", IMPACT_STYLE[f.impact])}>{f.impact} impact</span>
              </div>
              <p className="text-sm font-medium mb-1">{f.issue}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">→ {f.recommendation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Compare view ─────────────────────────────────────────────────────────────

function CompareView({ a, b, onRerunA, onRerunB, loadingA, loadingB }: {
  a: Competitor; b: Competitor;
  onRerunA: () => void; onRerunB: () => void;
  loadingA: boolean; loadingB: boolean;
}) {
  const auditA = a.croAudits[a.croAudits.length - 1];
  const auditB = b.croAudits[b.croAudits.length - 1];

  const categories = auditA ? Object.keys(auditA.breakdown) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4">
        {[{ c: a, audit: auditA, onRerun: onRerunA, loading: loadingA }, { c: b, audit: auditB, onRerun: onRerunB, loading: loadingB }].map(({ c, audit, onRerun, loading }) => (
          <Card key={c.id}>
            <CardContent className="pt-4 pb-4 flex flex-col items-center gap-2 text-center">
              {audit ? (
                <>
                  <ScoreRing score={audit.score} size={80} />
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <a href={c.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-0.5">
                      {c.url.replace(/^https?:\/\//, "").slice(0, 30)} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <Button variant="outline" size="sm" onClick={onRerun} disabled={loading} className="h-7 text-xs">
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <BarChart2 className="h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs font-medium">{c.name}</p>
                  <Button size="sm" onClick={onRerun} disabled={loading} className="h-7 text-xs">
                    {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                    Audit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown comparison */}
      {auditA && auditB && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score breakdown</p>
            {categories.map((key) => {
              const vA = auditA.breakdown[key] ?? 0;
              const vB = auditB.breakdown[key] ?? 0;
              const winner = vA > vB ? "a" : vA < vB ? "b" : "tie";
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{BREAKDOWN_LABELS[key] ?? key}</span>
                    <span className={cn("text-[10px] font-semibold", winner === "tie" ? "text-muted-foreground" : "text-primary")}>
                      {winner === "tie" ? "Tied" : `${winner === "a" ? a.name : b.name} wins`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground truncate">{a.name}</span>
                        <span className={cn("font-bold", scoreColor(vA))}>{vA}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40">
                        <div className="h-full rounded-full" style={{ width: `${vA}%`, backgroundColor: scoreRingColor(vA) }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground truncate">{b.name}</span>
                        <span className={cn("font-bold", scoreColor(vB))}>{vB}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40">
                        <div className="h-full rounded-full" style={{ width: `${vB}%`, backgroundColor: scoreRingColor(vB) }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* A/B tests for A only (primary) */}
      {auditA && auditA.abTests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-500" />
            <span className="font-semibold text-sm">A/B Tests for {a.name}</span>
          </div>
          {auditA.abTests.slice(0, 4).map((test, i) => (
            <Card key={i} className="border-l-2 border-l-violet-400">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="font-semibold text-sm">{test.title}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_STYLE[test.priority])}>{test.priority}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", EFFORT_STYLE[test.effort])}>{test.effort}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{test.hypothesis}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [auditing, setAuditing] = useState<Set<string>>(new Set());

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
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    const json = await res.json();
    setAdding(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to add"); return; }
    setName(""); setUrl("");
    await load();
    setSelectedId(json.data.id);
    toast.success(`${json.data.name} added`);
  };

  const remove = async (id: string) => {
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(competitors.find((c) => c.id !== id)?.id ?? null);
    if (compareId === id) setCompareId(null);
    toast.success("Removed");
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

  const selected = competitors.find((c) => c.id === selectedId) ?? null;
  const compared = competitors.find((c) => c.id === compareId) ?? null;
  const isComparing = !!selected && !!compared;

  if (loading) return null;

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left panel */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">CRO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Score and A/B test ideas per URL</p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <Input placeholder="Name (e.g. Casino UK)" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-8 text-xs" />
            <Button onClick={add} disabled={adding || !name.trim() || !url.trim()} size="sm" className="w-full h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add URL
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-0.5 flex-1 overflow-y-auto">
          {competitors.map((c) => {
            const latestAudit = c.croAudits[c.croAudits.length - 1];
            const isPrimary = c.id === selectedId;
            const isCompare = c.id === compareId;
            return (
              <div key={c.id} className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all group cursor-pointer",
                isPrimary ? "bg-primary/10" : isCompare ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-muted"
              )}>
                <div className="flex-1 min-w-0" onClick={() => { setSelectedId(c.id); if (compareId === c.id) setCompareId(null); }}>
                  <p className={cn("text-sm font-medium truncate", isPrimary ? "text-primary" : isCompare ? "text-violet-600 dark:text-violet-400" : "")}>{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.url.replace(/^https?:\/\//, "")}</p>
                </div>
                {latestAudit && (
                  <span className={cn("text-xs font-bold tabular-nums shrink-0", scoreColor(latestAudit.score))}>{latestAudit.score}</span>
                )}
                {/* Compare toggle */}
                {selectedId && c.id !== selectedId && (
                  <button
                    onClick={() => setCompareId(isCompare ? null : c.id)}
                    title={isCompare ? "Remove from compare" : "Compare with selected"}
                    className={cn("shrink-0 transition-all", isCompare ? "opacity-100 text-violet-500" : "opacity-0 group-hover:opacity-60 text-muted-foreground hover:text-violet-500")}
                  >
                    {isCompare ? <X className="h-3.5 w-3.5" /> : <GitCompare className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => remove(c.id)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {competitors.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-4">Add a URL to get started</p>
          )}
        </div>

        {compareId && (
          <div className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <GitCompare className="h-3 w-3 shrink-0" />
            Comparing {selected?.name} vs {compared?.name}
            <button onClick={() => setCompareId(null)} className="ml-auto hover:text-violet-800"><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-6">
        {!selected ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Select a URL on the left</div>
        ) : isComparing ? (
          <CompareView
            a={selected} b={compared!}
            onRerunA={() => runAudit(selected.id)} onRerunB={() => runAudit(compared!.id)}
            loadingA={auditing.has(selected.id)} loadingB={auditing.has(compared!.id)}
          />
        ) : selected.croAudits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <BarChart2 className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-semibold">{selected.name}</p>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mt-0.5">
                {selected.url} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">Run a CRO audit to get a score, breakdown, A/B test ideas and actionable findings.</p>
            <Button onClick={() => runAudit(selected.id)} disabled={auditing.has(selected.id)}>
              {auditing.has(selected.id) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {auditing.has(selected.id) ? "Auditing…" : "Run CRO Audit"}
            </Button>
          </div>
        ) : (
          <AuditResults
            competitor={selected}
            audit={selected.croAudits[selected.croAudits.length - 1]}
            allAudits={selected.croAudits}
            onRerun={() => runAudit(selected.id)}
            loading={auditing.has(selected.id)}
          />
        )}
      </div>
    </div>
  );
}
