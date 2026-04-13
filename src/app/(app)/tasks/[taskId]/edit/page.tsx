import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/tasks/TaskForm";
import { format } from "date-fns";

export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { taskId } = await params;

  const [task, memberships, projectRows] = await Promise.all([
    prisma.task.findFirst({
      where: { id: taskId, ownerId: userId },
      include: {
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { team: { members: { some: { userId } } } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!task) notFound();

  const teams = memberships.map((m) => ({ id: m.team.id, name: m.team.name }));
  const teammates = Array.from(
    new Map(
      memberships.flatMap((m) => m.team.members.map((tm) => tm.user)).map((u) => [u.id, u])
    ).values()
  ).filter((u) => u.id !== userId);

  const tags: string[] = (() => { try { return JSON.parse(task.tags); } catch { return []; } })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Task</h1>
        <p className="text-muted-foreground text-sm mt-1">Update the details for this task.</p>
      </div>
      <TaskForm
        taskId={task.id}
        teams={teams}
        teammates={teammates}
        projects={projectRows}
        initialValues={{
          title: task.title,
          description: task.description ?? "",
          priority: task.priority as "low" | "medium" | "high" | "urgent",
          status: task.status as "todo" | "in_progress" | "done",
          dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
          tagsInput: tags.join(", "),
          assigneeId: task.assigneeId ?? "",
          teamId: task.teamId ?? "",
          projectId: task.projectId ?? "",
        }}
      />
    </div>
  );
}
