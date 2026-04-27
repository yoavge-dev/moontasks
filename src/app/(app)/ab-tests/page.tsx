import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ABTestsList } from "@/components/ab-tests/ABTestsList";

export default async function ABTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);

  const tests = await prisma.aBTest.findMany({
    where: { OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    select: {
      id: true, name: true, hypothesis: true, status: true, createdAt: true,
      startedAt: true, concludedAt: true, result: true,
      team: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ABTestsList tests={tests} />;
}
