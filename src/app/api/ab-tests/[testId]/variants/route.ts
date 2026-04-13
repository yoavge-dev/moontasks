import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ABVariantSchema } from "@/lib/validators/abtest";

export async function POST(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const test = await prisma.aBTest.findFirst({ where: { id: testId, ownerId: userId } });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = ABVariantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const variant = await prisma.aBVariant.create({
    data: { ...parsed.data, testId },
    include: { metrics: true },
  });

  return NextResponse.json({ data: variant }, { status: 201 });
}
