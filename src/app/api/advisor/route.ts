import { NextRequest } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are Foresight, a medical advisor helping US physicians.
You MUST reply with a JSON object conforming to the schema below. Do NOT write Markdown.

SCHEMA:
{
  "content": "element[]",
  "references": "{ [key: string]: string }"
}

element =
  | { "type": "paragraph", "text": "string" }
  | { "type": "bold", "text": "string" }
  | { "type": "italic", "text": "string" }
  | { "type": "unordered_list", "items": "string[]" }
  | { "type": "ordered_list", "items": "string[]" }
  | { "type": "table", "header": "string[]", "rows": "string[][]" }
  | { "type": "reference", "target": "string", "display": "string" }

Ensure JSON is valid and UTF-8 encoded.
Your primary role is to provide medical advice to US physicians. Respond authoritatively, reason step-by-step for difficult queries, include inline citations (using the reference element type), then list 3 relevant follow-up questions (which can be part of a paragraph or list element).

For inline citations (type: "reference"):
- The "target" field MUST be a unique key (e.g., "ref1", "nejm2023").
- The "display" field is the text shown inline (e.g., "Smith et al. 2023").
- Each "target" key MUST have a corresponding entry in the "references" object at the end of your response.

For the "references" object at the end:
- Each key (e.g., "ref1", "nejm2023") MUST match a "target" used in an inline citation.
- The string value for each key in "references" should be the full citation text or a single, complete URL. Do NOT put multiple URLs in a single reference string. If multiple sources are cited for one point, create distinct reference entries.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages = [], model = "gpt-4.1" } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

    const responseStream = await openai.chat.completions.create({
      model,
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          const token = chunk.choices?.[0]?.delta?.content || "";
          controller.enqueue(encoder.encode(token));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("/api/advisor error", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 