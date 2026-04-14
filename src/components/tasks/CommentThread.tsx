"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { id: string; name: string | null; email: string };
}

interface MentionUser {
  id: string;
  name: string | null;
  email: string;
}

interface CommentThreadProps {
  taskId: string;
  comments: Comment[];
}

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

// Render @[Name:userId] as highlighted chips
function renderBody(body: string) {
  const parts = body.split(/(@\[[^\]]+:[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^:]+):[^\]]+\]$/);
    if (match) {
      return (
        <span key={i} className="text-primary font-semibold bg-primary/10 rounded px-0.5">
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CommentThread({ taskId, comments: initial }: CommentThreadProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mention picker state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/mentionable`)
      .then((r) => r.json())
      .then((json) => setMentionUsers(json.data ?? []));
  }, [taskId]);

  const filteredUsers = mentionQuery !== null
    ? mentionUsers.filter((u) =>
        (u.name ?? u.email).toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  const insertMention = useCallback((user: MentionUser) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? body.length;
    const textBefore = body.slice(0, cursor);
    const textAfter = body.slice(cursor);
    const replaced = textBefore.replace(/@\w*$/, `@[${user.name ?? user.email}:${user.id}] `);
    setBody(replaced + textAfter);
    setMentionQuery(null);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(replaced.length, replaced.length);
    }, 0);
  }, [body]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredUsers[mentionIndex]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

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
    if (!res.ok) { toast.error(json.error ?? "Failed to post comment"); return; }
    setComments((prev) => [...prev, json.data]);
    setBody("");
    setMentionQuery(null);
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
              <p className="text-sm text-foreground whitespace-pre-wrap">{renderBody(c.body)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 relative">
        <Textarea
          ref={textareaRef}
          placeholder="Write a comment… type @ to mention someone"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={3}
        />

        {/* Mention picker dropdown */}
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {filteredUsers.slice(0, 6).map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                  i === mentionIndex && "bg-muted"
                )}
              >
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {initials(u.name, u.email)}
                </span>
                <span className="truncate">{u.name ?? u.email}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
            {submitting ? "Posting…" : "Post Comment"}
          </Button>
          <span className="text-xs text-muted-foreground">⌘↵ to submit</span>
        </div>
      </div>
    </div>
  );
}
