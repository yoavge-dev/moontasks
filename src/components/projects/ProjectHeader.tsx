"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  name: string;
  description: string | null;
  url?: string | null;
  teamName?: string | null;
  isOwner: boolean;
}

export function ProjectHeader({ projectId, name, description, url, teamName, isOwner }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDesc, setEditDesc] = useState(description ?? "");
  const [editUrl, setEditUrl] = useState(url ?? "");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditName(name);
    setEditDesc(description ?? "");
    setEditUrl(url ?? "");
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const cancel = () => {
    setEditing(false);
    setEditName(name);
    setEditDesc(description ?? "");
    setEditUrl(url ?? "");
  };

  const save = async () => {
    if (!editName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null, url: editUrl.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save"); return; }
      toast.success("Project updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2 max-w-xl">
        <Input
          ref={nameRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="text-2xl font-bold h-auto py-1 px-2 border-primary/40"
        />
        <Textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Add a description…"
          rows={2}
          className="text-sm resize-none"
        />
        <Input
          type="url"
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          placeholder="https://…"
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving || !editName.trim()} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3">
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        {description && <p className="text-sm text-muted-foreground max-w-xl">{description}</p>}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Link2 className="h-3 w-3" />
            {url.replace(/^https?:\/\//, "")}
          </a>
        )}
        {teamName && <span className="text-xs bg-muted px-2 py-0.5 rounded-full inline-block">{teamName}</span>}
      </div>
      {isOwner && (
        <button
          onClick={startEdit}
          className={cn(
            "mt-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          )}
          title="Edit project"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
