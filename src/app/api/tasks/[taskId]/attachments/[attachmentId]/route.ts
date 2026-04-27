import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { taskId, attachmentId } = await params;

  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
    include: { task: { select: { ownerId: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (attachment.uploadedById !== userId && attachment.task.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  // Remove the file
  try {
    if (attachment.url.startsWith("https://")) {
      // Vercel Blob
      const { del } = await import("@vercel/blob");
      await del(attachment.url);
    } else {
      // Local file
      const { unlink } = await import("fs/promises");
      const filePath = path.join(process.cwd(), "public", "uploads", "tasks", attachment.storedName);
      await unlink(filePath);
    }
  } catch { /* already gone */ }

  return NextResponse.json({ success: true });
}
