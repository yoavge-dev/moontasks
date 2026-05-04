"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Copy, Check, FileSearch, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "section" | "provider" | "hardcoded";

interface Annotation {
  id: string;
  label: string;
  sourceType: SourceType;
  fieldPath: string;
  fieldType: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES: Record<SourceType, { box: string; badge: string; pill: string; dot: string }> = {
  section:   { box: "border-red-500 bg-red-500/10",    badge: "bg-red-500",    pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",       dot: "bg-red-500"   },
  provider:  { box: "border-blue-500 bg-blue-500/10",  badge: "bg-blue-500",   pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",   dot: "bg-blue-500"  },
  hardcoded: { box: "border-amber-400 bg-amber-400/10", badge: "bg-amber-400", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-400" },
};

function style(t: string) {
  return STYLES[t as SourceType] ?? STYLES.hardcoded;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CMSSpecifier() {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);

    const objUrl = URL.createObjectURL(file);
    setImageObjectUrl(objUrl);
    setAnnotations([]);
    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      try {
        const res = await fetch("/api/cms-specifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, imageMimeType: file.type }),
        });
        const json = await res.json();
        if (json.data?.annotations) {
          setAnnotations(json.data.annotations);
        } else {
          setError(json.error ?? "No annotations returned.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [imageObjectUrl]);

  const reset = () => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
    setAnnotations([]);
    setError(null);
  };

  const exportMarkdown = () => {
    const rows = annotations
      .map((a) => `| ${a.label} | ${a.sourceType} | ${a.fieldPath} | ${a.fieldType} |`)
      .join("\n");
    const md = [
      "# CMS Field Specification",
      "",
      "| Element | Source Type | Field Path | Field Type |",
      "|---------|-------------|------------|------------|",
      rows,
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left: spec table ── */}
      <div className="w-[340px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3.5 border-b shrink-0">
          <h2 className="text-sm font-semibold">CMS Field Specification</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Upload a screenshot — fields are detected automatically</p>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-b flex gap-4 text-[10px] font-semibold shrink-0">
          {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", style(t).dot)} />
              {t}
            </span>
          ))}
        </div>

        {/* Annotation rows */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Analyzing screenshot…</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {!isLoading && !error && annotations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
              <FileSearch className="h-8 w-8 opacity-20" />
              <p className="text-sm">Upload a screenshot and the AI will map every element to the CMS schema automatically.</p>
            </div>
          )}
          {!isLoading && annotations.map((ann, i) => {
            const s = style(ann.sourceType);
            return (
              <div key={ann.id} className="px-4 py-3 border-b last:border-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0", s.badge)}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold truncate flex-1">{ann.label}</span>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", s.pill)}>
                    {ann.sourceType}
                  </span>
                </div>
                <div className="pl-6 space-y-0.5">
                  <p className="text-[10px] font-mono text-muted-foreground">{ann.fieldPath}</p>
                  <p className="text-[10px] text-muted-foreground">{ann.fieldType}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export */}
        {annotations.length > 0 && (
          <div className="border-t p-3 shrink-0">
            <Button variant="outline" size="sm" onClick={exportMarkdown} className="w-full gap-1.5 h-8 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy spec as Markdown"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: annotated image ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          /* Drop zone */
          <div
            className={cn("flex-1 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer", isDragging && "bg-primary/5")}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) analyze(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); }} />
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                <Upload className="h-7 w-7 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop a screenshot here</p>
                <p className="text-xs mt-0.5">or click to browse — AI maps fields instantly</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto flex items-start justify-center p-6 relative">

            {/* Replace button */}
            <button
              onClick={reset}
              className="absolute top-4 right-4 z-10 flex items-center gap-1.5 text-[11px] bg-background border rounded-full px-2.5 py-1 shadow-sm hover:bg-muted transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> New screenshot
            </button>

            {/* Image with overlays */}
            <div className="relative inline-block">
              <img
                src={imageObjectUrl}
                alt="Screenshot"
                className="rounded-lg border shadow-sm max-h-[85vh] max-w-full block"
                draggable={false}
              />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-background/60 rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Detecting fields…</span>
                  </div>
                </div>
              )}

              {/* Annotation boxes */}
              {annotations.map((ann) => {
                const s = style(ann.sourceType);
                return (
                  <div
                    key={ann.id}
                    className={cn("absolute border-2 rounded pointer-events-none", s.box)}
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}
                  >
                    <span className={cn(
                      "absolute -top-5 left-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis block",
                      s.badge
                    )}>
                      {ann.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
