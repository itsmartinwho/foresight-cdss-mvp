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
Your primary role is to provide medical advice to US physicians. Respond authoritatively, reason step-by-step for difficult queries, include inline citations (using the reference element type), then list 3 relevant follow-up questions (which can be part of a paragraph or list element).`;

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