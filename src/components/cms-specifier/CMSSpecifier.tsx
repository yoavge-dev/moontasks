"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Copy, Check, FileSearch, X, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CMS_CONFIG, type CmsField } from "@/lib/cms-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "section" | "provider" | "hardcoded";

interface Annotation {
  id: string;
  label: string;
  sourceType: SourceType;
  fieldPath: string;
  fieldType: string;
  notes: string;
  x: number;
  y: number;
}

interface PendingPin {
  x: number;
  y: number;
  imgX: number;
  imgY: number;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const SOURCE_STYLES: Record<SourceType, { pin: string; pill: string; tab: string; tabActive: string }> = {
  section:   { pin: "bg-red-500",   pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",       tab: "text-red-600",   tabActive: "bg-red-500 text-white"   },
  provider:  { pin: "bg-blue-500",  pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",   tab: "text-blue-600",  tabActive: "bg-blue-500 text-white"  },
  hardcoded: { pin: "bg-amber-400", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", tab: "text-amber-600", tabActive: "bg-amber-400 text-white" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CMSSpecifier() {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [pickerTab, setPickerTab] = useState<SourceType>("provider");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending) setTimeout(() => searchRef.current?.focus(), 50);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const handler = (e: MouseEvent) => {
      const picker = document.getElementById("cms-picker");
      if (picker && !picker.contains(e.target as Node)) {
        setPending(null);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pending]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(URL.createObjectURL(file));
    setAnnotations([]);
    setPending(null);
  }, [imageObjectUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pending) { setPending(null); setSearch(""); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setPending({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      imgX: e.clientX - rect.left,
      imgY: e.clientY - rect.top,
    });
    setSearch("");
  };

  const place = (field: CmsField | null, sourceType: SourceType) => {
    if (!pending) return;
    const label = field
      ? field.path.split(".").pop()!
      : sourceType === "section" ? "Section" : "Static";
    setAnnotations((prev) => [
      ...prev,
      {
        id: `ann-${Date.now()}`,
        label,
        sourceType,
        fieldPath: field?.path ?? "N/A",
        fieldType: field?.type ?? "N/A",
        notes: "",
        x: pending.x,
        y: pending.y,
      },
    ]);
    setPending(null);
    setSearch("");
  };

  const update = (id: string, patch: Partial<Annotation>) =>
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));

  const remove = (id: string) =>
    setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const exportMarkdown = () => {
    const rows = annotations
      .map((a, i) => `| ${i + 1}. ${a.label} | ${a.sourceType} | ${a.fieldPath} | ${a.fieldType} | ${a.notes || "—"} |`)
      .join("\n");
    const md = [
      "# CMS Field Specification",
      "",
      "| Element | Source Type | Field Path | Field Type | Notes |",
      "|---------|-------------|------------|------------|-------|",
      rows,
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFields: CmsField[] = pickerTab === "section"
    ? [...CMS_CONFIG.section]
    : pickerTab === "provider"
    ? [...CMS_CONFIG.provider]
    : [];

  const filtered = activeFields.filter((f) =>
    f.path.toLowerCase().includes(search.toLowerCase()) ||
    f.hint.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left: annotation list ── */}
      <div className="w-[340px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Upload */}
        <div
          className={cn("p-4 border-b shrink-0 transition-colors", isDragging && "bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {imageObjectUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageObjectUrl} alt="Screenshot" className="h-12 w-20 object-cover rounded border shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Screenshot loaded</p>
                <p className="text-[11px] text-muted-foreground">Click elements on the image to map them</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-primary shrink-0">Replace</button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="h-5 w-5" />
              <span className="text-sm font-medium">Upload screenshot</span>
              <span className="text-xs">Then click elements to map to CMS fields</span>
            </button>
          )}
        </div>

        {/* Legend / schema summary */}
        <div className="px-4 py-2.5 border-b flex gap-3 text-[10px] font-semibold shrink-0">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />{CMS_CONFIG.section.length} section fields</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />{CMS_CONFIG.provider.length} provider fields</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />hardcoded</span>
        </div>

        {/* Annotation list */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 p-6">
              <FileSearch className="h-8 w-8 opacity-20" />
              <p className="text-sm">
                {imageObjectUrl
                  ? "Click on any element in the screenshot to start mapping."
                  : "Upload a screenshot to get started."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {annotations.map((ann, i) => {
                const s = SOURCE_STYLES[ann.sourceType];
                return (
                  <div key={ann.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0", s.pin)}>
                        {i + 1}
                      </span>
                      <Input
                        value={ann.label}
                        onChange={(e) => update(ann.id, { label: e.target.value })}
                        className="h-6 text-xs font-medium flex-1"
                      />
                      <button onClick={() => remove(ann.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pl-7">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Path</p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate" title={ann.fieldPath}>{ann.fieldPath}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Type</p>
                        <p className="text-[10px] text-muted-foreground">{ann.fieldType}</p>
                      </div>
                    </div>
                    <div className="pl-7">
                      <Input
                        value={ann.notes}
                        onChange={(e) => update(ann.id, { notes: e.target.value })}
                        placeholder="Notes (optional)"
                        className="h-6 text-[10px]"
                      />
                    </div>
                  </div>
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
              {copied ? "Copied!" : "Copy spec as Markdown"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: image + spec table ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <FileSearch className="h-12 w-12 opacity-20" />
            <p className="text-sm">Annotated screenshot will appear here</p>
          </div>
        ) : (
          <>
            {/* Clickable image */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
              <div
                ref={imageRef}
                className="relative inline-block cursor-crosshair select-none"
                onClick={handleImageClick}
              >
                <img
                  src={imageObjectUrl}
                  alt="Screenshot"
                  className="rounded-lg border shadow-sm max-h-[55vh] max-w-full block"
                  draggable={false}
                />

                {/* Placed pins */}
                {annotations.map((ann, i) => (
                  <div key={ann.id} className="absolute pointer-events-none"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -50%)" }}>
                    <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white", SOURCE_STYLES[ann.sourceType].pin)}>
                      {i + 1}
                    </span>
                  </div>
                ))}

                {/* Pending pulse */}
                {pending && (
                  <div className="absolute pointer-events-none"
                    style={{ left: `${pending.x}%`, top: `${pending.y}%`, transform: "translate(-50%, -50%)" }}>
                    <span className="h-5 w-5 rounded-full bg-primary/50 ring-2 ring-white animate-pulse block" />
                  </div>
                )}

                {/* Picker popover */}
                {pending && (
                  <div
                    id="cms-picker"
                    className="absolute z-50 w-68 bg-popover border rounded-xl shadow-xl overflow-hidden"
                    style={{
                      left: Math.min(pending.imgX + 14, (imageRef.current?.offsetWidth ?? 600) - 280),
                      top: Math.min(pending.imgY + 14, (imageRef.current?.offsetHeight ?? 400) - 340),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search */}
                    <div className="flex items-center gap-1.5 px-2.5 py-2 border-b">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fields…"
                        className="flex-1 text-xs outline-none bg-transparent placeholder:text-muted-foreground"
                      />
                      <button onClick={() => { setPending(null); setSearch(""); }}>
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>

                    {/* Type tabs */}
                    <div className="flex border-b">
                      {(["section", "provider", "hardcoded"] as SourceType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPickerTab(t)}
                          className={cn(
                            "flex-1 text-[10px] font-semibold py-1.5 transition-colors",
                            pickerTab === t ? SOURCE_STYLES[t].tabActive : "text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          {t === "hardcoded" ? "Static" : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Hardcoded quick place */}
                    {pickerTab === "hardcoded" ? (
                      <div className="p-3">
                        <p className="text-[11px] text-muted-foreground mb-2">Mark this element as static/hardcoded — not CMS-driven.</p>
                        <button
                          onClick={() => place(null, "hardcoded")}
                          className="w-full py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors"
                        >
                          Mark as Hardcoded
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-5">No matches</p>
                        ) : (
                          filtered.map((f) => (
                            <button
                              key={f.path}
                              onClick={() => place(f, pickerTab)}
                              className="w-full flex flex-col px-3 py-2 text-left hover:bg-muted/60 transition-colors border-b last:border-0"
                            >
                              <span className="text-xs font-mono">{f.path}</span>
                              <span className="text-[10px] text-muted-foreground">{f.hint} · {f.type}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Spec table */}
            {annotations.length > 0 && (
              <div className="border-t bg-background overflow-auto" style={{ maxHeight: "40vh" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-background z-10">
                  <h3 className="text-sm font-semibold">CMS Field Specification</h3>
                  <Button variant="outline" size="sm" onClick={exportMarkdown} className="gap-1.5 h-7 text-xs">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy as Markdown"}
                  </Button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["#", "Element", "Source", "Field Path", "Type", "Notes"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {annotations.map((ann, i) => {
                      const s = SOURCE_STYLES[ann.sourceType];
                      return (
                        <tr key={ann.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center", s.pin)}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">{ann.label}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold", s.pill)}>{ann.sourceType}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{ann.fieldPath}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{ann.fieldType}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{ann.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
