"use client";

import { useMemo } from "react";
import { format } from "date-fns";

export function Greeting({ name }: { name: string }) {
  const { greeting, dateStr } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const g = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return { greeting: g, dateStr: format(now, "EEEE, MMMM d, yyyy") };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {greeting}, {name}
      </h1>
      <p className="text-muted-foreground text-sm mt-1">{dateStr}</p>
    </div>
  );
}
