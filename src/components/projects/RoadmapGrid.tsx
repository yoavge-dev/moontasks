"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  logoUrl: string | null;
  publicSlug: string | null;
  isOwner: boolean;
  pmOwner: string | null;
  ppcOwner: string | null;
}

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
  "from-sky-400 to-blue-500",
  "from-orange-400 to-red-500",
  "from-teal-400 to-emerald-600",
  "from-purple-400 to-violet-600",
];

function projectGradient(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

function ProjectCard({ project }: { project: Project }) {
  const gradient = projectGradient(project.name);
  const initials = project.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <Link href={`/roadmaps/${project.id}`}>
      <div className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
        {/* Logo area */}
        <div className={cn("relative h-28 w-full", !project.logoUrl && `bg-gradient-to-br ${gradient}`)}>
          {project.logoUrl ? (
            <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black text-white/90 tracking-tight select-none">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-2.5 space-y-1">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{project.name}</p>
          {(project.pmOwner || project.ppcOwner) ? (
            <div className="flex flex-col gap-0.5">
              {project.pmOwner && (
                <p className="text-xs text-muted-foreground truncate">PM — {project.pmOwner}</p>
              )}
              {project.ppcOwner && (
                <p className="text-xs text-muted-foreground truncate">PPC — {project.ppcOwner}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function RoadmapGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
