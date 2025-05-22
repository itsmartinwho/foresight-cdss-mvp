import { NextRequest } from "next/server";
import OpenAI from "openai";

// 1. Model routing (default to gpt-4.1-mini)
// 2. Invoke chat-completions with streaming
// 3. Client-side rendering (handled by client)
// 4. Markdown fallback triggers
// 5. streamMarkdownOnly implementation
// 6. Security and recovery (DOMPurify on client, discard empty tool args)

const systemPrompt = "You are Foresight, an AI medical advisor for US physicians. Your responses should be comprehensive, empathetic, and formatted in clear, easy-to-read GitHub-flavored Markdown. Use headings, lists, bolding, and other Markdown features appropriately to structure your answer for optimal readability. Avoid overly technical jargon where simpler terms suffice, but maintain medical accuracy.";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function streamMarkdownOnly(
  incomingMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>, // Expect full message history
  model: string,
  controller: ReadableStreamDefaultController,
  // systemMessageContent: string, // System message is now part of incomingMessages
  reqSignal: AbortSignal, // For handling client disconnects & main request abort
  isControllerClosedRef: { value: boolean } // To check/update shared controller state
) {
  const encoder = new TextEncoder();
  let streamEndedByThisFunction = false;
  // Buffer to accumulate token stream into larger chunks
  let chunkBuffer = "";

  // Flush buffer when it has a complete sentence or block or exceeds threshold
  function shouldFlush(buffer: string): boolean {
    return (
      buffer.length > 600 ||                       // force flush at large size
      buffer.includes("\n\n")                     // paragraph or heading block finished
    );
  }

  const cleanupAndCloseController = () => {
    if (isControllerClosedRef.value || streamEndedByThisFunction) return;
    streamEndedByThisFunction = true;
    isControllerClosedRef.value = true; // Mark as closed immediately
    try {
      // Send stream_end only if this function is responsible for it and it hasn't been sent
      const endPayload = { type: "stream_end" };
      console.log("SSE send from streamMarkdownOnly (cleanup):", JSON.stringify(endPayload));
      controller.enqueue(encoder.encode(`data:${JSON.stringify(endPayload)}\n\n`));
      controller.close();
    } catch (e) {
      console.warn("Error closing controller in streamMarkdownOnly cleanup:", e);
    }
  };

  if (reqSignal.aborted) {
    // flush any remaining buffered content before cleanup
    if (chunkBuffer.length > 0 && !isControllerClosedRef.value) {
      const payload = { type: "markdown_chunk", content: chunkBuffer };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
      chunkBuffer = "";
    }
    cleanupAndCloseController();
    return;
  }

  const clientDisconnectListener = () => {
    // same flush on disconnect
    if (chunkBuffer.length > 0 && !isControllerClosedRef.value) {
      const payload = { type: "markdown_chunk", content: chunkBuffer };
      controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
      chunkBuffer = "";
    }
    cleanupAndCloseController();
  };
  reqSignal.addEventListener('abort', clientDisconnectListener, { once: true });

  try {
    const mdStream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: incomingMessages, // Pass full message history
    }, 
    { signal: reqSignal } // Pass signal in options bag
    );

    for await (const chunk of mdStream) {
      if (reqSignal.aborted || isControllerClosedRef.value) {
        break;
      }
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        // accumulate into buffer
        chunkBuffer += content;
        // flush when appropriate
        if (shouldFlush(chunkBuffer)) {
          const payload = { type: "markdown_chunk", content: chunkBuffer };
          console.log("SSE send (markdown_chunk buffered):", payload);
          controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
          chunkBuffer = "";
        }
      }
    }
    // send any remaining buffer after stream ends
    if (!isControllerClosedRef.value && chunkBuffer.length > 0) {
      const payload = { type: "markdown_chunk", content: chunkBuffer };
      console.log("SSE send (markdown_chunk final):", payload);
      controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
      chunkBuffer = "";
    }
  } catch (error: any) {
    if (!(error.name === 'AbortError' || reqSignal.aborted)) {
      console.error("Error in streamMarkdownOnly:", error);
      if (!isControllerClosedRef.value) {
        const errorPayload = { type: "error", message: `Markdown streaming failed: ${error.message || 'Unknown error'}` };
        console.log("SSE send (markdown error):", JSON.stringify(errorPayload));
        controller.enqueue(encoder.encode(`data:${JSON.stringify(errorPayload)}\n\n`));
      }
    }
  } finally {
    reqSignal.removeEventListener('abort', clientDisconnectListener);
    cleanupAndCloseController();
  }
}

export async function GET(req: NextRequest) {
  console.log("GET /api/advisor called"); // Added log
  const requestAbortController = new AbortController();
  req.signal.addEventListener('abort', () => {
    requestAbortController.abort();
  }, { once: true });

  try {
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    let userInputForGreetingCheck = "";

    if (!payloadParam) {
      // Abort the main controller if we exit early, as no stream will be started.
      if (!requestAbortController.signal.aborted) requestAbortController.abort();
      return new Response(JSON.stringify({ error: "Payload missing. Please provide messages in the 'payload' query parameter." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const parsedPayload = JSON.parse(payloadParam);
      if (!Array.isArray(parsedPayload.messages) || parsedPayload.messages.length === 0) {
        throw new Error("Messages array is missing or empty in payload.");
      }
      messages = parsedPayload.messages;
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      userInputForGreetingCheck = lastUserMessage?.content || "";
    } catch (e: any) {
      console.error("Failed to parse payload or invalid messages format:", e.message);
      // Abort the main controller if we exit early
      if (!requestAbortController.signal.aborted) requestAbortController.abort();
      return new Response(JSON.stringify({ error: `Invalid payload: ${e.message}` }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const thinkMode = url.searchParams.get("think") === "true"; // Currently unused, always use gpt-4.1
    const model = "gpt-4.1";
    
    // Prepare messages for OpenAI: prepend system prompt
    const messagesForMarkdown = [
        { role: "system" as const, content: systemPrompt },
        ...messages.filter(m => m.role === "user" || m.role === "assistant")
    ];

    const encoder = new TextEncoder();

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
        
        // IMMEDIATELY GO TO MARKDOWN STREAMING FOR NOW
        console.log("Routing directly to Markdown streaming for stability.");
        await streamMarkdownOnly(messagesForMarkdown, model, controller, requestAbortController.signal, isControllerClosedRef);
        requestAbortController.signal.removeEventListener('abort', mainAbortListener);
        return; 

        // Commenting out the structured streaming logic for now
        /*
        const hasUserMessages = messages.some(m => m.role === 'user');
        if (!hasUserMessages && !isGreetingOrTest) { 
          if (!isControllerClosedRef.value) {
            const errPayload = { type: "error", message: "User input missing in messages array." };
            controller.enqueue(encoder.encode(`data:${JSON.stringify(errPayload)}\n\n`));
            closeControllerOnce();
          }
          requestAbortController.signal.removeEventListener('abort', mainAbortListener);
          return;
        }

        if (isGreetingOrTest) {
          await streamMarkdownOnly(messagesForMarkdown, model, controller, requestAbortController.signal, isControllerClosedRef);
          requestAbortController.signal.removeEventListener('abort', mainAbortListener);
          return; 
        }

        let structuredFunctionCallArgsBuffer = "";
        // ... (rest of the complex structured streaming logic is now bypassed) ...
        */
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
        requestAbortController.abort(); // Ensure main abort controller is signaled on global error exit
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
