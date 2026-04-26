import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractContent } from "@/lib/scrape";
import { runCroAudit } from "@/lib/cro";

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
  const audit = runCroAudit(extracted);

  const saved = await prisma.croAudit.create({
    data: {
      competitorId: id,
      score: audit.score,
      breakdown: JSON.stringify(audit.breakdown),
      abTests: JSON.stringify(audit.abTests),
      findings: JSON.stringify(audit.findings),
    },
  });

  return NextResponse.json({ data: { ...saved, ...audit } });
}
