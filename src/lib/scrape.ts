export interface ExtractedContent {
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  nav: string[];
  ctas: string[];
  pricing: string[];
  sections: string[];
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text) results.push(text);
  }
  return [...new Set(results)];
}

function extractMeta(html: string, name: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"));
  return m ? m[1].trim() : "";
}

export function extractContent(html: string, url: string): ExtractedContent {
  // Nav links
  const navSection = html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? "";
  const nav = extractTag(navSection || html, "a")
    .filter((t) => t.length < 60)
    .slice(0, 20);

  // CTA buttons
  const ctaRe = /<(?:a|button)[^>]*(?:class|id)[^>]*(?:cta|btn|button|primary|hero)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  const ctas: string[] = [];
  let ctaM;
  while ((ctaM = ctaRe.exec(html)) !== null) {
    const t = stripTags(ctaM[1]).trim();
    if (t && t.length < 80) ctas.push(t);
  }

  // Pricing signals
  const pricingRe = /\$[\d,]+(?:\/mo|\/month|\/year|\/yr)?|\bfree\b|\bpro\b|\benterprise\b|\bstarter\b|\bbasic\b|\bpremium\b|\bplan[s]?\b|\bpricing\b/gi;
  const pricingSection = html.match(/<(?:section|div)[^>]*(?:pricing|plans)[^>]*>[\s\S]{0,3000}/i)?.[0] ?? "";
  const pricingMatches = [...new Set((pricingSection || html).match(pricingRe) ?? [])].slice(0, 30);

  // Key section headings context
  const sections = extractTag(html, "h2").concat(extractTag(html, "h3")).slice(0, 15);

  return {
    title: extractTag(html, "title")[0] ?? "",
    description: extractMeta(html, "description") || extractMeta(html, "og:description"),
    h1: extractTag(html, "h1").slice(0, 5),
    h2: extractTag(html, "h2").slice(0, 10),
    nav,
    ctas: [...new Set(ctas)].slice(0, 10),
    pricing: pricingMatches,
    sections,
  };
}

export function hashContent(c: ExtractedContent): string {
  const str = JSON.stringify([c.title, c.description, c.h1, c.h2, c.nav, c.ctas, c.pricing]);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

export type DiffSection = "title" | "description" | "headline" | "nav" | "cta" | "pricing" | "sections";
export type DiffType = "added" | "removed" | "changed";

export interface DiffItem {
  section: DiffSection;
  type: DiffType;
  value: string;
  before?: string;
}

export function diffContent(prev: ExtractedContent, curr: ExtractedContent): DiffItem[] {
  const items: DiffItem[] = [];

  if (prev.title !== curr.title && curr.title)
    items.push({ section: "title", type: "changed", value: curr.title, before: prev.title });

  if (prev.description !== curr.description && curr.description)
    items.push({ section: "description", type: "changed", value: curr.description, before: prev.description });

  // H1: if both sides have exactly one headline and it changed, show before→after
  if (prev.h1.length === 1 && curr.h1.length === 1 && prev.h1[0] !== curr.h1[0]) {
    items.push({ section: "headline", type: "changed", value: curr.h1[0], before: prev.h1[0] });
  } else {
    for (const h of curr.h1.filter((h) => !prev.h1.includes(h)))
      items.push({ section: "headline", type: "added", value: h });
    for (const h of prev.h1.filter((h) => !curr.h1.includes(h)))
      items.push({ section: "headline", type: "removed", value: h });
  }

  // H2: pair removed+added when counts match (likely reworded sections, not restructured)
  const addedH2 = curr.h2.filter((h) => !prev.h2.includes(h));
  const removedH2 = prev.h2.filter((h) => !curr.h2.includes(h));
  if (addedH2.length > 0 && addedH2.length === removedH2.length && addedH2.length <= 3) {
    for (let i = 0; i < addedH2.length; i++)
      items.push({ section: "sections", type: "changed", value: addedH2[i], before: removedH2[i] });
  } else {
    for (const h of addedH2) items.push({ section: "sections", type: "added", value: h });
    for (const h of removedH2) items.push({ section: "sections", type: "removed", value: h });
  }

  // CTAs: single swap shows as before→after
  const addedCta = curr.ctas.filter((c) => !prev.ctas.includes(c));
  const removedCta = prev.ctas.filter((c) => !curr.ctas.includes(c));
  if (addedCta.length === 1 && removedCta.length === 1) {
    items.push({ section: "cta", type: "changed", value: addedCta[0], before: removedCta[0] });
  } else {
    for (const c of addedCta) items.push({ section: "cta", type: "added", value: c });
    for (const c of removedCta) items.push({ section: "cta", type: "removed", value: c });
  }

  for (const n of curr.nav.filter((n) => !prev.nav.includes(n)))
    items.push({ section: "nav", type: "added", value: n });
  for (const n of prev.nav.filter((n) => !curr.nav.includes(n)))
    items.push({ section: "nav", type: "removed", value: n });

  for (const p of curr.pricing.filter((p) => !prev.pricing.includes(p)))
    items.push({ section: "pricing", type: "added", value: p });
  for (const p of prev.pricing.filter((p) => !curr.pricing.includes(p)))
    items.push({ section: "pricing", type: "removed", value: p });

  return items;
}

export function diffToStrings(items: DiffItem[]): string[] {
  const sectionLabel: Record<DiffSection, string> = {
    title: "Page title", description: "Meta description", headline: "Headline",
    nav: "Navigation", cta: "CTA button", pricing: "Pricing", sections: "Section",
  };
  return items.map((d) => {
    const label = sectionLabel[d.section];
    if (d.type === "changed") return `${label}: "${d.before}" → "${d.value}"`;
    if (d.type === "added") return `${label} added: "${d.value}"`;
    return `${label} removed: "${d.value}"`;
  });
}
