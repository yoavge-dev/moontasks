import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RoadmapColumns } from "@/components/projects/RoadmapColumns";
import { Link2 } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { publicSlug: slug } });
  return { title: project ? `${project.name} — Roadmap` : "Roadmap" };
}

export default async function PublicRoadmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { publicSlug: slug },
    include: {
      roadmapItems: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product Roadmap</p>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground max-w-xl mt-1">{project.description}</p>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <Link2 className="h-3 w-3" />
              {project.url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {/* Read-only board */}
        <RoadmapColumns
          projectId={project.id}
          initialItems={project.roadmapItems}
          isOwner={false}
        />

        {/* Footer */}
        <div className="pt-8 border-t text-center text-xs text-muted-foreground">
          Shared via{" "}
          <a href="https://moontasks.vercel.app" className="hover:underline font-medium">
            MoonTasks
          </a>
        </div>
      </div>
    </div>
  );
}
