import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractContent, hashContent, diffContent, ExtractedContent } from "@/lib/scrape";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;
  const { id } = await params;

  const competitor = await prisma.competitor.findFirst({
    where: { id, ownerId },
    include: {
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the page
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(competitor.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonTasks/1.0)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch ${competitor.url}: ${err instanceof Error ? err.message : err}` }, { status: 502 });
  }

  const extracted = extractContent(html, competitor.url);
  const hash = hashContent(extracted);
  const prev = competitor.snapshots[0];
  const hasChanges = !!prev && prev.contentHash !== hash;

  // Build diff
  let changesSince: string | null = null;
  if (hasChanges && prev) {
    const prevExtracted = JSON.parse(prev.extracted) as ExtractedContent;
    const rawDiff = diffContent(prevExtracted, extracted);

    if (rawDiff.length > 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const client = new Anthropic();
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{
            role: "user",
            content: `A competitor website (${competitor.name}) has changed. Here are the raw detected changes:\n\n${rawDiff.join("\n")}\n\nWrite a brief, plain-English summary of what changed and why it might matter strategically. 2-4 bullet points max.`,
          }],
        });
        changesSince = (response.content[0] as { type: string; text: string }).text;
      } catch {
        changesSince = rawDiff.join("\n");
      }
    } else if (rawDiff.length > 0) {
      changesSince = rawDiff.join("\n");
    }
  }

  const snapshot = await prisma.competitorSnapshot.create({
    data: {
      competitorId: id,
      contentHash: hash,
      extracted: JSON.stringify(extracted),
      hasChanges,
      changesSince,
    },
  });

  return NextResponse.json({ data: { snapshot, hasChanges, changesSince } });
}
