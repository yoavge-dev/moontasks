import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MergedTaskList } from "@/components/tasks/MergedTaskList";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [tasks, settings] = await Promise.all([
    prisma.task.findMany({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  const hasJiraConfigured = !!(settings?.jiraDomain && settings?.jiraEmail && settings?.jiraToken);

  return (
    <MergedTaskList
      localTasks={tasks.map((t) => ({ ...t, createdAt: t.createdAt }))}
      hasJiraConfigured={hasJiraConfigured}
    />
  );
}
