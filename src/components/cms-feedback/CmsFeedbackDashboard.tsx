"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, MessageSquare, TrendingUp, Users } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  content_editing: "Content Editing",
  media: "Media Management",
  publishing: "Publishing Workflow",
  navigation: "Navigation & UX",
  performance: "Performance",
  permissions: "Permissions & Access",
  integrations: "Integrations",
  other: "Other",
};

const SEVERITY_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Minor",
  2: "Occasional",
  3: "Frequent",
  4: "Blocking",
  5: "Critical",
};

interface FeedbackItem {
  id: string;
  category: string;
  severity: number;
  description: string;
  suggestion: string | null;
  createdAt: string | Date;
  author: { id: string; name: string | null; email: string };
}

interface Props {
  initialItems: FeedbackItem[];
}

export function CmsFeedbackDashboard({ initialItems }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<number>(0);

  const filtered = initialItems.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (severityFilter > 0 && item.severity !== severityFilter) return false;
    return true;
  });

  // Stats
  const totalCount = initialItems.length;
  const avgSeverity = totalCount ? (initialItems.reduce((s, i) => s + i.severity, 0) / totalCount).toFixed(1) : "—";
  const uniqueUsers = new Set(initialItems.map((i) => i.author.id)).size;
  const criticalCount = initialItems.filter((i) => i.severity >= 4).length;

  // Category breakdown for chart
  const categoryData = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key,
    label,
    count: initialItems.filter((i) => i.category === key).length,
    avgSeverity: (() => {
      const items = initialItems.filter((i) => i.category === key);
      return items.length ? items.reduce((s, i) => s + i.severity, 0) / items.length : 0;
    })(),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          CMS Feedback Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">All pain points reported by CMS users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, label: "Total Submissions", value: totalCount },
          { icon: Users, label: "Unique Users", value: uniqueUsers },
          { icon: TrendingUp, label: "Avg Severity", value: avgSeverity },
          { icon: AlertTriangle, label: "Critical / Blocking", value: criticalCount },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {totalCount > 0 && (
        <div className="border border-border rounded-xl p-6 bg-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Pain Points by Area</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={148} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value, "Submissions"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.key} fill={SEVERITY_COLORS[Math.round(entry.avgSeverity)] ?? "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">Bar colour indicates average severity for that area</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Filter:</span>
        <button
          onClick={() => setFilter("all")}
          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground/40")}
        >
          All areas
        </button>
        {categoryData.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filter === c.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground/40")}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Severity:</span>
        <button
          onClick={() => setSeverityFilter(0)}
          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", severityFilter === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground/40")}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", severityFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-muted-foreground/40")}
          >
            {s} — {SEVERITY_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Submissions list */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{filtered.length} submission{filtered.length !== 1 ? "s" : ""}</p>
        {filtered.length === 0 && (
          <div className="border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
            No submissions match the current filters.
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="border border-border rounded-xl p-5 bg-card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${SEVERITY_COLORS[item.severity]}22`, color: SEVERITY_COLORS[item.severity] }}
                >
                  Severity {item.severity} — {SEVERITY_LABELS[item.severity]}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(item.createdAt), "d MMM yyyy")}
              </span>
            </div>

            <p className="text-sm leading-relaxed">{item.description}</p>

            {item.suggestion && (
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Suggested improvement</p>
                <p className="text-sm leading-relaxed">{item.suggestion}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {item.author.name ?? item.author.email}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
