import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ featureId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featureId } = await params;
  const feature = await prisma.annotatedFeature.findUnique({
    where: { id: featureId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!feature) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: feature });
}

export async function PUT(req: Request, { params }: { params: Promise<{ featureId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featureId } = await params;
  const { name, annotations } = await req.json();

  const feature = await prisma.annotatedFeature.update({
    where: { id: featureId },
    data: {
      ...(name && { name }),
      ...(annotations !== undefined && { annotations: JSON.stringify(annotations) }),
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: feature });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ featureId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featureId } = await params;
  await prisma.annotatedFeature.delete({ where: { id: featureId } });
  return NextResponse.json({ success: true });
}
