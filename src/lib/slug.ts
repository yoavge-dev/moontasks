export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateProjectSlug(name: string, id: string): string {
  const base = toSlug(name) || "roadmap";
  const suffix = id.slice(-6);
  return `${base}-${suffix}`;
}
