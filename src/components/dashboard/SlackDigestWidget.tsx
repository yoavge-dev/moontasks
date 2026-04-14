"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Hash, Sparkles } from "lucide-react";

interface SlackData {
  summary: string | null;
  messages: string[];
  count: number;
  channelId: string;
}

export function SlackDigestWidget() {
  const [data, setData] = useState<SlackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/slack/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load Slack digest"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-[#E01E5A]" />
            Slack Digest
          </CardTitle>
          <LinkButton href="/settings" variant="ghost" size="sm">Settings</LinkButton>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-2">
            <div className="h-3 rounded bg-muted animate-pulse w-4/5" />
            <div className="h-3 rounded bg-muted animate-pulse w-3/5" />
            <div className="h-3 rounded bg-muted animate-pulse w-2/3" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && data && data.messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages in the last 24 hours.</p>
        )}

        {!loading && !error && data && data.messages.length > 0 && (
          <div className="space-y-3">
            {/* AI summary */}
            {data.summary && (
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3 w-3" />
                  AI Summary
                </p>
                <p className="text-xs text-violet-900 dark:text-violet-200 whitespace-pre-line leading-relaxed">
                  {data.summary}
                </p>
              </div>
            )}

            {/* Recent messages */}
            {!data.summary && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Last {data.messages.length} messages · {data.count} total today
                </p>
                {data.messages.map((msg, i) => (
                  <p key={i} className="text-xs text-foreground/80 leading-relaxed border-l-2 border-muted pl-2">
                    {msg}
                  </p>
                ))}
              </div>
            )}

            {data.summary && (
              <p className="text-[10px] text-muted-foreground">
                {data.count} message{data.count !== 1 ? "s" : ""} in the last 24 hours
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
