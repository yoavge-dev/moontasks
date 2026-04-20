import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderKanban, CheckSquare, FlaskConical, MapPin, UserCog } from "lucide-react";
import { ProjectUrlLink } from "@/components/projects/ProjectUrlLink";
import { format } from "date-fns";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const projects = await prisma.project.findMany({
    include: {
      team: { select: { id: true, name: true } },
      _count: { select: { abTests: true, roadmapItems: true, tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length === 0 ? "No projects yet" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <LinkButton href="/projects/new">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </LinkButton>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FolderKanban className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-base">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create a project to organise tasks, A/B tests, and roadmap items in one place.
          </p>
          <LinkButton href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border-t-2 border-t-violet-400 group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                      )}
                      {project.url && <ProjectUrlLink url={project.url} />}
                      {project.ppcOwner && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5 block">
                          <UserCog className="h-3 w-3" />{project.ppcOwner}
                        </span>
                      )}
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                      <FolderKanban className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      {project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <FlaskConical className="h-3 w-3" />
                      {project._count.abTests} experiment{project._count.abTests !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project._count.roadmapItems} roadmap
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                    {project.team && (
                      <span className="bg-muted px-1.5 py-0.5 rounded-full">{project.team.name}</span>
                    )}
                    <span className="ml-auto">{format(new Date(project.updatedAt ?? project.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
