import { NextRequest } from "next/server";
import OpenAI from "openai";
import { VALID_ELEMENT_TYPES } from "@/components/advisor/chat-types"; // Import from chat-types

// 1. Model routing (default to gpt-4.1-mini)
// 2. Define the streaming tool
// 3. Invoke chat-completions with streaming
// 4. Backend SSE parsing of tool calls
// 5. Client-side rendering (handled by client)
// 6. Markdown fallback triggers
// 7. streamMarkdownOnly implementation
// 8. Security and recovery (DOMPurify on client, discard empty tool args)

const newSystemPromptBase = "You are Foresight, a medical advisor helping US physicians.";

// Corrected Tool Definition (OpenAI expects the 'function' object directly in the array)
const addElementFunctionDefinition = {
  name: "add_element",
  description: "Emit one UI block: paragraph, unordered_list, ordered_list, table, or references",
  parameters: {
    type: "object",
    properties: {
      element: { type: "string", enum: ["paragraph", "unordered_list", "ordered_list", "table", "references"] as const },
      text: { type: "string", description: "Text content for paragraph." },
      items: { type: "array", items: { type: "string" }, description: "Array of strings for list items." },
      table: {
        type: "array",
        items: { type: "array", items: { type: "string" } },
        description: "2D array for table data. First inner array is header, subsequent are rows."
      },
      references: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Key-value pairs for references, e.g., { \"ref1\": \"Citation text...\" }"
      }
    },
    required: ["element"]
  }
} as const; // Use 'as const' for stricter type inference

// const VALID_ELEMENT_TYPES = ["paragraph", "unordered_list", "ordered_list", "table", "references"] as const; // Remove local definition

// Refined bracesBalanced: checks for a syntactically complete JSON object structure
function bracesBalanced(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;

  let balance = 0;
  for (const char of trimmed) {
    if (char === '{') balance++;
    if (char === '}') balance--;
    if (balance < 0) return false; // Closing brace before an opening one
  }
  return balance === 0; // True if braces are balanced and structure seems complete
}

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
    cleanupAndCloseController();
    return;
  }

  const clientDisconnectListener = () => {
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
        if (!isControllerClosedRef.value) {
          const payload = { type: "markdown_chunk", content };
          console.log("SSE send (markdown_chunk):", JSON.stringify(payload)); // Added log
          controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
        }
      }
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
    const messagesForOpenAI = [
        { role: "system" as const, content: newSystemPromptBase },
        ...messages.filter(m => m.role === "user" || m.role === "assistant") // Ensure only user/assistant messages are spread
    ];
    const messagesForMarkdown = [
        { role: "system" as const, content: `${newSystemPromptBase} Respond in GitHub-flavored Markdown only.` },
        ...messages.filter(m => m.role === "user" || m.role === "assistant")
    ];
    const messagesForToolCalls = [
        { role: "system" as const, content:
          `${newSystemPromptBase}
           You are a medical advisor. Your response MUST be entirely constructed by making a sequence of 'add_element' function calls.
           Do NOT output any text directly. ALL content must be within an 'add_element' call.
           Break down your complete answer into logical UI blocks: paragraphs, lists, tables, or references.
           For EACH block, make one 'add_element' function call.
           After one 'add_element' call, if more information is needed to fully answer the user's query, you MUST make another 'add_element' call.
           Continue making 'add_element' calls sequentially until the user's entire query is comprehensively answered.
           For example, to answer a question requiring an introductory paragraph, then a list of symptoms, then a paragraph about treatments, you would make three 'add_element' calls in sequence.
           Ensure all information is delivered via these function calls.`
        },
        ...messages.filter(m => m.role === "user" || m.role === "assistant")
    ];

    const isGreetingOrTest = /^[ \t]*(hello|hi|help|test|ping)[!?.]?$/i.test(userInputForGreetingCheck);
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
