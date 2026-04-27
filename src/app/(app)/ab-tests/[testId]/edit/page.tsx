import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditABTestForm } from "@/components/ab-tests/EditABTestForm";

export default async function EditABTestPage({ params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const test = await prisma.aBTest.findFirst({
    where: { id: testId, ownerId: userId },
    include: { variants: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, description: true, screenshotUrl: true } } },
  });
  if (!test) notFound();

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <EditABTestForm
      test={{
        id: test.id,
        name: test.name,
        hypothesis: test.hypothesis,
        projectId: test.projectId,
        pageUrl: test.pageUrl,
        kpi: test.kpi,
        targetUplift: test.targetUplift,
        plannedDays: test.plannedDays,
        startedAt: test.startedAt?.toISOString() ?? null,
        concludedAt: test.concludedAt?.toISOString() ?? null,
        result: (test.result as "won" | "lost" | null) ?? null,
        status: test.status,
        variants: test.variants.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description ?? "",
          screenshotUrl: v.screenshotUrl ?? "",
        })),
      }}
      projects={projects}
    />
  );
}
