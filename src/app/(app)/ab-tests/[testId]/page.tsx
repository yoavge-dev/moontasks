import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Separator } from "@/components/ui/separator";
import { MetricsChart } from "@/components/ab-tests/MetricsChart";
import { MetricLogger } from "@/components/ab-tests/MetricLogger";
import { ABStatusControls } from "@/components/ab-tests/ABStatusControls";
import { ArrowLeft, FlaskConical } from "lucide-react";

const statusConfig = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  running: { label: "Running", className: "bg-green-100 text-green-700" },
  concluded: { label: "Concluded", className: "bg-purple-100 text-purple-700" },
};

export default async function ABTestDetailPage({ params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);

  const test = await prisma.aBTest.findFirst({
    where: { id: testId, OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      variants: {
        include: { metrics: { orderBy: { recordedAt: "desc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!test) notFound();

  const status = statusConfig[test.status as keyof typeof statusConfig] ?? { label: test.status, className: "" };
  const isOwner = test.ownerId === userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton href="/ab-tests" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Experiments
        </LinkButton>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{test.name}</h1>
            <Badge className={`text-xs border-0 ${status.className}`}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created by {test.owner.name ?? test.owner.email} · {format(new Date(test.createdAt), "MMM d, yyyy")}
            {test.startedAt && ` · Started ${format(new Date(test.startedAt), "MMM d, yyyy")}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <MetricLogger testId={test.id} variants={test.variants} />
          <ABStatusControls testId={test.id} status={test.status} isOwner={isOwner} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Hypothesis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{test.hypothesis}</p>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="font-semibold mb-4">Metrics Overview</h2>
        <MetricsChart variants={test.variants} />
      </div>

      <Separator />

      <div>
        <h2 className="font-semibold mb-4">Variants ({test.variants.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {test.variants.map((variant) => {
            const metricsByName = variant.metrics.reduce<Record<string, number[]>>((acc, m) => {
              if (!acc[m.metricName]) acc[m.metricName] = [];
              acc[m.metricName].push(m.value);
              return acc;
            }, {});

            return (
              <Card key={variant.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{variant.name}</CardTitle>
                  {variant.description && (
                    <p className="text-xs text-muted-foreground">{variant.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {Object.keys(metricsByName).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No metrics logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(metricsByName).map(([name, values]) => (
                        <div key={name} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-medium">
                            {values[0].toFixed(2)}
                            {values.length > 1 && (
                              <span className="text-xs text-muted-foreground ml-1">({values.length} readings)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
