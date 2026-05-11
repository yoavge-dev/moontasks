import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Map } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = { title: "Roadmaps — MoonTasks" };

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

export default async function RoadmapsPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Moonshoot</p>
            <h1 className="text-3xl font-bold tracking-tight">Roadmaps</h1>
            <p className="text-sm text-muted-foreground">Browse all active project roadmaps</p>
          </div>
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-1.5"
            >
              Back to app
            </Link>
          )}
        </div>

        {/* Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3 border-2 border-dashed border-border rounded-xl">
            <Map className="h-10 w-10 opacity-25" />
            <p className="text-sm">No roadmaps yet</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {projects.map((project) => {
              const gradient = projectGradient(project.name);
              const initials = project.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
              // Logged-in users go to the full edit view (with sidebar), guests go to public view
              const href = isLoggedIn
                ? `/roadmaps/${project.id}`
                : project.publicSlug
                  ? `/roadmap/${project.publicSlug}`
                  : null;

              if (!href) return null;

              return (
                <Link key={project.id} href={href}>
                  <div className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                    <div className={cn("relative h-28 w-full", !project.logoUrl && `bg-gradient-to-br ${gradient}`)}>
                      {project.logoUrl ? (
                        <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-black text-white/90 tracking-tight select-none">{initials}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2.5 space-y-1">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{project.name}</p>
                      {(project.pmOwner || project.ppcOwner) && (
                        <div className="flex flex-col gap-0.5">
                          {project.pmOwner && <p className="text-xs text-muted-foreground truncate">PM — {project.pmOwner}</p>}
                          {project.ppcOwner && <p className="text-xs text-muted-foreground truncate">PPC — {project.ppcOwner}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!isLoggedIn && (
          <div className="pt-4 border-t text-center text-xs text-muted-foreground">
            Powered by{" "}
            <a href="https://moontasks.vercel.app" className="hover:underline font-medium">MoonTasks</a>
          </div>
        )}
      </div>
    </div>
  );
}
