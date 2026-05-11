import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProjectSlug } from "@/lib/slug";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().max(2000).optional(),
  teamId: z.string().optional(),
  ppcOwner: z.string().max(200).optional(),
  pmOwner: z.string().max(200).optional(),
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
      ppcOwner: parsed.data.ppcOwner || null,
      pmOwner: parsed.data.pmOwner || null,
      ownerId: userId,
      teamId: parsed.data.teamId || null,
    },
  });

  // Auto-generate public slug after creation (uses ID for uniqueness)
  const slug = generateProjectSlug(project.name, project.id);
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { publicSlug: slug },
  }).catch(() => project); // if slug collides somehow, skip

  return NextResponse.json({ data: updated }, { status: 201 });
}
