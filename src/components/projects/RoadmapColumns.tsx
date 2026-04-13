"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  phase: string | null;
  status: string;
  order: number;
}

interface Props {
  projectId: string;
  initialItems: RoadmapItem[];
  isOwner: boolean;
}

const statusConfig = {
  planned: {
    label: "Planned",
    icon: Circle,
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    dot: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

function getQuarters() {
  const year = new Date().getFullYear();
  return [
    { key: "Q1", label: `Q1 ${year}` },
    { key: "Q2", label: `Q2 ${year}` },
    { key: "Q3", label: `Q3 ${year}` },
    { key: "Q4", label: `Q4 ${year}` },
    { key: "Backlog", label: "Backlog" },
  ];
}

interface AddItemFormProps {
  defaultPhase: string;
  projectId: string;
  onAdd: (item: RoadmapItem) => void;
  onCancel: () => void;
}

function AddItemForm({ defaultPhase, projectId, onAdd, onCancel }: AddItemFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined, phase: defaultPhase, status }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to add"); return; }
    onAdd(json.data);
    toast.success("Item added");
  };

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2 shadow-sm">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to happen?"
        className="text-sm"
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onCancel(); }}
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        className="text-sm resize-none"
      />
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "planned")}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

interface EditItemFormProps {
  item: RoadmapItem;
  projectId: string;
  quarters: { key: string; label: string }[];
  onSave: (item: RoadmapItem) => void;
  onCancel: () => void;
}

function EditItemForm({ item, projectId, quarters, onSave, onCancel }: EditItemFormProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [phase, setPhase] = useState(item.phase ?? "Backlog");
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/roadmap/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined, phase, status }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to update"); return; }
    onSave(json.data);
    toast.success("Updated");
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card p-3 space-y-2 shadow-sm">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="text-sm resize-none"
        placeholder="Details (optional)"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Quarter</Label>
          <Select value={phase} onValueChange={(v) => setPhase(v ?? "Backlog")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {quarters.map((q) => <SelectItem key={q.key} value={q.key}>{q.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "planned")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function RoadmapColumns({ projectId, initialItems, isOwner }: Props) {
  const [items, setItems] = useState<RoadmapItem[]>(initialItems);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const quarters = getQuarters();

  const getColumnItems = (quarterKey: string) =>
    items.filter((item) => {
      const phase = item.phase ?? "Backlog";
      // match "Q1", "Q1 2026", "Q1 2025" etc to the quarter key
      return phase === quarterKey || phase.startsWith(quarterKey + " ");
    });

  const handleAdd = (item: RoadmapItem) => {
    setItems((prev) => [...prev, item]);
    setAddingToColumn(null);
  };

  const handleSave = (updated: RoadmapItem) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    setEditingId(null);
  };

  const handleDelete = async (itemId: string) => {
    const res = await fetch(`/api/projects/${projectId}/roadmap/${itemId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    toast.success("Removed");
  };

  const handleStatusCycle = async (item: RoadmapItem) => {
    if (!isOwner) return;
    const cycle: Record<string, string> = { planned: "in_progress", in_progress: "done", done: "planned" };
    const nextStatus = cycle[item.status] ?? "planned";
    const res = await fetch(`/api/projects/${projectId}/roadmap/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error("Failed to update"); return; }
    setItems((prev) => prev.map((it) => (it.id === item.id ? json.data : it)));
  };

  const totalItems = items.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {totalItems > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {(["planned", "in_progress", "done"] as const).map((s) => {
            const count = items.filter((i) => i.status === s).length;
            const sc = statusConfig[s];
            return count > 0 ? (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                {count} {sc.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Quarter columns — horizontal scroll on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
        {quarters.map((q) => {
          const colItems = getColumnItems(q.key);
          const isBacklog = q.key === "Backlog";

          return (
            <div key={q.key} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isBacklog ? "bg-muted/60" : "bg-primary/8"}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isBacklog ? "text-muted-foreground" : "text-primary"}`}>
                  {q.label}
                </span>
                <span className="text-xs text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-full">
                  {colItems.length}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2 min-h-[60px]">
                {colItems.map((item) => {
                  if (editingId === item.id) {
                    return (
                      <EditItemForm
                        key={item.id}
                        item={item}
                        projectId={projectId}
                        quarters={quarters}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                      />
                    );
                  }

                  const sc = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.planned;
                  const StatusIcon = sc.icon;

                  return (
                    <div
                      key={item.id}
                      className="group rounded-xl border bg-card p-3 space-y-2 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleStatusCycle(item)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title={`${sc.label} — click to cycle`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                        </button>
                        <p className={`text-sm font-medium leading-snug flex-1 min-w-0 ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </p>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{item.description}</p>
                      )}

                      <div className="flex items-center justify-between pl-5">
                        <Badge className={`text-[10px] border-0 px-1.5 py-0 h-4 ${sc.badge}`}>
                          {sc.label}
                        </Badge>
                        {isOwner && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingId(item.id); setAddingToColumn(null); }}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Inline add form */}
                {addingToColumn === q.key && (
                  <AddItemForm
                    defaultPhase={q.key}
                    projectId={projectId}
                    onAdd={handleAdd}
                    onCancel={() => setAddingToColumn(null)}
                  />
                )}
              </div>

              {/* Add button */}
              {isOwner && addingToColumn !== q.key && (
                <button
                  onClick={() => { setAddingToColumn(q.key); setEditingId(null); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/5 w-full"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
