"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Copy, Check, FileSearch, Trash2, RefreshCw, MousePointer2, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "section" | "provider" | "hardcoded";
type DragMode = "drawing" | "moving" | "resizing";
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface Box { x: number; y: number; w: number; h: number; }

export interface Annotation extends Box {
  id: string;
  label: string;
  sourceType: SourceType;
  fieldPath: string;
  fieldType: string;
  asset: string;
  notes: string;
}

interface DragState {
  mode: DragMode;
  startX: number; startY: number;
  annId?: string;
  handle?: Handle;
  origBox?: Box;
}

interface AnnotatorProps {
  featureId?: string;
  initialName?: string;
  initialScreenshotUrl?: string;
  initialAnnotations?: Annotation[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const T: Record<SourceType, { border: string; bg: string; badge: string; pill: string; dot: string; active: string; inactive: string }> = {
  section:   { border: "border-red-500",   bg: "bg-red-500/10",    badge: "bg-red-500",    pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",        dot: "bg-red-500",   active: "bg-red-500 text-white border-red-500",    inactive: "border-red-200 text-red-600 hover:bg-red-50"    },
  provider:  { border: "border-blue-500",  bg: "bg-blue-500/10",   badge: "bg-blue-500",   pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    dot: "bg-blue-500",  active: "bg-blue-500 text-white border-blue-500",  inactive: "border-blue-200 text-blue-600 hover:bg-blue-50"  },
  hardcoded: { border: "border-amber-400", bg: "bg-amber-400/10",  badge: "bg-amber-400",  pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-400", active: "bg-amber-400 text-white border-amber-400", inactive: "border-amber-200 text-amber-600 hover:bg-amber-50" },
};
const tc = (t: string) => T[t as SourceType] ?? T.hardcoded;

const FIELD_TYPES = ["text", "image", "richtext", "number", "boolean", "array", "url", "date", "N/A"];
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSORS: Record<Handle, string> = {
  nw: "nw-resize", n: "n-resize",  ne: "ne-resize",
  e:  "e-resize",  se: "se-resize", s:  "s-resize",
  sw: "sw-resize", w:  "w-resize",
};
const HANDLE_POS: Record<Handle, React.CSSProperties> = {
  nw: { left: 0,     top: 0,     transform: "translate(-50%,-50%)" },
  n:  { left: "50%", top: 0,     transform: "translate(-50%,-50%)" },
  ne: { right: 0,    top: 0,     transform: "translate(50%,-50%)"  },
  e:  { right: 0,    top: "50%", transform: "translate(50%,-50%)"  },
  se: { right: 0,    bottom: 0,  transform: "translate(50%,50%)"   },
  s:  { left: "50%", bottom: 0,  transform: "translate(-50%,50%)"  },
  sw: { left: 0,     bottom: 0,  transform: "translate(-50%,50%)"  },
  w:  { left: 0,     top: "50%", transform: "translate(-50%,-50%)" },
};

function resize(orig: Box, handle: Handle, dx: number, dy: number): Box {
  let { x, y, w, h } = orig;
  if (handle.includes("n")) { y += dy; h -= dy; }
  if (handle.includes("s")) { h += dy; }
  if (handle.includes("w")) { x += dx; w -= dx; }
  if (handle.includes("e")) { w += dx; }
  if (w < 1.5) { if (handle.includes("w")) x = orig.x + orig.w - 1.5; w = 1.5; }
  if (h < 1.5) { if (handle.includes("n")) y = orig.y + orig.h - 1.5; h = 1.5; }
  x = Math.max(0, Math.min(x, 100 - w));
  y = Math.max(0, Math.min(y, 100 - h));
  return { x, y, w: Math.min(w, 100 - x), h: Math.min(h, 100 - y) };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Annotator({ featureId, initialName = "", initialScreenshotUrl, initialAnnotations = [] }: AnnotatorProps) {
  const router = useRouter();
  const isEditing = !!featureId;

  const [featureName, setFeatureName] = useState(initialName);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialScreenshotUrl ?? null);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<SourceType>("provider");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<Box | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  // ── Coordinate helper ──
  const toPct = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // ── Document drag listeners ──
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const cur = toPct(e.clientX, e.clientY);
      const dx = cur.x - drag.startX;
      const dy = cur.y - drag.startY;
      if (drag.mode === "drawing") {
        setPreview({ x: Math.min(drag.startX, cur.x), y: Math.min(drag.startY, cur.y), w: Math.abs(dx), h: Math.abs(dy) });
      }
      if (drag.mode === "moving" && drag.annId && drag.origBox) {
        setAnnotations((prev) => prev.map((a) => a.id === drag.annId ? {
          ...a,
          x: Math.max(0, Math.min(100 - drag.origBox!.w, drag.origBox!.x + dx)),
          y: Math.max(0, Math.min(100 - drag.origBox!.h, drag.origBox!.y + dy)),
        } : a));
      }
      if (drag.mode === "resizing" && drag.annId && drag.origBox && drag.handle) {
        const box = resize(drag.origBox, drag.handle, dx, dy);
        setAnnotations((prev) => prev.map((a) => a.id === drag.annId ? { ...a, ...box } : a));
      }
    };
    const onUp = (e: MouseEvent) => {
      if (drag.mode === "drawing") {
        const cur = toPct(e.clientX, e.clientY);
        const x = Math.min(drag.startX, cur.x), y = Math.min(drag.startY, cur.y);
        const w = Math.abs(cur.x - drag.startX), h = Math.abs(cur.y - drag.startY);
        if (w > 1.5 && h > 1.5) {
          const id = `ann-${Date.now()}`;
          setAnnotations((prev) => [...prev, { id, label: "", sourceType: activeType, fieldPath: "N/A", fieldType: "text", asset: "", notes: "", x, y, w, h }]);
          setSelectedId(id);
        }
        setPreview(null);
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [drag, activeType, toPct]);

  // ── Mouse handlers ──
  const onImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = toPct(e.clientX, e.clientY);
    setSelectedId(null);
    setDrag({ mode: "drawing", startX: pos.x, startY: pos.y });
  };
  const onBoxMouseDown = (e: React.MouseEvent, ann: Annotation) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    setSelectedId(ann.id);
    const pos = toPct(e.clientX, e.clientY);
    setDrag({ mode: "moving", startX: pos.x, startY: pos.y, annId: ann.id, origBox: { x: ann.x, y: ann.y, w: ann.w, h: ann.h } });
  };
  const onHandleMouseDown = (e: React.MouseEvent, ann: Annotation, handle: Handle) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const pos = toPct(e.clientX, e.clientY);
    setDrag({ mode: "resizing", startX: pos.x, startY: pos.y, annId: ann.id, handle, origBox: { x: ann.x, y: ann.y, w: ann.w, h: ann.h } });
  };

  // ── File ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageUrl && !initialScreenshotUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setAnnotations([]);
    setSelectedId(null);
  }, [imageUrl, initialScreenshotUrl]);

  // ── Save ──
  const handleSave = async () => {
    if (!featureName.trim()) { alert("Please enter a spec name."); return; }
    if (!imageUrl) { alert("Please upload a screenshot."); return; }
    setIsSaving(true);
    try {
      let screenshotUrl = imageUrl;

      // Upload new file if provided
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const res = await fetch("/api/annotator/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.url) throw new Error("Upload failed");
        screenshotUrl = data.url;
      }

      if (isEditing) {
        await fetch(`/api/annotator/${featureId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: featureName, annotations }),
        });
      } else {
        const res = await fetch("/api/annotator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: featureName, screenshotUrl, annotations }),
        });
        const data = await res.json();
        if (data.data?.id) { router.push(`/annotator/${data.data.id}`); return; }
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Annotation updates ──
  const update = (id: string, patch: Partial<Annotation>) =>
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  const remove = (id: string) => { setAnnotations((prev) => prev.filter((a) => a.id !== id)); if (selectedId === id) setSelectedId(null); };

  // ── Export ──
  const exportMarkdown = () => {
    const rows = annotations.map((a, i) =>
      `| ${i + 1} | **${a.label || "—"}** | ${a.sourceType} | \`${a.fieldPath}\` | ${a.fieldType} | ${a.asset || "—"} | ${a.notes || "—"} |`
    ).join("\n");
    const md = ["# CMS Field Specification", "", "| # | Element | Source | Field Path | Type | Asset | Notes |", "|---|---------|--------|------------|------|-------|-------|", rows].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cursor = drag?.mode === "drawing" ? "crosshair" : drag?.mode === "moving" ? "grabbing" : "crosshair";

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left sidebar ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <LinkButton href="/annotator" variant="ghost" size="sm" className="h-7 px-2 -ml-1">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />All specs
            </LinkButton>
          </div>
          <Input
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="Spec name…"
            className="h-8 text-sm font-semibold"
          />
          <Button onClick={handleSave} disabled={isSaving || !featureName.trim() || !imageUrl} size="sm" className="w-full h-7 text-xs gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save spec"}
          </Button>
        </div>

        {/* Upload */}
        <div
          className={cn("px-4 py-3 border-b shrink-0 transition-colors", isDragging && "bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {imageUrl ? (
            <div className="flex items-center gap-2.5">
              <img src={imageUrl} alt="" className="h-10 w-16 object-cover rounded border shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}</p>
                <p className="text-[10px] text-muted-foreground">Select type → draw on image</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground/50 hover:text-muted-foreground" title="Replace">
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

        {/* Annotation form / list */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center", tc(selected.sourceType).badge)}>
                    {annotations.findIndex((a) => a.id === selected.id) + 1}
                  </span>
                  <span className="text-xs font-semibold">Edit field</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSelectedId(null)} className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border">Done</button>
                  <button onClick={() => remove(selected.id)} className="text-muted-foreground/30 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Label</label>
                  <Input value={selected.label} onChange={(e) => update(selected.id, { label: e.target.value })}
                    placeholder="e.g. Bonus Offer Text" className="h-7 text-xs mt-1" autoFocus />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Type</label>
                  <div className="flex gap-1.5 mt-1">
                    {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => (
                      <button key={t}
                        onClick={() => update(selected.id, { sourceType: t, fieldPath: "N/A" })}
                        className={cn("flex-1 text-[10px] font-semibold py-1 rounded border transition-all",
                          selected.sourceType === t ? tc(t).active : "border-border text-muted-foreground hover:bg-muted/50"
                        )}>
                        {t === "hardcoded" ? "Static" : t[0].toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {selected.sourceType !== "hardcoded" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Field Path</label>
                    <Input value={selected.fieldPath === "N/A" ? "" : selected.fieldPath}
                      onChange={(e) => update(selected.id, { fieldPath: e.target.value || "N/A" })}
                      placeholder="e.g. provider.offers.amount" className="h-7 text-[11px] font-mono mt-1" />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Field Type</label>
                  <select value={selected.fieldType} onChange={(e) => update(selected.id, { fieldType: e.target.value })}
                    className="w-full h-7 text-[11px] rounded-md border border-input bg-background px-2 mt-1 outline-none focus:ring-1 focus:ring-ring">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset</label>
                  <Input value={selected.asset} onChange={(e) => update(selected.id, { asset: e.target.value })}
                    placeholder="e.g. logo.svg, hero-bg.jpg" className="h-7 text-xs mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Asset file or identifier linked to this element</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
                  <Input value={selected.notes} onChange={(e) => update(selected.id, { notes: e.target.value })}
                    placeholder="Dev notes" className="h-7 text-xs mt-1" />
                </div>
              </div>
            </div>
          ) : annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 p-6">
              <MousePointer2 className="h-8 w-8 opacity-20" />
              <p className="text-sm">{imageUrl ? "Pick a type, then draw a box on any element." : "Upload a screenshot to start annotating."}</p>
            </div>
          ) : (
            <div className="divide-y">
              {annotations.map((ann, i) => (
                <button key={ann.id} onClick={() => setSelectedId(ann.id)}
                  className={cn("w-full px-4 py-3 text-left flex items-start gap-2.5 transition-colors", selectedId === ann.id ? "bg-muted/40" : "hover:bg-muted/20")}>
                  <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5", tc(ann.sourceType).badge)}>{i + 1}</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold truncate">{ann.label || <span className="text-muted-foreground italic font-normal">Unlabeled</span>}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{ann.fieldPath}</p>
                    {ann.asset && <p className="text-[10px] text-muted-foreground truncate">Asset: {ann.asset}</p>}
                    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", tc(ann.sourceType).pill)}>{ann.sourceType}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {annotations.length > 0 && (
          <div className="border-t p-3 shrink-0">
            <Button variant="outline" size="sm" onClick={exportMarkdown} className="w-full gap-1.5 h-8 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Export spec as Markdown"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {imageUrl && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Draw as:</span>
            {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => (
              <button key={t} onClick={() => setActiveType(t)}
                className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all",
                  activeType === t ? tc(t).active : tc(t).inactive)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", activeType === t ? "bg-white" : tc(t).dot)} />
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground">Draw · Move · Resize</span>
          </div>
        )}

        {!imageUrl ? (
          <div
            className={cn("flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer bg-muted/20 transition-colors", isDragging && "bg-primary/5")}
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
                <p className="text-xs mt-0.5">or click to browse</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-6">
            <div style={{ userSelect: "none" }}>
              <div ref={containerRef} className="relative inline-block" style={{ cursor }} onMouseDown={onImageMouseDown}>
                <img src={imageUrl} alt="Screenshot" className="rounded-lg border shadow-md max-h-[82vh] max-w-full block" draggable={false} />

                {annotations.map((ann, i) => {
                  const s = tc(ann.sourceType);
                  const isSel = selectedId === ann.id;
                  return (
                    <div key={ann.id}
                      className={cn("absolute border-2 rounded", s.border, s.bg, isSel && "ring-2 ring-white shadow-lg")}
                      style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%`, cursor: "move" }}
                      onMouseDown={(e) => onBoxMouseDown(e, ann)}
                    >
                      <div className="absolute -top-6 left-0 flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <span className={cn("h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-sm", s.badge)}>{i + 1}</span>
                        {ann.label && <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded text-white shadow-sm", s.badge)}>{ann.label}</span>}
                      </div>
                      {ann.fieldPath !== "N/A" && ann.w > 10 && ann.h > 5 && (
                        <div className="absolute bottom-1 left-1 flex gap-1 pointer-events-none flex-wrap">
                          <span className="text-[8px] font-mono font-semibold bg-black/60 text-white px-1 py-0.5 rounded">{ann.fieldPath}</span>
                          {ann.asset && <span className="text-[8px] font-semibold bg-violet-600/80 text-white px-1 py-0.5 rounded">{ann.asset}</span>}
                        </div>
                      )}
                      {isSel && HANDLES.map((h) => (
                        <div key={h} className="absolute w-2.5 h-2.5 bg-white border-2 border-primary rounded-sm shadow-sm z-10"
                          style={{ ...HANDLE_POS[h] as React.CSSProperties, cursor: HANDLE_CURSORS[h] }}
                          onMouseDown={(e) => onHandleMouseDown(e, ann, h)} />
                      ))}
                    </div>
                  );
                })}

                {preview && preview.w > 0.5 && (
                  <div className={cn("absolute border-2 rounded pointer-events-none", tc(activeType).border, tc(activeType).bg)}
                    style={{ left: `${preview.x}%`, top: `${preview.y}%`, width: `${preview.w}%`, height: `${preview.h}%` }} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
