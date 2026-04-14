import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractContent, hashContent, diffContent, diffToStrings, ExtractedContent } from "@/lib/scrape";
import { createNotification } from "@/lib/notifications";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const competitors = await prisma.competitor.findMany({
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  let checked = 0;
  let changed = 0;

  for (const competitor of competitors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(competitor.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonTasks/1.0)" },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) continue;
      const html = await res.text();
      const extracted = extractContent(html, competitor.url);
      const hash = hashContent(extracted);
      const prev = competitor.snapshots[0];
      const hasChanges = !!prev && prev.contentHash !== hash;
      checked++;

      let changesSince: string | null = null;
      let rawDiffJson: string | null = null;
      if (hasChanges && prev) {
        const prevExtracted = JSON.parse(prev.extracted) as ExtractedContent;
        const diffItems = diffContent(prevExtracted, extracted);
        rawDiffJson = diffItems.length > 0 ? JSON.stringify(diffItems) : null;

        if (diffItems.length > 0 && client) {
          try {
            const diffStrings = diffToStrings(diffItems);
            const response = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 300,
              messages: [{
                role: "user",
                content: `Competitor website "${competitor.name}" changed. Raw diff:\n${diffStrings.join("\n")}\n\nBrief plain-English summary (2-3 bullets) of what changed and why it might matter.`,
              }],
            });
            changesSince = (response.content[0] as { type: string; text: string }).text;
          } catch {
            changesSince = diffToStrings(diffItems).join("\n");
          }
        } else if (diffItems.length > 0) {
          changesSince = diffToStrings(diffItems).join("\n");
        }

        if (changesSince) {
          changed++;
          await createNotification({
            userId: competitor.ownerId,
            type: "competitor",
            title: `${competitor.name} updated their website`,
            body: changesSince.slice(0, 120),
            link: "/competitors",
          });
        }
      }

      await prisma.competitorSnapshot.create({
        data: {
          competitorId: competitor.id,
          contentHash: hash,
          extracted: JSON.stringify(extracted),
          hasChanges,
          changesSince,
          rawDiff: rawDiffJson,
        },
      });
    } catch {
      // continue with next competitor
    }
  }

  return NextResponse.json({ ok: true, checked, changed });
}
