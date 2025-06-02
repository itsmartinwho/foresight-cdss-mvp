import { NextRequest } from "next/server";
import OpenAI from "openai";

// 1. Model routing (default to gpt-4.1-mini)
// 2. Invoke chat-completions with streaming
// 3. Client-side rendering (handled by client)
// 4. Markdown fallback triggers
// 5. streamMarkdownOnly implementation
// 6. Security and recovery (DOMPurify on client, discard empty tool args)

// Enhanced system prompt for better code interpreter usage
const systemPrompt = `You are Foresight, an AI medical advisor for US physicians. Your responses should be comprehensive, empathetic, and formatted in clear, easy-to-read GitHub-flavored Markdown. Use headings, lists, bolding, and other Markdown features appropriately to structure your answer for optimal readability. Avoid overly technical jargon where simpler terms suffice, but maintain medical accuracy.

For tasks involving data analysis, generating tables, creating charts from data, or performing calculations, write Python code using markdown code blocks. When you generate code, explain what it does and what the expected output would be. Use libraries like matplotlib, pandas, seaborn, numpy, and scipy as needed for medical data analysis and visualization.

### Important instructions for data analysis and chart generation:
- When asked to create charts or analyze medical data, ALWAYS provide complete, executable Python code in \`\`\`python code blocks
- Ensure your code is self-contained and ready to execute (include all necessary imports)
- For data visualization, use matplotlib with clear titles, axis labels, and appropriate chart types for medical data
- When working with patient data, create realistic medical examples if no data is provided
- Use professional color schemes appropriate for medical charts (blues, greens, minimal colors)
- Include proper error handling and data validation in your code
- Explain the medical significance of any trends or patterns shown in the visualizations
- For tables, use pandas DataFrames and format them appropriately
- Always provide medical context and interpretation of any data analysis
- Examples of good medical charts: vital signs trends, lab value tracking, medication adherence, symptom progression
- Use clear, descriptive variable names and add comments to explain complex medical calculations

Remember: Your Python code will be executed in a web environment, so make it complete and executable.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function streamResponse(
  model: string,
  payload: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController,
  reqSignal: AbortSignal,
  isControllerClosedRef: { value: boolean }
) {
  const encoder = new TextEncoder();
  let streamEndedByThisFunction = false;
  let chunkBuffer = "";

  function shouldFlush(buffer: string): boolean {
    return buffer.length > 600 || buffer.includes("\n\n");
  }

  const cleanupAndCloseController = () => {
    if (isControllerClosedRef.value || streamEndedByThisFunction) return;
    streamEndedByThisFunction = true;
    isControllerClosedRef.value = true;
    try {
      const endPayload = { type: "stream_end" };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(endPayload)}\n\n`));
      controller.close();
    } catch (e) {
      console.warn("Error closing controller in streamResponse cleanup:", e);
    }
  };

  if (reqSignal.aborted) {
    if (chunkBuffer.length > 0 && !isControllerClosedRef.value) {
      const outPayload = { type: "markdown_chunk", content: chunkBuffer };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(outPayload)}\n\n`));
      chunkBuffer = "";
    }
    cleanupAndCloseController();
    return;
  }

  const clientDisconnectListener = () => {
    if (chunkBuffer.length > 0 && !isControllerClosedRef.value) {
      const outPayload = { type: "markdown_chunk", content: chunkBuffer };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(outPayload)}\n\n`));
      chunkBuffer = "";
    }
    cleanupAndCloseController();
  };
  reqSignal.addEventListener('abort', clientDisconnectListener, { once: true });

  try {
    let stream;
    if (model === "o4-mini") {
      // o4-mini uses reasoning_effort parameter
      stream = await openai.chat.completions.create({
        model,
        stream: true,
        messages: payload,
        reasoning_effort: "medium",
      }, { signal: reqSignal });
    } else {
      // gpt-4.1-mini uses standard format
      stream = await openai.chat.completions.create({
        model,
        stream: true,
        messages: payload,
      }, { signal: reqSignal });
    }

    for await (const chunk of stream) {
      if (reqSignal.aborted || isControllerClosedRef.value) {
        break;
      }
      
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        chunkBuffer += content;
        if (shouldFlush(chunkBuffer)) {
          const outPayload = { type: "markdown_chunk", content: chunkBuffer };
          controller.enqueue(encoder.encode(`data:${JSON.stringify(outPayload)}\n\n`));
          chunkBuffer = "";
        }
      }
    }

    // Send remaining content
    if (!isControllerClosedRef.value && chunkBuffer.length > 0) {
      const outPayload = { type: "markdown_chunk", content: chunkBuffer };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(outPayload)}\n\n`));
      chunkBuffer = "";
    }
  } catch (error: any) {
    if (!(error.name === 'AbortError' || reqSignal.aborted)) {
      console.error(`Error in streamResponse (model: ${model}):`, error);
      if (!isControllerClosedRef.value) {
        const errorPayload = { type: "error", message: `Streaming failed: ${error.message || 'Unknown error'}` };
        controller.enqueue(encoder.encode(`data:${JSON.stringify(errorPayload)}\n\n`));
      }
    }
  } finally {
    reqSignal.removeEventListener('abort', clientDisconnectListener);
    cleanupAndCloseController();
  }
}

export async function GET(req: NextRequest) {
  console.log("GET /api/advisor called");
  const requestAbortController = new AbortController();
  req.signal.addEventListener('abort', () => {
    requestAbortController.abort();
  }, { once: true });

  try {
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    let messagesFromClient: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    let patientContextString: string | null = null;

    if (!payloadParam) {
      if (!requestAbortController.signal.aborted) requestAbortController.abort();
      return new Response(JSON.stringify({ error: "Payload missing." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const parsedPayload = JSON.parse(payloadParam);
      if (!Array.isArray(parsedPayload.messages) || parsedPayload.messages.length === 0) {
        throw new Error("Messages array is missing or empty in payload.");
      }
      messagesFromClient = parsedPayload.messages;

      // Extract patient context if present as the first system message
      if (messagesFromClient.length > 0 && messagesFromClient[0].role === 'system') {
        try {
          const patientData = JSON.parse(messagesFromClient[0].content);
          if (patientData.patient) {
            // Dynamically build context string from all patient fields
            const patientDetails = Object.entries(patientData.patient)
              .map(([key, value]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return `${formattedKey}: ${value}`;
              })
              .join(', ');
            
            if (patientDetails) {
              patientContextString = `Regarding patient: ${patientDetails}.\n\n`;
            }
            messagesFromClient.shift(); // Remove the system message with patient JSON
          }
        } catch (e) {
          console.warn("Could not parse patient context from system message:", e);
        }
      }

      // If patient context was extracted, prepend it to the last user message
      if (patientContextString && messagesFromClient.length > 0) {
        let lastUserMessageIndex = -1;
        for (let i = messagesFromClient.length - 1; i >= 0; i--) {
          if (messagesFromClient[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
          }
        }
        if (lastUserMessageIndex !== -1) {
          messagesFromClient[lastUserMessageIndex].content = patientContextString + messagesFromClient[lastUserMessageIndex].content;
        }
      }

    } catch (e: any) {
      console.error("Failed to parse payload or invalid messages format:", e.message);
      if (!requestAbortController.signal.aborted) requestAbortController.abort();
      return new Response(JSON.stringify({ error: `Invalid payload: ${e.message}` }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const thinkMode = url.searchParams.get("think") === "true";
    const model = thinkMode ? "o4-mini" : "gpt-4.1-mini";
    
    console.log(`Using model: ${model}, think mode: ${thinkMode}`);

    // Prepare API payload
    const apiPayload = [
      { role: "system" as const, content: systemPrompt },
      ...messagesFromClient.filter(m => m.role === "user" || m.role === "assistant")
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const isControllerClosedRef = { value: false }; 

        const closeControllerOnce = () => {
          if (!isControllerClosedRef.value) {
            isControllerClosedRef.value = true;
            try { controller.close(); } catch (e) { /*ignore*/ }
          }
        };
        
        const mainAbortListener = () => { closeControllerOnce(); };
        requestAbortController.signal.addEventListener('abort', mainAbortListener, { once: true });

        if (requestAbortController.signal.aborted) {
          closeControllerOnce();
          requestAbortController.signal.removeEventListener('abort', mainAbortListener);
          return;
        }

        console.log(`Routing to streamResponse with model: ${model}`);
        await streamResponse(model, apiPayload, controller, requestAbortController.signal, isControllerClosedRef);
        requestAbortController.signal.removeEventListener('abort', mainAbortListener);
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
    });

  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred processing the request.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    if (!requestAbortController.signal.aborted) {
        requestAbortController.abort();
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
