import { cn } from "@/lib/utils";

const statusConfig = {
  todo: { label: "Not Started", className: "bg-slate-400 text-white" },
  in_progress: { label: "Working on it", className: "bg-amber-400 text-white" },
  done: { label: "Done", className: "bg-emerald-500 text-white" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    className: "bg-slate-400 text-white",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide", config.className)}>
      {config.label}
    </span>
  );
}
