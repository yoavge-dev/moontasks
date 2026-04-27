"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const KPI_OPTIONS = [
  "Conversion Rate",
  "Click-Through Rate (CTR)",
  "Bounce Rate",
  "Revenue per Visit",
  "Average Order Value",
  "Sign-up Rate",
  "Add-to-Cart Rate",
  "Engagement Rate",
  "Time on Page",
  "Custom",
];

interface TestData {
  id: string;
  name: string;
  hypothesis: string;
  projectId: string | null;
  pageUrl: string | null;
  kpi: string | null;
  targetUplift: string | null;
  plannedDays: number;
  startedAt: string | null;
  status: string;
  variants: { id: string; name: string; description: string; screenshotUrl: string }[];
}

interface Project { id: string; name: string; }

export function EditABTestForm({ test, projects }: { test: TestData; projects: Project[] }) {
  const router = useRouter();

  const [name, setName] = useState(test.name);
  const [hypothesis, setHypothesis] = useState(test.hypothesis);
  const [projectId, setProjectId] = useState(test.projectId ?? "");
  const [pageUrl, setPageUrl] = useState(test.pageUrl ?? "");
  const [kpi, setKpi] = useState(test.kpi ?? "");
  const [targetUplift, setTargetUplift] = useState(test.targetUplift ?? "");
  const [plannedDays, setPlannedDays] = useState(String(test.plannedDays));
  const [startDate, setStartDate] = useState(
    test.startedAt ? new Date(test.startedAt).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!hypothesis.trim()) { toast.error("Hypothesis is required"); return; }

    setSaving(true);
    const res = await fetch(`/api/ab-tests/${test.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        hypothesis: hypothesis.trim(),
        projectId: projectId || null,
        pageUrl: pageUrl.trim() || null,
        kpi: kpi || null,
        targetUplift: targetUplift.trim() || null,
        plannedDays: parseInt(plannedDays) || 30,
        ...(test.status === "draft" && startDate
          ? { startedAt: new Date(startDate).toISOString() }
          : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    toast.success("Experiment updated");
    router.push(`/ab-tests/${test.id}`);
  };

  const endDate = startDate && plannedDays
    ? new Date(new Date(startDate).getTime() + parseInt(plannedDays) * 86400000)
        .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <Link href={`/ab-tests/${test.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to experiment
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Experiment</h1>
        <p className="text-sm text-muted-foreground mt-1">Update experiment details. Variants can be managed from the experiment page.</p>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Details</h2>

        <div className="space-y-1">
          <Label>Experiment name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-base" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Project</Label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            >
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Page / URL being tested</Label>
            <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://example.com/landing" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {test.status === "draft" && (
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Duration (days)</Label>
            <Input type="number" min={1} max={365} value={plannedDays} onChange={(e) => setPlannedDays(e.target.value)} />
          </div>
          {startDate && (
            <div className="space-y-1">
              <Label>Expected end</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                {endDate ?? "—"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI & Hypothesis */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">KPI & Hypothesis</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Primary KPI</Label>
            <Select value={kpi} onValueChange={(v) => setKpi(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select a metric" /></SelectTrigger>
              <SelectContent>
                {KPI_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Target uplift</Label>
            <Input value={targetUplift} onChange={(e) => setTargetUplift(e.target.value)} placeholder="e.g. +10%, +5 sign-ups/day" />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Hypothesis *</Label>
          <Textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* Variants note */}
      <div className="rounded-lg bg-muted/40 border px-4 py-3 text-sm text-muted-foreground">
        To add, rename, or remove variants, go back to the experiment page and use the variant controls there.
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Link href={`/ab-tests/${test.id}`} className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        <Button onClick={save} disabled={saving || !name.trim() || !hypothesis.trim()} size="lg">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
}
