"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Loader2, RefreshCw, ChevronRight, Zap, AlertTriangle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  createdAt: string;
}

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

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={108} height={108} className="-rotate-90">
        <circle cx={54} cy={54} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/20" />
        <circle
          cx={54} cy={54} r={r} fill="none"
          stroke={scoreRingColor(score)} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-black tabular-nums", scoreColor(score))}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", scoreColor(value))}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: scoreRingColor(value) }}
        />
      </div>
    </div>
  );
}

function AuditResults({ audit, onRerun, loading }: { audit: CroAudit; onRerun: () => void; loading: boolean }) {
  return (
    <div className="space-y-6">
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

      {/* A/B Test quick wins */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          <h2 className="font-semibold text-sm">A/B Test Quick Wins</h2>
          <span className="text-xs text-muted-foreground">({audit.abTests.length})</span>
        </div>
        <div className="space-y-2">
          {audit.abTests.map((test, i) => (
            <Card key={i} className="border-l-2 border-l-violet-400">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="font-semibold text-sm">{test.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_STYLE[test.priority])}>
                      {test.priority}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", EFFORT_STYLE[test.effort])}>
                      {test.effort}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{test.hypothesis}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                    {test.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{test.impact}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-sm">Findings</h2>
          <span className="text-xs text-muted-foreground">({audit.findings.length})</span>
        </div>
        <div className="space-y-2">
          {audit.findings.map((finding, i) => (
            <Card key={i}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {finding.category}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", IMPACT_STYLE[finding.impact])}>
                      {finding.impact} impact
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">{finding.issue}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">→ {finding.recommendation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/competitors");
    const json = await res.json();
    const list: Competitor[] = (json.data ?? []).map((c: Competitor & { croAudits: Array<CroAudit & { breakdown: string; abTests: string; findings: string }> }) => ({
      ...c,
      croAudits: c.croAudits.map((a) => ({
        ...a,
        breakdown: typeof a.breakdown === "string" ? JSON.parse(a.breakdown) : a.breakdown,
        abTests: typeof a.abTests === "string" ? JSON.parse(a.abTests) : a.abTests,
        findings: typeof a.findings === "string" ? JSON.parse(a.findings) : a.findings,
      })),
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
    toast.success("Removed");
  };

  const runAudit = async () => {
    if (!selectedId) return;
    setAuditing(true);
    const res = await fetch(`/api/competitors/${selectedId}/cro-audit`, { method: "POST" });
    const json = await res.json();
    setAuditing(false);
    if (!res.ok) { toast.error(json.error ?? "Audit failed"); return; }
    await load();
    toast.success("CRO audit complete");
  };

  const selected = competitors.find((c) => c.id === selectedId) ?? null;
  const audit = selected?.croAudits?.[0] ?? null;

  if (loading) return null;

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left: URL list */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">CRO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Score and A/B test ideas per URL</p>
        </div>

        {/* Add form */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <Input
              placeholder="Name (e.g. Casino UK)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="h-8 text-xs"
            />
            <Button onClick={add} disabled={adding || !name.trim() || !url.trim()} size="sm" className="w-full h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add URL
            </Button>
          </CardContent>
        </Card>

        {/* URL list */}
        <div className="space-y-1 flex-1 overflow-y-auto">
          {competitors.map((c) => {
            const a = c.croAudits?.[0];
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group",
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.url.replace(/^https?:\/\//, "")}</p>
                </div>
                {a ? (
                  <span className={cn("text-xs font-bold tabular-nums shrink-0", scoreColor(a.score))}>{a.score}</span>
                ) : (
                  <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-opacity", isSelected ? "opacity-60" : "opacity-0 group-hover:opacity-40")} />
                <button
                  onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            );
          })}

          {competitors.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-4">Add a URL to get started</p>
          )}
        </div>
      </div>

      {/* Right: Audit results */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Select a URL on the left
          </div>
        ) : !audit ? (
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
            <p className="text-sm text-muted-foreground max-w-xs">
              Run a CRO audit to get a score, breakdown, A/B test ideas and actionable findings.
            </p>
            <Button onClick={runAudit} disabled={auditing}>
              {auditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {auditing ? "Auditing…" : "Run CRO Audit"}
            </Button>
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-base">{selected.name}</h2>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                {selected.url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <AuditResults audit={audit} onRerun={runAudit} loading={auditing} />
          </div>
        )}

        {auditing && !audit && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching and analyzing page — this takes ~15 seconds…
          </div>
        )}
      </div>
    </div>
  );
}
