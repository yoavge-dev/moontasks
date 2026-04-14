import { cn } from "@/lib/utils";

const statusConfig = {
  todo:        { label: "Not started",   className: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  in_progress: { label: "Working on it", className: "bg-amber-400 text-white" },
  done:        { label: "Done",          className: "bg-emerald-500 text-white" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    className: "bg-slate-200 text-slate-600",
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
