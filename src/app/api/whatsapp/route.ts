import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addDays, nextDay, endOfDay, startOfDay } from "date-fns";

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let str = url;
  for (const key of sortedKeys) str += key + (params[key] ?? "");
  const expected = crypto.createHmac("sha1", authToken).update(str).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function parsePriority(val: string): "low" | "medium" | "high" | "urgent" {
  switch (val.trim().toLowerCase()) {
    case "urgent":
    case "u":
      return "urgent";
    case "high":
    case "h":
      return "high";
    case "low":
    case "l":
      return "low";
    default:
      return "medium";
  }
}

function parseDueDate(val: string): Date | null {
  const v = val.trim().toLowerCase().replace(/^due\s+/, "");
  const today = startOfDay(new Date());

  if (v === "today") return endOfDay(today);
  if (v === "tomorrow") return endOfDay(addDays(today, 1));

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIndex = days.indexOf(v);
  if (dayIndex !== -1) {
    return endOfDay(nextDay(today, dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6));
  }

  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  return new Response(xml, { status: 200, headers: { "Content-Type": "text/xml" } });
}

const HELP_TEXT = `*MoonTasks Bot*

Commands:
- add <title>
- add <title> | <priority>
- add <title> | <priority> | due <date>
- list
- help

Priorities: low, medium, high, urgent
Dates: today, tomorrow, monday...sunday

Examples:
add Fix login bug
add Deploy API | high | due tomorrow
add Review PR | urgent | due friday`;

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return new Response("WhatsApp integration not configured", { status: 503 });
  }

  const text = await req.text();
  const params: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const k = decodeURIComponent(pair.slice(0, eqIdx).replace(/\+/g, " "));
    const v = decodeURIComponent(pair.slice(eqIdx + 1).replace(/\+/g, " "));
    params[k] = v;
  }

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${process.env.NEXTAUTH_URL}/api/whatsapp`;
  if (!validateTwilioSignature(authToken, signature, url, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = (params["From"] ?? "").replace("whatsapp:", "").trim();
  const body = (params["Body"] ?? "").trim();

  const settings = await prisma.userSettings.findFirst({
    where: { whatsappPhone: from },
    select: { userId: true },
  });

  if (!settings) {
    return twiml(
      "Your number isn't linked to a MoonTasks account.\nGo to Settings > WhatsApp in the app to connect."
    );
  }

  const userId = settings.userId;
  const lower = body.toLowerCase().trim();

  if (lower === "help" || lower === "?") {
    return twiml(HELP_TEXT);
  }

  if (lower === "list") {
    const tasks = await prisma.task.findMany({
      where: { ownerId: userId, status: { in: ["todo", "in_progress"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true, priority: true, status: true },
    });
    if (tasks.length === 0) {
      return twiml("No open tasks. Send 'add <title>' to create one.");
    }
    const lines = tasks.map((t, i) => {
      const pri = t.priority !== "medium" ? ` [${t.priority}]` : "";
      const status = t.status === "in_progress" ? " (in progress)" : "";
      return `${i + 1}. ${t.title}${pri}${status}`;
    });
    return twiml(`Your open tasks:\n${lines.join("\n")}`);
  }

  if (lower.startsWith("add ") || lower === "add") {
    const rest = body.slice(4).trim();
    if (!rest) return twiml("Please provide a task title.\nExample: add Fix login bug");

    const parts = rest.split("|").map((s) => s.trim());
    const title = parts[0];
    const priority = parts[1] ? parsePriority(parts[1]) : "medium";
    const dueDate = parts[2] ? parseDueDate(parts[2]) : null;

    await prisma.task.create({
      data: {
        title,
        priority,
        status: "todo",
        tags: "[]",
        dueDate,
        ownerId: userId,
      },
    });

    const parts2: string[] = [`Task created: "${title}"`];
    if (priority !== "medium") parts2.push(`${priority} priority`);
    if (dueDate) {
      parts2.push(
        `due ${dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
      );
    }
    return twiml(parts2.join(" — "));
  }

  return twiml("Unknown command. Send 'help' to see available commands.");
}
