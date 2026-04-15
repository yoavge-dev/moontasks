import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  try {
    const u = new URL(url);
    // Matches /file/KEY/... and /design/KEY/...
    const match = u.pathname.match(/\/(file|design)\/([^/]+)/);
    if (!match) return null;
    const fileKey = match[2];
    const rawNodeId = u.searchParams.get("node-id");
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ":") : null;
    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.figmaToken) {
    return NextResponse.json({ error: "Connect your Figma account in Settings first" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const figmaUrl = searchParams.get("url");
  if (!figmaUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const parsed = parseFigmaUrl(figmaUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
  }
  if (!parsed.nodeId) {
    return NextResponse.json(
      { error: "No frame selected — right-click a frame in Figma and copy its link" },
      { status: 400 }
    );
  }

  const headers = { "X-FIGMA-TOKEN": settings.figmaToken };

  // Fetch node name
  const nodeRes = await fetch(
    `https://api.figma.com/v1/files/${parsed.fileKey}/nodes?ids=${encodeURIComponent(parsed.nodeId)}`,
    { headers }
  );
  if (!nodeRes.ok) {
    return NextResponse.json({ error: "Could not fetch Figma frame — check your token and URL" }, { status: 400 });
  }
  const nodeData = await nodeRes.json();
  const node = nodeData.nodes?.[parsed.nodeId];
  const name: string = node?.document?.name ?? "Untitled";

  // Render image
  const imgRes = await fetch(
    `https://api.figma.com/v1/images/${parsed.fileKey}?ids=${encodeURIComponent(parsed.nodeId)}&format=png&scale=2`,
    { headers }
  );
  if (!imgRes.ok) {
    return NextResponse.json({ error: "Could not render Figma frame" }, { status: 400 });
  }
  const imgData = await imgRes.json();
  const imageUrl: string | null = imgData.images?.[parsed.nodeId] ?? null;

  return NextResponse.json({ data: { name, imageUrl } });
}
