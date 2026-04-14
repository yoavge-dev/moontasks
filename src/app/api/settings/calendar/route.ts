import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  return NextResponse.json({
    data: { connected: !!settings?.calendarUrl },
  });
}

const Schema = z.object({
  calendarUrl: z.string().url("Must be a valid URL").includes("calendar.google.com", {
    message: "Must be a Google Calendar iCal URL",
  }),
});

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, calendarUrl: parsed.data.calendarUrl },
    update: { calendarUrl: parsed.data.calendarUrl },
  });

  return NextResponse.json({ data: { connected: true } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  await prisma.userSettings.updateMany({ where: { userId }, data: { calendarUrl: null } });

  return NextResponse.json({ data: null });
}
