import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/tasks/TaskForm";

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [memberships, projectRows] = await Promise.all([
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
    prisma.project.findMany({ where: { ownerId: userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const teams = memberships.map((m) => ({ id: m.team.id, name: m.team.name }));
  const teammates = Array.from(
    new Map(
      memberships.flatMap((m) => m.team.members.map((tm) => tm.user)).map((u) => [u.id, u])
    ).values()
  ).filter((u) => u.id !== userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Task</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new task for yourself or your team.</p>
      </div>
      <TaskForm teams={teams} teammates={teammates} projects={projectRows} />
    </div>
  );
}
