import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteToken: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, inviteToken } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Auto-join team if a valid invite token was provided
    if (inviteToken) {
      const invite = await prisma.teamInvite.findUnique({ where: { token: inviteToken } });
      if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
        await prisma.$transaction([
          prisma.teamMember.create({
            data: { teamId: invite.teamId, userId: user.id, role: "member" },
          }),
          prisma.teamInvite.update({
            where: { token: inviteToken },
            data: { usedAt: new Date() },
          }),
        ]);
      }
    }

    return NextResponse.json({ data: user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
