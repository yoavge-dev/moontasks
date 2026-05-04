import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { LinkButton } from "@/components/ui/link-button";
import { Plus, PenLine, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function AnnotatorListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const features = await prisma.annotatedFeature.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spec Annotator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visual CMS field annotations for development handoff</p>
        </div>
        <LinkButton href="/annotator/new">
          <Plus className="h-4 w-4 mr-1.5" />
          New feature
        </LinkButton>
      </div>

      {features.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-4 border-2 border-dashed border-border rounded-xl">
          <Layers className="h-10 w-10 opacity-25" />
          <div>
            <p className="text-sm font-medium">No annotated features yet</p>
            <p className="text-xs mt-1">Upload a screenshot and annotate it to create your first feature spec</p>
          </div>
          <LinkButton href="/annotator/new" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> New feature
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            let count = 0;
            try { count = JSON.parse(f.annotations).length; } catch { /* */ }
            return (
              <Link
                key={f.id}
                href={`/annotator/${f.id}`}
                className="group border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all bg-card"
              >
                <div className="aspect-video bg-muted overflow-hidden relative">
                  <img
                    src={f.screenshotUrl}
                    alt={f.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {count} field{count !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-sm font-semibold truncate">{f.name}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{f.createdBy.name ?? f.createdBy.email}</span>
                    <span>{format(new Date(f.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
