"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Send, Copy, Check, FileSearch, RefreshCw, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface Annotation {
  id: string;
  label: string;
  type: "section" | "provider" | "hardcoded";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpecRow {
  element: string;
  description: string;
  sourceType: string;
  fieldPath: string;
  fieldType: string;
  notes: string;
}

interface AnalysisResult {
  annotations: Annotation[];
  spec: SpecRow[];
}

const TYPE_STYLES = {
  section:   { box: "border-red-500 bg-red-500/10",    badge: "bg-red-500",    pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"    },
  provider:  { box: "border-blue-500 bg-blue-500/10",  badge: "bg-blue-500",   pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"  },
  hardcoded: { box: "border-amber-400 bg-amber-400/10", badge: "bg-amber-400", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const FIELD_TYPES = ["text", "image", "richtext", "number", "boolean", "array", "url", "date", "N/A"];

function parseResult(text: string): AnalysisResult | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function cleanText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

export function CMSSpecifier() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editingSpec, setEditingSpec] = useState<SpecRow[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendToAPI = useCallback(async (allMessages: ChatMessage[], b64: string | null, mime: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms-specifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, imageBase64: b64, imageMimeType: mime }),
      });
      const data = await res.json();
      if (data.message) {
        const assistantMsg: ChatMessage = { role: "assistant", content: data.message };
        const updated = [...allMessages, assistantMsg];
        setMessages(updated);
        const parsed = parseResult(data.message);
        if (parsed) {
          setResult(parsed);
          setEditingSpec(parsed.spec);
        }
      } else {
        const errMsg: ChatMessage = { role: "assistant", content: `Error: ${data.error ?? "Something went wrong"}` };
        setMessages([...allMessages, errMsg]);
      }
    } catch (err) {
      const errMsg: ChatMessage = { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Network error"}` };
      setMessages([...allMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      const mime = file.type;
      setImageBase64(base64);
      setImageMimeType(mime);
      setImageObjectUrl(URL.createObjectURL(file));
      setMessages([]);
      setResult(null);
      setEditingSpec(null);
      const initial: ChatMessage = { role: "user", content: "Please analyze this UI screenshot and generate the CMS field specification." };
      setMessages([initial]);
      sendToAPI([initial], base64, mime);
    };
    reader.readAsDataURL(file);
  }, [imageObjectUrl, sendToAPI]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !imageBase64) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    sendToAPI(updated, imageBase64, imageMimeType);
  };

  const reset = useCallback(() => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setMessages([]);
    setInput("");
    setImageBase64(null);
    setImageObjectUrl(null);
    setResult(null);
    setEditingSpec(null);
  }, [imageObjectUrl]);

  const updateSpecRow = (i: number, patch: Partial<SpecRow>) => {
    setEditingSpec((prev) => prev ? prev.map((r, idx) => idx === i ? { ...r, ...patch } : r) : prev);
  };

  const removeSpecRow = (i: number) => {
    setEditingSpec((prev) => prev ? prev.filter((_, idx) => idx !== i) : prev);
  };

  const exportMarkdown = () => {
    const spec = editingSpec ?? result?.spec ?? [];
    const rows = spec.map((r) => `| ${r.element} | ${r.description} | ${r.sourceType} | ${r.fieldPath} | ${r.fieldType} | ${r.notes} |`).join("\n");
    const md = ["# CMS Field Specification", "", "| Element | Description | Source Type | Field Path | Field Type | Notes |", "|---------|-------------|-------------|------------|------------|-------|", rows].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spec = editingSpec ?? result?.spec ?? [];

  return (
    <div className="flex overflow-hidden -mx-6 -mt-6" style={{ height: "calc(100vh - 3rem)" }}>

      {/* ── Left: upload + chat ── */}
      <div className="w-[380px] shrink-0 flex flex-col border-r bg-background">

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
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img src={imageObjectUrl} alt="Uploaded" className="w-full max-h-40 object-contain rounded-lg border" />
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/50 rounded-lg flex items-center justify-center transition-all gap-2">
                <button onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="opacity-0 group-hover:opacity-100 bg-background border rounded-full p-1.5 shadow-sm transition-opacity" title="Remove">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">Upload screenshot</span>
              <span className="text-xs">Claude will auto-generate the CMS spec</span>
            </button>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !imageObjectUrl && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 pb-8">
              <FileSearch className="h-10 w-10 opacity-25" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Upload a screenshot</p>
                <p className="text-xs">Claude will analyze it and generate the CMS field specification. You can then review and correct.</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const isSpec = m.role === "assistant" && parseResult(m.content) !== null;
            const displayText = m.role === "assistant" ? cleanText(m.content) : m.content;
            const isError = displayText.startsWith("Error:");
            return (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" :
                  isError ? "bg-destructive/10 text-destructive rounded-bl-sm" :
                  "bg-muted text-foreground rounded-bl-sm"
                )}>
                  {isSpec
                    ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Spec generated — see the panel on the right</span>
                    : displayText || <span className="opacity-40 italic text-xs">…</span>
                  }
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3 flex gap-2 items-end shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={imageObjectUrl ? "Correct or add context…" : "Upload a screenshot first"}
            disabled={!imageObjectUrl || isLoading}
            className="min-h-[52px] max-h-[100px] resize-none text-sm"
            rows={2}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading || !imageObjectUrl} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Right: annotated image + editable spec table ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <FileSearch className="h-12 w-12 opacity-20" />
            <p className="text-sm">Annotated screenshot and spec will appear here</p>
          </div>
        ) : (
          <>
            {/* Annotated image */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
              <div className="relative inline-block">
                <img src={imageObjectUrl} alt="Screenshot" className="rounded-lg border shadow-sm max-h-[52vh] max-w-full block select-none" draggable={false} />
                {result?.annotations.map((ann) => {
                  const s = TYPE_STYLES[ann.type] ?? TYPE_STYLES.hardcoded;
                  return (
                    <div key={ann.id} className={cn("absolute border-2 rounded pointer-events-none", s.box)}
                      style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}>
                      <span className={cn("absolute -top-5 left-0 text-[9px] font-bold px-1 py-0.5 rounded text-white whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis block", s.badge)}>
                        {ann.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            {result && (
              <div className="px-6 pb-2 pt-2 flex items-center gap-5 text-xs text-muted-foreground border-t">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />Section</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />Provider (CMS)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />Hardcoded</span>
              </div>
            )}

            {/* Editable spec table */}
            {spec.length > 0 && (
              <div className="border-t bg-background overflow-auto" style={{ maxHeight: "42vh" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-background z-10">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">CMS Field Specification</h3>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Pencil className="h-3 w-3" />Editable</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportMarkdown} className="gap-1.5 h-7 text-xs">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy as Markdown"}
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {["Element", "Description", "Source", "Field Path", "Type", "Notes", ""].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {spec.map((row, i) => {
                        const s = TYPE_STYLES[row.sourceType as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.hardcoded;
                        return (
                          <tr key={i} className="border-b last:border-0 group hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-1.5">
                              <Input value={row.element} onChange={(e) => updateSpecRow(i, { element: e.target.value })} className="h-6 text-xs font-medium min-w-[100px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={row.description} onChange={(e) => updateSpecRow(i, { description: e.target.value })} className="h-6 text-xs min-w-[140px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <select value={row.sourceType} onChange={(e) => updateSpecRow(i, { sourceType: e.target.value })}
                                className="h-6 text-[10px] rounded border border-input bg-background px-1.5 outline-none focus:ring-1 focus:ring-ring">
                                <option value="provider">provider</option>
                                <option value="section">section</option>
                                <option value="hardcoded">hardcoded</option>
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={row.fieldPath} onChange={(e) => updateSpecRow(i, { fieldPath: e.target.value })} className="h-6 text-[10px] font-mono min-w-[120px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <select value={row.fieldType} onChange={(e) => updateSpecRow(i, { fieldType: e.target.value })}
                                className="h-6 text-[10px] rounded border border-input bg-background px-1.5 outline-none focus:ring-1 focus:ring-ring">
                                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={row.notes} onChange={(e) => updateSpecRow(i, { notes: e.target.value })} className="h-6 text-xs min-w-[100px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <button onClick={() => removeSpecRow(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
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
