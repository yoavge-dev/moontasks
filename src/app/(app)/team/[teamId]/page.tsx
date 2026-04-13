import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { ArrowLeft } from "lucide-react";

function initials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (email ?? "?")[0].toUpperCase();
}

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const { teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        where: { status: { not: "done" } },
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!team) notFound();

  const myRole = team.members.find((m) => m.userId === userId)?.role;
  const isOwner = myRole === "owner";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <LinkButton href="/team" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Teams
        </LinkButton>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {team.members.length} member{team.members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isOwner && <InviteMemberDialog teamId={team.id} />}
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {team.members.map(({ user, role }) => (
            <div key={user.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{user.name ?? user.email}</p>
                {user.name && <p className="text-xs text-muted-foreground">{user.email}</p>}
              </div>
              <Badge variant={role === "owner" ? "default" : "secondary"} className="text-xs">
                {role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {team.tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Open Tasks</CardTitle>
              <LinkButton href="/team/tasks" variant="outline" size="sm">
                View all
              </LinkButton>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.tasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                <span className="text-sm">{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.owner.name ?? task.owner.email}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
