"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, AlertCircle, CheckCircle2, Clock, ExternalLink,
  ArrowRight, PlusCircle, MinusCircle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { DiffItem, DiffSection } from "@/lib/scrape";

interface Snapshot {
  id: string;
  hasChanges: boolean;
  changesSince: string | null;
  rawDiff: string | null;
  createdAt: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  snapshots: Snapshot[];
}

const SECTION_LABELS: Record<DiffSection, string> = {
  title: "Page title",
  description: "Meta description",
  headline: "Hero headline",
  nav: "Navigation",
  cta: "CTA button",
  pricing: "Pricing",
  sections: "Page sections",
};

function DiffDisplay({ rawDiff, changesSince }: { rawDiff: string | null; changesSince: string | null }) {
  let items: DiffItem[] = [];
  if (rawDiff) {
    try { items = JSON.parse(rawDiff) as DiffItem[]; } catch { /* fall through */ }
  }

  if (items.length === 0) {
    return changesSince ? (
      <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line leading-relaxed">
        {changesSince}
      </p>
    ) : null;
  }

  const grouped = items.reduce<Record<string, DiffItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([section, sectionItems]) => (
        <div key={section}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
            {SECTION_LABELS[section as DiffSection] ?? section}
          </p>
          <div className="space-y-1.5">
            {sectionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                {item.type === "added" && <PlusCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                {item.type === "removed" && <MinusCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                {item.type === "changed" && <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />}
                <span className="leading-relaxed">
                  {item.type === "changed" ? (
                    <>
                      <span className="line-through text-amber-700/60 dark:text-amber-300/50">{item.before}</span>
                      <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                      <span className="font-medium">{item.value}</span>
                    </>
                  ) : (
                    <span className={item.type === "removed" ? "line-through opacity-60" : "font-medium"}>
                      {item.value}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {changesSince && (
        <div className="pt-2 mt-2 border-t border-amber-200 dark:border-amber-700">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
            What this means
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line leading-relaxed">
            {changesSince}
          </p>
        </div>
      )}
    </div>
  );
}

// Static example card shown until the user has seen a real change
const EXAMPLE_DIFF: DiffItem[] = [
  { section: "headline", type: "changed", value: "The #1 PM tool for fast-moving teams", before: "Save time on tasks" },
  { section: "cta",      type: "changed", value: "Get started — it's free",             before: "Start free trial" },
];

function ExampleCard() {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Example — what a change alert looks like
        </p>
      </div>

      <Card className="border-amber-400 border-2 opacity-80 pointer-events-none select-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-semibold text-sm">Acme Corp</span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  https://acme.com <ExternalLink className="h-3 w-3" />
                </span>
                <Badge variant="secondary" className="ml-auto text-amber-600 bg-amber-100 border-amber-200 text-[10px]">
                  Changes detected
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <DiffDisplay rawDiff={JSON.stringify(EXAMPLE_DIFF)} changesSince={null} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        You'll get an in-app notification and see a breakdown like this the moment something changes.
      </p>
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/competitors");
    const json = await res.json();
    setCompetitors(json.data ?? []);
    setLoading(false);
  }, []);

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
    setCompetitors((prev) => [json.data, ...prev]);
    setName(""); setUrl("");
    toast.success(`${json.data.name} added — baseline scan running`);
    setTimeout(() => load(), 5000);
  };

  const remove = async (id: string) => {
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    toast.success("Removed");
  };

  if (loading) return null;

  const hasAnyChanges = competitors.some((c) => c.snapshots[0]?.hasChanges);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add competitor URLs. We scan them daily at 10am and notify you the moment anything changes — headlines, CTAs, pricing, navigation.
        </p>
      </div>

      {/* Add competitor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Track a competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Name (e.g. Acme)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-40 shrink-0"
            />
            <Input
              placeholder="https://competitor.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={adding || !name.trim() || !url.trim()} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Competitor list */}
      {competitors.length > 0 && (
        <div className="space-y-3">
          {competitors.map((c) => {
            const latest = c.snapshots[0];
            const isPending = !latest;
            return (
              <Card key={c.id} className={latest?.hasChanges ? "border-amber-400 border-2" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isPending && <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />}
                      {!isPending && !latest.hasChanges && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {latest?.hasChanges && <AlertCircle className="h-4 w-4 text-amber-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <a
                          href={c.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 truncate max-w-xs"
                        >
                          {c.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <span className="ml-auto shrink-0">
                          {isPending ? (
                            <Badge variant="secondary" className="text-[10px]">Setting up</Badge>
                          ) : latest.hasChanges ? (
                            <Badge variant="secondary" className="text-amber-600 bg-amber-100 border-amber-200 text-[10px]">
                              Changes detected
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Checked {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </span>
                      </div>

                      {isPending && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reading the current site — this is your baseline. Daily checks start tomorrow at 10am.
                        </p>
                      )}

                      {!isPending && !latest.hasChanges && (
                        <p className="text-xs text-muted-foreground mt-1">No changes since last check</p>
                      )}

                      {latest?.hasChanges && (latest.changesSince || latest.rawDiff) && (
                        <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <DiffDisplay rawDiff={latest.rawDiff} changesSince={latest.changesSince} />
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Example preview — shown until the user has seen at least one real change */}
      {!hasAnyChanges && <ExampleCard />}
    </div>
  );
}
