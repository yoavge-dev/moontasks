"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { format } from "date-fns";
import { Copy, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const STORAGE_KEY = "daily-update-v2";

type Status = "done" | "in_progress" | "blocked";

interface Bullet {
  id: string;
  text: string;
  status: Status;
}

interface DayData {
  date: string;
  bullets: Bullet[];
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  done:        { label: "Done",        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  blocked:     { label: "Blocked",     className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
};

const STATUS_CYCLE: Status[] = ["in_progress", "done", "blocked"];

function newBullet(): Bullet {
  return { id: crypto.randomUUID(), text: "", status: "in_progress" };
}

export default function DailyUpdatePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [data, setData] = useState<DayData>({ date: today, bullets: [newBullet()] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DayData = JSON.parse(stored);
        if (parsed.date === today) { setData(parsed); return; }
      }
    } catch {}
    setData({ date: today, bullets: [newBullet()] });
  }, [today]);

  const save = (next: DayData) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateBullet = (id: string, patch: Partial<Bullet>) => {
    save({ ...data, bullets: data.bullets.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };

  const removeBullet = (id: string) => {
    const next = data.bullets.filter((b) => b.id !== id);
    save({ ...data, bullets: next.length ? next : [newBullet()] });
  };

  const addAfter = (id: string) => {
    const idx = data.bullets.findIndex((b) => b.id === id);
    const fresh = newBullet();
    const next = [...data.bullets];
    next.splice(idx + 1, 0, fresh);
    save({ ...data, bullets: next });
    setTimeout(() => (document.getElementById(`bullet-${fresh.id}`) as HTMLInputElement)?.focus(), 0);
  };

  const cycleStatus = (id: string, current: Status) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    updateBullet(id, { status: next });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, bullet: Bullet) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAfter(bullet.id);
    }
    if (e.key === "Backspace" && bullet.text === "" && data.bullets.length > 1) {
      e.preventDefault();
      const idx = data.bullets.findIndex((b) => b.id === bullet.id);
      removeBullet(bullet.id);
      setTimeout(() => {
        const prev = data.bullets[Math.max(0, idx - 1)];
        if (prev) (document.getElementById(`bullet-${prev.id}`) as HTMLInputElement)?.focus();
      }, 0);
    }
  };

  const copy = () => {
    const text = data.bullets
      .filter((b) => b.text.trim())
      .map((b) => `• ${b.text}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Update</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Button onClick={copy} variant="outline" size="sm">
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3 space-y-1">
          {data.bullets.map((bullet) => (
            <div key={bullet.id} className="flex items-center gap-2.5 group py-0.5">
              <button
                onClick={() => cycleStatus(bullet.id, bullet.status)}
                className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${STATUS_CONFIG[bullet.status].className}`}
              >
                {STATUS_CONFIG[bullet.status].label}
              </button>
              <input
                id={`bullet-${bullet.id}`}
                value={bullet.text}
                onChange={(e) => updateBullet(bullet.id, { text: e.target.value })}
                onKeyDown={(e) => onKeyDown(e, bullet)}
                placeholder="Write your update..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
              />
              {data.bullets.length > 1 && (
                <button
                  onClick={() => removeBullet(bullet.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => { const b = newBullet(); save({ ...data, bullets: [...data.bullets, b] }); setTimeout(() => (document.getElementById(`bullet-${b.id}`) as HTMLInputElement)?.focus(), 0); }}
            className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors pt-2 pl-0.5"
          >
            <Plus className="h-3 w-3" /> Add bullet
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
