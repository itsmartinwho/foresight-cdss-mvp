import { NextRequest } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are Foresight, a medical advisor helping US physicians.
You MUST reply with a stream of newline-delimited JSON objects. Each JSON object MUST conform to ONE of the 'element' schemas or the 'references_object' schema defined below.
Do NOT write Markdown outside of these JSON objects.
The stream should consist of multiple 'element' JSONs, followed by a single 'references_object' JSON at the very end if there are any references.

SCHEMAS:

element =
  | { "type": "paragraph", "text": "string" }
  | { "type": "bold", "text": "string" }
  | { "type": "italic", "text": "string" }
  | { "type": "unordered_list", "items": "string[]" }
  | { "type": "ordered_list", "items": "string[]" }
  | { "type": "table", "header": "string[]", "rows": "string[][]" }
  | { "type": "reference", "target": "string", "display": "string" }

references_object =
  | { "type": "references_container", "references": "{ [key: string]: string }" } // Use this type for the final references object

Ensure each JSON object is valid, complete, and UTF-8 encoded, and is followed by a newline character.
Your primary role is to provide medical advice to US physicians. Respond authoritatively, reason step-by-step for difficult queries, include inline citations (using the reference element type), then list 3 relevant follow-up questions (which can be part of a paragraph or list element).

For inline citations (type: "reference"):
- The "target" field MUST be a unique key (e.g., "ref1", "nejm2023").
- The "display" field is the text shown inline (e.g., "Smith et al. 2023").
- Each "target" key MUST have a corresponding entry in the "references" object (inside the "references_container" type) at the end of your response.

For the "references_container" object at the end:
- It must be the LAST object in the stream.
- The "references" field within it contains the dictionary of all references.
- Each key (e.g., "ref1", "nejm2023") MUST match a "target" used in an inline citation.
- The string value for each key in "references" should be the full citation text or a single, complete URL. Do NOT put multiple URLs in a single reference string. If multiple sources are cited for one point, create distinct reference entries.
`;

export async function GET(req: NextRequest) {
  try {
    // Read payload from query parameter for SSE GET requests
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    if (!payloadParam) {
      return new Response(JSON.stringify({ error: "Payload missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { messages = [], model = "gpt-4.1" } = JSON.parse(payloadParam);

    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

    const responseStream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          const token = chunk.choices?.[0]?.delta?.content || "";
          buffer += token;

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.substring(0, newlineIndex).trim();
            buffer = buffer.substring(newlineIndex + 1);

            if (line) {
              try {
                JSON.parse(line);
                controller.enqueue(encoder.encode(`data: ${line}\n\n`));
              } catch (e) {
                console.warn("Skipping invalid JSON line for SSE:", line, e);
              }
            }
          }
        }
        const remainingLine = buffer.trim();
        if (remainingLine) {
          try {
            JSON.parse(remainingLine);
            controller.enqueue(encoder.encode(`data: ${remainingLine}\n\n`));
          } catch (e) {
            console.warn("Skipping invalid JSON from remaining buffer for SSE:", remainingLine, e);
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
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