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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

const PHASES = ["Q1", "Q2", "Q3", "Q4", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Backlog", "Now", "Next", "Later"];

export function RoadmapBoard({ projectId, initialItems, isOwner }: Props) {
  const [items, setItems] = useState<RoadmapItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    phase: "",
    status: "planned" as string,
  });

  const resetForm = () => setForm({ title: "", description: "", phase: "", status: "planned" });

  const handleAdd = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const res = await fetch(`/api/projects/${projectId}/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        phase: form.phase || undefined,
        status: form.status,
        order: items.length,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to add item");
      return;
    }
    setItems((prev) => [...prev, json.data]);
    resetForm();
    setShowAdd(false);
    toast.success("Roadmap item added");
  };

  const handleUpdate = async (itemId: string) => {
    const res = await fetch(`/api/projects/${projectId}/roadmap/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        phase: form.phase || undefined,
        status: form.status,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to update item");
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === itemId ? json.data : it)));
    setEditingId(null);
    resetForm();
    toast.success("Item updated");
  };

  const handleDelete = async (itemId: string) => {
    const res = await fetch(`/api/projects/${projectId}/roadmap/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete item");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    toast.success("Item removed");
  };

  const handleStatusToggle = async (item: RoadmapItem) => {
    if (!isOwner) return;
    const cycle: Record<string, string> = { planned: "in_progress", in_progress: "done", done: "planned" };
    const nextStatus = cycle[item.status] ?? "planned";
    const res = await fetch(`/api/projects/${projectId}/roadmap/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? json.data : it)));
  };

  const startEdit = (item: RoadmapItem) => {
    setForm({
      title: item.title,
      description: item.description ?? "",
      phase: item.phase ?? "",
      status: item.status,
    });
    setEditingId(item.id);
    setShowAdd(false);
  };

  // Group items by phase
  const grouped: Record<string, RoadmapItem[]> = {};
  const noPhase: RoadmapItem[] = [];
  for (const item of items) {
    if (item.phase) {
      if (!grouped[item.phase]) grouped[item.phase] = [];
      grouped[item.phase].push(item);
    } else {
      noPhase.push(item);
    }
  }
  const phases = [...Object.keys(grouped), ...(noPhase.length > 0 ? ["__none__"] : [])];

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={() => { setShowAdd(true); setEditingId(null); resetForm(); }} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      )}

      {showAdd && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Roadmap Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Launch checkout A/B test"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Details…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phase / Quarter</Label>
                <Select value={form.phase} onValueChange={(v) => setForm((f) => ({ ...f, phase: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "planned" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="font-medium mb-1">Roadmap is empty</p>
          <p className="text-sm text-muted-foreground mb-4">Add items to plan out your project&apos;s milestones</p>
          {isOwner && (
            <Button onClick={() => setShowAdd(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {phases.map((phase) => {
            const phaseItems = phase === "__none__" ? noPhase : grouped[phase];
            return (
              <div key={phase}>
                {phase !== "__none__" && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    {phase}
                    <span className="h-px flex-1 bg-border" />
                  </h2>
                )}
                <div className="space-y-2">
                  {phaseItems.map((item) => {
                    const sc = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.planned;
                    const StatusIcon = sc.icon;

                    if (editingId === item.id) {
                      return (
                        <Card key={item.id} className="border-dashed border-primary/40 bg-primary/5">
                          <CardContent className="pt-4 space-y-3">
                            <div className="space-y-1">
                              <Label>Title *</Label>
                              <Input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Description</Label>
                              <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                rows={2}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Phase</Label>
                                <Select value={form.phase} onValueChange={(v) => setForm((f) => ({ ...f, phase: v ?? "" }))}>
                                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "planned" }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="planned">Planned</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdate(item.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
                      >
                        <button
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => handleStatusToggle(item)}
                          title={`Status: ${sc.label} — click to cycle`}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-xs border-0 ${sc.className}`}>{sc.label}</Badge>
                          {isOwner && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(item)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
