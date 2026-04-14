export const WIDGET_CATEGORIES = [
  "Popup",
  "Headline",
  "Social Proof",
  "CTA",
  "Trust Signal",
  "Urgency",
  "Navigation",
  "Form",
  "Other",
] as const;

export const WIDGET_KPIS = [
  "Conversion Rate",
  "CTR",
  "Bounce Rate",
  "Sign-ups",
  "AOV",
  "Engagement",
  "Other",
] as const;

export const WIDGET_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "deprecated", label: "Deprecated" },
] as const;

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  draft: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  deprecated: "bg-muted text-muted-foreground",
};
