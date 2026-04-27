"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Upload, ImageIcon, Trophy, Loader2, CheckCircle2, X } from "lucide-react";

interface Variant {
  id: string;
  name: string;
}

interface ResultsPanelProps {
  testId: string;
  variants: Variant[];
  winner: string | null;
  resultsSummary: string | null;
  resultsImageUrl: string | null;
  isOwner: boolean;
  status: string;
}

export function ResultsPanel({ testId, variants, winner: initialWinner, resultsSummary: initialSummary, resultsImageUrl: initialImageUrl, isOwner, status }: ResultsPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [winner, setWinner] = useState(initialWinner ?? "");
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editable = isOwner && status !== "draft";

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/ab-tests/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner: winner || null,
        resultsSummary: summary || null,
        resultsImageUrl: imageUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    setDirty(false);
    toast.success("Results saved");
    router.refresh();
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/ab-tests/${testId}/screenshot`, { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) { toast.error("Upload failed"); return; }
    setImageUrl(json.data.url);
    setDirty(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) uploadFile(file);
  };

  if (!editable && !winner && !summary && !imageUrl) return null;

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

      {/* Screenshot */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Results Report Screenshot</p>

        {imageUrl ? (
          <Card className="overflow-hidden">
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Results report" className="w-full rounded-lg" />
              {editable && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="bg-black/60 text-white rounded-md p-1.5 hover:bg-black/80"
                    title="Replace"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setImageUrl(""); setDirty(true); }}
                    className="bg-black/60 text-white rounded-md p-1.5 hover:bg-black/80"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ) : editable ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/20 transition-all"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drop your analytics screenshot here</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, or WebP · Click to browse</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No screenshot uploaded</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
      </div>

      {/* Save button */}
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
