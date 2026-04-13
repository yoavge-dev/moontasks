import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  jiraDomain: z.string().min(1).max(300),
  jiraEmail: z.string().email(),
  jiraToken: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  return NextResponse.json({
    data: {
      jiraDomain: settings?.jiraDomain ?? "",
      jiraEmail: settings?.jiraEmail ?? "",
      // never return the token — just whether it's set
      hasToken: !!settings?.jiraToken,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({
    data: {
      jiraDomain: settings.jiraDomain,
      jiraEmail: settings.jiraEmail,
      hasToken: !!settings.jiraToken,
    },
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  await prisma.userSettings.deleteMany({ where: { userId } });
  return NextResponse.json({ success: true });
}
