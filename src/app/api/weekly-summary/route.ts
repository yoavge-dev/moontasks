import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

function getWeekBounds(dateStr: string | null) {
  const ref = dateStr ? new Date(dateStr) : new Date();
  const day = ref.getDay(); // 0 = Sun
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const weekParam = req.nextUrl.searchParams.get("week");
  const { monday, sunday } = getWeekBounds(weekParam);

  const tasks = await prisma.task.findMany({
    where: {
      ownerId: userId,
      OR: [
        // completed this week
        { status: "done", updatedAt: { gte: monday, lte: sunday } },
        // created or updated this week and not done
        { status: { not: "done" }, updatedAt: { gte: monday, lte: sunday } },
        // due this week
        { dueDate: { gte: monday, lte: sunday } },
      ],
    },
    include: {
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const done = tasks.filter((t) => t.status === "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const stuck = tasks.filter((t) => t.status === "stuck");
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date()
  );

  return NextResponse.json({
    data: {
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      done: done.map((t) => ({ id: t.id, title: t.title, project: t.project?.name ?? null })),
      inProgress: inProgress.map((t) => ({ id: t.id, title: t.title, project: t.project?.name ?? null })),
      stuck: stuck.map((t) => ({ id: t.id, title: t.title, project: t.project?.name ?? null })),
      overdue: overdue.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, project: t.project?.name ?? null })),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI summary requires ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const { done, inProgress, stuck, overdue, weekStart } = await req.json();

  const weekLabel = new Date(weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const lines: string[] = [];
  if (done.length) lines.push(`Completed:\n${done.map((t: { title: string; project: string | null }) => `- ${t.title}${t.project ? ` [${t.project}]` : ""}`).join("\n")}`);
  if (inProgress.length) lines.push(`In progress:\n${inProgress.map((t: { title: string; project: string | null }) => `- ${t.title}${t.project ? ` [${t.project}]` : ""}`).join("\n")}`);
  if (stuck.length) lines.push(`Blocked:\n${stuck.map((t: { title: string }) => `- ${t.title}`).join("\n")}`);
  if (overdue.length) lines.push(`Overdue:\n${overdue.map((t: { title: string }) => `- ${t.title}`).join("\n")}`);

  if (!lines.length) {
    return NextResponse.json({ data: { summary: "No task activity this week to summarize." } });
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Write a concise, professional weekly status update for the week of ${weekLabel} that I can send to my manager. Use bullet points. Cover what was accomplished, what's ongoing, and any blockers. Be brief and factual — no filler phrases. Here's my task data:\n\n${lines.join("\n\n")}`,
      },
    ],
  });

  const summary = (response.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ data: { summary } });
}
