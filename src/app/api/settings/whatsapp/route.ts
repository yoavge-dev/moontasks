import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  return NextResponse.json({
    data: { whatsappPhone: settings?.whatsappPhone ?? null },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { phone } = await req.json();

  if (!phone || typeof phone !== "string") {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  // Normalise: strip spaces/dashes, ensure leading +
  const normalised = phone.replace(/[\s\-()]/g, "");
  if (!/^\+\d{7,15}$/.test(normalised)) {
    return NextResponse.json(
      { error: "Enter a valid phone number in international format, e.g. +1234567890" },
      { status: 400 }
    );
  }

  // Ensure no other account already uses this number
  const conflict = await prisma.userSettings.findFirst({
    where: { whatsappPhone: normalised, NOT: { userId } },
  });
  if (conflict) {
    return NextResponse.json({ error: "This number is already linked to another account" }, { status: 409 });
  }

  await prisma.userSettings.upsert({
    where: { userId },
    update: { whatsappPhone: normalised },
    create: { userId, whatsappPhone: normalised },
  });

  return NextResponse.json({ data: { whatsappPhone: normalised } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  await prisma.userSettings.updateMany({
    where: { userId },
    data: { whatsappPhone: null },
  });

  return NextResponse.json({ data: null });
}
