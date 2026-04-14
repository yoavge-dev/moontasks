import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteClient } from "./InviteClient";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      team: { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) notFound();

  const expired = invite.expiresAt < new Date();
  const used = !!invite.usedAt;

  const session = await getServerSession(authOptions);
  const loggedInUserId = session?.user ? (session.user as { id: string }).id : null;

  // Check if logged-in user is already a member
  let alreadyMember = false;
  if (loggedInUserId) {
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: invite.teamId, userId: loggedInUserId },
    });
    alreadyMember = !!membership;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <InviteClient
        token={token}
        teamName={invite.team.name}
        invitedBy={invite.invitedBy.name ?? invite.invitedBy.email}
        expired={expired}
        used={used}
        loggedIn={!!loggedInUserId}
        alreadyMember={alreadyMember}
      />
    </main>
  );
}
