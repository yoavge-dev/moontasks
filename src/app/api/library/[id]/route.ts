import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const widget = await prisma.libraryWidget.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: widget });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const widget = await prisma.libraryWidget.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? null,
      category: body.category,
      hypothesis: body.hypothesis,
      targetKpi: body.targetKpi,
      status: body.status,
      figmaUrl: body.figmaUrl || null,
      placement: body.placement || null,
      platform: body.platform || null,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: widget });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.libraryWidget.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
