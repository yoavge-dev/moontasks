export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  allDay?: boolean;
}

function parseICSDate(raw: string): Date | null {
  // Strip TZID=... prefix if present (value is after the colon)
  const value = raw.includes(":") ? raw.split(":").pop()! : raw;
  const v = value.trim();

  if (v.length === 8) {
    // All-day: YYYYMMDD
    const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1, d = +v.slice(6, 8);
    return new Date(y, m, d);
  }

  if (v.includes("T")) {
    const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1, d = +v.slice(6, 8);
    const h = +v.slice(9, 11), min = +v.slice(11, 13), s = +v.slice(13, 15);
    return v.endsWith("Z")
      ? new Date(Date.UTC(y, m, d, h, min, s))
      : new Date(y, m, d, h, min, s);
  }

  return null;
}

function addInterval(date: Date, freq: string, interval: number): Date {
  const d = new Date(date);
  if (freq === "DAILY") d.setDate(d.getDate() + interval);
  else if (freq === "WEEKLY") d.setDate(d.getDate() + interval * 7);
  else if (freq === "MONTHLY") d.setMonth(d.getMonth() + interval);
  else if (freq === "YEARLY") d.setFullYear(d.getFullYear() + interval);
  return d;
}

export function parseICS(icsText: string, rangeStart: Date, rangeEnd: Date): CalEvent[] {
  // Unfold continuation lines
  const text = icsText.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");

  const events: CalEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const get = (key: string) => {
      const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im"));
      return m ? m[1].trim() : null;
    };

    const summary = get("SUMMARY") ?? "(No title)";
    const location = get("LOCATION");
    const uid = get("UID") ?? String(i);

    const dtstartRaw = block.match(/^DTSTART(?:[^:]*)?:(.+)$/im)?.[1]?.trim();
    const dtendRaw = block.match(/^DTEND(?:[^:]*)?:(.+)$/im)?.[1]?.trim();
    if (!dtstartRaw) continue;

    const dtstart = parseICSDate(dtstartRaw);
    if (!dtstart) continue;
    const dtend = dtendRaw ? parseICSDate(dtendRaw) : new Date(dtstart.getTime() + 3600_000);
    if (!dtend) continue;

    const allDay = dtstartRaw.trim().length === 8;
    const durationMs = dtend.getTime() - dtstart.getTime();
    const rruleLine = get("RRULE");

    if (rruleLine) {
      const parts = Object.fromEntries(
        rruleLine.split(";").map((p) => p.split("=") as [string, string])
      );
      const freq = parts.FREQ ?? "DAILY";
      const interval = parts.INTERVAL ? +parts.INTERVAL : 1;
      const maxCount = parts.COUNT ? +parts.COUNT : 1000;
      const until = parts.UNTIL ? parseICSDate(parts.UNTIL) : null;

      let current = new Date(dtstart);
      let count = 0;

      while (count < maxCount) {
        if (current > rangeEnd) break;
        if (until && current > until) break;

        if (current >= rangeStart) {
          events.push({
            id: `${uid}-${current.getTime()}`,
            title: summary,
            start: current.toISOString(),
            end: new Date(current.getTime() + durationMs).toISOString(),
            location,
            allDay,
          });
        }

        current = addInterval(current, freq, interval);
        count++;
      }
    } else {
      if (dtstart <= rangeEnd && dtend >= rangeStart) {
        events.push({
          id: uid,
          title: summary,
          start: dtstart.toISOString(),
          end: dtend.toISOString(),
          location,
          allDay,
        });
      }
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
