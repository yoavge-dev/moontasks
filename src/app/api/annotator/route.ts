import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const features = await prisma.annotatedFeature.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: features });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { name, screenshotUrl, annotations } = await req.json();

  if (!name || !screenshotUrl) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const feature = await prisma.annotatedFeature.create({
    data: {
      name,
      screenshotUrl,
      annotations: JSON.stringify(annotations ?? []),
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: feature });
}
