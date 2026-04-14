import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractContent, hashContent } from "@/lib/scrape";

const Schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;

  const competitors = await prisma.competitor.findMany({
    where: { ownerId },
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: competitors });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const competitor = await prisma.competitor.create({
    data: { ...parsed.data, ownerId },
    include: { snapshots: { take: 1 } },
  });

  // Take baseline snapshot immediately (fire and forget — don't block the response)
  takeSnapshot(competitor.id, parsed.data.url).catch(console.error);

  return NextResponse.json({ data: competitor }, { status: 201 });
}

async function takeSnapshot(competitorId: string, url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonTasks/1.0)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return;
    const html = await res.text();
    const extracted = extractContent(html, url);
    const hash = hashContent(extracted);
    await prisma.competitorSnapshot.create({
      data: { competitorId, contentHash: hash, extracted: JSON.stringify(extracted), hasChanges: false },
    });
  } catch {
    // silently ignore — baseline can be retaken on first manual check
  }
}
