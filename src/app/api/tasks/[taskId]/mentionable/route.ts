import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userMap = new Map<string, { id: string; name: string | null; email: string }>();
  userMap.set(task.owner.id, task.owner);
  if (task.assignee) userMap.set(task.assignee.id, task.assignee);
  if (task.team) {
    for (const m of task.team.members) {
      userMap.set(m.user.id, m.user);
    }
  }

  return NextResponse.json({ data: [...userMap.values()] });
}
