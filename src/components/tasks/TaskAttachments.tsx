"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Paperclip, Upload, Trash2, FileText, Image, FileArchive, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
}

interface Props {
  taskId: string;
  initialAttachments: Attachment[];
  canUpload: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-sky-500" />;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed"))
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("text"))
    return <FileText className="h-4 w-4 text-violet-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function TaskAttachments({ taskId, initialAttachments, canUpload }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Upload failed"); return; }
      setAttachments((prev) => [...prev, json.data]);
      toast.success(`${file.name} uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(upload);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Attachment removed");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({attachments.length})</span>
          )}
        </h3>
        {canUpload && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3 w-3" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {/* Drop zone (only when there are no files yet and can upload) */}
      {canUpload && attachments.length === 0 && !uploading && (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Max 10 MB per file</p>
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
            >
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.filename}
                  className="text-sm font-medium truncate block hover:text-primary transition-colors"
                >
                  {att.filename}
                </a>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(att.size)} · {format(new Date(att.createdAt), "MMM d, yyyy")} · {att.uploadedBy.name ?? att.uploadedBy.email}
                </p>
              </div>
              {canUpload && (
                <button
                  onClick={() => handleDelete(att.id)}
                  disabled={deletingId === att.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add more button below file list */}
          {canUpload && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
            >
              <p className="text-xs text-muted-foreground">Drop more files or click to browse</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
