import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateTeamSchema = z.object({ name: z.string().min(1).max(100) });

async function getTeamForUser(teamId: string, userId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { teamId } = await params;
  const team = await getTeamForUser(teamId, userId);
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: team });
}

export async function PUT(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { teamId } = await params;

  // Only owner can update
  const member = await prisma.teamMember.findFirst({ where: { teamId, userId, role: "owner" } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateTeamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const team = await prisma.team.update({ where: { id: teamId }, data: { name: parsed.data.name } });
  return NextResponse.json({ data: team });
}

export async function DELETE() {
  return NextResponse.json({ data: null });
}
