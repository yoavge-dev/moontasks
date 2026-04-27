import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;
  const { id } = await params;

  await prisma.competitor.deleteMany({ where: { id, ownerId } });
  return NextResponse.json({ data: null });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = await req.json();

  // Setting as control: atomically clear other controls then set this one
  if (body.isControl === true) {
    await prisma.$transaction([
      prisma.competitor.updateMany({ where: { ownerId, isControl: true }, data: { isControl: false } }),
      prisma.competitor.updateMany({ where: { id, ownerId }, data: { isControl: true } }),
    ]);
  } else if (body.isControl === false) {
    await prisma.competitor.updateMany({ where: { id, ownerId }, data: { isControl: false } });
  }

  const updated = await prisma.competitor.findFirst({ where: { id, ownerId } });
  return NextResponse.json({ data: updated });
}
