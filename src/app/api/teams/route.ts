import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          _count: { select: { members: true, tasks: true } },
        },
      },
    },
  });

  const teams = memberships.map((m) => ({ ...m.team, role: m.role }));
  return NextResponse.json({ data: teams });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const parsed = CreateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        createdById: userId,
        members: { create: { userId, role: "owner" } },
      },
      include: { _count: { select: { members: true, tasks: true } } },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
