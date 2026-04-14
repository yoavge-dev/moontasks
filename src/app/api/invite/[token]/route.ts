import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      team: { select: { id: true, name: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "This invite link has already been used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });

  return NextResponse.json({
    data: {
      teamId: invite.team.id,
      teamName: invite.team.name,
      invitedBy: invite.invitedBy.name ?? invite.invitedBy.email,
      expiresAt: invite.expiresAt,
    },
  });
}
