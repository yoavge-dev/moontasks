import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/link-button";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { RoadmapColumns } from "@/components/projects/RoadmapColumns";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Plus, FlaskConical, CheckSquare, MapPin,
  Calendar, Circle, Clock, CheckCircle2,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const statusDot: Record<string, string> = {
  draft: "bg-slate-400",
  running: "bg-emerald-500",
  concluded: "bg-violet-400",
};
const statusLabel: Record<string, string> = {
  draft: "Draft",
  running: "Running",
  concluded: "Concluded",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { projectId } = await params;
  const { tab = "roadmap" } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      roadmapItems: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      abTests: {
        include: {
          _count: { select: { variants: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);
  const canAccess = project.ownerId === userId || (project.teamId && teamIds.includes(project.teamId));
  if (!canAccess) redirect("/projects");

  const isOwner = project.ownerId === userId;

  const tabs = [
    { key: "roadmap", label: "Roadmap", icon: MapPin, count: project.roadmapItems.length },
    { key: "tasks", label: "Tasks", icon: CheckSquare, count: project.tasks.length },
    { key: "experiments", label: "Experiments", icon: FlaskConical, count: project.abTests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          All Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <ProjectHeader
            projectId={projectId}
            name={project.name}
            description={project.description}
            url={project.url}
            ppcOwner={project.ppcOwner}
            teamName={project.team?.name}
            isOwner={isOwner}
          />
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && tab === "experiments" && (
              <LinkButton href={`/ab-tests/new?projectId=${projectId}`} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Experiment
              </LinkButton>
            )}
            {isOwner && tab === "tasks" && (
              <LinkButton href={`/tasks/new`} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Task
              </LinkButton>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <Link
            key={key}
            href={`/projects/${projectId}?tab=${key}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              tab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "roadmap" && (
        <RoadmapColumns
          projectId={projectId}
          initialItems={project.roadmapItems}
          isOwner={isOwner}
        />
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          {project.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <CheckSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-sm">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Edit any task and set its project to <span className="font-medium text-foreground">{project.name}</span>.</p>
              {isOwner && (
                <LinkButton href="/tasks/new" size="sm" className="mt-4">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Task
                </LinkButton>
              )}
            </div>
          ) : (
            <>
              {/* Status summary */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {[
                  { status: "todo", label: "Not Started", dot: "bg-slate-400" },
                  { status: "in_progress", label: "In Progress", dot: "bg-amber-400" },
                  { status: "done", label: "Done", dot: "bg-emerald-500" },
                ].map(({ status, label, dot }) => {
                  const count = project.tasks.filter((t) => t.status === status).length;
                  return count > 0 ? (
                    <span key={status} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                      {count} {label}
                    </span>
                  ) : null;
                })}
              </div>

              {/* Task rows */}
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {project.tasks.map((task) => {
                  const borderColor = task.status === "done" ? "border-l-emerald-500" : task.status === "in_progress" ? "border-l-amber-400" : "border-l-slate-300";
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/40 transition-colors border-l-4 group",
                        borderColor
                      )}
                    >
                      <TaskStatusBadge status={task.status} />
                      <span className="text-sm font-medium flex-1 truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <TaskPriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className={cn(
                            "flex items-center gap-1 text-xs",
                            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {isToday(new Date(task.dueDate)) ? "Today" : format(new Date(task.dueDate), "MMM d")}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {task.assignee.name ?? task.assignee.email}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "experiments" && (
        <div className="space-y-3">
          {project.abTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No experiments linked to this project yet.</p>
              {isOwner && (
                <LinkButton href={`/ab-tests/new?projectId=${projectId}`} size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Experiment
                </LinkButton>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {project.abTests.map((test) => (
                <Link key={test.id} href={`/ab-tests/${test.id}`}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {test.name}
                        </p>
                        <span className={cn(
                          "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                          test.status === "running" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          test.status === "concluded" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[test.status])} />
                          {statusLabel[test.status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{test.hypothesis}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{test._count.variants} variant{test._count.variants !== 1 ? "s" : ""}</span>
                        {test.startedAt && (
                          <span>Started {format(new Date(test.startedAt), "MMM d")}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
