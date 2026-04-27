import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  if (!targetUrl) return new NextResponse(null, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(
      `https://image.thum.io/get/width/1200/crop/700/${targetUrl}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonTasks/1.0)" },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!res.ok) return new NextResponse(null, { status: 502 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
