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

export function diffContent(prev: ExtractedContent, curr: ExtractedContent): string[] {
  const changes: string[] = [];

  if (prev.title !== curr.title) changes.push(`Title: "${prev.title}" → "${curr.title}"`);
  if (prev.description !== curr.description) changes.push(`Meta description changed`);

  const h1Added = curr.h1.filter((h) => !prev.h1.includes(h));
  const h1Removed = prev.h1.filter((h) => !curr.h1.includes(h));
  if (h1Added.length) changes.push(`New H1: ${h1Added.map((h) => `"${h}"`).join(", ")}`);
  if (h1Removed.length) changes.push(`Removed H1: ${h1Removed.map((h) => `"${h}"`).join(", ")}`);

  const navAdded = curr.nav.filter((n) => !prev.nav.includes(n));
  const navRemoved = prev.nav.filter((n) => !curr.nav.includes(n));
  if (navAdded.length) changes.push(`New nav items: ${navAdded.map((n) => `"${n}"`).join(", ")}`);
  if (navRemoved.length) changes.push(`Removed nav items: ${navRemoved.map((n) => `"${n}"`).join(", ")}`);

  const ctaAdded = curr.ctas.filter((c) => !prev.ctas.includes(c));
  const ctaRemoved = prev.ctas.filter((c) => !curr.ctas.includes(c));
  if (ctaAdded.length) changes.push(`New CTAs: ${ctaAdded.map((c) => `"${c}"`).join(", ")}`);
  if (ctaRemoved.length) changes.push(`Removed CTAs: ${ctaRemoved.map((c) => `"${c}"`).join(", ")}`);

  const pricingAdded = curr.pricing.filter((p) => !prev.pricing.includes(p));
  if (pricingAdded.length) changes.push(`New pricing signals: ${pricingAdded.join(", ")}`);

  return changes;
}
