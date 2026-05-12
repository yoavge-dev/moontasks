import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.sectionLibraryItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { name, screenshotUrl } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!screenshotUrl) return NextResponse.json({ error: "Screenshot is required" }, { status: 400 });

  const item = await prisma.sectionLibraryItem.create({
    data: { name: name.trim(), screenshotUrl, createdById: userId },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
