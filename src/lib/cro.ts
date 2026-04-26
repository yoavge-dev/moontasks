import type { ExtractedContent } from "./scrape";

export interface CroBreakdown {
  hero: number;
  cta: number;
  clarity: number;
  social_proof: number;
  structure: number;
  urgency: number;
  mobile: number;
  visuals: number;
}

export interface AbTest {
  title: string;
  hypothesis: string;
  priority: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
  impact: string;
  category: string;
}

export interface Finding {
  category: string;
  issue: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
}

export interface FeatureGap {
  label: string;
  description: string;
  type: "page" | "feature" | "content";
  effort: "easy" | "medium" | "hard";
}

export interface CroResult {
  score: number;
  breakdown: CroBreakdown;
  abTests: AbTest[];
  findings: Finding[];
}

// ─── Word lists ───────────────────────────────────────────────────────────────

const ACTION_WORDS = [
  "get started", "start free", "try free", "sign up", "signup", "register",
  "join", "buy now", "order", "book", "claim", "download", "request",
  "access", "unlock", "get my", "start my", "create account", "open account",
];
const WEAK_CTA = ["click here", "submit", "go", "ok", "next", "read more", "click", "here", "button"];
const SOCIAL_PROOF_STRONG = [
  "testimonial", "rated", "stars", "trustpilot", "case study", "success stor",
  "join over", "trusted by over", "people use", "customers trust",
];
const SOCIAL_PROOF_MEDIUM = [
  "customers", "clients", "reviews", "guarantee", "award", "certified",
  "accredited", "#1", "number one", "top rated",
];
const URGENCY_STRONG = [
  "today only", "limited time", "last chance", "hurry", "expires",
  "countdown", "ends soon", "only X left", "selling fast",
];
const URGENCY_MEDIUM = [
  "free trial", "no credit card", "cancel anytime", "money back",
  "risk free", "instant access", "start today", "get started free",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wc(s: string) { return s.trim().split(/\s+/).length; }

function containsAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

function countMatches(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.filter((w) => t.includes(w)).length;
}

function safe(v: boolean | undefined): boolean { return v ?? false; }
function safeN(v: number | undefined): number { return v ?? 0; }

// ─── Scorers ──────────────────────────────────────────────────────────────────

function scoreHero(e: ExtractedContent): number {
  let score = 0;
  if (e.h1.length === 0) return 5;
  score += 30;

  const words = wc(e.h1[0]);
  if (words >= 5 && words <= 12) score += 25;
  else if (words >= 3 && words <= 16) score += 12;

  if (e.description) {
    score += 20;
    if (e.description.length >= 80 && e.description.length <= 200) score += 15;
  }

  if (e.title && e.h1[0] && e.title.toLowerCase() !== e.h1[0].toLowerCase()) score += 10;

  return Math.min(score, 100);
}

function scoreCta(e: ExtractedContent): number {
  if (e.ctas.length === 0) return 20;

  let score = 30;
  if (e.ctas.length >= 2) score += 15;
  if (e.ctas.length >= 3) score += 10;

  const actionCount = e.ctas.filter((c) => containsAny(c, ACTION_WORDS)).length;
  score += Math.min(actionCount * 15, 30);

  const weakCount = e.ctas.filter((c) => containsAny(c, WEAK_CTA)).length;
  if (weakCount === 0) score += 15;
  else score -= weakCount * 10;

  return Math.max(10, Math.min(score, 100));
}

function scoreClarity(e: ExtractedContent): number {
  let score = 0;
  if (e.h1.length > 0) score += 25;
  if (e.h2.length >= 2) score += 20;
  if (e.h2.length >= 4) score += 10;
  if (e.description) score += 20;
  if (e.sections.length >= 3) score += 15;
  if (e.title && e.title.length > 20) score += 10;
  return Math.min(score, 100);
}

function scoreSocialProof(e: ExtractedContent): number {
  const allText = [...e.h1, ...e.h2, ...e.sections, ...e.nav, e.title, e.description].join(" ");

  const strongHits = countMatches(allText, SOCIAL_PROOF_STRONG);
  const mediumHits = countMatches(allText, SOCIAL_PROOF_MEDIUM);

  let score = 5;
  score += Math.min(strongHits * 25, 60);
  score += Math.min(mediumHits * 10, 30);

  if (/[\d,]+\s*(users|customers|clients|reviews|businesses)/.test(allText.toLowerCase())) score += 15;
  if (safe(e.hasSchema)) score += 5;

  return Math.min(score, 100);
}

function scoreStructure(e: ExtractedContent): number {
  let score = 0;

  if (e.nav.length >= 3) score += 20;
  if (e.nav.length >= 4 && e.nav.length <= 8) score += 15;
  if (e.nav.length > 10) score -= 10;

  if (e.h1.length > 0 && e.h2.length > 0) score += 20;
  if (e.h2.length >= 3) score += 20;
  if (e.h2.length >= 6) score += 10;
  if (e.sections.length >= 4) score += 15;

  if (safe(e.hasFaq)) score += 10;

  return Math.max(0, Math.min(score, 100));
}

function scoreUrgency(e: ExtractedContent): number {
  const allText = [...e.ctas, ...e.h1, ...e.h2, e.title, e.description].join(" ");

  let score = 5;
  score += Math.min(countMatches(allText, URGENCY_STRONG) * 30, 50);
  score += Math.min(countMatches(allText, URGENCY_MEDIUM) * 15, 35);
  if (e.pricing.length > 0) score += 10;

  return Math.min(score, 100);
}

function scoreMobile(e: ExtractedContent): number {
  let score = 0;
  if (safe(e.hasMobileViewport)) score += 45;
  if (safe(e.hasButtonCtas)) score += 20;
  if (safe(e.hasAmpOrPwa)) score += 15;
  const shortCtas = e.ctas.filter((c) => c.length <= 25);
  if (shortCtas.length > 0) score += 10;
  if (e.nav.length > 0 && e.nav.length <= 6) score += 10;
  return Math.min(score, 100);
}

function scoreVisuals(e: ExtractedContent): number {
  let score = 0;

  // Hero visual presence — highest weight
  if (safe(e.heroVideo)) score += 45;       // video > image for engagement
  else if (safe(e.heroImage)) score += 35;

  // Image quality signals
  const altRatio = safeN(e.totalImages) > 0
    ? safeN(e.imagesWithAlt) / safeN(e.totalImages)
    : 0;
  if (altRatio >= 0.8) score += 20;
  else if (altRatio >= 0.5) score += 10;

  // Has images at all
  if (safeN(e.totalImages) >= 3) score += 15;

  // Not image-heavy (performance signal)
  if (safeN(e.totalImages) <= 20) score += 10;
  else if (safeN(e.totalImages) > 40) score -= 10;

  // Form / email capture = conversion visual
  if (safe(e.hasEmailCapture)) score += 10;

  return Math.max(0, Math.min(score, 100));
}

// ─── Findings ─────────────────────────────────────────────────────────────────

function generateFindings(e: ExtractedContent, b: CroBreakdown): Finding[] {
  const findings: Finding[] = [];

  // Hero
  if (e.h1.length === 0) {
    findings.push({ category: "Hero", issue: "No H1 headline found", recommendation: "Add a clear benefit-driven H1 above the fold: what you offer and for whom, in one sentence.", impact: "high" });
  } else {
    const words = wc(e.h1[0]);
    if (words < 3) {
      findings.push({ category: "Hero", issue: `H1 is too short: "${e.h1[0]}"`, recommendation: "Expand into a full value proposition (5–12 words) that answers what you do and who it's for.", impact: "high" });
    } else if (words > 16) {
      findings.push({ category: "Hero", issue: `H1 is too long (${words} words)`, recommendation: `Trim to under 12 words. Move the rest to a supporting subheadline.`, impact: "medium" });
    }
  }

  if (!e.description) {
    findings.push({ category: "SEO / CTR", issue: "Missing meta description", recommendation: "Write a 120–160 char meta description. It shows in search results and directly affects click-through rate from Google.", impact: "medium" });
  }

  // Visuals
  if (!safe(e.heroImage) && !safe(e.heroVideo)) {
    findings.push({ category: "Visuals", issue: "No hero image or video detected above the fold", recommendation: "Add a strong hero visual — a product screenshot, lifestyle photo, or short explainer video. Pages with hero visuals convert significantly better than text-only above-the-fold.", impact: "high" });
  } else if (!safe(e.heroVideo) && safe(e.heroImage)) {
    findings.push({ category: "Visuals", issue: "Hero has image but no video", recommendation: "Test adding a 60–90 second explainer or demo video in the hero. Video consistently increases time-on-page and conversion, especially for complex products.", impact: "medium" });
  }

  if (safeN(e.totalImages) > 0 && safeN(e.imagesWithAlt) / safeN(e.totalImages) < 0.5) {
    findings.push({ category: "Visuals / SEO", issue: `${safeN(e.totalImages) - safeN(e.imagesWithAlt)} of ${safeN(e.totalImages)} images are missing alt text`, recommendation: "Add descriptive alt text to all images. Alt text improves accessibility, SEO ranking, and helps Google understand your content context.", impact: "medium" });
  }

  // CTA
  if (e.ctas.length === 0) {
    findings.push({ category: "CTA", issue: "No CTA buttons detected", recommendation: "Add at least one prominent CTA above the fold: 'Get Started Free', 'Try for Free', or 'Book a Demo'.", impact: "high" });
  } else {
    const weakCtas = e.ctas.filter((c) => containsAny(c, WEAK_CTA));
    if (weakCtas.length > 0) {
      findings.push({ category: "CTA", issue: `Weak CTA copy: "${weakCtas[0]}"`, recommendation: `Replace with specific action-oriented copy. E.g. "Get My Free Trial" instead of "${weakCtas[0]}".`, impact: "high" });
    }
    if (e.ctas.length === 1) {
      findings.push({ category: "CTA", issue: "Only one CTA detected", recommendation: "Add a lower-commitment secondary CTA ('See how it works', 'Watch demo') for visitors not ready to convert yet.", impact: "medium" });
    }
  }

  // Social proof
  if (b.social_proof < 25) {
    findings.push({ category: "Social Proof", issue: "No trust signals detected", recommendation: "Add at least one: customer count, star rating, testimonial quote, or logos of known clients — near the primary CTA.", impact: "high" });
  } else if (b.social_proof < 50) {
    findings.push({ category: "Social Proof", issue: "Weak social proof", recommendation: "Strengthen with specifics: '4.8/5 from 2,400 reviews', a named testimonial, or a recognisable client logo. Vague claims don't convert.", impact: "medium" });
  }

  // Urgency
  if (b.urgency < 20) {
    findings.push({ category: "Urgency", issue: "No friction-reduction signals near CTA", recommendation: "Add 'Free 14-day trial', 'No credit card required', or 'Cancel anytime' below the primary CTA. These remove the main objection at the conversion point.", impact: "medium" });
  }

  // Clarity
  if (e.h2.length < 2) {
    findings.push({ category: "Clarity", issue: "Very few section headings — hard to scan", recommendation: "Add H2 headings every 2–3 content blocks. Most visitors scan headings before reading — clear headings keep them on the page.", impact: "medium" });
  }

  // Mobile
  if (!safe(e.hasMobileViewport)) {
    findings.push({ category: "Mobile", issue: "Missing mobile viewport meta tag", recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">. Without it, mobile browsers show a zoomed-out desktop page — CTAs become untappable.', impact: "high" });
  } else if (!safe(e.hasButtonCtas)) {
    findings.push({ category: "Mobile", issue: "CTAs may be links instead of tappable buttons", recommendation: "Use <button> elements for CTAs with min 44×44px touch target. Small links are hard to tap on mobile and hurt mobile conversion rates.", impact: "medium" });
  }

  if (e.nav.length > 8) {
    findings.push({ category: "Mobile", issue: `Navigation has ${e.nav.length} items — overflows on mobile`, recommendation: "Collapse to a hamburger menu on mobile. Show only 3–5 primary links. Nav overload is a top mobile friction point.", impact: "medium" });
  }

  // Structure
  if (e.nav.length > 10) {
    findings.push({ category: "Structure", issue: `${e.nav.length} navigation items — creates decision paralysis`, recommendation: "Reduce to 5–7 primary nav items. More choices = more cognitive load = fewer conversions.", impact: "medium" });
  }

  if (e.pricing.length === 0) {
    findings.push({ category: "Pricing", issue: "No pricing signals detected", recommendation: "Show pricing or a 'See pricing' link. Hidden pricing forces users to contact you before they're ready — major drop-off cause.", impact: "medium" });
  }

  if (!safe(e.hasFaq)) {
    findings.push({ category: "Objection Handling", issue: "No FAQ section detected", recommendation: "Add a FAQ section that addresses the top 5 objections (price, security, setup time, cancellation). FAQs reduce exit intent from undecided visitors.", impact: "low" });
  }

  if (!safe(e.hasEmailCapture) && !safe(e.hasForm)) {
    findings.push({ category: "Lead Capture", issue: "No email capture or form detected", recommendation: "Add an email capture (newsletter, demo request, or free resource) to capture visitors not ready to buy. Email sequences convert at 3–5× higher rates than cold traffic.", impact: "medium" });
  }

  return findings
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.impact] - { high: 0, medium: 1, low: 2 }[b.impact]))
    .slice(0, 8);
}

// ─── A/B Tests ────────────────────────────────────────────────────────────────

function generateAbTests(e: ExtractedContent, b: CroBreakdown): AbTest[] {
  const tests: AbTest[] = [];
  const h1 = e.h1[0] ?? null;
  const primaryCta = e.ctas[0] ?? null;

  if (h1) {
    tests.push({
      title: "Benefit-led vs current headline",
      hypothesis: `If we rewrite "${h1.slice(0, 50)}" to lead with the visitor's outcome (e.g. 'Get More X with Less Y'), then CTA clicks will increase because users respond to results, not features.`,
      priority: "high", effort: "easy",
      impact: "Headline rewrites consistently produce 10–30% lifts. Highest-ROI test to run first.",
      category: "Headline",
    });
  }

  if (primaryCta) {
    tests.push({
      title: "CTA copy: value vs action",
      hypothesis: `If we change "${primaryCta}" to include what the user gets (e.g. "Get My Free [Thing]"), then click-through rate will increase because it removes ambiguity about the next step.`,
      priority: "high", effort: "easy",
      impact: "CTA copy tests average 5–25% CVR uplift.",
      category: "CTA",
    });
  } else {
    tests.push({
      title: "Add above-fold CTA button",
      hypothesis: "If we add a prominent CTA button in the hero section, then conversion rate will increase because visitors have no clear next action above the fold.",
      priority: "high", effort: "easy",
      impact: "Adding a missing CTA is the single highest-impact CRO change possible.",
      category: "CTA",
    });
  }

  // Hero visual test
  if (!safe(e.heroVideo)) {
    tests.push({
      title: safe(e.heroImage) ? "Hero image vs explainer video" : "Add hero visual (image or video)",
      hypothesis: safe(e.heroImage)
        ? "If we replace the hero image with a 60-second product demo video, then time-on-page and CTA clicks will increase because video communicates value faster than static images."
        : "If we add a hero image or short video above the fold, then bounce rate will decrease because visual context helps visitors immediately understand the product.",
      priority: "high", effort: "medium",
      impact: "Hero visuals reduce bounce by 20–40%. Video specifically increases conversion by up to 80% in documented tests.",
      category: "Visuals",
    });
  }

  if (b.social_proof < 60) {
    tests.push({
      title: "Social proof directly below CTA",
      hypothesis: "If we place a trust signal ('10,000+ customers', a star rating, or one testimonial) immediately below the primary CTA, then conversion rate will increase because it reduces anxiety at the decision moment.",
      priority: "high", effort: "easy",
      impact: "Social proof near CTA lifts conversions by 10–40% in most documented tests.",
      category: "Social Proof",
    });
  }

  if (b.urgency < 40) {
    tests.push({
      title: "Add friction-reducing micro-copy under CTA",
      hypothesis: "If we add 'No credit card required' or 'Cancel anytime' beneath the main CTA, then sign-up rate will increase because it eliminates the most common reason visitors hesitate.",
      priority: "high", effort: "easy",
      impact: "Micro-copy reassurance typically adds 5–15% to sign-up conversion with near-zero effort.",
      category: "Trust",
    });
  }

  if (!safe(e.hasFaq)) {
    tests.push({
      title: "Add FAQ section above footer",
      hypothesis: "If we add a FAQ section addressing the top 5 objections (pricing, security, setup, cancellation), then exit rate will decrease because undecided visitors get answers instead of bouncing.",
      priority: "medium", effort: "easy",
      impact: "FAQ sections reduce exit intent for bottom-of-funnel visitors — especially effective for complex or B2B products.",
      category: "Objection Handling",
    });
  }

  tests.push({
    title: "High-contrast CTA button colour",
    hypothesis: "If we change the CTA button to a colour that contrasts strongly with the page background, then click-through rate will increase because the eye is drawn to it faster.",
    priority: "medium", effort: "easy",
    impact: "Button colour contrast tests average 5–15% CTA click uplift.",
    category: "CTA",
  });

  tests.push({
    title: "Simplified hero: headline + CTA only",
    hypothesis: "If we strip the hero to a single headline, one line of supporting copy, and a CTA (removing everything else), then conversion rate will increase because visitors reach the action faster with less distraction.",
    priority: "medium", effort: "medium",
    impact: "Reduces cognitive load above the fold — effective for high-intent traffic.",
    category: "Layout",
  });

  if (e.h2.length >= 3 && b.social_proof < 60) {
    tests.push({
      title: "Move trust section to position 2",
      hypothesis: "If we reorder the page so a testimonial or 'used by' block appears immediately after the hero (before features), then scroll depth and CTA clicks will increase because trust is established before we ask for commitment.",
      priority: "medium", effort: "medium",
      impact: "Front-loading social proof drives 10–20% more scroll-to-CTA completions.",
      category: "Layout",
    });
  }

  if (safeN(e.imagesWithAlt) < safeN(e.totalImages) * 0.5 && safeN(e.totalImages) > 0) {
    tests.push({
      title: "Add descriptive alt text to hero images",
      hypothesis: "If we add keyword-rich descriptive alt text to hero and product images, then organic search traffic will increase because Google uses alt text to understand image context and rank image-heavy pages.",
      priority: "low", effort: "easy",
      impact: "Alt text improvements compound over time — SEO lift typically seen in 4–8 weeks.",
      category: "SEO",
    });
  }

  tests.push({
    title: "Dual CTA: primary + secondary",
    hypothesis: "If we add a lower-commitment secondary CTA ('See how it works' or 'Watch demo') next to the primary, then overall engagement will increase by capturing visitors not ready to convert yet.",
    priority: "low", effort: "easy",
    impact: "Secondary CTAs typically add 10–20% more engaged sessions without hurting primary conversions.",
    category: "CTA",
  });

  return tests.slice(0, 8);
}

// ─── Feature gap detection ────────────────────────────────────────────────────

const FEATURE_SIGNALS: Array<{
  keywords: string[];
  label: string;
  description: string;
  type: FeatureGap["type"];
  effort: FeatureGap["effort"];
}> = [
  { keywords: ["pricing", "plans", "price"], label: "Pricing page", description: "Competitor has a pricing page. Showing pricing reduces drop-off on checkout and helps visitors self-qualify.", type: "page", effort: "easy" },
  { keywords: ["blog", "articles", "posts", "news", "insights", "resources"], label: "Blog / Content hub", description: "They're doing content marketing. A blog builds SEO authority and warms cold traffic before they're ready to buy.", type: "content", effort: "medium" },
  { keywords: ["case stud", "success stor", "portfolio"], label: "Case studies", description: "Competitor shows proof of results. Case studies are the most persuasive B2B conversion asset.", type: "page", effort: "medium" },
  { keywords: ["compare", "vs ", "alternative", "versus"], label: "Comparison / vs pages", description: "They're capturing 'X vs Y' and 'alternative to X' search traffic. These pages convert at very high rates.", type: "page", effort: "medium" },
  { keywords: ["integrat", "plugin", "app", "connect"], label: "Integrations directory", description: "An integrations page signals a mature product ecosystem and removes compatibility objections.", type: "feature", effort: "hard" },
  { keywords: ["demo", "free trial", "sandbox", "playground"], label: "Demo / free trial flow", description: "They offer a demo or free trial. Low-commitment first steps dramatically reduce conversion friction.", type: "feature", effort: "hard" },
  { keywords: ["faq", "frequently asked", "help", "support"], label: "FAQ / Help center", description: "They handle objections proactively. A FAQ section reduces exit intent from confused visitors.", type: "page", effort: "easy" },
  { keywords: ["about", "team", "story", "mission", "who we are"], label: "About / Team page", description: "Showing the team behind the product builds trust — especially critical for B2B and SaaS.", type: "page", effort: "easy" },
  { keywords: ["video", "watch", "webinar", "demo video"], label: "Video content", description: "They use video to explain their product. Video increases time-on-site and conversion, especially for complex products.", type: "content", effort: "medium" },
  { keywords: ["review", "testimonial", "rating", "feedback"], label: "Dedicated reviews page", description: "A standalone reviews/testimonials page consolidates social proof and improves conversion for bottom-of-funnel visitors.", type: "page", effort: "easy" },
  { keywords: ["community", "forum", "slack", "discord", "group"], label: "Community", description: "They have a community hub. Communities increase retention, generate UGC, and serve as powerful social proof.", type: "feature", effort: "hard" },
  { keywords: ["affiliate", "partner", "resell", "referral program"], label: "Affiliate / Partner program", description: "A partner program creates a distribution channel and social proof through trusted third parties.", type: "feature", effort: "hard" },
  { keywords: ["calculator", "tool", "quiz", "assessment", "estimat"], label: "Interactive tool / calculator", description: "Interactive tools dramatically increase engagement and generate qualified leads. A pricing calculator or assessment quiz converts cold traffic.", type: "feature", effort: "hard" },
  { keywords: ["award", "press", "featured", "as seen in", "media"], label: "Press / Awards section", description: "Media mentions and award badges are powerful trust signals. Collect and prominently display any press coverage.", type: "content", effort: "easy" },
];

export function detectFeatureGaps(
  yours: Pick<ExtractedContent, "nav" | "sections" | "h2" | "title">,
  competitor: Pick<ExtractedContent, "nav" | "sections" | "h2" | "title">
): FeatureGap[] {
  const yourText = [...yours.nav, ...yours.sections, ...yours.h2, yours.title].join(" ").toLowerCase();
  const theirText = [...competitor.nav, ...competitor.sections, ...competitor.h2, competitor.title].join(" ").toLowerCase();

  return FEATURE_SIGNALS.filter(
    (signal) =>
      signal.keywords.some((k) => theirText.includes(k)) &&
      !signal.keywords.some((k) => yourText.includes(k))
  ).map(({ label, description, type, effort }) => ({ label, description, type, effort }));
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function runCroAudit(extracted: ExtractedContent): CroResult {
  const breakdown: CroBreakdown = {
    hero:         scoreHero(extracted),
    cta:          scoreCta(extracted),
    clarity:      scoreClarity(extracted),
    social_proof: scoreSocialProof(extracted),
    structure:    scoreStructure(extracted),
    urgency:      scoreUrgency(extracted),
    mobile:       scoreMobile(extracted),
    visuals:      scoreVisuals(extracted),
  };

  const score = Math.round(
    Object.values(breakdown).reduce((sum, v) => sum + v, 0) / Object.keys(breakdown).length
  );

  return {
    score,
    breakdown,
    abTests: generateAbTests(extracted, breakdown),
    findings: generateFindings(extracted, breakdown),
  };
}
