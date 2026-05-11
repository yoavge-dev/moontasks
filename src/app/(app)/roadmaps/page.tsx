import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Map } from "lucide-react";
import { RoadmapGrid } from "@/components/projects/RoadmapGrid";

export default async function RoadmapsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    orderBy: { name: "asc" },
  });

  const gridProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    logoUrl: p.logoUrl ?? null,
    publicSlug: p.publicSlug ?? null,
    isOwner: p.ownerId === userId,
    pmOwner: p.pmOwner ?? null,
    ppcOwner: p.ppcOwner ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roadmaps</h1>
        <p className="text-muted-foreground text-sm mt-1">Select a project to view its quarterly roadmap</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Map className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a project first to start building a roadmap.
          </p>
        </div>
      ) : (
        <RoadmapGrid projects={gridProjects} />
      )}
    </div>
  );
}
