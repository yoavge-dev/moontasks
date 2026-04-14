"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2, Lightbulb, Target, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { STATUS_STYLES } from "@/lib/library-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Widget = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  hypothesis: string;
  targetKpi: string;
  status: string;
  screenshotUrl: string | null;
  figmaUrl: string | null;
  createdBy: { id: string; name: string | null; email: string };
  createdAt: string;
};

export default function LibraryWidgetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/library/${id}`)
      .then((r) => r.json())
      .then((json) => { setWidget(json.data ?? null); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this widget from the library?")) return;
    setDeleting(true);
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Widget deleted");
      router.push("/library");
    } else {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="aspect-video bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-medium text-muted-foreground">Widget not found</p>
        <LinkButton href="/library" variant="outline" className="mt-4">Back to Library</LinkButton>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/library" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{widget.name}</h1>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[widget.status] ?? STATUS_STYLES.draft)}>
                {widget.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {widget.category}
              </span>
              <span className="text-xs text-muted-foreground/60">
                Added by {widget.createdBy.name ?? widget.createdBy.email} · {format(new Date(widget.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {widget.figmaUrl && (
            <a
              href={widget.figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Figma
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Screenshot */}
      {widget.screenshotUrl && (
        <div className="rounded-xl overflow-hidden border border-border aspect-video relative bg-muted">
          <Image src={widget.screenshotUrl} alt={widget.name} fill className="object-cover" />
        </div>
      )}

      {/* Description */}
      {widget.description && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{widget.description}</p>
        </div>
      )}

      {/* Hypothesis & KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Hypothesis
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{widget.hypothesis}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Target KPI
          </div>
          <p className="text-2xl font-bold text-primary">{widget.targetKpi}</p>
          <p className="text-xs text-muted-foreground">Primary metric this widget is designed to move</p>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <User className="h-4 w-4" />
          Added by
        </div>
        <p className="text-sm text-muted-foreground">
          {widget.createdBy.name ?? widget.createdBy.email} on {format(new Date(widget.createdAt), "MMMM d, yyyy")}
        </p>
      </div>
    </div>
  );
}
