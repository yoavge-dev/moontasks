"use client";

import { useRef, useState } from "react";
import { Plus, Upload, Trash2, Layers, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  name: string;
  screenshotUrl: string;
  createdAt: Date | string;
  createdBy: { name: string | null; email: string };
}

interface Props {
  initialItems: SectionItem[];
}

export function SectionLibrary({ initialItems }: Props) {
  const [items, setItems] = useState<SectionItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<SectionItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!file) { toast.error("Screenshot is required"); return; }
    setSaving(true);
    try {
      // Upload screenshot
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/annotator/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error("Upload failed");

      // Save section
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), screenshotUrl: uploadData.url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");

      setItems((prev) => [json.data, ...prev]);
      setName("");
      setFile(null);
      setPreview(null);
      setShowForm(false);
      toast.success("Section added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Section removed");
  };

  const cancel = () => {
    setShowForm(false);
    setName("");
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Section Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visual reference for all CMS sections</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New section</p>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Section name (e.g. Hero, Offers Table, Footer)"
            className="text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancel(); }}
          />
          <div
            className={cn(
              "border-2 border-dashed rounded-xl transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {preview ? (
              <img src={preview} alt="preview" className="w-full max-h-64 object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <Upload className="h-7 w-7 opacity-40" />
                <p className="text-sm">Drop a screenshot here or click to upload</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !name.trim() || !file} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : "Add section"}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-4 border-2 border-dashed border-border rounded-xl">
          <Layers className="h-10 w-10 opacity-25" />
          <div>
            <p className="text-sm font-medium">No sections yet</p>
            <p className="text-xs mt-1">Add a section name and screenshot to build your visual library</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add section
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all">
              <button
                className="block w-full text-left"
                onClick={() => setLightbox(item)}
              >
                <div className="bg-muted overflow-hidden">
                  <img
                    src={item.screenshotUrl}
                    alt={item.name}
                    className="w-full object-cover max-h-48 group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              </button>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.createdBy.name ?? item.createdBy.email} · {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="text-white font-semibold mb-3">{lightbox.name}</p>
            <img
              src={lightbox.screenshotUrl}
              alt={lightbox.name}
              className="w-full rounded-xl max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
