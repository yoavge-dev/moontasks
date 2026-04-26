import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractContent } from "@/lib/scrape";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;
  const { id } = await params;

  const competitor = await prisma.competitor.findFirst({ where: { id, ownerId } });
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(competitor.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonTasks/1.0)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch page: ${err instanceof Error ? err.message : err}` }, { status: 502 });
  }

  const extracted = extractContent(html, competitor.url);

  const prompt = `You are a senior CRO (Conversion Rate Optimization) specialist. Analyze this landing page and provide a detailed audit.

URL: ${competitor.url}
Title: ${extracted.title}
Meta Description: ${extracted.description}
H1 Headlines: ${extracted.h1.join(" | ") || "none found"}
H2 Subheadings: ${extracted.h2.join(" | ") || "none found"}
Navigation Items: ${extracted.nav.join(", ") || "none found"}
CTA Buttons: ${extracted.ctas.join(" | ") || "none found"}
Pricing Signals: ${extracted.pricing.join(", ") || "none found"}
Key Sections: ${extracted.sections.join(" | ") || "none found"}

Respond with ONLY a valid JSON object in this exact structure, no markdown, no explanation:
{
  "score": <integer 0-100>,
  "breakdown": {
    "hero": <0-100>,
    "cta": <0-100>,
    "clarity": <0-100>,
    "social_proof": <0-100>,
    "structure": <0-100>,
    "urgency": <0-100>
  },
  "ab_tests": [
    {
      "title": "<concise test name, max 8 words>",
      "hypothesis": "If we [change X], then [metric] will [direction] because [reason]",
      "priority": "high|medium|low",
      "effort": "easy|medium|hard",
      "impact": "<1 sentence on expected uplift>",
      "category": "Headline|CTA|Social Proof|Pricing|Navigation|Layout|Form|Trust"
    }
  ],
  "findings": [
    {
      "category": "<area>",
      "issue": "<what is weak or missing>",
      "recommendation": "<specific actionable change>",
      "impact": "high|medium|low"
    }
  ]
}

Provide 5-7 A/B tests sorted by priority (high first). Provide 4-6 findings sorted by impact. Be specific to the actual page content.`;

  let auditData: {
    score: number;
    breakdown: Record<string, number>;
    ab_tests: Array<{
      title: string;
      hypothesis: string;
      priority: string;
      effort: string;
      impact: string;
      category: string;
    }>;
    findings: Array<{
      category: string;
      issue: string;
      recommendation: string;
      impact: string;
    }>;
  };

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (response.content[0] as { type: string; text: string }).text.trim();
    auditData = JSON.parse(text);
  } catch (err) {
    return NextResponse.json({ error: `Audit failed: ${err instanceof Error ? err.message : err}` }, { status: 500 });
  }

  const audit = await prisma.croAudit.create({
    data: {
      competitorId: id,
      score: auditData.score,
      breakdown: JSON.stringify(auditData.breakdown),
      abTests: JSON.stringify(auditData.ab_tests),
      findings: JSON.stringify(auditData.findings),
    },
  });

  return NextResponse.json({ data: { ...audit, breakdown: auditData.breakdown, abTests: auditData.ab_tests, findings: auditData.findings } });
}
