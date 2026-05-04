"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Copy, Check, FileSearch, Trash2, RefreshCw, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CMS_CONFIG } from "@/lib/cms-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "section" | "provider" | "hardcoded";

interface Annotation {
  id: string;
  label: string;
  sourceType: SourceType;
  fieldPath: string;
  fieldType: string;
  notes: string;
  x: number; y: number; w: number; h: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SourceType, {
  label: string; color: string;
  border: string; bg: string; badge: string;
  pill: string; dot: string; toolbar: string; toolbarActive: string;
}> = {
  section: {
    label: "Section",
    color: "#ef4444",
    border: "border-red-500",
    bg: "bg-red-500/10",
    badge: "bg-red-500",
    pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
    toolbar: "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950",
    toolbarActive: "bg-red-500 text-white border-red-500",
  },
  provider: {
    label: "Provider",
    color: "#3b82f6",
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
    toolbar: "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950",
    toolbarActive: "bg-blue-500 text-white border-blue-500",
  },
  hardcoded: {
    label: "Hardcoded",
    color: "#f59e0b",
    border: "border-amber-400",
    bg: "bg-amber-400/10",
    badge: "bg-amber-400",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-400",
    toolbar: "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950",
    toolbarActive: "bg-amber-400 text-white border-amber-400",
  },
};

const FIELD_TYPES = ["text", "image", "richtext", "number", "boolean", "array", "url", "date", "N/A"];

function cfg(t: string) { return TYPE_CONFIG[t as SourceType] ?? TYPE_CONFIG.hardcoded; }

function getFieldsFor(type: SourceType) {
  if (type === "section") return CMS_CONFIG.section;
  if (type === "provider") return CMS_CONFIG.provider;
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Annotator() {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<SourceType>("provider");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(URL.createObjectURL(file));
    setAnnotations([]);
    setSelectedId(null);
  }, [imageObjectUrl]);

  const reset = () => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
    setAnnotations([]);
    setSelectedId(null);
    setDrawPreview(null);
  };

  // ── Drawing ──
  const getPct = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = imageContainerRef.current;
    if (!el) return;
    const pos = getPct(e, el);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setSelectedId(null);
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const el = imageContainerRef.current;
    if (!el) return;
    const pos = getPct(e, el);
    setDrawPreview({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const el = imageContainerRef.current;
    if (!el) return;
    const pos = getPct(e, el);
    const x = Math.min(drawStart.x, pos.x);
    const y = Math.min(drawStart.y, pos.y);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);

    if (w > 1.5 && h > 1.5) {
      const id = `ann-${Date.now()}`;
      setAnnotations((prev) => [
        ...prev,
        {
          id, label: "", sourceType: activeType,
          fieldPath: "N/A", fieldType: "text",
          notes: "", x, y, w, h,
        },
      ]);
      setSelectedId(id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);
  };

  // ── Updates ──
  const update = (id: string, patch: Partial<Annotation>) =>
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));

  const remove = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Export ──
  const exportMarkdown = () => {
    const rows = annotations.map((a, i) =>
      `| ${i + 1} | **${a.label || "—"}** | ${a.sourceType} | \`${a.fieldPath}\` | ${a.fieldType} | ${a.notes || "—"} |`
    ).join("\n");
    const md = [
      "# CMS Field Specification",
      "",
      "| # | Element | Source | Field Path | Type | Notes |",
      "|---|---------|--------|------------|------|-------|",
      rows,
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left sidebar ── */}
      <div className="w-[320px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">CMS Annotations</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Draw boxes on elements to map them to CMS fields</p>
        </div>

        {/* Upload compact */}
        <div
          className={cn("px-4 py-3 border-b shrink-0 transition-colors", isDragging && "bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {imageObjectUrl ? (
            <div className="flex items-center gap-2.5">
              <img src={imageObjectUrl} alt="" className="h-10 w-16 object-cover rounded border shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}</p>
                <p className="text-[10px] text-muted-foreground">Draw boxes on the image →</p>
              </div>
              <button onClick={reset} title="New screenshot" className="text-muted-foreground/50 hover:text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="text-xs">Upload screenshot</span>
            </button>
          )}
        </div>

        {/* Selected annotation form OR list */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            /* Edit form */
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center", cfg(selected.sourceType).badge)}>
                    {annotations.findIndex((a) => a.id === selected.id) + 1}
                  </span>
                  <span className="text-xs font-semibold">Edit annotation</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelectedId(null)} className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border">
                    Done
                  </button>
                  <button onClick={() => remove(selected.id)} className="text-muted-foreground/40 hover:text-destructive ml-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Label</label>
                  <Input
                    value={selected.label}
                    onChange={(e) => update(selected.id, { label: e.target.value })}
                    placeholder="e.g. Bonus Offer Text"
                    className="h-7 text-xs mt-1"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Type</label>
                  <div className="flex gap-1.5 mt-1">
                    {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => update(selected.id, { sourceType: t as SourceType, fieldPath: "N/A", fieldType: "text" })}
                        className={cn(
                          "flex-1 text-[10px] font-semibold py-1 rounded border transition-colors",
                          selected.sourceType === t ? cfg(t).toolbarActive : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {t === "hardcoded" ? "Static" : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {selected.sourceType !== "hardcoded" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Field Path</label>
                    <Input
                      value={selected.fieldPath === "N/A" ? "" : selected.fieldPath}
                      onChange={(e) => update(selected.id, { fieldPath: e.target.value || "N/A" })}
                      placeholder="e.g. provider.offers.amount"
                      className="h-7 text-[11px] font-mono mt-1"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Field Type</label>
                  <select
                    value={selected.fieldType}
                    onChange={(e) => update(selected.id, { fieldType: e.target.value })}
                    className="w-full h-7 text-[11px] rounded-md border border-input bg-background px-2 mt-1 outline-none focus:ring-1 focus:ring-ring"
                  >
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
                  <Input
                    value={selected.notes}
                    onChange={(e) => update(selected.id, { notes: e.target.value })}
                    placeholder="Optional dev notes"
                    className="h-7 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          ) : annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 p-6">
              <MousePointer2 className="h-8 w-8 opacity-20" />
              <p className="text-sm">
                {imageObjectUrl
                  ? "Select a type above, then draw a box on any element in the screenshot."
                  : "Upload a screenshot to start annotating."}
              </p>
            </div>
          ) : (
            /* Annotation list */
            <div className="divide-y">
              {annotations.map((ann, i) => {
                const c = cfg(ann.sourceType);
                return (
                  <button
                    key={ann.id}
                    onClick={() => setSelectedId(ann.id)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-start gap-2.5"
                  >
                    <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5", c.badge)}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold truncate">{ann.label || <span className="text-muted-foreground italic">Unlabeled</span>}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{ann.fieldPath}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", c.pill)}>{ann.sourceType}</span>
                        <span className="text-[10px] text-muted-foreground">{ann.fieldType}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Export */}
        {annotations.length > 0 && (
          <div className="border-t p-3 shrink-0">
            <Button variant="outline" size="sm" onClick={exportMarkdown} className="w-full gap-1.5 h-8 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Export spec as Markdown"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: canvas area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Type toolbar */}
        {imageObjectUrl && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Draw as:</span>
            {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => {
              const c = cfg(t);
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all",
                    activeType === t ? c.toolbarActive : c.toolbar
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", activeType === t ? "bg-white" : c.dot)} />
                  {c.label}
                </button>
              );
            })}
            <span className="ml-auto text-[10px] text-muted-foreground">Click and drag to annotate an element</span>
          </div>
        )}

        {/* Image canvas */}
        {!imageObjectUrl ? (
          <div
            className={cn("flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors bg-muted/20", isDragging && "bg-primary/5")}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                <Upload className="h-8 w-8 opacity-30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop a screenshot here</p>
                <p className="text-xs mt-0.5 text-muted-foreground">or click to browse</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-6">
            <div
              ref={imageContainerRef}
              className="relative inline-block select-none"
              style={{ cursor: isDrawing ? "crosshair" : "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawStart(null); setDrawPreview(null); } }}
            >
              <img
                src={imageObjectUrl}
                alt="Screenshot"
                className="rounded-lg border shadow-md max-h-[80vh] max-w-full block"
                draggable={false}
              />

              {/* Existing annotations */}
              {annotations.map((ann, i) => {
                const c = cfg(ann.sourceType);
                const isSelected = selectedId === ann.id;
                return (
                  <div
                    key={ann.id}
                    className={cn(
                      "absolute border-2 rounded transition-all",
                      c.border, c.bg,
                      isSelected && "ring-2 ring-offset-1 ring-white"
                    )}
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
                  >
                    {/* Label float */}
                    <div className="absolute -top-6 left-0 flex items-center gap-1 pointer-events-none">
                      <span className={cn("h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow", c.badge)}>
                        {i + 1}
                      </span>
                      {ann.label && (
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow", c.badge)}>
                          {ann.label}
                        </span>
                      )}
                    </div>
                    {/* Field path inside box */}
                    {ann.fieldPath !== "N/A" && ann.w > 12 && ann.h > 6 && (
                      <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 pointer-events-none overflow-hidden">
                        <span className="text-[8px] font-mono font-semibold bg-black/60 text-white px-1 py-0.5 rounded truncate">
                          {ann.fieldPath}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Drawing preview */}
              {drawPreview && drawPreview.w > 0.5 && (
                <div
                  className={cn("absolute border-2 rounded pointer-events-none", cfg(activeType).border, cfg(activeType).bg)}
                  style={{ left: `${drawPreview.x}%`, top: `${drawPreview.y}%`, width: `${drawPreview.w}%`, height: `${drawPreview.h}%` }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
