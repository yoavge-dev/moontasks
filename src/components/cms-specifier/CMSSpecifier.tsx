"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Copy, Check, FileSearch, X, Search, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmsField {
  path: string;
  type: string;
}

interface Annotation {
  id: string;
  label: string;
  sourceType: "provider" | "section" | "hardcoded";
  fieldPath: string;
  fieldType: string;
  notes: string;
  x: number;
  y: number;
}

interface PendingPin {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenSchema(obj: unknown, prefix = ""): CmsField[] {
  if (typeof obj === "string") return [{ path: prefix, type: obj }];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, val]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") return [{ path, type: val }];
    if (typeof val === "object") return flattenSchema(val, path);
    return [];
  });
}

function parseSchema(raw: string): CmsField[] {
  raw = raw.trim();
  if (!raw) return [];

  // Try JSON first
  try {
    const parsed = JSON.parse(raw);
    return flattenSchema(parsed);
  } catch { /* not JSON */ }

  // Plain text: "path.to.field: type" or "path.to.field"
  return raw.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return [];
    const [path, type] = trimmed.split(":").map((s) => s.trim());
    if (!path) return [];
    return [{ path, type: type || "text" }];
  });
}

const SOURCE_TYPES = [
  { value: "provider",  label: "Provider (CMS)", pin: "bg-blue-500",  pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "section",   label: "Section",         pin: "bg-red-500",   pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "hardcoded", label: "Hardcoded",        pin: "bg-amber-400", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

const FIELD_TYPES = ["text", "image", "richtext", "number", "boolean", "array", "url", "date", "N/A"];

function pinColor(sourceType: string) {
  return SOURCE_TYPES.find((t) => t.value === sourceType)?.pin ?? "bg-slate-500";
}
function pillStyle(sourceType: string) {
  return SOURCE_TYPES.find((t) => t.value === sourceType)?.pill ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CMSSpecifier() {
  const [schemaRaw, setSchemaRaw] = useState("");
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [fields, setFields] = useState<CmsField[]>([]);
  const [parseError, setParseError] = useState("");

  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending) setTimeout(() => searchRef.current?.focus(), 50);
  }, [pending]);

  // Close picker on outside click
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

  const parseAndApply = () => {
    try {
      const result = parseSchema(schemaRaw);
      setFields(result);
      setParseError(result.length === 0 ? "No fields found — check the format." : "");
      if (result.length > 0) setSchemaOpen(false);
    } catch {
      setParseError("Could not parse schema.");
    }
  };

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
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // picker position relative to viewport
    setPending({ x, y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
    setSearch("");
  };

  const placeAnnotation = (field: CmsField | null, sourceType: "provider" | "section" | "hardcoded") => {
    if (!pending) return;
    const id = `ann-${Date.now()}`;
    const label = field ? field.path.split(".").pop()! : sourceType === "section" ? "Section" : "Static element";
    setAnnotations((prev) => [
      ...prev,
      {
        id,
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

  const updateAnnotation = (id: string, patch: Partial<Annotation>) =>
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const removeAnnotation = (id: string) =>
    setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const exportMarkdown = () => {
    const rows = annotations
      .map((a, i) => `| ${i + 1}. ${a.label} | ${a.sourceType} | ${a.fieldPath} | ${a.fieldType} | ${a.notes || "—"} |`)
      .join("\n");
    const md = ["# CMS Field Specification", "", "| Element | Source Type | Field Path | Field Type | Notes |", "|---------|-------------|------------|------------|-------|", rows].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFields = fields.filter((f) =>
    f.path.toLowerCase().includes(search.toLowerCase()) ||
    f.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left panel ── */}
      <div className="w-[360px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* CMS Schema input */}
        <div className="border-b shrink-0">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
            onClick={() => setSchemaOpen((o) => !o)}
          >
            <span className="flex items-center gap-2">
              {schemaOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              CMS Schema
              {fields.length > 0 && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{fields.length} fields</span>
              )}
            </span>
          </button>
          {schemaOpen && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[11px] text-muted-foreground">Paste your CMS hierarchy — JSON object or one path per line (<code className="font-mono">hero.title: text</code>)</p>
              <textarea
                value={schemaRaw}
                onChange={(e) => setSchemaRaw(e.target.value)}
                placeholder={'{\n  "hero": {\n    "title": "text",\n    "image": "image"\n  }\n}'}
                className="w-full h-36 text-xs font-mono rounded-md border border-input bg-muted/30 p-2.5 resize-none outline-none focus:ring-1 focus:ring-ring"
              />
              {parseError && <p className="text-[11px] text-destructive">{parseError}</p>}
              <Button size="sm" className="w-full h-7 text-xs" onClick={parseAndApply}>Load schema</Button>
            </div>
          )}
        </div>

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
                <p className="text-[11px] text-muted-foreground">Click on the image to place field markers</p>
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

        {/* Annotation list */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 p-6">
              <FileSearch className="h-8 w-8 opacity-20" />
              <p className="text-sm">{imageObjectUrl ? "Click on the screenshot to map elements to CMS fields." : "Load your CMS schema, then upload a screenshot."}</p>
            </div>
          ) : (
            <div className="divide-y">
              {annotations.map((ann, i) => (
                <div key={ann.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0", pinColor(ann.sourceType))}>
                      {i + 1}
                    </span>
                    <Input
                      value={ann.label}
                      onChange={(e) => updateAnnotation(ann.id, { label: e.target.value })}
                      className="h-6 text-xs font-medium flex-1"
                    />
                    <button onClick={() => removeAnnotation(ann.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pl-7">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Path</p>
                      {fields.length > 0 ? (
                        <select
                          value={ann.fieldPath}
                          onChange={(e) => {
                            const f = fields.find((f) => f.path === e.target.value);
                            updateAnnotation(ann.id, { fieldPath: e.target.value, fieldType: f?.type ?? ann.fieldType });
                          }}
                          className="w-full h-6 text-[10px] font-mono rounded border border-input bg-background px-1.5 outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="N/A">N/A</option>
                          {fields.map((f) => <option key={f.path} value={f.path}>{f.path}</option>)}
                        </select>
                      ) : (
                        <Input value={ann.fieldPath} onChange={(e) => updateAnnotation(ann.id, { fieldPath: e.target.value })} className="h-6 text-[10px] font-mono" />
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Type</p>
                      <select
                        value={ann.fieldType}
                        onChange={(e) => updateAnnotation(ann.id, { fieldType: e.target.value })}
                        className="w-full h-6 text-[10px] rounded border border-input bg-background px-1.5 outline-none focus:ring-1 focus:ring-ring"
                      >
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="pl-7">
                    <Input
                      value={ann.notes}
                      onChange={(e) => updateAnnotation(ann.id, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="h-6 text-[10px]"
                    />
                  </div>
                </div>
              ))}
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

      {/* ── Right panel: image + spec table ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <FileSearch className="h-12 w-12 opacity-20" />
            <p className="text-sm">Annotated screenshot will appear here</p>
          </div>
        ) : (
          <>
            {/* Annotated image with picker */}
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

                {/* Pins */}
                {annotations.map((ann, i) => (
                  <div
                    key={ann.id}
                    className="absolute pointer-events-none"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white", pinColor(ann.sourceType))}>
                      {i + 1}
                    </span>
                  </div>
                ))}

                {/* Pending crosshair */}
                {pending && (
                  <div
                    className="absolute pointer-events-none"
                    style={{ left: `${pending.x}%`, top: `${pending.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <span className="h-5 w-5 rounded-full bg-primary/60 ring-2 ring-white animate-pulse flex items-center justify-center" />
                  </div>
                )}

                {/* Field picker popover */}
                {pending && (
                  <div
                    id="cms-picker"
                    className="absolute z-50 w-64 bg-popover border rounded-xl shadow-xl overflow-hidden"
                    style={{
                      left: Math.min(pending.screenX + 12, (imageRef.current?.offsetWidth ?? 600) - 270),
                      top: Math.min(pending.screenY + 12, (imageRef.current?.offsetHeight ?? 400) - 320),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search CMS fields…"
                        className="flex-1 text-xs outline-none bg-transparent placeholder:text-muted-foreground"
                      />
                      <button onClick={() => { setPending(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Quick picks */}
                    <div className="flex gap-1 p-2 border-b">
                      <button onClick={() => placeAnnotation(null, "section")}
                        className="flex-1 text-[10px] font-semibold py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                        Section
                      </button>
                      <button onClick={() => placeAnnotation(null, "hardcoded")}
                        className="flex-1 text-[10px] font-semibold py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                        Hardcoded
                      </button>
                    </div>

                    {/* CMS fields list */}
                    <div className="max-h-48 overflow-y-auto">
                      {fields.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-4 px-3">No schema loaded — paste your CMS hierarchy on the left</p>
                      ) : filteredFields.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-4">No matches</p>
                      ) : (
                        filteredFields.slice(0, 30).map((f) => (
                          <button
                            key={f.path}
                            onClick={() => placeAnnotation(f, "provider")}
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/60 transition-colors gap-2"
                          >
                            <span className="text-xs font-mono truncate">{f.path}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{f.type}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            {annotations.length > 0 && (
              <div className="px-6 pb-2 pt-2 flex items-center gap-5 text-xs text-muted-foreground border-t">
                {SOURCE_TYPES.map((t) => (
                  <span key={t.value} className="flex items-center gap-1.5 pt-1">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", t.pin)} />{t.label}
                  </span>
                ))}
              </div>
            )}

            {/* Spec table */}
            {annotations.length > 0 && (
              <div className="border-t bg-background overflow-auto" style={{ maxHeight: "38vh" }}>
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
                    {annotations.map((ann, i) => (
                      <tr key={ann.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className={cn("h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center", pinColor(ann.sourceType))}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{ann.label}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", pillStyle(ann.sourceType))}>
                            {ann.sourceType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{ann.fieldPath}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{ann.fieldType}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{ann.notes || "—"}</td>
                      </tr>
                    ))}
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
