"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Snapshot {
  id: string;
  hasChanges: boolean;
  changesSince: string | null;
  createdAt: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  snapshots: Snapshot[];
  checking?: boolean;
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
    toast.success(`${json.data.name} added`);
  };

  const remove = async (id: string) => {
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    toast.success("Removed");
  };

  const check = async (id: string) => {
    setCompetitors((prev) => prev.map((c) => c.id === id ? { ...c, checking: true } : c));
    const res = await fetch(`/api/competitors/${id}/check`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Check failed");
      setCompetitors((prev) => prev.map((c) => c.id === id ? { ...c, checking: false } : c));
      return;
    }
    const { snapshot } = json.data;
    setCompetitors((prev) => prev.map((c) =>
      c.id === id ? { ...c, checking: false, snapshots: [snapshot, ...c.snapshots] } : c
    ));
    if (snapshot.hasChanges) toast.success("Changes detected!");
    else toast.success("No changes since last check");
  };

  const checkAll = async () => {
    for (const c of competitors) await check(c.id);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitor Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor UI and messaging changes on competitor websites</p>
        </div>
        {competitors.length > 0 && (
          <Button variant="outline" size="sm" onClick={checkAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Check all
          </Button>
        )}
      </div>

      {/* Add competitor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add competitor</CardTitle>
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
      {competitors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competitors added yet.</p>
      ) : (
        <div className="space-y-4">
          {competitors.map((c) => {
            const latest = c.snapshots[0];
            return (
              <Card key={c.id} className={latest?.hasChanges ? "border-amber-400 border-2" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-0.5 shrink-0">
                      {!latest && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {latest && !latest.hasChanges && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {latest?.hasChanges && <AlertCircle className="h-4 w-4 text-amber-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <a href={c.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 truncate max-w-xs">
                          {c.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        {latest && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            Checked {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {!latest && (
                        <p className="text-xs text-muted-foreground mt-1">Never checked — click "Check now" to take a snapshot</p>
                      )}

                      {latest?.hasChanges && latest.changesSince && (
                        <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Changes detected</p>
                          <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                            {latest.changesSince}
                          </p>
                        </div>
                      )}

                      {latest && !latest.hasChanges && (
                        <p className="text-xs text-muted-foreground mt-1">No changes since last check</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => check(c.id)}
                        disabled={c.checking}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${c.checking ? "animate-spin" : ""}`} />
                        {c.checking ? "Checking…" : "Check now"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
