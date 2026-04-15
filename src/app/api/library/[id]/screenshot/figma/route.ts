import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const widget = await prisma.libraryWidget.findUnique({ where: { id } });
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { imageUrl } = await req.json();
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  // Download the Figma-rendered image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return NextResponse.json({ error: "Failed to download image" }, { status: 400 });

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const storedName = `${Date.now()}-figma.png`;
  let screenshotUrl: string;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`library/${id}/${storedName}`, buffer, { access: "public", contentType: "image/png" });
    screenshotUrl = blob.url;
  } else {
    const { writeFile, mkdir } = await import("fs/promises");
    const uploadDir = path.join(process.cwd(), "public", "uploads", "library");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, storedName), buffer);
    screenshotUrl = `/uploads/library/${storedName}`;
  }

  const updated = await prisma.libraryWidget.update({
    where: { id },
    data: { screenshotUrl },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: updated });
}
