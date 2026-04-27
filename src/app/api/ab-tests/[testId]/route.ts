import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ABTestUpdateSchema } from "@/lib/validators/abtest";

async function getTestForUser(testId: string, userId: string) {
  const memberships = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const teamIds = memberships.map((m) => m.teamId);
  return prisma.aBTest.findFirst({
    where: { id: testId, OR: [{ ownerId: userId }, { teamId: { in: teamIds } }] },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      variants: { include: { metrics: { orderBy: { recordedAt: "desc" } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;
  const test = await getTestForUser(testId, userId);
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: test });
}

export async function PUT(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;
  const test = await getTestForUser(testId, userId);
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only owner can update
  if (test.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = ABTestUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.status === "running" && test.status === "draft") {
    const variantCount = await prisma.aBVariant.count({ where: { testId } });
    if (variantCount < 2) {
      return NextResponse.json({ error: "At least 2 variants are required to start a test" }, { status: 400 });
    }
  }

  const { startedAt, concludedAt, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  // Auto-set dates on status transitions (unless manually provided)
  if (parsed.data.status === "running" && test.status === "draft")
    data.startedAt = startedAt ? new Date(startedAt) : new Date();
  else if (startedAt !== undefined)
    data.startedAt = startedAt ? new Date(startedAt) : null;

  if (parsed.data.status === "concluded")
    data.concludedAt = concludedAt ? new Date(concludedAt) : new Date();
  else if (concludedAt !== undefined)
    data.concludedAt = concludedAt ? new Date(concludedAt) : null;

  const updated = await prisma.aBTest.update({ where: { id: testId }, data });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const test = await prisma.aBTest.findFirst({ where: { id: testId, ownerId: userId } });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aBTest.delete({ where: { id: testId } });
  return NextResponse.json({ data: null });
}
