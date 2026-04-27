"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Upload, ImageIcon, Loader2, X, ArrowLeft } from "lucide-react";
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

interface Project { id: string; name: string; }

interface VariantDraft {
  name: string;
  description: string;
  file: File | null;
  preview: string;
}

function VariantCard({ variant, index, total, onChange, onRemove, uploading }: {
  variant: VariantDraft;
  index: number;
  total: number;
  onChange: (v: Partial<VariantDraft>) => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const preview = URL.createObjectURL(file);
    onChange({ file, preview });
  };

  return (
    <Card className="overflow-hidden">
      {/* Screenshot zone */}
      <div
        className={cn(
          "relative group cursor-pointer transition-all",
          variant.preview ? "h-48" : "h-32 border-b-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20"
        )}
        onClick={() => !variant.preview && fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
      >
        {variant.preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={variant.preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                className="bg-white/20 backdrop-blur text-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white/30">
                <Upload className="h-3.5 w-3.5" /> Replace
              </button>
              <button onClick={(e) => { e.stopPropagation(); onChange({ file: null, preview: "" }); }}
                className="bg-white/20 backdrop-blur text-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white/30">
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
              <ImageIcon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Drop screenshot or click to upload</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={variant.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={index === 0 ? "Control" : `Variant ${String.fromCharCode(64 + index)}`}
              className="h-8 text-sm font-medium"
            />
          </div>
          {total > 2 && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <Input
          value={variant.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's different in this variant? (optional)"
          className="h-8 text-xs text-muted-foreground"
        />
      </CardContent>
    </Card>
  );
}

export default function NewABTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [hypothesis, setHypothesis] = useState(searchParams.get("hypothesis") ?? "");
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "");
  const [startDate, setStartDate] = useState("");
  const [plannedDays, setPlannedDays] = useState("30");
  const [pageUrl, setPageUrl] = useState("");
  const [kpi, setKpi] = useState("");
  const [targetUplift, setTargetUplift] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([
    { name: "Control", description: "", file: null, preview: "" },
    { name: "Variant A", description: "", file: null, preview: "" },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.data ?? []));
  }, []);

  const updateVariant = (i: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  };

  const addVariant = () => {
    const letter = String.fromCharCode(64 + variants.length);
    setVariants((prev) => [...prev, { name: `Variant ${letter}`, description: "", file: null, preview: "" }]);
  };

  const removeVariant = (i: number) => setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!name.trim()) { toast.error("Test name is required"); return; }
    if (!hypothesis.trim()) { toast.error("Hypothesis is required"); return; }
    if (variants.some((v) => !v.name.trim())) { toast.error("All variants need a name"); return; }

    setSaving(true);

    // 1. Create the test
    const testRes = await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        hypothesis: hypothesis.trim(),
        plannedDays: parseInt(plannedDays) || 30,
        pageUrl: pageUrl.trim() || null,
        kpi: kpi || null,
        targetUplift: targetUplift.trim() || null,
        projectId: projectId || null,
        startedAt: startDate ? new Date(startDate).toISOString() : null,
      }),
    });
    const testJson = await testRes.json();
    if (!testRes.ok) { toast.error(testJson.error ?? "Failed to create"); setSaving(false); return; }
    const testId: string = testJson.data.id;

    // 2. Create variants
    const variantIds: string[] = [];
    for (const v of variants) {
      const vRes = await fetch(`/api/ab-tests/${testId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name.trim(), description: v.description.trim() || undefined }),
      });
      const vJson = await vRes.json();
      if (vRes.ok) variantIds.push(vJson.data.id);
    }

    // 3. Upload variant screenshots
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.file || !variantIds[i]) continue;
      setUploadingIdx(i);
      const fd = new FormData();
      fd.append("file", v.file);
      await fetch(`/api/ab-tests/${testId}/variants/${variantIds[i]}/screenshot`, { method: "POST", body: fd });
    }

    setSaving(false);
    toast.success("Experiment created!");
    router.push(`/ab-tests/${testId}`);
  };

  const endDate = startDate && plannedDays
    ? new Date(new Date(startDate).getTime() + parseInt(plannedDays) * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <Link href="/ab-tests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Experiments
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Experiment</h1>
        <p className="text-sm text-muted-foreground mt-1">Set up your test before you run it</p>
      </div>

      {/* ── Section 1: Details ── */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Details</h2>

        <div className="space-y-1">
          <Label>Experiment name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hero CTA copy test" className="text-base" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Page / URL being tested</Label>
            <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://example.com/landing" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Duration (days)</Label>
            <Input type="number" min={1} max={365} value={plannedDays} onChange={(e) => setPlannedDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Expected end</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
              {endDate ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: KPI & Hypothesis ── */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">KPI & Hypothesis</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Primary KPI *</Label>
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
            placeholder="If we change [X] then [Y] will happen because [Z]..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* ── Section 3: Variants ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Variants ({variants.length})
          </h2>
          <Button variant="outline" size="sm" onClick={addVariant} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add variant
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {variants.map((v, i) => (
            <VariantCard
              key={i}
              variant={v}
              index={i}
              total={variants.length}
              onChange={(patch) => updateVariant(i, patch)}
              onRemove={() => removeVariant(i)}
              uploading={uploadingIdx === i}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Upload a screenshot of what each variant looks like — helps your team understand what&apos;s being tested.
        </p>
      </div>

      {/* ── Create button ── */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Link href="/ab-tests" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        <Button onClick={create} disabled={saving || !name.trim() || !hypothesis.trim()} size="lg">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : "Create Experiment"}
        </Button>
      </div>
    </div>
  );
}
