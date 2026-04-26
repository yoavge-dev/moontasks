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

// Specific action verbs that signal a strong CTA
const ACTION_WORDS = ["get started", "start free", "try free", "sign up", "signup", "register", "join", "buy now", "order", "book", "claim", "download", "request", "access", "unlock", "get my", "start my", "create account", "open account"];

// Generic weak CTAs that don't communicate value
const WEAK_CTA = ["click here", "submit", "go", "ok", "next", "read more", "click", "here", "button"];

// Real social proof signals — specific, not generic
const SOCIAL_PROOF_STRONG = ["testimonial", "rated", "stars", "trustpilot", "review", "case study", "success stor", "our customers love", "join over", "trusted by over", "people use", "customers trust"];
const SOCIAL_PROOF_MEDIUM = ["customers", "clients", "users", "reviews", "guarantee", "award", "certified", "accredited", "#1", "number one", "top rated"];

// Real urgency — time/scarcity based, not just "free"
const URGENCY_STRONG = ["today only", "limited time", "last chance", "hurry", "expires", "countdown", "ends soon", "while stocks last", "only X left", "selling fast"];
const URGENCY_MEDIUM = ["free trial", "no credit card", "cancel anytime", "money back", "risk free", "instant access", "start today", "get started free"];

function wc(s: string) { return s.trim().split(/\s+/).length; }

function containsAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

function countMatches(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.filter((w) => t.includes(w)).length;
}

// ─── Scorers ───────────────────────────────────────────────────────────────

function scoreHero(e: ExtractedContent): number {
  let score = 0;

  if (e.h1.length === 0) return 5;
  score += 30;

  const h1 = e.h1[0];
  const words = wc(h1);
  if (words >= 5 && words <= 12) score += 25;       // ideal length
  else if (words >= 3 && words <= 16) score += 12;  // acceptable
  // too short (<3 words) or too long (>16 words) = 0 bonus

  if (e.description) {
    score += 20;
    if (e.description.length >= 80 && e.description.length <= 200) score += 15;
  }

  // bonus: H1 and title are different (not just brand name repeated)
  if (e.title && e.h1[0] && e.title.toLowerCase() !== e.h1[0].toLowerCase()) score += 10;

  return Math.min(score, 100);
}

function scoreCta(e: ExtractedContent): number {
  // Note: scraper uses class/id selectors — CTAs may be missed on JS-heavy sites.
  // Treat 0 CTAs as a soft penalty, not an automatic fail.
  if (e.ctas.length === 0) return 20; // unknown, not necessarily absent

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
  // title should be descriptive, not just a domain
  if (e.title && e.title.length > 20) score += 10;

  return Math.min(score, 100);
}

function scoreSocialProof(e: ExtractedContent): number {
  const allText = [...e.h1, ...e.h2, ...e.sections, ...e.nav, e.title, e.description].join(" ");

  const strongHits = countMatches(allText, SOCIAL_PROOF_STRONG);
  const mediumHits = countMatches(allText, SOCIAL_PROOF_MEDIUM);

  // needs multiple signals to score well — not just one generic word
  let score = 5;
  score += Math.min(strongHits * 25, 60);
  score += Math.min(mediumHits * 10, 30);

  // bonus: specific number of customers/users mentioned (e.g. "10,000 users")
  if (/[\d,]+\s*(users|customers|clients|reviews|businesses)/.test(allText.toLowerCase())) score += 15;

  return Math.min(score, 100);
}

function scoreStructure(e: ExtractedContent): number {
  let score = 0;

  // nav presence
  if (e.nav.length >= 3) score += 20;
  if (e.nav.length >= 4 && e.nav.length <= 8) score += 15; // sweet spot
  if (e.nav.length > 10) score -= 10; // too many nav items = distraction

  // heading hierarchy
  if (e.h1.length > 0 && e.h2.length > 0) score += 20;
  if (e.h2.length >= 3) score += 20;
  if (e.h2.length >= 6) score += 10;

  // sections
  if (e.sections.length >= 4) score += 15;

  return Math.max(0, Math.min(score, 100));
}

function scoreUrgency(e: ExtractedContent): number {
  const allText = [...e.ctas, ...e.h1, ...e.h2, e.title, e.description].join(" ");

  let score = 5;

  const strongHits = countMatches(allText, URGENCY_STRONG);
  const mediumHits = countMatches(allText, URGENCY_MEDIUM);

  score += Math.min(strongHits * 30, 50);
  score += Math.min(mediumHits * 15, 35);

  if (e.pricing.length > 0) score += 10; // pricing visible = reduces friction

  return Math.min(score, 100);
}

// ─── Findings ──────────────────────────────────────────────────────────────

function generateFindings(e: ExtractedContent, b: CroBreakdown): Finding[] {
  const findings: Finding[] = [];
  const allText = [...e.h1, ...e.h2, ...e.sections, ...e.nav, e.title, e.description].join(" ");

  // Hero
  if (e.h1.length === 0) {
    findings.push({
      category: "Hero",
      issue: "No H1 headline found",
      recommendation: "Add a clear, benefit-driven H1 above the fold that answers: what do you offer, and for whom.",
      impact: "high",
    });
  } else {
    const words = wc(e.h1[0]);
    if (words < 3) {
      findings.push({
        category: "Hero",
        issue: `H1 is too short: "${e.h1[0]}"`,
        recommendation: "Expand into a full value proposition (5–12 words). E.g. instead of a brand name alone, add what you do and the benefit.",
        impact: "high",
      });
    } else if (words > 16) {
      findings.push({
        category: "Hero",
        issue: `H1 is too long (${words} words): "${e.h1[0].slice(0, 60)}…"`,
        recommendation: "Trim to under 12 words. Move supporting detail to a subheadline (H2) below.",
        impact: "medium",
      });
    }
  }

  if (!e.description) {
    findings.push({
      category: "SEO / Click-through",
      issue: "Missing meta description",
      recommendation: "Write a 120–160 character meta description. It shows in search results and directly affects CTR from Google.",
      impact: "medium",
    });
  }

  // CTA
  if (e.ctas.length === 0) {
    findings.push({
      category: "CTA",
      issue: "No CTA buttons detected",
      recommendation: "Add at least one prominent CTA button above the fold. Use action-oriented copy: 'Get Started Free', 'Try for Free', 'Book a Demo'.",
      impact: "high",
    });
  } else {
    const weakCtas = e.ctas.filter((c) => containsAny(c, WEAK_CTA));
    if (weakCtas.length > 0) {
      findings.push({
        category: "CTA",
        issue: `Weak CTA copy: "${weakCtas[0]}"`,
        recommendation: `Replace with specific, action-oriented copy that tells the user what they get. E.g. "Get My Free Trial" instead of "${weakCtas[0]}".`,
        impact: "high",
      });
    }
    if (e.ctas.length === 1) {
      findings.push({
        category: "CTA",
        issue: "Only one CTA detected",
        recommendation: "Add a second CTA for visitors not ready to commit — e.g. 'See how it works' or 'View demo'. This captures mid-funnel visitors without diluting the primary action.",
        impact: "medium",
      });
    }
  }

  // Social proof
  if (b.social_proof < 25) {
    findings.push({
      category: "Social Proof",
      issue: "No trust signals detected",
      recommendation: "Add at least one: customer count ('Trusted by 10,000+ users'), star rating, testimonial quote, or logos of known clients. Place it near the primary CTA.",
      impact: "high",
    });
  } else if (b.social_proof < 50) {
    findings.push({
      category: "Social Proof",
      issue: "Weak social proof signals",
      recommendation: "Strengthen trust: add specific numbers ('4.8/5 from 2,400 reviews'), a named testimonial, or a recognisable client logo. Vague claims like 'trusted' alone don't convert.",
      impact: "medium",
    });
  }

  // Urgency
  if (b.urgency < 20) {
    findings.push({
      category: "Urgency",
      issue: "No motivation signals near the CTA",
      recommendation: "Add low-friction reassurance below the CTA: 'Free 14-day trial', 'No credit card required', or 'Cancel anytime'. These remove the #1 hesitation at the conversion point.",
      impact: "medium",
    });
  }

  // Clarity
  if (e.h2.length < 2) {
    findings.push({
      category: "Clarity",
      issue: "Page has few section headings — hard to scan",
      recommendation: "Add H2 headings every 2–3 content blocks. Most visitors scan headings before reading — clear headings keep them on the page.",
      impact: "medium",
    });
  }

  // Structure
  if (e.nav.length > 10) {
    findings.push({
      category: "Structure",
      issue: `Navigation has ${e.nav.length} items — too many choices`,
      recommendation: "Reduce to 5–7 primary nav items. Too many options create decision paralysis and distract from the main conversion goal.",
      impact: "medium",
    });
  }

  // Pricing
  if (e.pricing.length === 0) {
    findings.push({
      category: "Pricing",
      issue: "No pricing signals detected",
      recommendation: "Show pricing or a 'See pricing' link. Hiding price forces users to contact you before they're ready, increasing drop-off.",
      impact: "medium",
    });
  }

  return findings
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.impact] - order[b.impact];
    })
    .slice(0, 6);
}

// ─── A/B Tests ─────────────────────────────────────────────────────────────

function generateAbTests(e: ExtractedContent, b: CroBreakdown): AbTest[] {
  const tests: AbTest[] = [];
  const h1 = e.h1[0] ?? null;
  const primaryCta = e.ctas[0] ?? null;

  // Headline test — reference actual H1
  if (h1) {
    tests.push({
      title: "Benefit-led vs current headline",
      hypothesis: `If we rewrite "${h1.slice(0, 50)}" to lead with the visitor's outcome (e.g. 'Get More X with Less Y'), then CTA clicks will increase because users respond to results, not features.`,
      priority: "high",
      effort: "easy",
      impact: "Headline rewrites consistently produce 10–30% lifts. Highest-ROI test to start with.",
      category: "Headline",
    });
  }

  // CTA copy test — reference actual CTA or suggest adding one
  if (primaryCta) {
    tests.push({
      title: "CTA copy: value vs action",
      hypothesis: `If we change "${primaryCta}" to include what the user gets (e.g. "Get My Free [Thing]"), then click-through rate will increase because it removes ambiguity about the next step.`,
      priority: "high",
      effort: "easy",
      impact: "CTA copy tests are among the fastest wins — 5–25% CVR uplift is common.",
      category: "CTA",
    });
  } else {
    tests.push({
      title: "Add above-fold CTA button",
      hypothesis: `If we add a prominent CTA button in the hero section, then conversion rate will increase because visitors currently have no clear next action above the fold.`,
      priority: "high",
      effort: "easy",
      impact: "Adding a missing CTA is the single highest-impact CRO change possible.",
      category: "CTA",
    });
  }

  // Social proof near CTA
  if (b.social_proof < 60) {
    tests.push({
      title: "Social proof directly below CTA",
      hypothesis: `If we place a trust signal ('10,000+ customers', a star rating, or one testimonial) immediately below the primary CTA, then conversion rate will increase because anxiety is reduced at the decision moment.`,
      priority: "high",
      effort: "easy",
      impact: "Social proof near CTA lifts conversions by 10–40% in most documented tests.",
      category: "Social Proof",
    });
  }

  // Urgency micro-copy
  if (b.urgency < 40) {
    tests.push({
      title: "Add micro-copy under CTA",
      hypothesis: `If we add 'No credit card required' or 'Cancel anytime' beneath the main CTA, then sign-up rate will increase because it eliminates the most common reason visitors hesitate.`,
      priority: "high",
      effort: "easy",
      impact: "Friction-reducing micro-copy typically adds 5–15% to sign-up conversion with near-zero effort.",
      category: "Trust",
    });
  }

  // CTA button colour
  tests.push({
    title: "High-contrast CTA button colour",
    hypothesis: `If we change the CTA button to a colour that contrasts strongly with the page background, then click-through rate will increase because the eye is drawn to it faster.`,
    priority: "medium",
    effort: "easy",
    impact: "Button colour contrast tests average 5–15% CTA click uplift.",
    category: "CTA",
  });

  // Hero simplification
  tests.push({
    title: "Simplified hero: headline + CTA only",
    hypothesis: `If we strip the hero section down to a single headline, one sentence of supporting copy, and a CTA (removing everything else), then conversion rate will increase because visitors reach the action faster with less distraction.`,
    priority: "medium",
    effort: "medium",
    impact: "Reduces cognitive load above the fold — effective for high-intent traffic sources.",
    category: "Layout",
  });

  // Section reorder
  if (e.h2.length >= 3 && b.social_proof < 60) {
    tests.push({
      title: "Move trust section to position 2",
      hypothesis: `If we reorder the page so a testimonial or 'used by' block appears immediately after the hero (before features), then scroll depth and CTA clicks will increase because trust is established before we ask for commitment.`,
      priority: "medium",
      effort: "medium",
      impact: "Front-loading social proof is a proven pattern — drives 10–20% more scroll-to-CTA completions.",
      category: "Layout",
    });
  }

  // Pricing visibility
  if (e.pricing.length === 0) {
    tests.push({
      title: "Show pricing on landing page",
      hypothesis: `If we add a pricing section or 'Plans from $X/mo' to the landing page, then lead quality will improve because visitors self-qualify before requesting a demo or signing up.`,
      priority: "medium",
      effort: "medium",
      impact: "Transparent pricing reduces unqualified leads and cuts churn from price-surprised customers.",
      category: "Pricing",
    });
  }

  // Secondary CTA
  tests.push({
    title: "Dual CTA: primary + secondary",
    hypothesis: `If we add a lower-commitment secondary CTA ('See how it works' or 'Watch demo') next to the primary, then overall engagement will increase by capturing visitors who aren't ready to convert yet.`,
    priority: "low",
    effort: "easy",
    impact: "Secondary CTAs typically add 10–20% more engaged sessions without cannibalising primary conversions.",
    category: "CTA",
  });

  return tests.slice(0, 7);
}

// ─── Main ──────────────────────────────────────────────────────────────────

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
    Object.values(breakdown).reduce((sum, v) => sum + v, 0) / Object.keys(breakdown).length
  );

  return {
    score,
    breakdown,
    abTests: generateAbTests(extracted, breakdown),
    findings: generateFindings(extracted, breakdown),
  };
}
