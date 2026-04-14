import { cn } from "@/lib/utils";

// Monday.com priority colors
const priorityConfig = {
  low:    { label: "Low",    dot: "bg-[#c4c4c4]", className: "text-[#797979] bg-[#f0f0f0]" },
  medium: { label: "Medium", dot: "bg-[#579bfc]", className: "text-[#1e6ec1] bg-[#e3f0ff]" },
  high:   { label: "High",   dot: "bg-[#fdab3d]", className: "text-[#a8710d] bg-[#fff4e3]" },
  urgent: { label: "Urgent", dot: "bg-[#e2445c]", className: "text-[#b8172e] bg-[#fde8ec]" },
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold", config.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
