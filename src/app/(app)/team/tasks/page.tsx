import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/team/KanbanBoard";
import { LinkButton } from "@/components/ui/link-button";
import { Plus } from "lucide-react";

export default async function TeamTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const tasks = await prisma.task.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Drag cards to update status</p>
        </div>
        <LinkButton href="/tasks/new">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </LinkButton>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">No team tasks yet.</p>
          <LinkButton href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            Create the first one
          </LinkButton>
        </div>
      ) : (
        <div className="flex-1">
          <KanbanBoard tasks={tasks} />
        </div>
      )}
    </div>
  );
}
