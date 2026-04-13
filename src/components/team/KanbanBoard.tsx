"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  tags: string;
  owner: { id: string; name: string | null; email: string };
  assignee?: { id: string; name: string | null; email: string } | null;
  team?: { id: string; name: string } | null;
  _count?: { comments: number };
}

const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

export function KanbanBoard({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId = result.draggableId;

    if (newStatus === result.source.droppableId) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert
      setTasks(initialTasks);
      toast.error("Failed to update task status");
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-3 gap-4 h-full">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] rounded-lg p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-muted/80" : "bg-muted/30"
                    }`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(drag, snap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className={snap.isDragging ? "opacity-75" : ""}
                          >
                            <Card className="hover:shadow-sm transition-shadow">
                              <CardContent className="p-3 space-y-2">
                                <Link href={`/tasks/${task.id}`} className="block">
                                  <p className="text-sm font-medium hover:text-primary line-clamp-2">
                                    {task.title}
                                  </p>
                                </Link>
                                <div className="flex items-center justify-between">
                                  <TaskPriorityBadge priority={task.priority} />
                                  {task.assignee && (
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[9px]">
                                        {initials(task.assignee.name, task.assignee.email)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                                {task.team && (
                                  <p className="text-xs text-muted-foreground">{task.team.name}</p>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
