import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Map, ArrowRight } from "lucide-react";

export const metadata = { title: "Roadmaps — MoonTasks" };

export default async function PublicRoadmapsPage() {
  const projects = await prisma.project.findMany({
    where: { publicSlug: { not: null } },
    include: { _count: { select: { roadmapItems: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Moonshoot</p>
          <h1 className="text-3xl font-bold tracking-tight">Product Roadmaps</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse all active project roadmaps
          </p>
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3 border-2 border-dashed border-border rounded-xl">
            <Map className="h-10 w-10 opacity-25" />
            <p className="text-sm">No roadmaps have been shared yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/roadmap/${project.publicSlug}`}>
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
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a href="https://moontasks.vercel.app" className="hover:underline font-medium">
            MoonTasks
          </a>
        </div>
      </div>
    </div>
  );
}
