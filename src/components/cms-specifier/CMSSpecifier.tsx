"use client";

import { useState, useRef, useCallback, useId } from "react";
import { Upload, Plus, Trash2, Copy, Check, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Annotation {
  id: string;
  label: string;
  type: "section" | "provider" | "hardcoded";
  x: number;
  y: number;
  fieldPath: string;
  fieldType: string;
  notes: string;
}

const TYPE_OPTIONS = [
  { value: "provider",  label: "Provider (CMS)",  pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",  pin: "bg-blue-500"  },
  { value: "section",   label: "Section",          pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",    pin: "bg-red-500"   },
  { value: "hardcoded", label: "Hardcoded",        pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", pin: "bg-amber-400" },
] as const;

const FIELD_TYPES = ["text", "image", "richtext", "number", "boolean", "array", "url", "date", "N/A"];

function typeStyle(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];
}

export function CMSSpecifier() {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(URL.createObjectURL(file));
    setAnnotations([]);
    setSelected(null);
  }, [imageObjectUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = `${uid}-${Date.now()}`;
    const next: Annotation = { id, label: `Field ${annotations.length + 1}`, type: "provider", x, y, fieldPath: "", fieldType: "text", notes: "" };
    setAnnotations((prev) => [...prev, next]);
    setSelected(id);
  };

  const update = (id: string, patch: Partial<Annotation>) =>
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const remove = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selected === id) setSelected(null);
  };

  const exportMarkdown = () => {
    const rows = annotations
      .map((a, i) => `| ${i + 1}. ${a.label} | ${a.type} | ${a.fieldPath || "N/A"} | ${a.fieldType} | ${a.notes} |`)
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

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left: upload + annotation list ── */}
      <div className="w-[360px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Upload */}
        <div
          className={cn("p-4 border-b transition-colors shrink-0", isDragging && "bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {imageObjectUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageObjectUrl} alt="Uploaded" className="h-12 w-20 object-cover rounded border shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">Screenshot uploaded</p>
                <p className="text-[11px] text-muted-foreground">Click on the image to place field markers</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-primary shrink-0">Replace</button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm font-medium">Upload screenshot</span>
              <span className="text-xs">Drag & drop or click to browse</span>
            </button>
          )}
        </div>

        {/* Annotation list */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 p-6">
              <FileSearch className="h-9 w-9 opacity-25" />
              <p className="text-sm">{imageObjectUrl ? "Click anywhere on the screenshot to place a field marker." : "Upload a screenshot to get started."}</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {annotations.map((ann, i) => {
                const ts = typeStyle(ann.type);
                const isOpen = selected === ann.id;
                return (
                  <div
                    key={ann.id}
                    className={cn("rounded-lg border transition-all", isOpen ? "border-primary/40 shadow-sm" : "border-border")}
                  >
                    {/* Header row */}
                    <div
                      className="flex items-center gap-2 p-2.5 cursor-pointer"
                      onClick={() => setSelected(isOpen ? null : ann.id)}
                    >
                      <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0", ts.pin)}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{ann.label || `Field ${i + 1}`}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", ts.pill)}>{ts.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(ann.id); }}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Expanded form */}
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 border-t pt-2.5">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Label</label>
                          <Input
                            value={ann.label}
                            onChange={(e) => update(ann.id, { label: e.target.value })}
                            className="h-7 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Source Type</label>
                          <div className="flex gap-1 mt-1">
                            {TYPE_OPTIONS.map((t) => (
                              <button
                                key={t.value}
                                onClick={() => update(ann.id, { type: t.value as Annotation["type"] })}
                                className={cn("flex-1 text-[10px] font-semibold py-1 rounded border transition-colors",
                                  ann.type === t.value ? `${t.pin} text-white border-transparent` : "border-border text-muted-foreground hover:border-primary/40"
                                )}
                              >
                                {t.value === "provider" ? "Provider" : t.value === "section" ? "Section" : "Static"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Field Path</label>
                          <Input
                            value={ann.fieldPath}
                            onChange={(e) => update(ann.id, { fieldPath: e.target.value })}
                            placeholder="e.g. product.title"
                            className="h-7 text-xs mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Field Type</label>
                          <select
                            value={ann.fieldType}
                            onChange={(e) => update(ann.id, { fieldType: e.target.value })}
                            className="w-full h-7 text-xs mt-1 rounded-md border border-input bg-background px-2 outline-none focus:ring-1 focus:ring-ring"
                          >
                            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notes</label>
                          <Input
                            value={ann.notes}
                            onChange={(e) => update(ann.id, { notes: e.target.value })}
                            placeholder="Optional notes"
                            className="h-7 text-xs mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {annotations.length > 0 && (
          <div className="border-t p-3 shrink-0">
            <Button variant="outline" size="sm" onClick={exportMarkdown} className="w-full gap-1.5 h-8 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy spec as Markdown"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: annotated image + spec table ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <FileSearch className="h-12 w-12 opacity-20" />
            <p className="text-sm">Annotated screenshot and spec will appear here</p>
          </div>
        ) : (
          <>
            {/* Clickable annotated image */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
              <div
                className="relative inline-block cursor-crosshair"
                onClick={handleImageClick}
              >
                <img
                  src={imageObjectUrl}
                  alt="Screenshot"
                  className="rounded-lg border shadow-sm max-h-[55vh] max-w-full block select-none"
                  draggable={false}
                />
                {annotations.map((ann, i) => {
                  const ts = typeStyle(ann.type);
                  return (
                    <div
                      key={ann.id}
                      className="absolute pointer-events-none"
                      style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <span className={cn(
                        "h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white",
                        ts.pin,
                        selected === ann.id && "ring-primary scale-125"
                      )}>
                        {i + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 pb-2 pt-1 flex items-center gap-5 text-xs text-muted-foreground border-t">
              {TYPE_OPTIONS.map((t) => (
                <span key={t.value} className="flex items-center gap-1.5 pt-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", t.pin)} />
                  {t.label}
                </span>
              ))}
              <span className="flex items-center gap-1 pt-2 ml-auto text-[11px]">
                <Plus className="h-3 w-3" /> Click image to add marker
              </span>
            </div>

            {/* Spec table */}
            {annotations.length > 0 && (
              <div className="border-t bg-background overflow-auto" style={{ maxHeight: "40vh" }}>
                <div className="px-5 py-3 border-b sticky top-0 bg-background z-10">
                  <h3 className="text-sm font-semibold">CMS Field Specification</h3>
                </div>
                <div className="overflow-x-auto">
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
                        const ts = typeStyle(ann.type);
                        return (
                          <tr
                            key={ann.id}
                            className={cn("border-b last:border-0 cursor-pointer transition-colors", selected === ann.id ? "bg-muted/50" : "hover:bg-muted/20")}
                            onClick={() => setSelected(selected === ann.id ? null : ann.id)}
                          >
                            <td className="px-4 py-2.5">
                              <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center", ts.pin)}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">{ann.label || `Field ${i + 1}`}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", ts.pill)}>
                                {ann.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{ann.fieldPath || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{ann.fieldType}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{ann.notes || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
