import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoadmapBoard } from "@/components/projects/RoadmapBoard";
import { ArrowLeft } from "lucide-react";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      roadmapItems: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!project) notFound();

  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);
  const canAccess = project.ownerId === userId || (project.teamId && teamIds.includes(project.teamId));
  if (!canAccess) redirect("/ab-tests/projects");
  const isOwner = project.ownerId === userId;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/ab-tests/projects/${projectId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          {project.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
        <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
      </div>

      <RoadmapBoard
        projectId={projectId}
        initialItems={project.roadmapItems}
        isOwner={isOwner}
      />
    </div>
  );
}
