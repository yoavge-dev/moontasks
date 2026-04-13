import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, OR: [{ ownerId: userId }, { assigneeId: userId }, { team: { members: { some: { userId } } } }] },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: attachments });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, OR: [{ ownerId: userId }, { assigneeId: userId }, { team: { members: { some: { userId } } } }] },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });

    const ext = path.extname(file.name);
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    let fileUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Production: use Vercel Blob
      const { put } = await import("@vercel/blob");
      const blob = await put(`tasks/${taskId}/${storedName}`, file, { access: "public" });
      fileUrl = blob.url;
    } else {
      // Development: save to local public/uploads/tasks/
      const { writeFile, mkdir } = await import("fs/promises");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "tasks");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));
      fileUrl = `/uploads/tasks/${storedName}`;
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        filename: file.name,
        storedName,
        url: fileUrl,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
