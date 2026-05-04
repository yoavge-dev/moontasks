import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { CMS_CONFIG } from "@/lib/cms-config";

const client = new Anthropic();

function buildSystemPrompt() {
  const sectionFields = CMS_CONFIG.section.map((f) => `  - ${f.path} (${f.type}) — ${f.hint}`).join("\n");
  const providerFields = CMS_CONFIG.provider.map((f) => `  - ${f.path} (${f.type}) — ${f.hint}`).join("\n");

  return `You are a CMS annotation engine. You analyze UI screenshots and map every visible element to the correct CMS field based on these rules:

ANNOTATION RULES:
- "section" (red) — elements that are editable at the section/page level, not per-provider
- "provider" (blue) — elements driven by CMS provider data
- "hardcoded" (yellow) — static elements that never change

SECTION FIELDS:
${sectionFields}

PROVIDER FIELDS:
${providerFields}

TASK:
Look at the screenshot carefully. Identify every meaningful UI element and annotate it.
For each element, estimate its bounding box as percentages (0–100) of the image dimensions.

Return ONLY this JSON — no explanation, no text before or after:

\`\`\`json
{
  "annotations": [
    {
      "id": "1",
      "label": "short element name",
      "sourceType": "section | provider | hardcoded",
      "fieldPath": "exact.field.path or N/A",
      "fieldType": "text | image | richtext | number | boolean | array | url | date | N/A",
      "x": 10,
      "y": 5,
      "w": 30,
      "h": 8
    }
  ]
}
\`\`\`

x, y = top-left corner as % of image. w, h = width/height as % of image.
Be precise. Annotate every distinct element you can see.`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { imageBase64, imageMimeType } = body as {
    imageBase64: string;
    imageMimeType?: string;
  };

  if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [
        {
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
            { type: "text", text: "Annotate every element in this screenshot according to the CMS field rules." },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    const match = block.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return NextResponse.json({ error: "No JSON in response", raw: block.text }, { status: 500 });

    const result = JSON.parse(match[1]);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cms-specifier]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
