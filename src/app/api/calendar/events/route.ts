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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(settings.calendarUrl, {
      headers: { "User-Agent": "MoonTasks/1.0" },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error("Calendar fetch HTTP error:", res.status, res.statusText);
      return NextResponse.json(
        { error: `Calendar returned HTTP ${res.status}. Check your iCal URL in Settings.` },
        { status: 502 }
      );
    }

    const icsText = await res.text();

    if (!icsText.includes("BEGIN:VCALENDAR")) {
      console.error("Calendar response is not valid ICS, starts with:", icsText.slice(0, 200));
      return NextResponse.json(
        { error: "URL did not return a valid iCal file. Make sure you copied the secret iCal address." },
        { status: 502 }
      );
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = parseICS(icsText, todayStart, rangeEnd);

    return NextResponse.json({ data: events });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar fetch error:", message);
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "Calendar request timed out. Try again later." : `Failed to load calendar: ${message}` },
      { status: 502 }
    );
  }
}
