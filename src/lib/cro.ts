import type { ExtractedContent } from "./scrape";

export interface CroBreakdown {
  hero: number;
  cta: number;
  clarity: number;
  social_proof: number;
  structure: number;
  urgency: number;
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

export interface CroResult {
  score: number;
  breakdown: CroBreakdown;
  abTests: AbTest[];
  findings: Finding[];
}

const ACTION_WORDS = ["get", "start", "try", "sign up", "signup", "register", "join", "buy", "order", "book", "claim", "download", "request", "access", "unlock", "discover"];
const URGENCY_WORDS = ["free", "today", "now", "instantly", "limited", "hurry", "last chance", "only", "exclusive", "fast", "quick", "immediately"];
const TRUST_WORDS = ["trusted", "reviews", "testimonial", "rating", "customers", "users", "clients", "guarantee", "certified", "award", "verified", "secure"];
const WEAK_CTA = ["click here", "submit", "go", "ok", "next", "more", "read more", "learn more", "click"];

function wordCount(s: string) { return s.trim().split(/\s+/).length; }
function containsAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

function scoreHero(e: ExtractedContent): number {
  let score = 0;
  if (e.h1.length > 0) score += 35;
  if (e.h1.length > 0) {
    const wc = wordCount(e.h1[0]);
    if (wc >= 4 && wc <= 14) score += 25;
    else if (wc >= 2) score += 10;
  }
  if (e.description) score += 25;
  if (e.description && e.description.length >= 80 && e.description.length <= 200) score += 15;
  return Math.min(score, 100);
}

function scoreCta(e: ExtractedContent): number {
  let score = 0;
  if (e.ctas.length === 0) return 5;
  score += 35;
  if (e.ctas.length >= 2) score += 20;
  const actionCtas = e.ctas.filter((c) => containsAny(c, ACTION_WORDS));
  if (actionCtas.length > 0) score += 25;
  const weakCtas = e.ctas.filter((c) => containsAny(c, WEAK_CTA));
  if (weakCtas.length === 0) score += 20;
  return Math.min(score, 100);
}

function scoreClarity(e: ExtractedContent): number {
  let score = 0;
  if (e.h1.length > 0) score += 20;
  if (e.h2.length >= 2) score += 25;
  if (e.h2.length >= 4) score += 15;
  if (e.description) score += 20;
  if (e.sections.length >= 3) score += 20;
  return Math.min(score, 100);
}

function scoreSocialProof(e: ExtractedContent): number {
  let score = 10;
  const allText = [...e.h1, ...e.h2, ...e.sections, ...e.nav, e.title, e.description].join(" ");
  if (containsAny(allText, TRUST_WORDS)) score += 50;
  if (containsAny(allText, ["review", "rating", "star", "testimonial"])) score += 25;
  if (containsAny(allText, ["case stud", "success stor", "our customers", "our clients"])) score += 15;
  return Math.min(score, 100);
}

function scoreStructure(e: ExtractedContent): number {
  let score = 0;
  if (e.nav.length >= 3) score += 30;
  if (e.nav.length >= 5 && e.nav.length <= 9) score += 20;
  if (e.h2.length >= 3) score += 25;
  if (e.h1.length > 0 && e.h2.length > 0) score += 15;
  if (e.sections.length >= 4) score += 10;
  return Math.min(score, 100);
}

function scoreUrgency(e: ExtractedContent): number {
  let score = 5;
  const allText = [...e.ctas, ...e.h1, ...e.h2, e.title, e.description].join(" ");
  if (containsAny(allText, URGENCY_WORDS)) score += 35;
  if (e.pricing.length > 0) score += 30;
  if (containsAny(allText, ["free trial", "free plan", "no credit card", "cancel anytime"])) score += 20;
  if (containsAny(e.ctas.join(" "), ACTION_WORDS)) score += 10;
  return Math.min(score, 100);
}

function generateFindings(e: ExtractedContent, b: CroBreakdown): Finding[] {
  const findings: Finding[] = [];

  if (e.h1.length === 0) {
    findings.push({ category: "Hero", issue: "No H1 headline found", recommendation: "Add a clear, benefit-driven H1 above the fold that explains your value proposition in one line.", impact: "high" });
  } else if (wordCount(e.h1[0]) < 4) {
    findings.push({ category: "Hero", issue: "H1 headline is too short", recommendation: `Expand "${e.h1[0]}" into a full value proposition (6–12 words) that answers 'what do you do and for whom'.`, impact: "high" });
  } else if (wordCount(e.h1[0]) > 16) {
    findings.push({ category: "Hero", issue: "H1 headline is too long", recommendation: "Shorten the headline to under 12 words. Move extra detail to a supporting subheadline.", impact: "medium" });
  }

  if (!e.description) {
    findings.push({ category: "Hero", issue: "Missing meta description", recommendation: "Add a meta description (120–160 chars) summarising the page. It appears in search results and improves click-through rate.", impact: "medium" });
  }

  if (e.ctas.length === 0) {
    findings.push({ category: "CTA", issue: "No CTA buttons detected", recommendation: "Add at least one prominent CTA button above the fold with action-oriented copy like 'Get Started Free' or 'Try for Free'.", impact: "high" });
  } else {
    const weakCtas = e.ctas.filter((c) => containsAny(c, WEAK_CTA));
    if (weakCtas.length > 0) {
      findings.push({ category: "CTA", issue: `Weak CTA copy detected: "${weakCtas[0]}"`, recommendation: "Replace generic CTA text with specific action-oriented copy that communicates value (e.g. 'Start Free Trial' instead of 'Click here').", impact: "high" });
    }
  }

  if (b.social_proof < 40) {
    findings.push({ category: "Social Proof", issue: "No trust signals detected on the page", recommendation: "Add customer testimonials, star ratings, a 'trusted by X users' badge, or logos of known clients near the CTA.", impact: "high" });
  }

  if (e.h2.length < 2) {
    findings.push({ category: "Clarity", issue: "Few or no H2 subheadings", recommendation: "Add H2 headings to break the page into scannable sections. Visitors scan before they read — headings keep them engaged.", impact: "medium" });
  }

  if (b.urgency < 30) {
    findings.push({ category: "Urgency", issue: "No urgency or motivation signals", recommendation: "Add low-friction urgency: 'Free for 14 days', 'No credit card required', or 'Cancel anytime' near the primary CTA.", impact: "medium" });
  }

  if (e.pricing.length === 0) {
    findings.push({ category: "Pricing", issue: "No pricing information detected", recommendation: "Consider showing pricing or at least a 'See pricing' link. Hidden pricing creates friction and drops conversion.", impact: "medium" });
  }

  return findings.sort((a, b) => (a.impact === "high" ? -1 : b.impact === "high" ? 1 : 0)).slice(0, 6);
}

function generateAbTests(e: ExtractedContent, b: CroBreakdown): AbTest[] {
  const tests: AbTest[] = [];

  if (e.h1.length > 0) {
    tests.push({
      title: "Benefit-led vs feature-led headline",
      hypothesis: `If we rewrite the H1 to lead with the user's outcome instead of the product feature, then engagement and scroll depth will increase because visitors identify with results, not features.`,
      priority: "high",
      effort: "easy",
      impact: "Typically 10–30% lift in time-on-page and CTA clicks.",
      category: "Headline",
    });
  }

  if (e.ctas.length > 0) {
    tests.push({
      title: "CTA copy: action vs value",
      hypothesis: `If we change the primary CTA to include a value statement (e.g. 'Get My Free Report'), then click-through rate will increase because it reduces ambiguity about what happens next.`,
      priority: "high",
      effort: "easy",
      impact: "CTA copy changes are among the highest-ROI tests — often 5–25% CVR uplift.",
      category: "CTA",
    });
  }

  if (b.social_proof < 60) {
    tests.push({
      title: "Add social proof near CTA",
      hypothesis: `If we add a short testimonial or '10,000+ users' trust badge directly above or below the primary CTA, then conversion rate will increase because it reduces anxiety at the decision point.`,
      priority: "high",
      effort: "easy",
      impact: "Social proof near CTA can lift conversions by 10–40%.",
      category: "Social Proof",
    });
  }

  if (b.urgency < 50) {
    tests.push({
      title: "Add friction-reducing micro-copy",
      hypothesis: `If we add 'No credit card required' or 'Cancel anytime' below the CTA button, then sign-up rate will increase because it removes the primary objection to starting.`,
      priority: "high",
      effort: "easy",
      impact: "Micro-copy reassurance typically adds 5–15% to sign-up conversion.",
      category: "Trust",
    });
  }

  if (e.pricing.length === 0) {
    tests.push({
      title: "Show pricing vs hide pricing",
      hypothesis: `If we surface pricing (or a 'See pricing' link) on the landing page, then qualified lead quality will improve because visitors self-select based on fit.`,
      priority: "medium",
      effort: "medium",
      impact: "Reduces bounce from price-shock on checkout; improves lead quality.",
      category: "Pricing",
    });
  }

  tests.push({
    title: "Above-fold CTA button colour",
    hypothesis: `If we change the primary CTA button to a high-contrast colour that stands out from the page palette, then click-through rate will increase because it draws the eye faster.`,
    priority: "medium",
    effort: "easy",
    impact: "Colour contrast improvements average 5–15% uplift on CTA clicks.",
    category: "CTA",
  });

  tests.push({
    title: "Short-form vs long-form hero section",
    hypothesis: `If we reduce the hero section to a single headline + CTA (removing secondary copy), then conversion rate will increase because there is less cognitive load before the first action.`,
    priority: "medium",
    effort: "medium",
    impact: "Simplifying above-the-fold content improves conversion for high-intent traffic.",
    category: "Layout",
  });

  if (e.h2.length >= 3) {
    tests.push({
      title: "Reorder sections: social proof first",
      hypothesis: `If we move a testimonial or 'used by' block to the second section (directly after the hero), then scroll depth and CTA clicks will increase because trust is established earlier.`,
      priority: "medium",
      effort: "medium",
      impact: "Section reordering to front-load trust is a proven conversion pattern.",
      category: "Layout",
    });
  }

  tests.push({
    title: "Add a secondary CTA for undecided visitors",
    hypothesis: `If we add a lower-commitment secondary CTA (e.g. 'See how it works') alongside the primary CTA, then overall engagement will increase by capturing visitors not yet ready to convert.`,
    priority: "low",
    effort: "easy",
    impact: "Secondary CTAs reduce bounce for mid-funnel visitors without cannibalising primary conversions.",
    category: "CTA",
  });

  return tests.slice(0, 7);
}

export function runCroAudit(extracted: ExtractedContent): CroResult {
  const breakdown: CroBreakdown = {
    hero:         scoreHero(extracted),
    cta:          scoreCta(extracted),
    clarity:      scoreClarity(extracted),
    social_proof: scoreSocialProof(extracted),
    structure:    scoreStructure(extracted),
    urgency:      scoreUrgency(extracted),
  };

  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length
  );

  return {
    score,
    breakdown,
    abTests: generateAbTests(extracted, breakdown),
    findings: generateFindings(extracted, breakdown),
  };
}
