import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { JiraDashboardPanel, JiraStatCard } from "@/components/dashboard/JiraDashboardPanel";
import { JiraSetupBanner } from "@/components/dashboard/JiraSetupBanner";
import { CheckSquare, Clock, FlaskConical, Users, Plus, PartyPopper } from "lucide-react";
import { format, isToday } from "date-fns";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [openTaskCount, dueTodayTasks, runningABTests, recentTasks, memberships, userSettings] =
    await Promise.all([
      prisma.task.count({ where: { ownerId: userId, status: { not: "done" } } }),
      prisma.task.findMany({
        where: {
          ownerId: userId,
          dueDate: {
            gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
            lte: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })(),
          },
          status: { not: "done" },
        },
      }),
      prisma.aBTest.count({ where: { ownerId: userId, status: "running" } }),
      prisma.task.findMany({
        where: { ownerId: userId },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.teamMember.count({ where: { userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
    ]);

  const hasJira = !!(userSettings?.jiraDomain && userSettings?.jiraEmail && userSettings?.jiraToken);

  const stats = [
    { label: "Open Tasks", value: openTaskCount, icon: CheckSquare, href: "/tasks", iconBg: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600 dark:text-sky-400", accent: "border-t-sky-400" },
    { label: "Due Today", value: dueTodayTasks.length, icon: Clock, href: "/tasks", iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", accent: "border-t-amber-400" },
    { label: "Running Experiments", value: runningABTests, icon: FlaskConical, href: "/ab-tests", iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", accent: "border-t-emerald-400" },
    { label: "Teams", value: memberships, icon: Users, href: "/team", iconBg: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600 dark:text-violet-400", accent: "border-t-violet-400" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {session.user.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <LinkButton href="/tasks/new">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </LinkButton>
      </div>

      {/* Jira setup prompt — only shown when not connected */}
      {!hasJira && <JiraSetupBanner />}

      {/* Stat cards — Jira card appends itself if connected */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, iconBg, iconColor, accent }) => (
          <Link key={label} href={href}>
            <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border-t-2 ${accent}`}>
              <CardContent className="p-5">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <p className="text-3xl font-extrabold tracking-tight">{value}</p>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {hasJira && <JiraStatCard />}
      </div>

      {/* Panels */}
      <div className={`grid gap-6 ${hasJira ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {/* Due Today */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Due Today</CardTitle>
              <LinkButton href="/tasks" variant="ghost" size="sm">View all</LinkButton>
            </div>
          </CardHeader>
          <CardContent>
            {dueTodayTasks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PartyPopper className="h-4 w-4 text-emerald-500" />
                Nothing due today
              </div>
            ) : (
              <div className="space-y-1">
                {dueTodayTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <TaskPriorityBadge priority={task.priority} />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Tasks</CardTitle>
              <LinkButton href="/tasks" variant="ghost" size="sm">View all</LinkButton>
            </div>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No tasks yet.</p>
                <LinkButton href="/tasks/new" size="sm">Create your first task</LinkButton>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <TaskStatusBadge status={task.status} />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    {task.project && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-[#e3f0ff] text-[#1e6ec1]">
                        {task.project.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isToday(new Date(task.updatedAt)) ? "Today" : format(new Date(task.updatedAt), "MMM d")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jira panel — only renders if connected */}
        {hasJira && <JiraDashboardPanel />}
      </div>
    </div>
  );
}
