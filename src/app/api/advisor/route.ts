import { NextRequest } from "next/server";
import OpenAI from "openai";

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
      element: { enum: ["paragraph", "unordered_list", "ordered_list", "table", "references"] as const },
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
    isControllerClosedRef.value = true;
    try { controller.close(); } catch (e) { /* ignore if already closed by another path */ }
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
          controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
        }
      }
    }
  } catch (error: any) {
    if (!(error.name === 'AbortError' || reqSignal.aborted)) {
      console.error("Error in streamMarkdownOnly:", error);
      if (!isControllerClosedRef.value) {
        const errorPayload = { type: "error", message: "Markdown streaming failed" };
        controller.enqueue(encoder.encode(`data:${JSON.stringify(errorPayload)}\n\n`));
      }
    }
  } finally {
    reqSignal.removeEventListener('abort', clientDisconnectListener);
    cleanupAndCloseController();
  }
}

export async function GET(req: NextRequest) {
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
      return new Response(JSON.stringify({ error: `Invalid payload: ${e.message}` }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const thinkMode = url.searchParams.get("think") === "true";
    const model = thinkMode ? "gpt-o3" : "gpt-4.1-mini";
    
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
        { role: "system" as const, content: `${newSystemPromptBase} You must call the add_element function to stream each UI block.` },
        ...messages.filter(m => m.role === "user" || m.role === "assistant")
    ];

    const isGreetingOrTest = /^[ \t]*(hello|hi|help|test|ping)[!?.]?$/i.test(userInputForGreetingCheck);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false; // Local variable to track controller state
        const isControllerClosedRef = { value: false }; // Pass as ref to streamMarkdownOnly

        const closeControllerOnce = () => {
          if (!isControllerClosedRef.value) {
            isControllerClosedRef.value = true;
            try { controller.close(); } catch (e) { /*ignore*/ }
          }
        };

        // Abort stream processing if main request is aborted
        requestAbortController.signal.addEventListener('abort', closeControllerOnce, { once: true });

        if (requestAbortController.signal.aborted) {
          closeControllerOnce();
          return;
        }

        if (messagesForOpenAI.filter(m=>m.role === 'user').length === 0 && !isGreetingOrTest) { 
          if (!isControllerClosedRef.value) {
            const errPayload = { type: "error", message: "User input missing in messages array." };
            controller.enqueue(encoder.encode(`data:${JSON.stringify(errPayload)}\n\n`));
            closeControllerOnce();
          }
          return;
        }

        if (isGreetingOrTest) {
          await streamMarkdownOnly(messagesForMarkdown, model, controller, requestAbortController.signal, isControllerClosedRef);
          return; 
        }

        let structuredFunctionCallArgsBuffer = "";
        let fallbackTimeoutId: NodeJS.Timeout | null = null;
        let tokenCount = 0;
        const MAX_TOKENS_BEFORE_FALLBACK = 20;
        const FALLBACK_TIMEOUT_MS = 150;
        let firstBlockSent = false;
        let fallbackEngaged = false;
        const structuredStreamInternalAbortController = new AbortController();

        requestAbortController.signal.addEventListener('abort', () => {
          structuredStreamInternalAbortController.abort();
        }, { once: true });

        const engageMarkdownFallback = async (reason: string) => {
          if (fallbackEngaged || isControllerClosedRef.value) return;
          fallbackEngaged = true;
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
          structuredStreamInternalAbortController.abort();

          if (!isControllerClosedRef.value) {
            const fbPayload = { type: "fallback_initiated", reason };
            controller.enqueue(encoder.encode(`data:${JSON.stringify(fbPayload)}\n\n`));
          }
          await streamMarkdownOnly(messagesForMarkdown, model, controller, requestAbortController.signal, isControllerClosedRef);
        };

        const resetFallbackTimer = () => {
          if (fallbackEngaged || isControllerClosedRef.value) return;
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = setTimeout(() => {
            if (fallbackEngaged || isControllerClosedRef.value) return;
            engageMarkdownFallback("Timeout: No complete block/activity in 150ms");
          }, FALLBACK_TIMEOUT_MS);
        };
        
        resetFallbackTimer();

        try {
          const structuredStream = await openai.chat.completions.create({
            model,
            stream: true,
            messages: messagesForToolCalls,
            functions: [addElementFunctionDefinition],
            function_call: { name: addElementFunctionDefinition.name },
          },
          { signal: structuredStreamInternalAbortController.signal } // Pass signal in options bag
          );

          for await (const chunk of structuredStream) {
            if (fallbackEngaged || structuredStreamInternalAbortController.signal.aborted || isControllerClosedRef.value) {
              break;
            }
            tokenCount++;
            resetFallbackTimer();

            const fcDelta = chunk.choices[0]?.delta?.function_call;
            if (fcDelta?.arguments) {
              structuredFunctionCallArgsBuffer += fcDelta.arguments;
            }

            if (bracesBalanced(structuredFunctionCallArgsBuffer)) {
              try {
                const parsedArgs = JSON.parse(structuredFunctionCallArgsBuffer);
                structuredFunctionCallArgsBuffer = "";
                if (Object.keys(parsedArgs).length === 0 && parsedArgs.constructor === Object) {
                  // Skip empty {} 
                } else if (!parsedArgs.element) {
                  // console.warn("Parsed arguments missing 'element' field:", parsedArgs);
                } else {
                  if (!isControllerClosedRef.value) {
                    controller.enqueue(encoder.encode(`data:${JSON.stringify(parsedArgs)}\n\n`));
                    firstBlockSent = true;
                  }
                }
              } catch (e) {
                // Continue accumulating if parse fails, timeout will handle persistent malformed data
              }
            }
            
            if (!firstBlockSent && tokenCount >= MAX_TOKENS_BEFORE_FALLBACK && structuredFunctionCallArgsBuffer.length === 0) {
              await engageMarkdownFallback(`Token limit (${MAX_TOKENS_BEFORE_FALLBACK}) reached before first block and no partial args.`);
              break;
            }
          }
        } catch (error: any) {
          if (!(error.name === 'AbortError' || structuredStreamInternalAbortController.signal.aborted)) {
            if (!fallbackEngaged && !isControllerClosedRef.value) {
              console.error("Error in structured OpenAI stream:", error);
              await engageMarkdownFallback("Structured stream error");
            }
          }
        } finally {
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          if (!fallbackEngaged && !isControllerClosedRef.value) {
            closeControllerOnce();
          }
        }
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
