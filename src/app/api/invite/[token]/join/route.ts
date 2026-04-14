import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "This invite link has already been used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });

  const existing = await prisma.teamMember.findFirst({
    where: { teamId: invite.teamId, userId },
  });
  if (existing) {
    return NextResponse.json({ data: { teamId: invite.teamId } });
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: invite.teamId, userId, role: "member" },
    }),
    prisma.teamInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ data: { teamId: invite.teamId } }, { status: 201 });
}
