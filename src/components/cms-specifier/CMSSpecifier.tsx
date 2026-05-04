"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Send, Copy, Check, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  section:    { box: "border-red-500 bg-red-500/10",   badge: "bg-red-500",   pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  provider:   { box: "border-blue-500 bg-blue-500/10", badge: "bg-blue-500",  pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  hardcoded:  { box: "border-amber-400 bg-amber-400/10", badge: "bg-amber-400", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

function parseResult(text: string): AnalysisResult | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function cleanAssistantText(text: string): string {
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
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendToAPI = useCallback(async (
    allMessages: ChatMessage[],
    b64: string | null,
    mime: string
  ) => {
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
        if (parsed) setResult(parsed);
      }
    } catch {
      // silently fail — user can retry
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
      const objUrl = URL.createObjectURL(file);

      setImageBase64(base64);
      setImageMimeType(mime);
      setImageObjectUrl(objUrl);
      setMessages([]);
      setResult(null);

      const initialMsg: ChatMessage = {
        role: "user",
        content: "Please analyze this screenshot and ask me clarifying questions to generate a CMS field specification.",
      };
      const initial = [initialMsg];
      setMessages(initial);
      sendToAPI(initial, base64, mime);
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
  }, [imageObjectUrl]);

  const exportMarkdown = () => {
    if (!result) return;
    const rows = result.spec
      .map((r) => `| ${r.element} | ${r.description} | ${r.sourceType} | ${r.fieldPath} | ${r.fieldType} | ${r.notes} |`)
      .join("\n");
    const md = [
      "# CMS Field Specification",
      "",
      "| Element | Description | Source Type | Field Path | Field Type | Notes |",
      "|---------|-------------|-------------|------------|------------|-------|",
      rows,
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex overflow-hidden -mx-6 -mt-6"
      style={{ height: "calc(100vh - 3rem)" }}
    >
      {/* ── Left panel: upload + chat ── */}
      <div className="w-[400px] shrink-0 flex flex-col border-r bg-background">

        {/* Upload zone */}
        <div
          className={cn("p-4 border-b transition-colors", isDragging && "bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {imageObjectUrl ? (
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={imageObjectUrl}
                alt="Uploaded screenshot"
                className="w-full max-h-44 object-contain rounded-lg border"
              />
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 rounded-lg flex items-center justify-center transition-all">
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="opacity-0 group-hover:opacity-100 bg-background border rounded-full p-1.5 shadow-sm transition-opacity"
                  title="Remove image"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">Upload screenshot</span>
              <span className="text-xs">Drag & drop or click to browse</span>
            </button>
          )}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !imageObjectUrl && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 pb-8">
              <FileSearch className="h-10 w-10 opacity-25" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No screenshot yet</p>
                <p className="text-xs">Upload a UI screenshot to start generating a CMS field specification.</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const isSpec = m.role === "assistant" && parseResult(m.content) !== null;
            const displayText = m.role === "assistant" ? cleanAssistantText(m.content) : m.content;

            return (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {isSpec ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Spec generated — see the panel on the right
                    </span>
                  ) : (
                    displayText || <span className="opacity-50 italic text-xs">…</span>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t p-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={imageObjectUrl ? "Answer questions or add context…" : "Upload a screenshot first"}
            disabled={!imageObjectUrl || isLoading}
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !imageObjectUrl}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Right panel: annotated image + spec table ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {!imageObjectUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <FileSearch className="h-12 w-12 opacity-20" />
            <p className="text-sm">Annotated screenshot and spec will appear here</p>
          </div>
        ) : (
          <>
            {/* Annotated image area */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
              <div className="relative inline-block">
                <img
                  src={imageObjectUrl}
                  alt="Screenshot"
                  className="rounded-lg border shadow-sm max-h-[55vh] max-w-full block"
                />
                {result?.annotations.map((ann) => {
                  const style = TYPE_STYLES[ann.type] ?? TYPE_STYLES.hardcoded;
                  return (
                    <div
                      key={ann.id}
                      className={cn("absolute border-2 rounded pointer-events-none", style.box)}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.w}%`,
                        height: `${ann.h}%`,
                      }}
                    >
                      <span
                        className={cn(
                          "absolute -top-5 left-0 text-[9px] font-bold px-1 py-0.5 rounded text-white whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis block",
                          style.badge
                        )}
                      >
                        {ann.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            {result && (
              <div className="px-6 pb-2 flex items-center gap-5 text-xs text-muted-foreground border-t pt-2.5">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />Section</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />Provider (CMS)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />Hardcoded</span>
              </div>
            )}

            {/* Spec table */}
            {result?.spec && result.spec.length > 0 && (
              <div className="border-t bg-background overflow-auto" style={{ maxHeight: "42vh" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-background z-10">
                  <h3 className="text-sm font-semibold">CMS Field Specification</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportMarkdown}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy as Markdown"}
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {["Element", "Description", "Source", "Field Path", "Type", "Notes"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.spec.map((row, i) => {
                        const style = TYPE_STYLES[row.sourceType as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.hardcoded;
                        return (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">{row.element}</td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-[200px]">{row.description}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", style.pill)}>
                                {row.sourceType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.fieldPath}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.fieldType}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{row.notes}</td>
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
