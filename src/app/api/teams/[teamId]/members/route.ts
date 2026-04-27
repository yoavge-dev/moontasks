import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const InviteSchema = z.object({ email: z.string().email() });

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { teamId } = await params;

  const isMember = await prisma.teamMember.findFirst({ where: { teamId, userId } });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: members });
}

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { teamId } = await params;

  const isOwner = await prisma.teamMember.findFirst({ where: { teamId, userId, role: "owner" } });
  if (!isOwner) return NextResponse.json({ error: "Only team owners can invite members" }, { status: 403 });

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "No account with that email address" }, { status: 404 });

  const existing = await prisma.teamMember.findFirst({ where: { teamId, userId: user.id } });
  if (existing) return NextResponse.json({ error: "User is already a team member" }, { status: 409 });

  const member = await prisma.teamMember.create({
    data: { teamId, userId: user.id, role: "member" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: member }, { status: 201 });
}

export async function DELETE() {
  return NextResponse.json({ data: null });
}
