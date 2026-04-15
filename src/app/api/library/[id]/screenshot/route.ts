import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const widget = await prisma.libraryWidget.findUnique({ where: { id } });
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | Blob | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });

    const fileName = file instanceof File ? file.name : "screenshot";
    const ext = path.extname(fileName) || ".png";
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    let screenshotUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`library/${id}/${storedName}`, file, { access: "public" });
      screenshotUrl = blob.url;
    } else if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Screenshot storage not configured — add BLOB_READ_WRITE_TOKEN in Vercel environment variables" },
        { status: 503 }
      );
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "library");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));
      screenshotUrl = `/uploads/library/${storedName}`;
    }

    const updated = await prisma.libraryWidget.update({
      where: { id },
      data: { screenshotUrl },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Screenshot upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
