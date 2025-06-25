import { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseDataService } from "@/lib/supabaseDataService";
import { searchGuidelines } from "@/services/guidelines/search-service";
import { Specialty } from "@/types/guidelines";
import { AIModelType } from "@/types/ai-models";

// 1. Model routing (default to gpt-4.1-mini)
// 2. Invoke chat-completions with streaming
// 3. Client-side rendering (handled by client)
// 4. Markdown fallback triggers
// 5. streamMarkdownOnly implementation
// 6. Security and recovery (DOMPurify on client, discard empty tool args)

// Enhanced system prompt for OpenAI Code Interpreter with Clinical Guidelines
const baseSystemPrompt = `You are Foresight, an AI medical advisor for US physicians. Your responses should be comprehensive, empathetic, and formatted in clear, easy-to-read GitHub-flavored Markdown. Use headings, lists, bolding, and other Markdown features appropriately to structure your answer for optimal readability. Avoid overly technical jargon where simpler terms suffice, but maintain medical accuracy.

**CLINICAL GUIDELINES INTEGRATION**: You have access to evidence-based clinical guidelines from authoritative sources including USPSTF, NICE, NCI PDQ, and RxNorm. When relevant to the clinical question or patient scenario:

1. **Reference Clinical Guidelines**: Cite relevant guidelines with their source, grade/strength of recommendation, and publication date
2. **Evidence-Based Recommendations**: Provide specific recommendations based on clinical guidelines when applicable
3. **Screening Guidelines**: Reference appropriate screening recommendations for preventive care
4. **Drug Guidelines**: Include medication recommendations, contraindications, and interactions based on RxNorm data
5. **Specialty Guidelines**: Reference specialty-specific guidelines when relevant to the clinical scenario

When data analysis, tables, or charts would enhance your medical explanation or are explicitly requested:

1. **Automatic Chart/Table Generation**: Use the code_interpreter tool to create visualizations automatically. When you generate charts or tables, they will be displayed directly to the physician without requiring additional steps.

**IMPORTANT**: Even when the user doesn't explicitly request visualizations, you should proactively create relevant charts or tables when:
- Patient data contains time-series information (lab results, vital signs, medication history)
- Multiple diagnoses or treatments can be compared
- Clinical trends or patterns would be medically significant
- A timeline of clinical events would aid understanding
Choose the most appropriate visualization type (timeline charts, comparison tables, trend graphs, etc.) based on the clinical data available.

2. **Data Requirements**: 
   - Utilize the provided patient context FIRST (see 'Current Patient Information' section above if present)
   - If the necessary data for a clinically relevant visualization is not available, clearly state what specific data points you need
   - Do NOT invent patient data - always work with real data provided or create educational examples when appropriate

3. **Chart Guidelines**:
   - Create clear, professional medical visualizations with high visual quality
   - Use appropriate chart types (line charts for trends, bar charts for comparisons, scatter plots for correlations)
   - Include descriptive titles, axis labels, and legends
   - Use professional color schemes suitable for medical documentation
   - **Important**: Filter out empty/null dates and focus only on actual data points to avoid sparse timelines
   - Set appropriate figure sizes (figsize=(12, 6) minimum) for clarity
   - Use proper date formatting and smart date ranges (avoid showing empty periods)
   - Always explain the medical significance of the visualization

4. **Table Guidelines**:
   - Structure data clearly with appropriate headers
   - Include relevant medical units and reference ranges where applicable
   - Sort or organize data in clinically meaningful ways
   - Explain the clinical significance of the data patterns

5. **Code Interpreter Usage**:
   - Use Python with matplotlib, pandas, seaborn, and numpy as needed
   - Create professional-quality visualizations with proper styling
   - **Performance**: Keep data processing efficient - focus on the most relevant clinical data points
   - Filter data intelligently to avoid empty periods in timelines
   - Use datetime parsing and proper date ranges for time-based charts
   - Return structured data for tables when appropriate
   - Always provide clear medical interpretation of the results

When responding to general medical queries:
1. Provide evidence-based information
2. Include relevant medical context and differential diagnoses when appropriate
3. Suggest appropriate next steps or follow-up care
4. Use clear, professional language that respects both the physician's expertise and patient welfare
5. When in doubt, recommend consultation with specialists or additional testing
6. **Always reference relevant clinical guidelines when applicable**

Remember: You are assisting qualified medical professionals, not providing direct patient care. Charts and tables you create will be automatically displayed to enhance clinical understanding.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Assistant ID for the medical advisor (you can create this once and store it)
const MEDICAL_ADVISOR_ASSISTANT_ID = process.env.MEDICAL_ADVISOR_ASSISTANT_ID;

// Cache assistant IDs in memory to avoid recreating each request
const assistantIdCache: Record<string, string> = {};

async function createOrGetAssistant(model: string): Promise<string> {
  // Use model name as cache key
  if (assistantIdCache[model]) return assistantIdCache[model];

  try {
    console.log(`Creating assistant with model: ${model}`);
    const assistant = await openai.beta.assistants.create({
      name: `Foresight Medical Advisor (${model})`,
      instructions: baseSystemPrompt,
      model,
      tools: [{ type: "code_interpreter" }],
    });

    console.log(`Assistant created successfully with ID: ${assistant.id}`);
    assistantIdCache[model] = assistant.id;
    return assistant.id;
  } catch (error: any) {
    console.error(`Failed to create assistant for model ${model}:`, error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create assistant: ${error.message || 'Unknown error'}`);
  }
}

async function createAssistantResponse(
  assistantId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  controller: ReadableStreamDefaultController,
  reqSignal: AbortSignal,
  isControllerClosedRef: { value: boolean }
) {
  const encoder = new TextEncoder();
  let streamEndedByThisFunction = false;

  const cleanupAndCloseController = () => {
    if (isControllerClosedRef.value || streamEndedByThisFunction) return;
    streamEndedByThisFunction = true;
    isControllerClosedRef.value = true;
    try {
      controller.close();
    } catch (e) {
      console.warn("Error closing controller in createAssistantResponse cleanup:", e);
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
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add all previous messages to the thread
    for (const message of messages) {
      await openai.beta.threads.messages.create(thread.id, {
        role: message.role,
        content: message.content
      });
    }

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Enhanced polling with heartbeat and timeout protection
    let runStatus = run;
    let pollCount = 0;
    const maxPolls = 120; // 2 minutes max
    const heartbeatInterval = 10; // Send heartbeat every 10 polls (10 seconds)
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (reqSignal.aborted) {
        break;
      }
      
      pollCount++;
      
      // Check for maximum polling timeout
      if (pollCount >= maxPolls) {
        const errorData = `data: ${JSON.stringify({ error: "Request timeout - processing is taking too long. Please try again." })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        cleanupAndCloseController();
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      // OpenAI SDK v5: cast to any until typings updated
      runStatus = await (openai.beta.threads.runs.retrieve as any)({
        thread_id: thread.id,
        run_id: run.id
      });
    }

    if (reqSignal.aborted) {
      cleanupAndCloseController();
      return;
    }

    if (runStatus.status === 'completed') {
      // Get the messages
      const threadMessages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = threadMessages.data.find(msg => msg.role === 'assistant' && msg.run_id === run.id);
      
      if (assistantMessage) {
        // Check for images first and send in content format
        for (const content of assistantMessage.content) {
          if (content.type === 'image_file') {
            const eventData = `data: ${JSON.stringify({ content: `![Generated Chart](image:${content.image_file.file_id})` })}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          }
        }

        // Send text content with simulated streaming for better UX
        for (const content of assistantMessage.content) {
          if (content.type === 'text') {
            // Simulate streaming by breaking text into chunks
            const fullText = content.text.value;
            const chunkSize = 50; // Send ~50 characters at a time
            const chunks = [];
            
            for (let i = 0; i < fullText.length; i += chunkSize) {
              chunks.push(fullText.slice(i, i + chunkSize));
            }
            
            // Send chunks in original working format
            for (let i = 0; i < chunks.length; i++) {
              if (reqSignal.aborted) break;
              
              const eventData = `data: ${JSON.stringify({ content: chunks[i] })}\n\n`;
              controller.enqueue(encoder.encode(eventData));
              
              // Small delay for streaming effect (skip delay for last chunk)
              if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 30));
              }
            }
          }
        }
      }
    } else if (runStatus.status === 'failed') {
      const errorMsg = runStatus.last_error?.message || 'Assistant run failed';
      const errorData = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
      controller.enqueue(encoder.encode(errorData));
    } else if (runStatus.status === 'expired') {
      const errorData = `data: ${JSON.stringify({ error: "Request expired - please try again." })}\n\n`;
      controller.enqueue(encoder.encode(errorData));
    } else {
      const errorData = `data: ${JSON.stringify({ error: `Unexpected status: ${runStatus.status}. Please try again.` })}\n\n`;
      controller.enqueue(encoder.encode(errorData));
    }

  } catch (error: any) {
    console.error("Assistant API error:", error);
    const errorData = `data: ${JSON.stringify({ error: `Assistant error: ${error.message || 'Unknown error'}. Please try again.` })}\n\n`;
    controller.enqueue(encoder.encode(errorData));
  }

  reqSignal.removeEventListener('abort', clientDisconnectListener);
  cleanupAndCloseController();
}

async function enrichWithGuidelines(query: string, patientData?: any, specialty?: Specialty): Promise<string> {
  try {
    // Extract medical terms and conditions for guideline search
    const searchTerms = extractMedicalTerms(query, patientData);
    
    if (searchTerms.length === 0) {
      return '';
    }

    // Search for relevant guidelines
    const guidelines = await searchGuidelines({
      query: searchTerms.join(' '),
      specialty: specialty,
      limit: 5,
      searchType: 'combined'
    });

    if (guidelines.length === 0) {
      return '';
    }

    // Format guidelines for inclusion in system prompt
    const guidelinesText = guidelines.map(guideline => {
      const metadata = guideline.metadata || {};
      return `**${metadata.source || 'Unknown'} Guideline**: ${metadata.title || 'Untitled'}
- **Grade/Strength**: ${metadata.grade || 'Not specified'}
- **Specialty**: ${metadata.specialty || 'General Medicine'}
- **Content Preview**: ${guideline.content?.substring(0, 300) + '...' || 'No content available'}
- **Similarity Score**: ${Math.round(guideline.similarity * 100)}%
---`;
    }).join('\n');

    return `

## Relevant Clinical Guidelines

The following evidence-based clinical guidelines are relevant to this query:

${guidelinesText}

Please incorporate these guidelines into your response where appropriate, citing the source and strength of recommendations.

---

`;
  } catch (error) {
    console.error('Error enriching with guidelines:', error);
    return '';
  }
}

function extractMedicalTerms(query: string, patientData?: any): string[] {
  const terms: string[] = [];
  
  // Extract from query
  const queryTerms = query.toLowerCase().match(/\b(diabetes|hypertension|cancer|screening|vaccination|cholesterol|depression|anxiety|obesity|smoking|alcohol|cardiovascular|cardiac|pulmonary|renal|hepatic|endocrine|neurological|psychiatric|dermatology|oncology|pediatric|geriatric|emergency|surgery|anesthesia|radiology|pathology|laboratory|pharmacy|medication|drug|treatment|therapy|diagnosis|prevention|guidelines|recommendations)\b/g);
  if (queryTerms) {
    terms.push(...queryTerms);
  }

  // Extract from patient data if available
  if (patientData) {
    // Look for conditions, medications, etc.
    const patientStr = JSON.stringify(patientData).toLowerCase();
    const patientTerms = patientStr.match(/\b(diabetes|hypertension|cancer|cholesterol|depression|anxiety|obesity|cardiovascular|cardiac|pulmonary|renal|hepatic|endocrine|neurological|psychiatric)\b/g);
    if (patientTerms) {
      terms.push(...patientTerms);
    }
  }

  // Remove duplicates
  return [...new Set(terms)];
}

export async function GET(req: NextRequest) {
  const requestAbortController = new AbortController();
  req.signal.addEventListener('abort', () => {
    requestAbortController.abort();
  }, { once: true });

  try {
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");
    const patientId = url.searchParams.get("patientId");
    const specialty = url.searchParams.get("specialty");
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

      // If patientId is provided, fetch complete patient data
      if (patientId) {
        try {
  
          const completePatientData = await supabaseDataService.getPatientData(patientId);
          
          if (completePatientData && completePatientData.patient) {
            // Format comprehensive patient data for clinical context
            const patientInfo = completePatientData.patient;
            const encounters = completePatientData.encounters || [];
            
            // Calculate age from dateOfBirth if available
            let ageText = 'Unknown';
            if (patientInfo.dateOfBirth) {
              try {
                const birthDate = new Date(patientInfo.dateOfBirth);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                ageText = `${age} years old`;
              } catch (e) {
                console.warn('Could not calculate age from dateOfBirth:', patientInfo.dateOfBirth);
              }
            }

            let clinicalContext = `### Complete Patient Clinical Data\n`;
            clinicalContext += `**Patient:** ${patientInfo.firstName} ${patientInfo.lastName} (ID: ${patientInfo.id})\n`;
            clinicalContext += `**Demographics:** ${ageText}, ${patientInfo.gender || 'Unknown gender'}\n`;
            if (patientInfo.dateOfBirth) clinicalContext += `**Date of Birth:** ${patientInfo.dateOfBirth}\n`;
            if (patientInfo.race) clinicalContext += `**Race:** ${patientInfo.race}\n`;
            if (patientInfo.ethnicity) clinicalContext += `**Ethnicity:** ${patientInfo.ethnicity}\n`;
            if (patientInfo.maritalStatus) clinicalContext += `**Marital Status:** ${patientInfo.maritalStatus}\n`;
            if (patientInfo.language) clinicalContext += `**Language:** ${patientInfo.language}\n`;
            
            // Collect all diagnoses across encounters
            const allDiagnoses: any[] = [];
            const allLabResults: any[] = [];
            const allTreatments: any[] = [];
            
            if (encounters.length > 0) {
              clinicalContext += `\n**Recent Encounters:**\n`;
              encounters.forEach(encounterWrapper => { // Show all encounters
                const encounter = encounterWrapper.encounter;
                clinicalContext += `- ${encounter.scheduledStart.split('T')[0]}: ${encounter.reasonDisplayText || encounter.reasonCode || 'General visit'}`;
                if (encounter.transcript) {
                  const truncatedTranscript = encounter.transcript.length > 100 
                    ? encounter.transcript.substring(0, 100) + '...' 
                    : encounter.transcript;
                  clinicalContext += ` - Notes: ${truncatedTranscript}`;
                }
                clinicalContext += `\n`;
                
                // Collect diagnoses from this encounter
                allDiagnoses.push(...encounterWrapper.diagnoses);
                allLabResults.push(...encounterWrapper.labResults);
                
                // Collect treatments from encounter if available
                if (encounter.treatments) {
                  allTreatments.push(...encounter.treatments);
                }
              });
            }

            if (allDiagnoses.length > 0) {
              clinicalContext += `\n**Medical Conditions/Diagnoses:**\n`;
              allDiagnoses.forEach(diagnosis => {
                clinicalContext += `- ${diagnosis.description || 'Unknown condition'}`;
                if (diagnosis.code) clinicalContext += ` (${diagnosis.code})`;
                clinicalContext += `\n`;
              });
            }

            if (allLabResults.length > 0) {
              clinicalContext += `\n**Laboratory Results:**\n`;
              allLabResults.forEach(lab => { // Show all lab results
                clinicalContext += `- ${lab.dateTime ? lab.dateTime.split('T')[0] : 'Unknown date'}: ${lab.name} = ${lab.value}`;
                if (lab.units) clinicalContext += ` ${lab.units}`;
                if (lab.referenceRange) clinicalContext += ` (Ref: ${lab.referenceRange})`;
                if (lab.flag) clinicalContext += ` [${lab.flag}]`;
                clinicalContext += `\n`;
              });
            }

            if (allTreatments.length > 0) {
              clinicalContext += `\n**Current/Recent Treatments:**\n`;
              allTreatments.forEach(treatment => { // Show all treatments
                clinicalContext += `- ${treatment.drug}`;
                if (treatment.status) clinicalContext += ` (Status: ${treatment.status})`;
                if (treatment.rationale) clinicalContext += ` - ${treatment.rationale}`;
                clinicalContext += `\n`;
              });
            }

            if (patientInfo.alerts && patientInfo.alerts.length > 0) {
              clinicalContext += `\n**Clinical Alerts:**\n`;
              patientInfo.alerts.forEach(alert => {
                clinicalContext += `- ${alert.severity?.toUpperCase()} Alert: ${alert.msg || 'No message'}`;
                if (alert.type) clinicalContext += ` (Type: ${alert.type})`;
                clinicalContext += `\n`;
              });
            }

            clinicalContext += `\n**Chart Creation Instructions:** 
- When creating timeline charts, only plot actual encounter dates - do not include empty date ranges
- Use compact, focused date ranges that highlight actual clinical activity periods
- For medical timelines: focus on encounter dates, symptom progression, and treatment changes
- Ensure charts are visually clean with proper spacing and professional medical styling
- Filter out any null/empty dates to create cleaner visualizations

**Analysis Instructions:** Analyze this complete clinical data to provide comprehensive medical insights. Generate charts and tables for trends, comparisons, and clinical correlations as clinically appropriate. Do not invent data - use only the information provided above.\n\n--------------------\n\n`;
            
            patientSummaryBlock = clinicalContext;
          }
        } catch (error) {
          console.error("Failed to fetch patient data:", error);
          // Continue without patient data but log the error
        }
      }

      // Legacy support: Check for basic patient context in system messages
      if (!patientSummaryBlock && messagesFromClient.length > 0 && messagesFromClient[0].role === 'system') {
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

    // Update assistant instructions with patient context if available
    if (patientSummaryBlock) {

      // We'll add patient context as the first user message instead of system prompt
      messagesFromClient.unshift({ role: "user", content: patientSummaryBlock });
    }

    // Wrap everything inside a ReadableStream so we can choose strategy (chat vs assistant) and stream back to client quickly
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const isControllerClosedRef = { value: false };

        const closeControllerOnce = () => {
          if (!isControllerClosedRef.value) {
            isControllerClosedRef.value = true;
            try { controller.close(); } catch {/* ignore */}
          }
        };

        const mainAbortListener = () => { closeControllerOnce(); };
        requestAbortController.signal.addEventListener('abort', mainAbortListener, { once: true });

        if (requestAbortController.signal.aborted) {
          closeControllerOnce();
          requestAbortController.signal.removeEventListener('abort', mainAbortListener);
          return;
        }

        // Determine whether to use advanced reasoning (o3) or faster processing (gpt-4.1-mini)
        const thinkParamRaw = url.searchParams.get("think");
        const thinkMode = thinkParamRaw === "true"; // treat any value other than explicit 'true' as false

        // Select the appropriate model for the mode
        const modelName = thinkMode ? AIModelType.O3 : AIModelType.GPT_4_1_MINI;
        console.log(`Advisor mode: ${thinkMode ? 'think' : 'non-think'}, using model: ${modelName}`);

        try {
          // Prepare the input for the Responses API
          const input: any[] = [];
          
          // Add system/developer message with patient context
          const combinedSystemPrompt = patientSummaryBlock
            ? `${baseSystemPrompt}\n\n${patientSummaryBlock}`
            : baseSystemPrompt;
          
          // For reasoning models (o3), use "developer" role; for others use "system"
          const systemRole = thinkMode ? "developer" : "system";
          input.push({ 
            role: systemRole, 
            content: [{ type: "input_text", text: combinedSystemPrompt }]
          });

          // Add conversation messages
          for (const m of messagesFromClient) {
            if (m.role === "user" || m.role === "assistant") {
              input.push({
                role: m.role,
                content: [{ type: "input_text", text: m.content }]
              });
            }
          }

          // Configure tools for code interpreter functionality
          const tools: any[] = [{ 
            type: "code_interpreter",
            container: { type: "auto" }
          }];

          // Configure reasoning options for think mode
          const reasoningOptions = thinkMode ? {
            effort: "medium" as const,
            summary: "auto" as const
          } : undefined;

          // Make the Responses API call
          const response = await openai.responses.create({
            model: modelName,
            input: input,
            tools: tools,
            max_output_tokens: 4000,
            ...(reasoningOptions && { reasoning: reasoningOptions })
          });

          // Extract the text content from the response
          let outputText = "";
          for (const item of response.output) {
            if (item.type === "message" && item.content) {
              for (const contentItem of item.content) {
                if (contentItem.type === "output_text") {
                  outputText += contentItem.text;
                }
              }
            }
          }

          // Stream the response back to the client
          const eventData = `data: ${JSON.stringify({ content: outputText })}\n\n`;
          controller.enqueue(encoder.encode(eventData));

          // Send done event
          const doneData = `data: [DONE]\n\n`;
          controller.enqueue(encoder.encode(doneData));
          
        } catch (error: any) {
          console.error('Responses API error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            code: error.code,
            type: error.type
          });
          
          // Send error to client
          const errorData = `data: ${JSON.stringify({ 
            error: `API error: ${error.message || 'Failed to process request'}. Please try again.` 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
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
