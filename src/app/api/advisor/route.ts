import { NextRequest } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are Foresight, a medical advisor helping US physicians. Respond authoritatively, reason step-by-step for difficult queries, include inline citations, then list 3 relevant follow-up questions.`;

export async function POST(req: NextRequest) {
  try {
    const { messages = [], model = "gpt-4.1" } = await req.json();

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
        "Content-Type": "text/plain; charset=utf-8",
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