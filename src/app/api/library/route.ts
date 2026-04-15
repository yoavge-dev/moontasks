import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, "Category is required"),
  hypothesis: z.string().min(1, "Hypothesis is required").max(2000),
  targetKpi: z.string().min(1, "Target KPI is required"),
  status: z.enum(["draft", "active", "deprecated"]).default("active"),
  figmaUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  placement: z.string().optional(),
  platform: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const kpi = searchParams.get("kpi") ?? undefined;

  const widgets = await prisma.libraryWidget.findMany({
    where: {
      ...(category && category !== "all" ? { category } : {}),
      ...(kpi && kpi !== "all" ? { targetKpi: kpi } : {}),
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: widgets });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { figmaUrl, placement, platform, ...rest } = parsed.data;
  const widget = await prisma.libraryWidget.create({
    data: {
      ...rest,
      figmaUrl: figmaUrl || null,
      placement: placement || null,
      platform: platform || null,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: widget }, { status: 201 });
}
