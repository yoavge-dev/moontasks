import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ABMetricSchema } from "@/lib/validators/abtest";

export async function POST(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { testId } = await params;

  const body = await req.json();
  const parsed = ABMetricSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Verify the variant belongs to this test and user has access
  const variant = await prisma.aBVariant.findFirst({
    where: {
      id: parsed.data.variantId,
      test: {
        id: testId,
        OR: [
          { ownerId: userId },
          { team: { members: { some: { userId } } } },
        ],
      },
    },
  });

  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const metric = await prisma.aBMetric.create({ data: parsed.data });
  return NextResponse.json({ data: metric }, { status: 201 });
}
