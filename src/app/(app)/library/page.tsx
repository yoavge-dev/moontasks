"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, ExternalLink, BookOpen } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { WIDGET_CATEGORIES, WIDGET_KPIS, STATUS_STYLES } from "@/lib/library-constants";
import { cn } from "@/lib/utils";

type Widget = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  hypothesis: string;
  targetKpi: string;
  status: string;
  screenshotUrl: string | null;
  figmaUrl: string | null;
  createdBy: { name: string | null; email: string };
  createdAt: string;
};

export default function LibraryPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [kpi, setKpi] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (kpi !== "all") params.set("kpi", kpi);
    setLoading(true);
    fetch(`/api/library?${params}`)
      .then((r) => r.json())
      .then((json) => { setWidgets(json.data ?? []); setLoading(false); });
  }, [category, kpi]);

  const filterChip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Widget Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse available UI components, hypotheses, and target KPIs
          </p>
        </div>
        <LinkButton href="/library/new">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Widget
        </LinkButton>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">Category</span>
          {filterChip("All", category === "all", () => setCategory("all"))}
          {WIDGET_CATEGORIES.map((c) => filterChip(c, category === c, () => setCategory(c)))}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">KPI</span>
          {filterChip("All", kpi === "all", () => setKpi("all"))}
          {WIDGET_KPIS.map((k) => filterChip(k, kpi === k, () => setKpi(k)))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse h-64" />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No widgets yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Add the first widget to start building the library
          </p>
          <LinkButton href="/library/new" variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Widget
          </LinkButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((w) => (
            <Link
              key={w.id}
              href={`/library/${w.id}`}
              className="group rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              {/* Screenshot */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                {w.screenshotUrl ? (
                  <Image
                    src={w.screenshotUrl}
                    alt={w.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">{w.name}</h3>
                  <span className={cn("shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[w.status] ?? STATUS_STYLES.draft)}>
                    {w.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {w.category}
                  </span>
                  <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {w.targetKpi}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{w.hypothesis}</p>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground/60">
                    {w.createdBy.name ?? w.createdBy.email}
                  </span>
                  {w.figmaUrl && (
                    <span className="text-[10px] text-primary flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Figma
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
