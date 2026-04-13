import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Map, ArrowRight } from "lucide-react";

export default async function RoadmapsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    include: {
      team: { select: { id: true, name: true } },
      _count: { select: { roadmapItems: true } },
    },
    orderBy: { name: "asc" },
  });

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/roadmaps/${project.id}`}>
              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {project._count.roadmapItems} item{project._count.roadmapItems !== 1 ? "s" : ""}
                    {project.team && ` · ${project.team.name}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
