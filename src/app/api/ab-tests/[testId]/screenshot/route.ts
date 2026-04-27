import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const test = await prisma.aBTest.findFirst({ where: { id: testId, ownerId: userId } });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const blob = await put(`ab-results/${testId}-${Date.now()}.${file.name.split(".").pop()}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ data: { url: blob.url } });
}
