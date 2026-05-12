"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Loader2, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  { value: "content_editing", label: "Content Editing", description: "Creating, editing, or formatting content" },
  { value: "media", label: "Media Management", description: "Uploading, organising, or using images/files" },
  { value: "publishing", label: "Publishing Workflow", description: "Scheduling, reviewing, or deploying content" },
  { value: "navigation", label: "Navigation & UX", description: "Finding things, menus, layout, or general usability" },
  { value: "performance", label: "Performance", description: "Slow loading, lag, or timeouts" },
  { value: "permissions", label: "Permissions & Access", description: "User roles, access control, or restrictions" },
  { value: "integrations", label: "Integrations", description: "Third-party tools, APIs, or plugins" },
  { value: "other", label: "Other", description: "Anything that doesn't fit above" },
];

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Minor annoyance", color: "text-green-600" },
  2: { label: "Slows me down occasionally", color: "text-lime-600" },
  3: { label: "Frequent friction", color: "text-yellow-600" },
  4: { label: "Blocks me regularly", color: "text-orange-600" },
  5: { label: "Critical — stops me working", color: "text-red-600" },
};

export function CmsFeedbackForm() {
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = category && severity > 0 && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cms-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, severity, description: description.trim(), suggestion: suggestion.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit");
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-semibold">Thank you for your feedback!</h2>
        <p className="text-muted-foreground max-w-sm">
          Your input helps us understand what to improve in the CMS. We review all submissions regularly.
        </p>
        <Button variant="outline" onClick={() => { setCategory(""); setSeverity(0); setDescription(""); setSuggestion(""); setSubmitted(false); }}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquarePlus className="h-6 w-6 text-primary" />
          Share CMS Feedback
        </h1>
        <p className="text-muted-foreground mt-1">
          Tell us what&apos;s frustrating or broken in the CMS. Your feedback goes directly to the team.
        </p>
      </div>

      {/* Category */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. What area is affected?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "text-left border rounded-lg px-4 py-3 transition-all",
                category === c.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
              )}
            >
              <p className="font-medium text-sm">{c.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Severity */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          2. How painful is this?
        </h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSeverity(n)}
              className={cn(
                "flex-1 border rounded-lg py-3 text-sm font-bold transition-all",
                severity === n
                  ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                  : "border-border hover:border-muted-foreground/40 text-muted-foreground"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {severity > 0 && (
          <p className={cn("text-sm font-medium", SEVERITY_LABELS[severity].color)}>
            {SEVERITY_LABELS[severity].label}
          </p>
        )}
      </section>

      {/* Description */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          3. Describe the pain point
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What exactly happens? When does it occur? What were you trying to do?"
          rows={5}
          maxLength={2000}
          className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
      </section>

      {/* Suggestion */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          4. What would help? <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
        </h2>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="If you have an idea for a fix or improvement, share it here…"
          rows={3}
          maxLength={1000}
          className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
        />
      </section>

      <Button onClick={handleSubmit} disabled={!canSubmit || saving} size="lg" className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Submit Feedback
      </Button>
    </div>
  );
}
