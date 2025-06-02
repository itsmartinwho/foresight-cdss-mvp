import { NextRequest } from "next/server";
import OpenAI from "openai";

// 1. Model routing (default to gpt-4.1-mini)
// 2. Invoke chat-completions with streaming
// 3. Client-side rendering (handled by client)
// 4. Markdown fallback triggers
// 5. streamMarkdownOnly implementation
// 6. Security and recovery (DOMPurify on client, discard empty tool args)

// Enhanced system prompt for better code interpreter usage
const baseSystemPrompt = `You are Foresight, an AI medical advisor for US physicians. Your responses should be comprehensive, empathetic, and formatted in clear, easy-to-read GitHub-flavored Markdown. Use headings, lists, bolding, and other Markdown features appropriately to structure your answer for optimal readability. Avoid overly technical jargon where simpler terms suffice, but maintain medical accuracy.

When data analysis, tables, or charts are appropriate for the physician's request or to enhance your explanation:
1. Determine the most clinically relevant type of visualization (e.g., timeline, trend chart, comparison table).
2. Utilize the provided patient context FIRST (see 'Current Patient Information' section above if present). If the necessary data for a specific, relevant visualization is not available in the provided patient context or conversation history, clearly state what specific data points you need to create it. Do NOT invent data.
3. Once you have the necessary data (from context or physician input), write executable Python code using markdown code blocks to generate the chart or table.

Format your Python code blocks for charts and tables precisely like this:

\`\`\`python
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np # if needed for calculations

# Example: df = pd.DataFrame(data_from_patient_context_or_user_input)
# Your Python code here to process data and generate the visualization

plt.figure(figsize=(10, 6))
# ... chart generation code (e.g., plt.plot(), plt.bar()) ...
plt.title('Descriptive Chart Title')
plt.xlabel('X-axis Label')
plt.ylabel('Y-axis Label')
plt.legend() # If applicable
plt.grid(True, alpha=0.3)
plt.show() # For Pyodide, this will be handled by the frontend to display the chart
\`\`\`

For all Python code related to charts/tables, ensure:
- Complete, executable code with all necessary imports (matplotlib, pandas, numpy as needed).
- Use the actual data provided or requested. Do not generate placeholder or random data.
- Professional medical chart formatting with clear titles, axis labels, and legends where appropriate.
- Use matplotlib.pyplot for charts and pandas DataFrames for tables.
- Explain the medical significance of the visualization and what it shows *before* presenting the code block.

The physician will use this code to see actual data visualizations. Make your code practical, executable, and medically relevant based on the information at hand.

When responding to general medical queries:
1. Provide evidence-based information.
2. Include relevant medical context and differential diagnoses when appropriate.
3. Suggest appropriate next steps or follow-up care.
4. Use clear, professional language that respects both the physician's expertise and patient welfare.
5. When in doubt, recommend consultation with specialists or additional testing.

Remember: You are assisting qualified medical professionals, not providing direct patient care.`;

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
    let patientSummaryBlock: string = ""; 

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

      if (messagesFromClient.length > 0 && messagesFromClient[0].role === 'system') {
        try {
          const patientData = JSON.parse(messagesFromClient[0].content);
          if (patientData.patient) {
            const patientDetails = Object.entries(patientData.patient)
              .map(([key, value]) => {                
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return `- ${formattedKey}: ${value}`;
              })
              .join('\n'); 
            
            if (patientDetails) {
              patientSummaryBlock = `### Current Patient Information & Directives\nThis is the primary data for the current consultation. Analyze and use this information first. If specific data points are missing for a visualization YOU DEEM CLINICALLY RELEVANT, clearly state what is needed. Do not invent data.\n\n**Patient Summary:**\n${patientDetails}\n\n--------------------\n\n### Your Role and General Instructions\n`;
            }
            messagesFromClient.shift(); 
          }
        } catch (e) {
          console.warn("Could not parse patient context from system message:", e);
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
    
    const finalSystemPrompt = patientSummaryBlock + baseSystemPrompt;
    
    if (patientSummaryBlock) {
      console.log("DEBUG: Patient Summary Block being prepended:\n", patientSummaryBlock);
    } else {
      console.log("DEBUG: No Patient Summary Block was generated.");
    }
    console.log("DEBUG: Final System Prompt being sent to AI (first 700 chars):\n", finalSystemPrompt.substring(0, 700));

    const apiPayload = [
      { role: "system" as const, content: finalSystemPrompt },
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
