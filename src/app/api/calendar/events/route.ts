import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseICS } from "@/lib/ics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.calendarUrl) return NextResponse.json({ data: [] });

  try {
    const res = await fetch(settings.calendarUrl, {
      headers: { "User-Agent": "MoonTasks/1.0" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const icsText = await res.text();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = parseICS(icsText, todayStart, rangeEnd);

    return NextResponse.json({ data: events });
  } catch (err) {
    console.error("Calendar fetch error:", err);
    return NextResponse.json({ error: "Failed to load calendar. Check your iCal URL in Settings." }, { status: 502 });
  }
}
