import { cn } from "@/lib/utils";

// Monday.com exact status colors
const statusConfig = {
  todo:        { label: "Not started",   className: "bg-[#c4c4c4] text-white" },
  in_progress: { label: "Working on it", className: "bg-[#fdab3d] text-white" },
  done:        { label: "Done",          className: "bg-[#00c875] text-white" },
  stuck:       { label: "Stuck",         className: "bg-[#e2445c] text-white" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    className: "bg-[#c4c4c4] text-white",
  };
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide min-w-[100px] text-center",
      config.className
    )}>
      {config.label}
    </span>
  );
}
