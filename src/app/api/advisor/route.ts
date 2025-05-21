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
        let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null; 
        let tokenCount = 0;
        const MAX_TOKENS_BEFORE_FALLBACK = 100;
        const FALLBACK_TIMEOUT_MS = 500;
        let firstBlockSent = false;
        let fallbackEngaged = false;
        const structuredStreamInternalAbortController = new AbortController();

        const structuredStreamAbortListener = () => { structuredStreamInternalAbortController.abort(); }; 
        requestAbortController.signal.addEventListener('abort', structuredStreamAbortListener, { once: true });

        const engageMarkdownFallback = async (reason: string) => {
          if (fallbackEngaged || isControllerClosedRef.value) return;
          fallbackEngaged = true;
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
          structuredStreamInternalAbortController.abort();

          if (!isControllerClosedRef.value) {
            const fbPayload = { type: "fallback_initiated", reason };
            console.log("SSE send (fallback_initiated):", JSON.stringify(fbPayload));
            controller.enqueue(encoder.encode(`data:${JSON.stringify(fbPayload)}\n\n`));
          }
          await streamMarkdownOnly(messagesForMarkdown, model, controller, requestAbortController.signal, isControllerClosedRef);
        };

        const resetFallbackTimer = () => {
          // If fallback already engaged, controller closed, or firstBlockSent is true, this timer is no longer needed.
          if (fallbackEngaged || isControllerClosedRef.value || firstBlockSent) {
            // If the timer was set before firstBlockSent became true, clear it now.
            if (fallbackTimeoutId) {
                clearTimeout(fallbackTimeoutId);
                fallbackTimeoutId = null;
            }
            return;
          }
          
          // This part only runs if firstBlockSent is false.
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
          // fallbackTimeoutId = setTimeout(() => { // Fallback DEFINITIVELY disabled
          //   if (fallbackEngaged || isControllerClosedRef.value || firstBlockSent) return; // Re-check state inside timeout
          //   // engageMarkdownFallback("Timeout: Initial block not received in 500ms"); // Fallback DEFINITIVELY disabled
          // }, FALLBACK_TIMEOUT_MS);
        };
        
        // resetFallbackTimer(); // Fallback DEFINITIVELY disabled

        try {
          console.log("Attempting structured stream with OpenAI...");

          let continueStreaming = true;
          let loopCount = 0; // Safety break for the loop
          const MAX_LOOPS = 10; // Allow up to 10 tool calls

          // Make a mutable copy of messagesForToolCalls to append tool responses
          // Explicitly type to allow for function_call and tool roles
          let currentMessagesForToolCalls: Array<OpenAI.Chat.ChatCompletionMessageParam | OpenAI.Chat.ChatCompletionToolMessageParam> = [...messagesForToolCalls.map(m => m as OpenAI.Chat.ChatCompletionMessageParam)]; 

          while (continueStreaming && loopCount < MAX_LOOPS) {
            loopCount++;
            if (requestAbortController.signal.aborted || isControllerClosedRef.value) {
              console.log("Loop break: Request aborted or controller closed.");
              break;
            }

            console.log(`Loop ${loopCount}: Calling OpenAI with ${currentMessagesForToolCalls.length} messages.`);

            const structuredStream = await openai.chat.completions.create({
              model,
              stream: true,
              messages: currentMessagesForToolCalls,
              tools: [ { type: "function", function: addElementFunctionDefinition } ],
              tool_choice: { type: "function", function: { name: addElementFunctionDefinition.name } },
            },
            { signal: structuredStreamInternalAbortController.signal }
            );

            let functionCallArgumentsReceived = "";
            let madeSuccessfulToolCallInThisLoop = false;

            for await (const chunk of structuredStream) {
              if (fallbackEngaged || structuredStreamInternalAbortController.signal.aborted || isControllerClosedRef.value) {
                console.log("Chunk processing break: Fallback, abort, or controller closed.");
                continueStreaming = false; // Stop the outer loop
                break;
              }
              // tokenCount++; // Token count is less relevant in a multi-call loop for fallback timer
              // resetFallbackTimer(); // Fallback disabled

              const fcDelta = chunk.choices[0]?.delta?.function_call;
              if (fcDelta?.arguments) {
                functionCallArgumentsReceived += fcDelta.arguments;
              }

              // Check for finish_reason other than function_call to stop the loop
              // or if the LLM simply stops sending function call arguments.
              const finishReason = chunk.choices[0]?.finish_reason;
              if (finishReason && finishReason !== "function_call" && finishReason !== "tool_calls") {
                  console.log(`Loop ${loopCount}: OpenAI indicated finish reason: ${finishReason}. Stopping further tool calls.`);
                  continueStreaming = false; // Stop making new OpenAI calls
                  // No break here, let bracesBalanced check for any final partial args
              }

              if (bracesBalanced(functionCallArgumentsReceived)) {
                try {
                  const parsedArgs = JSON.parse(functionCallArgumentsReceived);
                  const toolCallId = chunk.choices[0]?.delta?.tool_calls?.[0]?.id || `tool_call_${Date.now()}`;
                  // ^^^ Note: The original `functions` API doesn't use tool_calls array or provide tool_call_id in delta directly like the newer `tools` API.
                  // For `functions`, the `function_call` object is directly on the delta.
                  // We will synthesize a tool message without a specific ID from the LLM if not available.

                  functionCallArgumentsReceived = ""; // Reset buffer

                  if (Object.keys(parsedArgs).length === 0 && parsedArgs.constructor === Object) {
                    // Skip empty {}
                  } else if (
                    typeof parsedArgs.element !== 'string' ||
                    !VALID_ELEMENT_TYPES.includes(parsedArgs.element as typeof VALID_ELEMENT_TYPES[number])
                  ) {
                    console.warn("Invalid or missing 'element' field:", parsedArgs);
                    // Potentially stop streaming if LLM sends bad data repeatedly?
                  } else {
                    if (!isControllerClosedRef.value) {
                      console.log(`Loop ${loopCount}: First block enqueued:`, parsedArgs);
                      firstBlockSent = true; // This ref might need re-evaluation in multi-call
                                            // For now, it still helps avoid fallback if it were enabled.
                      // if (fallbackTimeoutId) { // Fallback disabled
                      //   clearTimeout(fallbackTimeoutId);
                      //   fallbackTimeoutId = null;
                      // }
                      const payload = { type: "structured_block", element: parsedArgs };
                      console.log(`Loop ${loopCount}: SSE send:`, JSON.stringify(payload));
                      controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
                      madeSuccessfulToolCallInThisLoop = true;

                      // Add the assistant's function call and our tool response to messages for next iteration
                      currentMessagesForToolCalls.push({
                        role: "assistant",
                        content: null, // Per OpenAI spec for function call message
                        function_call: { 
                          name: addElementFunctionDefinition.name,
                          arguments: JSON.stringify(parsedArgs) 
                        }
                      } as OpenAI.Chat.ChatCompletionAssistantMessageParam); // Cast to the specific type
                      currentMessagesForToolCalls.push({
                        role: "tool", 
                        tool_call_id: toolCallId, // Synthesized or from actual tool_call if available
                        name: addElementFunctionDefinition.name, 
                        content: JSON.stringify({ success: true, message: "Element added." }) 
                      } as OpenAI.Chat.ChatCompletionToolMessageParam); // Cast to the specific type
                    }
                  }
                } catch (e) {
                  // JSON parse error, continue accumulating
                  console.warn(`Loop ${loopCount}: JSON parse error, continuing to accumulate:`, e);
                }
              } // End bracesBalanced check
            } // End for-await-chunk loop

            if (!madeSuccessfulToolCallInThisLoop && continueStreaming) {
                // If the inner loop finished (e.g. stream ended from OpenAI) but we didn't make a tool call
                // (e.g. LLM stopped calling functions, or sent empty/invalid args that we skipped)
                // then we should stop the outer while loop.
                console.log(`Loop ${loopCount}: No successful tool call made in this loop iteration. Stopping streaming.`);
                continueStreaming = false;
            }

            // If OpenAI stream ended (inner loop broke) and we don't want to continue (e.g. finish_reason was not function_call)
            // then continueStreaming would be false, and the while loop condition will handle it.

          } // End while(continueStreaming) loop

          if (loopCount >= MAX_LOOPS) {
            console.warn("Max loop count reached. Stopping further tool calls.");
          }

        } catch (error: any) {
          if (!(error.name === 'AbortError' || structuredStreamInternalAbortController.signal.aborted)) {
            if (!fallbackEngaged && !isControllerClosedRef.value) {
              console.error("Error in structured OpenAI stream:", error);
              const detailedErrorReason = `Structured stream error: ${error.message || 'Unknown error'}`;
              // Send a specific error event before fallback
              const errorPayload = { type: "error", message: detailedErrorReason };
              console.log("SSE send (structured stream error):", JSON.stringify(errorPayload));
              controller.enqueue(encoder.encode(`data:${JSON.stringify(errorPayload)}\n\n`));
              
              // await engageMarkdownFallback(detailedErrorReason); // Fallback DEFINITIVELY disabled
              console.warn(`Fallback suppressed: Structured stream error: ${detailedErrorReason}`);
            }
          }
        } finally {
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId); // Final cleanup for any reason
          requestAbortController.signal.removeEventListener('abort', structuredStreamAbortListener);
          
          // If fallback was engaged, streamMarkdownOnly is responsible for closing.
          // If structured stream completed without fallback, we close here.
          if (!fallbackEngaged && !isControllerClosedRef.value) {
            const endPayload = { type: "stream_end" };
            console.log("SSE send (end of structured stream):", JSON.stringify(endPayload));
            controller.enqueue(encoder.encode(`data:${JSON.stringify(endPayload)}\n\n`));
            closeControllerOnce(); 
          }
          // Removed redundant closeControllerOnce() as it might have already been called or stream is handled by fallback.
          requestAbortController.signal.removeEventListener('abort', mainAbortListener);
        }

        // Ensure the stream is closed properly at the end
        // This section is now largely handled by the finally block of the structured stream
        // or by streamMarkdownOnly in case of fallback.
        // const endPayload = { type: "stream_end" };
        // console.log("SSE send:", JSON.stringify(endPayload));
        // controller.enqueue(encoder.encode(`data:${JSON.stringify(endPayload)}\n\n`));
        // controller.close();
        // isControllerClosedRef.value = true; // Mark as closed
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
