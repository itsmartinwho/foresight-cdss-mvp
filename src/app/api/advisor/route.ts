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

async function streamResponse(
  model: string,
  payload: any, // Can be messages for chat.completions or input for responses
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
    if (model === "o3") {
      stream = await openai.responses.create({
        model,
        stream: true,
        ...payload, // Contains input and reasoning
      }, { signal: reqSignal });
    } else {
      stream = await openai.chat.completions.create({
        model,
        stream: true,
        messages: payload, // Contains messages array
      }, { signal: reqSignal });
    }

    for await (const chunk of stream) {
      if (reqSignal.aborted || isControllerClosedRef.value) {
        break;
      }
      let content = "";
      if (model === "o3") {
        // For o3, the structure might be different. Let's assume a similar delta content for now.
        // This might need adjustment based on actual o3 streaming API response.
        // Based on the docs for o1-preview (similar model), it might be chunk.delta or chunk.choices[0].delta.content
        // For now, trying a more generic approach that OpenAI SDKs tend to use for streaming deltas.
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
            content = chunk.choices[0].delta.content;
        } else if (typeof chunk.delta === 'string') { // fallback for a simpler delta structure
            content = chunk.delta;
        } else if (chunk.output_text) { // Check if a non-delta field comes through in streaming for o3
            content = chunk.output_text; // This would imply non-delta streaming if it's the full text each time
        }
      } else {
        content = chunk.choices?.[0]?.delta?.content;
      }

      if (content) {
        chunkBuffer += content;
        if (shouldFlush(chunkBuffer)) {
          const outPayload = { type: "markdown_chunk", content: chunkBuffer };
          controller.enqueue(encoder.encode(`data:${JSON.stringify(outPayload)}\n\n`));
          chunkBuffer = "";
        }
      }
    }

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
                // Prettify common keys for better readability
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
          // Optionally, remove the unparseable system message or leave it
          // For now, we'll leave it if it's not parsable as patient data
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
    const model = thinkMode ? "o3" : "gpt-4.1-mini"; // Use gpt-4.1-mini as default based on prior comment
    
    let apiPayload;
    if (thinkMode) {
      // For o3, combine system prompt with the first user message if messages exist.
      // The o3 'input' expects an array of objects, typically starting with a user role.
      // We'll take all messages, prepend system prompt to the *content* of the very first message if it's a user message,
      // or prepend a new user message with the system prompt if the history starts with an assistant.
      // Then we map to the format o3 expects for its 'input' array.
      // The 'reasoning' parameter is also specific to o3.

      const processedMessagesForO3 = [];
      let systemPromptApplied = false;
      if (messagesFromClient.length > 0) {
        messagesFromClient.forEach((msg, index) => {
          if (msg.role === 'user') {
            let content = msg.content;
            if (index === 0 && !systemPromptApplied) {
              content = `${systemPrompt}\n\n${content}`;
              systemPromptApplied = true;
            }
            processedMessagesForO3.push({ role: 'user', content });
          } else if (msg.role === 'assistant') {
            // o3 input format seems to be [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}, ...]
            // It might not support direct assistant messages without a preceding user message in its 'input'.
            // For simplicity, we will pass assistant messages as is, but this might need review based on o3 behavior.
            processedMessagesForO3.push({ role: 'assistant', content: msg.content });
          }
        });
      } else {
         // If there are no messages from client, send system prompt as first user message
         processedMessagesForO3.push({ role: 'user', content: systemPrompt });
         systemPromptApplied = true;
      }
      // Ensure there's at least one user message if all were assistant or empty.
      if (!systemPromptApplied && processedMessagesForO3.length === 0) {
        processedMessagesForO3.push({ role: 'user', content: systemPrompt });
      }

      apiPayload = {
        input: processedMessagesForO3,
        reasoning: { "effort": "medium" },
      };
    } else {
      // For gpt-4.1-mini and other chat completion models
      apiPayload = [
        { role: "system" as const, content: systemPrompt },
        ...messagesFromClient.filter(m => m.role === "user" || m.role === "assistant")
      ];
    }

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
        requestAbortController.abort(); // Ensure main abort controller is signaled on global error exit
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
