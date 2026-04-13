"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Comment {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { id: string; name: string | null; email: string };
}

interface CommentThreadProps {
  taskId: string;
  comments: Comment[];
}

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

export function CommentThread({ taskId, comments: initial }: CommentThreadProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to post comment");
      return;
    }
    setComments((prev) => [...prev, json.data]);
    setBody("");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Comments ({comments.length})</h3>
      <Separator />

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">
                {initials(c.author.name, c.author.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{c.author.name ?? c.author.email}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <Textarea
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
          {submitting ? "Posting…" : "Post Comment"}
        </Button>
      </div>
    </div>
  );
}
