"use client";

import { Link2 } from "lucide-react";

export function ProjectUrlLink({ url }: { url: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      <Link2 className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[160px]">{url.replace(/^https?:\/\//, "")}</span>
    </span>
  );
}
