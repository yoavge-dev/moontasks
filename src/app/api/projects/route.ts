import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().max(2000).optional(),
  teamId: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      _count: { select: { abTests: true, roadmapItems: true, tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: projects });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      url: parsed.data.url || null,
      ownerId: userId,
      teamId: parsed.data.teamId || null,
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
