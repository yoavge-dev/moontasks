import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a CMS field specifier. You analyze UI component screenshots and help product managers create precise CMS field specifications.

WORKFLOW:
1. When given a screenshot, study it carefully and ask 3-5 targeted clarifying questions:
   - Which text/content elements are dynamic (fetched from CMS or API)?
   - What is the CMS field path structure (e.g., product.title, hero.subtitle, section.cta.label)?
   - Which elements are hardcoded/static and will never change?
   - Which areas are layout containers or section wrappers?
   - Are there any repeating items (arrays)?

2. After the user answers, ask follow-up questions only if truly necessary.

3. Once you have enough information, output the spec. Your response should contain ONLY the JSON block below — no intro text, no explanation after it:

\`\`\`json
{
  "annotations": [
    { "id": "1", "label": "Element Name", "type": "section", "x": 0, "y": 0, "w": 100, "h": 12 }
  ],
  "spec": [
    { "element": "Element Name", "description": "What it displays", "sourceType": "section", "fieldPath": "N/A", "fieldType": "N/A", "notes": "" }
  ]
}
\`\`\`

ANNOTATION TYPES:
- "section" — layout containers/wrappers
- "provider" — dynamic content from CMS or API
- "hardcoded" — static content that never changes

COORDINATES: x, y, w, h are percentages (0–100) of the image. Estimate as best you can from what you see.

FIELD TYPES: text | image | richtext | number | boolean | array | url | date | N/A

Keep questions concise and conversational. Output the JSON block only when you're confident you have all necessary information.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { messages, imageBase64, imageMimeType } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    imageBase64?: string | null;
    imageMimeType?: string;
  };

  if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
    if (i === 0 && imageBase64) {
      return {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (imageMimeType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const block = response.content[0];
    if (block.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    return NextResponse.json({ message: block.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cms-specifier]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
