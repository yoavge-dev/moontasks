"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { format } from "date-fns";
import { Copy, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const STORAGE_KEY = "daily-update";

interface DayData {
  date: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
}

function BulletList({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    onChange([...items, ""]);
    setTimeout(() => {
      const inputs = document.querySelectorAll(`[data-section="${title}"] input`);
      (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
    }, 0);
  };

  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...items];
      next.splice(i + 1, 0, "");
      onChange(next);
      setTimeout(() => {
        const inputs = document.querySelectorAll(`[data-section="${title}"] input`);
        (inputs[i + 1] as HTMLInputElement)?.focus();
      }, 0);
    }
    if (e.key === "Backspace" && items[i] === "" && items.length > 1) {
      e.preventDefault();
      remove(i);
      setTimeout(() => {
        const inputs = document.querySelectorAll(`[data-section="${title}"] input`);
        (inputs[Math.max(0, i - 1)] as HTMLInputElement)?.focus();
      }, 0);
    }
  };

  return (
    <div data-section={title} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className="text-muted-foreground/40 text-sm">•</span>
            <input
              ref={i === 0 ? inputRef : undefined}
              value={item}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              placeholder={i === 0 ? placeholder : ""}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
            {items.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
      >
        <Plus className="h-3 w-3" /> Add bullet
      </button>
    </div>
  );
}

export default function DailyUpdatePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [data, setData] = useState<DayData>({ date: today, yesterday: [""], today: [""], blockers: [""] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DayData = JSON.parse(stored);
        if (parsed.date === today) {
          setData(parsed);
          return;
        }
      }
    } catch {}
    setData({ date: today, yesterday: [""], today: [""], blockers: [""] });
  }, [today]);

  const save = (next: DayData) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const formatForCopy = () => {
    const lines: string[] = [];
    lines.push(`*Daily Update — ${format(new Date(), "MMMM d, yyyy")}*\n`);

    const filled = (items: string[]) => items.filter((s) => s.trim());

    if (filled(data.yesterday).length) {
      lines.push("*Yesterday*");
      filled(data.yesterday).forEach((s) => lines.push(`• ${s}`));
      lines.push("");
    }
    if (filled(data.today).length) {
      lines.push("*Today*");
      filled(data.today).forEach((s) => lines.push(`• ${s}`));
      lines.push("");
    }
    if (filled(data.blockers).length) {
      lines.push("*Blockers*");
      filled(data.blockers).forEach((s) => lines.push(`• ${s}`));
    }

    return lines.join("\n").trim();
  };

  const copy = () => {
    navigator.clipboard.writeText(formatForCopy());
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Standup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BulletList
            title="Yesterday"
            items={data.yesterday}
            onChange={(v) => save({ ...data, yesterday: v })}
            placeholder="What did you do yesterday?"
          />
          <BulletList
            title="Today"
            items={data.today}
            onChange={(v) => save({ ...data, today: v })}
            placeholder="What are you working on today?"
          />
          <BulletList
            title="Blockers"
            items={data.blockers}
            onChange={(v) => save({ ...data, blockers: v })}
            placeholder="Any blockers? (optional)"
          />
        </CardContent>
      </Card>
    </div>
  );
}
