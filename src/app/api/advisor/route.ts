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
  userInput: string,
  model: string,
  controller: ReadableStreamDefaultController,
  systemMessageContent: string,
  reqSignal: AbortSignal // For handling client disconnects
) {
  const encoder = new TextEncoder();
  let streamEnded = false;

  const cleanup = () => {
    if (streamEnded) return;
    streamEnded = true;
    if (!controller['_closed']) {
      try { controller.close(); } catch (e) { /* ignore */ }
      controller['_closed'] = true;
    }
  };

  // If client disconnected before this function is even called or during its setup
  if (reqSignal.aborted) {
    cleanup();
    return;
  }

  const clientDisconnectListener = () => {
    // console.log("Markdown stream: client disconnected via req.signal");
    cleanup();
  };
  reqSignal.addEventListener('abort', clientDisconnectListener, { once: true });

  try {
    const mdStream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemMessageContent },
        { role: "user", content: userInput }
      ],
      // OpenAI SDK's `create` with `stream:true` might not directly use top-level `signal` for abort.
      // Aborting is handled by breaking the loop when `reqSignal.aborted` is true.
    });

    for await (const chunk of mdStream) {
      if (reqSignal.aborted || streamEnded) { // Check for client disconnect or if stream was already ended
        break;
      }
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        if (!controller['_closed']) {
          // Send as { type: "markdown_chunk", content: ... }
          const payload = { type: "markdown_chunk", content };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } else {
          break; 
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || reqSignal.aborted) {
      // Expected if client disconnects or stream is intentionally aborted
    } else {
      console.error("Error in streamMarkdownOnly:", error);
      if (!controller['_closed']) {
        const errorPayload = { type: "error", message: "Markdown streaming failed" };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
      }
    }
  } finally {
    reqSignal.removeEventListener('abort', clientDisconnectListener);
    cleanup(); // Ensures controller is closed
  }
}

export async function GET(req: NextRequest) {
  const requestAbortController = new AbortController(); // Master AbortController for this request
  req.signal.addEventListener('abort', () => {
    // console.log("Client disconnected, aborting master controller for the request.");
    requestAbortController.abort();
  }, { once: true });

  try {
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    let userInput = "";

    if (payloadParam) {
      try {
        const parsedPayload = JSON.parse(payloadParam);
        userInput = parsedPayload.messages?.find((m: any) => m.role === 'user')?.content || "";
      } catch (e) {
        console.error("Failed to parse payload:", payloadParam, e);
        return new Response(JSON.stringify({ error: "Invalid payload format" }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
    }

    const thinkMode = url.searchParams.get("think") === "true";
    const model = thinkMode ? "gpt-o3" : "gpt-4.1-mini";
    const systemPromptForMarkdown = `${newSystemPromptBase} Respond in GitHub-flavored Markdown only.`;
    const systemPromptForToolCalls = `${newSystemPromptBase} You must call the add_element function to stream each UI block.`;
    
    const isGreetingOrTest = /^[ \t]*(hello|hi|help|test|ping)[!?.]?$/i.test(userInput);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller['_closed'] = false; // Custom flag to track controller state

        if (requestAbortController.signal.aborted) {
          if (!controller['_closed']) { try { controller.close(); } catch(e){/*ignore*/} controller['_closed'] = true; }
          return;
        }
        
        // Ensure request specific abort listener for this stream instance
        const streamSpecificAbort = () => {
            if(!controller['_closed']) {
                try { controller.close(); } catch(e) {/*ignore*/}
                controller['_closed'] = true;
            }
        };
        requestAbortController.signal.addEventListener('abort', streamSpecificAbort, {once: true});


        if (!userInput && !isGreetingOrTest) {
          if (!controller['_closed']) {
            const errPayload = { type: "error", message: "User input missing." };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errPayload)}\n\n`));
            try { controller.close(); } catch (e) { /*ignore*/ } controller['_closed'] = true;
          }
          return;
        }

        if (isGreetingOrTest) {
          const greetingInput = userInput || url.searchParams.get("text") || "Hi";
          // Pass requestAbortController.signal directly to streamMarkdownOnly
          await streamMarkdownOnly(greetingInput, model, controller, systemPromptForMarkdown, requestAbortController.signal);
          return; // streamMarkdownOnly handles closing
        }

        // --- Structured Path with Fallback ---
        let structuredFunctionCallArgsBuffer = "";
        let fallbackTimeoutId: NodeJS.Timeout | null = null;
        let tokenCount = 0;
        const MAX_TOKENS_BEFORE_FALLBACK = 20;
        const FALLBACK_TIMEOUT_MS = 150;
        let firstBlockSent = false;
        let fallbackEngaged = false;

        // Abort controller specifically for the structured OpenAI stream
        const structuredStreamInternalAbortController = new AbortController();
        
        // Link external request abort to this internal one
        requestAbortController.signal.addEventListener('abort', () => {
            // console.log("Structured path: parent request aborted, aborting internal stream controller.");
            structuredStreamInternalAbortController.abort();
        }, {once: true});


        const engageMarkdownFallback = async (reason: string) => {
          if (fallbackEngaged || controller['_closed']) return;
          fallbackEngaged = true;
          // console.log(Fallback engaged: ${reason});

          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
          
          structuredStreamInternalAbortController.abort(); // Attempt to abort the structured stream

          if (!controller['_closed']) {
            const fbPayload = { type: "fallback_initiated", reason };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(fbPayload)}\n\n`));
          }
          // streamMarkdownOnly will use the main requestAbortController.signal for its own lifetime.
          await streamMarkdownOnly(userInput, model, controller, systemPromptForMarkdown, requestAbortController.signal);
        };

        const resetFallbackTimer = () => {
          if (fallbackEngaged || controller['_closed']) return;
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = setTimeout(() => {
            if (fallbackEngaged || controller['_closed']) return;
            engageMarkdownFallback("Timeout: No complete block/activity in 150ms");
          }, FALLBACK_TIMEOUT_MS);
        };
        
        resetFallbackTimer(); // Initial timer

        try {
          const structuredStream = await openai.chat.completions.create({
            model,
            stream: true,
            messages: [
              { role: "system", content: systemPromptForToolCalls },
              { role: "user", content: userInput },
            ],
            functions: [addElementFunctionDefinition],
            function_call: { name: addElementFunctionDefinition.name },
            // signal: structuredStreamInternalAbortController.signal, // Removed due to linter/SDK version issue
          });

          for await (const chunk of structuredStream) {
            if (fallbackEngaged || structuredStreamInternalAbortController.signal.aborted || controller['_closed']) {
              break;
            }
            tokenCount++;
            resetFallbackTimer(); // Activity detected, reset timer for next chunk or completion

            const fcDelta = chunk.choices[0]?.delta?.function_call;
            if (fcDelta?.arguments) {
              structuredFunctionCallArgsBuffer += fcDelta.arguments;
            }

            if (bracesBalanced(structuredFunctionCallArgsBuffer)) {
              try {
                const parsedArgs = JSON.parse(structuredFunctionCallArgsBuffer);
                structuredFunctionCallArgsBuffer = ""; // Clear buffer after successful parse

                // Skip empty {} tool arguments, but allow valid empty structures like items:[]
                if (Object.keys(parsedArgs).length === 0 && parsedArgs.constructor === Object) {
                  // console.log("Skipping empty {} tool arguments.");
                } else if (!parsedArgs.element) {
                  // console.warn("Parsed arguments missing 'element' field:", parsedArgs);
                } else {
                  if (!controller['_closed']) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsedArgs)}\n\n`));
                    firstBlockSent = true;
                    // Fallback timer is already reset above for any activity,
                    // so it correctly covers time until next block.
                  } else { break; }
                }
              } catch (e) {
                // JSON might be incomplete (more chunks to come) or truly malformed.
                // If malformed and stream ends, it's an error. If incomplete, more chunks will fix.
                // console.warn("Attempted to parse incomplete/malformed JSON from buffer:", structuredFunctionCallArgsBuffer, e.message);
                // The bracesBalanced check should ideally prevent parsing attempts on clearly incomplete JSON.
                // If it's balanced but still fails parse, could be malformed content from model.
                // In this case, we continue accumulating; if it never resolves, timeout will trigger fallback.
              }
            }
            
            // Fallback if 20 tokens arrive before *any* block is sent, AND no arguments are being buffered
            if (!firstBlockSent && tokenCount >= MAX_TOKENS_BEFORE_FALLBACK && structuredFunctionCallArgsBuffer.length === 0) {
              await engageMarkdownFallback(`Token limit (${MAX_TOKENS_BEFORE_FALLBACK}) reached before first block and no partial args.`);
              break;
            }
          }
        } catch (error: any) {
          if (structuredStreamInternalAbortController.signal.aborted || requestAbortController.signal.aborted) {
            // Expected abort (due to fallback, or client disconnect)
            // If fallback not engaged yet, it might be a direct client disconnect aborting the internal controller
            if (!fallbackEngaged && !controller['_closed']) {
                // console.log("Structured stream aborted by signal, but fallback not engaged. Closing controller if open.");
            }
          } else if (!fallbackEngaged && !controller['_closed']) {
            console.error("Error in structured OpenAI stream:", error);
            await engageMarkdownFallback("Structured stream error");
          }
        } finally {
          // console.log("Structured path: finally block. Fallback engaged: ", fallbackEngaged, "Controller closed: ", controller['_closed']);
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          // If fallback was engaged, it's responsible for closing the controller.
          // If not engaged and controller still open, means structured stream finished or errored locally.
          if (!fallbackEngaged && !controller['_closed']) {
            try { controller.close(); } catch(e){/*ignore*/}
            controller['_closed'] = true;
          }
          // remove stream specific abort, main one on requestAbortController will still be there for other potential ops
          requestAbortController.signal.removeEventListener('abort', streamSpecificAbort); 
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
    });

  } catch (error: unknown) {
    // console.error("/api/advisor global error caught in GET:", error);
    // This outer try-catch is for synchronous errors during initial setup
    // or if new Response itself throws.
    let errorMessage = "An unexpected error occurred processing the request.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    
    // Ensure that requestAbortController is cleaned up if it was set.
    if (!requestAbortController.signal.aborted) {
        requestAbortController.abort("Global error cleanup");
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
