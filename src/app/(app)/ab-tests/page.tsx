import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FlaskConical, FolderKanban } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  draft:     { label: "Draft",     dot: "bg-slate-400",   className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  running:   { label: "Running",   dot: "bg-emerald-500", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  concluded: { label: "Concluded", dot: "bg-violet-400",  className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

type Test = {
  id: string; name: string; hypothesis: string; status: string; createdAt: Date;
  project: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  _count: { variants: number };
};

function TestCard({ test }: { test: Test }) {
  const sc = statusConfig[test.status as keyof typeof statusConfig] ?? statusConfig.draft;
  return (
    <Link href={`/ab-tests/${test.id}`}>
      <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
              {test.name}
            </CardTitle>
            <Badge className={`text-[10px] border-0 shrink-0 flex items-center gap-1 ${sc.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{test.hypothesis}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{test._count.variants} variant{test._count.variants !== 1 ? "s" : ""}</span>
            <span>{format(new Date(test.createdAt), "MMM d, yyyy")}</span>
          </div>
          {test.team && (
            <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{test.team.name}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ABTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);

  const tests = await prisma.aBTest.findMany({
    where: { OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    include: {
      team: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by project
  const byProject = new Map<string, { name: string; tests: Test[] }>();
  const untagged: Test[] = [];

  for (const test of tests) {
    if (test.project) {
      const existing = byProject.get(test.project.id);
      if (existing) {
        existing.tests.push(test);
      } else {
        byProject.set(test.project.id, { name: test.project.name, tests: [test] });
      }
    } else {
      untagged.push(test);
    }
  }

  const running = tests.filter((t) => t.status === "running").length;
  const draft = tests.filter((t) => t.status === "draft").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-3">
            <span>{tests.length} experiment{tests.length !== 1 ? "s" : ""}</span>
            {running > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {running} running
              </span>
            )}
            {draft > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {draft} draft
              </span>
            )}
          </p>
        </div>
        <LinkButton href="/ab-tests/new">
          <Plus className="h-4 w-4 mr-2" />
          New Experiment
        </LinkButton>
      </div>

      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FlaskConical className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">No experiments yet</p>
          <p className="text-sm text-muted-foreground mb-5 mt-1">Create your first A/B test to get started</p>
          <LinkButton href="/ab-tests/new">
            <Plus className="h-4 w-4 mr-2" />
            New Experiment
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Project groups */}
          {Array.from(byProject.entries()).map(([projectId, { name, tests: projectTests }]) => (
            <section key={projectId}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <FolderKanban className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="font-semibold text-base">{name}</h2>
                <span className="text-xs text-muted-foreground">({projectTests.length})</span>
                <Link href={`/projects/${projectId}`} className="text-xs text-muted-foreground hover:text-foreground ml-1 underline underline-offset-2">
                  View project
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projectTests.map((test) => <TestCard key={test.id} test={test} />)}
              </div>
            </section>
          ))}

          {/* Untagged */}
          {untagged.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <h2 className="font-semibold text-base text-muted-foreground">No project tagged yet</h2>
                <span className="text-xs text-muted-foreground">({untagged.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {untagged.map((test) => <TestCard key={test.id} test={test} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
