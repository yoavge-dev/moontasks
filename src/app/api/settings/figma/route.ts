import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  return NextResponse.json({ data: { hasToken: !!settings?.figmaToken } });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Verify the token works before saving
  const test = await fetch("https://api.figma.com/v1/me", {
    headers: { "X-FIGMA-TOKEN": token },
  });
  if (!test.ok) {
    return NextResponse.json({ error: "Invalid Figma token — check and try again" }, { status: 400 });
  }

  await prisma.userSettings.upsert({
    where: { userId },
    update: { figmaToken: token },
    create: { userId, figmaToken: token },
  });

  return NextResponse.json({ data: { hasToken: true } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  await prisma.userSettings.updateMany({ where: { userId }, data: { figmaToken: null } });
  return NextResponse.json({ data: null });
}
