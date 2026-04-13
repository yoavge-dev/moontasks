import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { label: "Low", dot: "bg-sky-400", className: "text-sky-700 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400" },
  medium: { label: "Medium", dot: "bg-amber-400", className: "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
  high: { label: "High", dot: "bg-orange-500", className: "text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400" },
  urgent: { label: "Urgent", dot: "bg-red-600", className: "text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400" },
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold", config.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
