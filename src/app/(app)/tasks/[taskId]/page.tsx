import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { CommentThread } from "@/components/tasks/CommentThread";
import { TaskAttachments } from "@/components/tasks/TaskAttachments";
import { LinkButton } from "@/components/ui/link-button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, ArrowLeft, Pencil, Tag, FolderKanban } from "lucide-react";

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { ownerId: userId },
        { assigneeId: userId },
        { team: { members: { some: { userId } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) notFound();

  const tags: string[] = (() => { try { return JSON.parse(task.tags); } catch { return []; } })();
  const isOwner = task.ownerId === userId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton href="/tasks" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Tasks
        </LinkButton>
        {isOwner && (
          <LinkButton href={`/tasks/${task.id}/edit`} variant="outline" size="sm" className="ml-auto">
            <Pencil className="h-4 w-4 mr-1" />Edit
          </LinkButton>
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>

        <div className="flex flex-wrap gap-2 items-center">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
          {task.team && (
            <Badge variant="outline">{task.team.name}</Badge>
          )}
          {task.project && (
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800 gap-1">
              <FolderKanban className="h-3 w-3" />
              {task.project.name}
            </Badge>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{task.description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {tags.map((tag) => (
              <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Owner</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {initials(task.owner.name, task.owner.email)}
                </AvatarFallback>
              </Avatar>
              <span>{task.owner.name ?? task.owner.email}</span>
            </div>
          </div>

          {task.assignee && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assignee</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {initials(task.assignee.name, task.assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <span>{task.assignee.name ?? task.assignee.email}</span>
              </div>
            </div>
          )}

          {task.dueDate && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(task.dueDate), "MMMM d, yyyy")}</span>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <span>{format(new Date(task.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      <Separator />

      <TaskAttachments
        taskId={task.id}
        initialAttachments={task.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), url: a.url ?? "" }))}
        canUpload={isOwner || task.assigneeId === userId}
      />

      <Separator />

      <CommentThread taskId={task.id} comments={task.comments} />
    </div>
  );
}
