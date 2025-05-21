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

const addElementTool = {
  type: "function",
  function: {
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
  }
} as const;

function bracesBalanced(str: string): boolean {
  if (!str || str.trim() === "") return false;
  let balance = 0;
  for (const char of str) {
    if (char === '{') balance++;
    if (char === '}') balance--;
    // Early exit if balance goes negative, meaning a '}' appeared before a matching '{'
    if (balance < 0) return false; 
  }
  const trimmed = str.trim();
  // Check if it starts with { and ends with } and balance is zero, and not just "{}" or "{ }"
  return balance === 0 && trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.length > 2;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function streamMarkdownOnly(
  userInput: string, 
  model: string, 
  controller: ReadableStreamDefaultController,
  systemMessageContent: string,
  reqSignal: AbortSignal // Pass NextRequest's signal for cancellation
) {
  const encoder = new TextEncoder();
  let openAIStreamClosed = false;

  const cleanup = async () => {
    if (openAIStreamClosed) return;
    openAIStreamClosed = true;
    if (!controller['_closed']) {
        try { controller.close(); } catch(e) { /* console.warn("Controller already closed?", e) */ }
        controller['_closed'] = true;
    }
  };

  if (reqSignal.aborted) {
    await cleanup();
    return;
  }
  const clientDisconnectListener = async () => {
    await cleanup(); 
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
    });

    for await (const chunk of mdStream) {
      if (reqSignal.aborted || openAIStreamClosed) {
        break;
      }
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        if (!controller['_closed']) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "markdown_chunk", content })}\n\n`));
        } else {
            break;
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || reqSignal.aborted) {
    } else {
      console.error("Error in streamMarkdownOnly:", error);
      if (!controller['_closed']) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Markdown streaming failed" })}\n\n`));
      }
    }
  } finally {
    reqSignal.removeEventListener('abort', clientDisconnectListener);
    await cleanup();
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    
    let userInput = "";
    if (payloadParam) {
        try {
            const parsedPayload = JSON.parse(payloadParam);
            const userMessage = parsedPayload.messages?.find((m: any) => m.role === 'user');
            userInput = userMessage?.content || "";
        } catch (e) {
            console.error("Failed to parse payload:", payloadParam, e);
             return new Response(JSON.stringify({ error: "Invalid payload format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    } 

    const thinkMode = url.searchParams.get("think") === "true";
    const model = thinkMode ? "gpt-o3" : "gpt-4.1-mini";
    const systemPromptForMarkdown = `${newSystemPromptBase} Respond in GitHub-flavored Markdown only.`;
    const systemPromptForToolCalls = `${newSystemPromptBase} Stream each UI block via add_element.`;

    const isGreetingOrTest = /^[ \t]*(hello|hi|help|test|ping)[!?.]?$/i.test(userInput);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller['_closed'] = false;

        if (req.signal.aborted) {
            if (!controller['_closed']) { try { controller.close(); } catch(e) {/*ignore*/} controller['_closed'] = true; }
            return;
        }

        if (!userInput && !isGreetingOrTest) { 
          if (!controller['_closed']) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "User input missing for non-greeting/test query." })}\n\n`));
            try { controller.close(); } catch(e) { /*ignore*/ } controller['_closed'] = true;
          }
          return;
        }
        
        if (isGreetingOrTest) {
          const greetingInput = userInput || url.searchParams.get("text") || "Hi";
          await streamMarkdownOnly(greetingInput, model, controller, systemPromptForMarkdown, req.signal);
          return; 
        }

        let fallbackTimeoutId: NodeJS.Timeout | null = null;
        let tokenCount = 0;
        const MAX_TOKENS_BEFORE_FALLBACK = 20;
        const FALLBACK_TIMEOUT_MS = 150; 
        
        const buffers: { [key: string]: string } = {};
        let fallbackStreamActive = false; 
        let structuredStreamActive = true;
        let firstBlockSentFromStructured = false;
        let openAIStructuredStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> | null = null;

        const cleanupResources = async (reason?: string) => {
            if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
            fallbackTimeoutId = null;
            
            structuredStreamActive = false;

            if (!controller['_closed']) {
                try { controller.close(); } catch (e) { /* console.warn("Controller close error in cleanup:", e) */ }
                controller['_closed'] = true;
            }
        };

        if (req.signal.aborted) {
            await cleanupResources("Request aborted early");
            return;
        }
        const clientDisconnectCleanup = () => {
            cleanupResources("Client disconnected");
        };
        req.signal.addEventListener('abort', clientDisconnectCleanup, { once: true });


        const startFallbackDueToErrorOrTimeout = async (reason: string) => {
          if (fallbackStreamActive || controller['_closed']) return;
          fallbackStreamActive = true;
          structuredStreamActive = false;

          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
          
          if (!controller['_closed']) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "fallback_initiated", reason })}\n\n`));
          }
          
          await streamMarkdownOnly(userInput, model, controller, systemPromptForMarkdown, req.signal);
        };

        const resetOrStartFallbackTimer = () => {
          if (fallbackStreamActive || controller['_closed']) return;
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          
          fallbackTimeoutId = setTimeout(() => {
            if (fallbackStreamActive || controller['_closed']) return;
            startFallbackDueToErrorOrTimeout("Timeout: No complete block received within 150ms threshold");
          }, FALLBACK_TIMEOUT_MS);
        };

        resetOrStartFallbackTimer();

        try {
          openAIStructuredStream = await openai.chat.completions.create({
            model,
            stream: true,
            tools: [addElementTool],
            tool_choice: { type: "function", function: { name: addElementTool.function.name } },
            messages: [
              { role: "system", content: systemPromptForToolCalls },
              { role: "user", content: userInput }
            ],
          });

          for await (const chunk of openAIStructuredStream) {
            if (!structuredStreamActive || req.signal.aborted || controller['_closed']) {
              break;
            }

            tokenCount++; 
            const toolCallChunk = chunk.choices[0]?.delta?.tool_calls?.[0];

            if (toolCallChunk?.function?.arguments) {
              const id = toolCallChunk.id || "_tool_call_id_" + Date.now() + Math.random(); 
              buffers[id] = (buffers[id] || "") + toolCallChunk.function.arguments;

              if (bracesBalanced(buffers[id])) {
                if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
                firstBlockSentFromStructured = true; 

                try {
                  const parsedArgs = JSON.parse(buffers[id]);
                  if (Object.keys(parsedArgs).length === 0 && parsedArgs.constructor === Object) {
                  } else if (!parsedArgs.element) {
                  } else {
                    if (!controller['_closed']) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsedArgs)}

`));
                    } else { break; }
                  }
                } catch (e) {
                  console.warn("Failed to parse buffered JSON from tool call:", buffers[id], e);
                }
                delete buffers[id];
                if (!controller['_closed']) resetOrStartFallbackTimer();
                else break;
              }
            } else if (chunk.choices[0]?.delta?.content) {
            }
            
            if (!firstBlockSentFromStructured && tokenCount >= MAX_TOKENS_BEFORE_FALLBACK) {
                let hasAnyBufferContent = false;
                for (const key in buffers) {
                    if (buffers[key] && buffers[key].length > 0) {
                        hasAnyBufferContent = true;
                        break;
                    }
                }
                if (!hasAnyBufferContent) {
                    await startFallbackDueToErrorOrTimeout("Token limit before first block with no tool activity");
                    break; 
                }
            }
          }
        } catch (error: any) {
          if (req.signal.aborted || (error.name === 'AbortError' && structuredStreamActive === false) ) {
          } else if (!fallbackStreamActive && structuredStreamActive) {
            await startFallbackDueToErrorOrTimeout("Structured stream error");
          }
        } finally {
            req.signal.removeEventListener('abort', clientDisconnectCleanup);
            if (!fallbackStreamActive && !controller['_closed']) {
                await cleanupResources("Structured stream finally");
            }
        }
      }
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
    console.error("/api/advisor global error caught in GET:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(JSON.stringify({ error: "Failed to process request: " + errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
