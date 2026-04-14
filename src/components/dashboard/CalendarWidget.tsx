"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  allDay?: boolean;
}

function groupByDay(events: CalEvent[]): Record<string, CalEvent[]> {
  const groups: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    const key = format(new Date(ev.start), "yyyy-MM-dd");
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return groups;
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
}

function timeRange(ev: CalEvent): string {
  if (ev.allDay) return "All day";
  const s = format(new Date(ev.start), "h:mm a");
  const e = format(new Date(ev.end), "h:mm a");
  return `${s} – ${e}`;
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setEvents(json.data ?? []);
      })
      .catch(() => setError("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByDay(events);
  const days = Object.keys(groups).sort().slice(0, 3); // show up to 3 days

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
          <LinkButton href="/settings" variant="ghost" size="sm">Settings</LinkButton>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming events in the next 7 days.</p>
        )}

        {!loading && !error && days.length > 0 && (
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {dayLabel(day + "T00:00:00")}
                </p>
                <div className="space-y-1">
                  {groups[day].map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors border-l-2 border-l-primary/40 pl-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {timeRange(ev)}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
