import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are Foresight, a medical advisor helping US physicians. Respond authoritatively, reason step-by-step for difficult queries, include inline citations, then list 3 relevant follow-up questions.`;

export async function POST(req: NextRequest) {
  try {
    const { messages = [], model = "gpt-4.1" } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const assistant = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ assistant });
  } catch (error: any) {
    console.error("/api/advisor error", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
} 