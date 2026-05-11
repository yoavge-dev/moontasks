"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  logoUrl: string | null;
  publicSlug: string | null;
  isOwner: boolean;
  itemCount: number;
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
];

function projectGradient(name: string) {
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${project.id}/logo`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Upload failed"); return; }
      toast.success("Logo updated");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const gradient = projectGradient(project.name);
  const initials = project.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="group relative">
      <Link href={`/roadmaps/${project.id}`} className="block">
        <div className="rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          {/* Logo area */}
          <div className={cn("relative aspect-square w-full", !project.logoUrl && `bg-gradient-to-br ${gradient}`)}>
            {project.logoUrl ? (
              <img
                src={project.logoUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl font-black text-white/90 tracking-tight select-none">
                  {initials}
                </span>
              </div>
            )}

            {/* Upload overlay — only for owners */}
            {project.isOwner && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Upload logo"
              >
                {uploading ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <Camera className="h-7 w-7 text-white drop-shadow" />
                )}
              </button>
            )}
          </div>

          {/* Info */}
          <div className="px-3.5 py-3 space-y-0.5">
            <p className="text-sm font-semibold truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground">
              {project.itemCount} item{project.itemCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Link>

      {project.isOwner && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
      )}
    </div>
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
