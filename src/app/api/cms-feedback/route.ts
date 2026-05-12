import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CmsFeedbackSchema = z.object({
  category: z.enum([
    "content_editing",
    "media",
    "publishing",
    "navigation",
    "performance",
    "permissions",
    "integrations",
    "other",
  ]),
  severity: z.number().int().min(1).max(5),
  description: z.string().min(10).max(2000),
  suggestion: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = CmsFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const feedback = await prisma.cmsFeedback.create({
    data: { ...parsed.data, authorId: userId },
  });

  return NextResponse.json({ data: feedback }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feedback = await prisma.cmsFeedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: feedback });
}
