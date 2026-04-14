import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const res = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim&exclude_archived=true&limit=200",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const json = await res.json();

  if (!json.ok) {
    return NextResponse.json(
      { error: json.error === "invalid_auth" ? "Invalid bot token" : json.error },
      { status: 400 }
    );
  }

  const channels = (json.channels as { id: string; name: string }[])
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data: channels });
}
