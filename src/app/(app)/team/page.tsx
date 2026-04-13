import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTeamDialog } from "@/components/team/CreateTeamDialog";
import { Users, CheckSquare } from "lucide-react";

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: { include: { _count: { select: { members: true, tasks: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {memberships.length} team{memberships.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">You&apos;re not in any teams yet. Create one to collaborate!</p>
          <CreateTeamDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ team, role }) => (
            <Link key={team.id} href={`/team/${team.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <Badge variant={role === "owner" ? "default" : "secondary"} className="text-xs">
                      {role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {team._count.tasks} task{team._count.tasks !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
