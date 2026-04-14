import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const CommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { taskId } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, OR: [{ ownerId: userId }, { assigneeId: userId }, { team: { members: { some: { userId } } } }] },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json();
    const parsed = CommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { body: parsed.data.body, taskId, authorId: userId },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    const actorName = comment.author.name ?? comment.author.email;

    // Notify task owner and assignee
    const notifyIds = new Set<string>();
    notifyIds.add(task.ownerId);
    if (task.assigneeId) notifyIds.add(task.assigneeId);
    notifyIds.delete(userId);

    await Promise.all(
      [...notifyIds].map((recipientId) =>
        createNotification({
          userId: recipientId,
          actorId: userId,
          type: "comment",
          title: `${actorName} commented on "${task.title}"`,
          body: parsed.data.body.slice(0, 100),
          link: `/tasks/${taskId}`,
        })
      )
    );

    // Notify mentioned users (@[Name:userId] pattern)
    const mentionRegex = /@\[([^\]]+):([^\]]+)\]/g;
    const mentionedIds = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(parsed.data.body)) !== null) {
      mentionedIds.add(match[2]);
    }
    mentionedIds.delete(userId); // don't notify yourself

    await Promise.all(
      [...mentionedIds].map((mentionedId) =>
        createNotification({
          userId: mentionedId,
          actorId: userId,
          type: "mention",
          title: `${actorName} mentioned you in "${task.title}"`,
          body: parsed.data.body.replace(/@\[([^\]]+):[^\]]+\]/g, "@$1").slice(0, 100),
          link: `/tasks/${taskId}`,
        })
      )
    );

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
