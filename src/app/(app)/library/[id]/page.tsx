"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2, Lightbulb, Target, User, MapPin, Monitor, ZoomIn, ZoomOut, RotateCcw, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Pencil } from "lucide-react";
import { STATUS_STYLES } from "@/lib/library-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
  placement: string | null;
  platform: string | null;
  ppcOwner: string | null;
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
              {widget.placement && (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{widget.placement}
                </span>
              )}
              {widget.platform && (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Monitor className="h-3 w-3" />{widget.platform}
                </span>
              )}
              {widget.ppcOwner && (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCog className="h-3 w-3" />PPC: {widget.ppcOwner}
                </span>
              )}
              <span className="text-xs text-muted-foreground/60">
                Added by {widget.createdBy.name ?? widget.createdBy.email} · {format(new Date(widget.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton href={`/library/${widget.id}/edit`} variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </LinkButton>
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
        <div className="rounded-xl overflow-hidden border border-border bg-muted relative">
          <TransformWrapper minScale={0.5} maxScale={4} centerOnInit>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Controls */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border p-1">
                  <button
                    onClick={() => zoomIn()}
                    className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Reset"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <TransformComponent
                  wrapperStyle={{ width: "100%", cursor: "grab" }}
                  contentStyle={{ width: "100%" }}
                >
                  <img
                    src={widget.screenshotUrl!}
                    alt={widget.name}
                    className="w-full h-auto block"
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
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
