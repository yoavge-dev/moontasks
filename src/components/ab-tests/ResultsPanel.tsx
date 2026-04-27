"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Upload, ImageIcon, Trophy, Loader2, CheckCircle2, X, Plus } from "lucide-react";

interface Variant { id: string; name: string; }

interface ResultsPanelProps {
  testId: string;
  variants: Variant[];
  winner: string | null;
  resultsSummary: string | null;
  resultsImages: string[];
  isOwner: boolean;
  status: string;
}

export function ResultsPanel({
  testId, variants,
  winner: initialWinner,
  resultsSummary: initialSummary,
  resultsImages: initialImages,
  isOwner, status,
}: ResultsPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [winner, setWinner] = useState(initialWinner ?? "");
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [images, setImages] = useState<string[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editable = isOwner && (status === "running" || status === "concluded");

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/ab-tests/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner: winner || null,
        resultsSummary: summary || null,
        resultsImages: JSON.stringify(images),
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    setDirty(false);
    toast.success("Results saved");
    router.refresh();
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/ab-tests/${testId}/screenshot`, { method: "POST", body: fd });
      if (!res.ok) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data } = await res.json();
      uploaded.push(data.url);
    }
    setUploading(false);
    if (uploaded.length) {
      setImages((prev) => [...prev, ...uploaded]);
      setDirty(true);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    setDirty(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  if (!editable && !winner && !summary && images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h2 className="font-semibold">Results & Analysis</h2>
      </div>

      {/* Winner */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Winner</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const isWinner = winner === v.id || winner === v.name;
            return (
              <button
                key={v.id}
                disabled={!editable}
                onClick={() => { setWinner(isWinner ? "" : v.id); setDirty(true); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                  isWinner
                    ? "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-300"
                    : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted",
                  !editable && "cursor-default"
                )}
              >
                {isWinner && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                {v.name}
              </button>
            );
          })}
          {!winner && !editable && (
            <span className="text-sm text-muted-foreground italic">No winner selected</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {(editable || summary) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analysis Notes</p>
          {editable ? (
            <Textarea
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setDirty(true); }}
              placeholder="What did you learn? What was the uplift? What are the next steps?"
              rows={4}
              className="text-sm resize-none"
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
          )}
        </div>
      )}

      {/* Screenshots */}
      {(editable || images.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Results Screenshots {images.length > 0 && <span className="normal-case font-normal">({images.length})</span>}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((url) => (
              <div key={url} className="relative group rounded-lg overflow-hidden border">
                <img src={url} alt="Result screenshot" className="w-full object-cover" />
                {editable && (
                  <button
                    onClick={() => removeImage(url)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {editable && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/20 transition-all min-h-[120px]"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Add screenshot<br />or drop here</p>
                  </>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Save */}
      {editable && dirty && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
            Save results
          </Button>
        </div>
      )}
    </div>
  );
}
