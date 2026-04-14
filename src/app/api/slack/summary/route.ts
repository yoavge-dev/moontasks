import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

interface SlackMessage {
  user?: string;
  bot_id?: string;
  text: string;
  ts: string;
  subtype?: string;
}

async function resolveUserName(token: string, userId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(userId)) return cache.get(userId)!;
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const name = json.user?.real_name ?? json.user?.name ?? userId;
    cache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings?.slackToken || !settings?.slackChannelId) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  const { slackToken, slackChannelId } = settings;

  // Fetch last 24 hours of messages
  const oldest = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000).toString();

  const histRes = await fetch(
    `https://slack.com/api/conversations.history?channel=${slackChannelId}&oldest=${oldest}&limit=100&inclusive=true`,
    { headers: { Authorization: `Bearer ${slackToken}` } }
  );
  const histJson = await histRes.json();

  if (!histJson.ok) {
    return NextResponse.json(
      { error: histJson.error === "channel_not_found" ? "Channel not found. Re-connect Slack in Settings." : `Slack error: ${histJson.error}` },
      { status: 502 }
    );
  }

  const messages: SlackMessage[] = (histJson.messages ?? [])
    .filter((m: SlackMessage) => !m.subtype && m.text?.trim())
    .reverse(); // chronological order

  if (messages.length === 0) {
    return NextResponse.json({ data: { summary: null, messages: [], channelId: slackChannelId } });
  }

  // Resolve user names
  const nameCache = new Map<string, string>();
  const formatted = await Promise.all(
    messages.map(async (m) => {
      const name = m.user ? await resolveUserName(slackToken, m.user, nameCache) : "Bot";
      const time = new Date(parseFloat(m.ts) * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return `[${time}] ${name}: ${m.text}`;
    })
  );

  // AI summary if API key is available
  let summary: string | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Summarize the key topics, decisions, and action items from these Slack messages. Be concise (3-5 bullet points max). Skip small talk.\n\n${formatted.join("\n")}`,
          },
        ],
      });
      summary = (response.content[0] as { type: string; text: string }).text;
    } catch (err) {
      console.error("Claude summarize error:", err);
    }
  }

  return NextResponse.json({
    data: {
      summary,
      messages: formatted.slice(-10), // last 10 for display
      count: messages.length,
      channelId: slackChannelId,
    },
  });
}
