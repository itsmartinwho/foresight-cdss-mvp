import { 
  DiagnosticPlan, 
  DiagnosticStep, 
  DiagnosticResult, 
  ClinicalSource,
  ClinicalTrial,
  PriorAuthorization,
  SpecialistReferral,
  ClinicalOutputPackage,
  SoapNote,
  Treatment,
  Diagnosis,
  LabResult,
  DifferentialDiagnosis
} from './types';
import { supabaseDataService } from './supabaseDataService';
import { getSupabaseClient } from './supabaseClient';
import OpenAI from 'openai';
import { GPT_4_1_MINI } from './ai/gpt-models';
import { getDiagnosisPrompt, getTreatmentPrompt, getTreatmentGuidelinesPrompt } from './ai/prompt-templates';

// Clinical Engine Assistant ID
const CLINICAL_ENGINE_ASSISTANT_ID = process.env.CLINICAL_ENGINE_ASSISTANT_ID;

/**
 * Enhanced Clinical Engine Service V3
 * Implements GPT-based clinical reasoning with multi-step diagnostic process
 * Now supports OpenAI Code Interpreter for data analysis and visualization
 */
export class ClinicalEngineServiceV3 {
  private supabase = getSupabaseClient();
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  /**
   * Create or get the clinical engine assistant with code interpreter
   */
  private async createOrGetClinicalEngineAssistant(): Promise<string> {
    if (CLINICAL_ENGINE_ASSISTANT_ID) {
      return CLINICAL_ENGINE_ASSISTANT_ID;
    }

    // Create a new assistant if not configured
    const assistant = await this.openai.beta.assistants.create({
      name: "Foresight Clinical Engine",
      instructions: `You are Foresight's Clinical Engine, an advanced AI system for comprehensive medical analysis and diagnosis. 
      
      Your role is to:
      1. Analyze patient data comprehensively using clinical reasoning
      2. Generate differential diagnoses with evidence-based rationale
      3. Create data visualizations and charts when they enhance clinical understanding
      4. Provide structured diagnostic outputs with clear recommendations
      
      When analyzing patient data:
      - Use the code_interpreter tool to create charts showing trends, correlations, or patterns in patient data
      - Generate visualizations for lab results, vital signs, medication timelines, etc.
      - Create tables summarizing key findings or comparisons
      - Always explain the clinical significance of any visualizations
      
      Maintain high clinical standards and evidence-based reasoning in all analyses.`,
      model: "gpt-4.1-mini",
      tools: [{ type: "code_interpreter" }],
    });


    
    return assistant.id;
  }

  /**
   * Run comprehensive assistant-based analysis with code interpreter
   */
  private async runAssistantAnalysis(
    assistantId: string,
    patientData: any,
    transcript: string
  ): Promise<{ text: string; visualizations: string[] }> {
    try {
      // Create a thread
      const thread = await this.openai.beta.threads.create();

      // Add patient context and request
      await this.openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Please analyze this patient data and generate appropriate clinical visualizations:

Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Please:
1. Provide a comprehensive clinical analysis
2. Generate data visualizations for any trends, patterns, or key findings
3. Create charts for lab results, vital signs, medication timelines, or other relevant data
4. Explain the clinical significance of all visualizations
5. Provide differential diagnoses with supporting evidence
6. Recommend appropriate treatments and follow-up tests`
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      // Poll for completion
      let runStatus = run;
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Assistant run failed with status: ${runStatus.status}`);
      }

      // Get the messages
      const threadMessages = await this.openai.beta.threads.messages.list(thread.id);
      const assistantMessage = threadMessages.data.find(msg => msg.role === 'assistant' && msg.run_id === run.id);
      
      let analysisText = '';
      const visualizations: string[] = [];

      if (assistantMessage) {
        // Extract text content
        for (const content of assistantMessage.content) {
          if (content.type === 'text') {
            analysisText += content.text.value;
          } else if (content.type === 'image_file') {
            visualizations.push(content.image_file.file_id);
          }
        }
      }

      // Get run steps to check for additional generated images
      const runSteps = await this.openai.beta.threads.runs.steps.list(thread.id, run.id);
      
      for (const step of runSteps.data) {
        if (step.type === 'tool_calls' && 'tool_calls' in step.step_details) {
          for (const toolCall of step.step_details.tool_calls) {
            if (toolCall.type === 'code_interpreter') {
              // Check outputs for images
              for (const output of toolCall.code_interpreter.outputs) {
                if (output.type === 'image') {
                  visualizations.push(output.image.file_id);
                }
              }
            }
          }
        }
      }

      // Clean up the thread
      await this.openai.beta.threads.del(thread.id);

      return {
        text: analysisText,
        visualizations: visualizations
      };

    } catch (error) {
      console.error('Error in assistant analysis:', error);
      throw error;
    }
  }

  /**
   * Parse assistant analysis result into structured diagnostic result
   */
  private parseAnalysisResult(analysisResult: { text: string; visualizations: string[] }): DiagnosticResult {
    try {
      // For now, extract structured information from the text using simple parsing
      // In a production system, you might want to use more sophisticated NLP or ask the assistant
      // to return structured JSON along with the analysis text
      
      const text = analysisResult.text;
      
      // Extract diagnosis name (look for common patterns)
      let diagnosisName = "Clinical evaluation needed";
      const diagnosisMatch = text.match(/(?:primary diagnosis|diagnosis|condition):\s*([^.\n]+)/i);
      if (diagnosisMatch) {
        diagnosisName = diagnosisMatch[1].trim();
      }

      // Extract confidence (look for percentage or confidence indicators)
      let confidence = 0.7; // Default
      const confidenceMatch = text.match(/confidence[:\s]*(\d+)%/i);
      if (confidenceMatch) {
        confidence = parseInt(confidenceMatch[1]) / 100;
      }

      // Extract supporting evidence (look for bullet points or lists)
      const evidenceMatches = text.match(/(?:evidence|findings|supports?):\s*([^.]+)/gi) || [];
      const supportingEvidence = evidenceMatches.map(match => match.replace(/^[^:]*:\s*/, '').trim());

      // Extract recommended tests and treatments
      const testMatches = text.match(/(?:recommend|suggest|order).*?(?:test|lab|study)[^.]*[.]/gi) || [];
      const recommendedTests = testMatches.map(match => match.trim());

      const treatmentMatches = text.match(/(?:treatment|therapy|medication)[^.]*[.]/gi) || [];
      const recommendedTreatments = treatmentMatches.map(match => match.trim());

      return {
        diagnosisName,
        diagnosisCode: "", // Will be filled by separate extraction
        confidence,
        supportingEvidence: supportingEvidence.length > 0 ? supportingEvidence : ["Analysis completed"],
        differentialDiagnoses: [], // Will be filled separately
        recommendedTests: recommendedTests.length > 0 ? recommendedTests : [],
        recommendedTreatments: recommendedTreatments.length > 0 ? recommendedTreatments : [],
        clinicalTrialMatches: []
      };

    } catch (error) {
      console.error('Error parsing analysis result:', error);
      return {
        diagnosisName: "Clinical evaluation needed",
        diagnosisCode: "",
        confidence: 0.5,
        supportingEvidence: ["Analysis parsing error"],
        differentialDiagnoses: [],
        recommendedTests: [],
        recommendedTreatments: [],
        clinicalTrialMatches: []
      };
    }
  }

  /**
   * Run the complete diagnostic pipeline for a patient encounter
   */
  async runDiagnosticPipeline(
    patientId: string,
    compositeEncounterId: string,
    transcript?: string
  ): Promise<ClinicalOutputPackage> {
    try {
      // Extract actual encounter_id for context loading
      let actualEncounterId = '';
      if (compositeEncounterId.startsWith(patientId + '_')) {
        actualEncounterId = compositeEncounterId.substring(patientId.length + 1);
      } else {
        console.warn(`Unexpected compositeEncounterId format: ${compositeEncounterId}`);
        actualEncounterId = compositeEncounterId;
      }

      // Stage 1: Load comprehensive patient data
      const patientData = await supabaseDataService.getPatientData(patientId);
      
      if (!patientData || !patientData.patient) {
        throw new Error(`Patient data not found for ID: ${patientId}`);
      }

      // Get the current encounter and transcript
      const currentEncounter = patientData.encounters.find(
        enc => enc.encounter.id === actualEncounterId || enc.encounter.encounterIdentifier === actualEncounterId
      );
      
      const finalTranscript = transcript || currentEncounter?.encounter.transcript || '';
      
      // Stage 2: Generate differential diagnoses using GPT-4.1-mini
      const differentialDiagnoses = await this.generateDifferentialDiagnoses(patientData, finalTranscript);
      
      // Stage 3a: Generate primary diagnosis
      const diagnosisResult = await this.generateDiagnosis(
        patientData, 
        finalTranscript, 
        differentialDiagnoses
      );

      // Stage 3b: Generate treatment plan with decision trees
      const treatmentResult = await this.generateTreatmentPlan(
        patientData,
        finalTranscript,
        diagnosisResult
      );

      // Combine diagnosis and treatment results
      const diagnosticResult: DiagnosticResult = {
        ...diagnosisResult,
        recommendedTreatments: treatmentResult.treatments?.map((t: any) => `${t.medication} ${t.dosage} - ${t.rationale}`) || [],
        clinicalTrialMatches: treatmentResult.clinicalTrialMatches || []
      } as DiagnosticResult;
      
      // Stage 4: Generate additional clinical fields using o4-mini
      await this.generateAdditionalFields(patientData, finalTranscript, diagnosticResult, actualEncounterId);
      
      // Stage 5: Generate SOAP note
      const soapNote = await this.generateSoapNote(patientData, finalTranscript, diagnosticResult, differentialDiagnoses);
      
      // Stage 6: Generate optional documents
      const referralDoc = await this.generateReferralIfNeeded(diagnosticResult, patientData);
      const priorAuthDoc = await this.generatePriorAuthIfNeeded(diagnosticResult, patientData);
      
      // Stage 7: Save results to database
      if (currentEncounter?.encounter.id) {
        await this.saveResults(
          patientId, 
          currentEncounter.encounter.id, 
          diagnosticResult, 
          soapNote, 
          referralDoc, 
          priorAuthDoc,
          differentialDiagnoses,
          diagnosisResult,
          treatmentResult
        );
      }
      
      // Return complete clinical output package
      return {
        requestId: `dx-${Date.now()}`,
        timestamp: new Date().toISOString(),
        patientId: patientId,
        diagnosticResult: diagnosticResult,
        soapNote: soapNote,
        referralDocument: referralDoc,
        priorAuthDocument: priorAuthDoc,
        evidenceSources: this.getEvidenceSources(patientData)
      };
      
    } catch (error) {
      console.error('Error in enhanced diagnostic pipeline:', error);
      throw error;
    }
  }

  /**
   * Stage 2: Generate differential diagnoses using GPT-4.1-mini
   */
  private async generateDifferentialDiagnoses(
    patientData: any,
    transcript: string
  ): Promise<DifferentialDiagnosis[]> {
    try {
      const systemPrompt = `You are a US-based doctor tasked to create differential diagnoses based on the provided patient information and data from the latest encounter and rank them based on their likelihood.

Return your response as a JSON array with this exact structure:
[
  {
    "name": "Diagnosis Name",
    "probabilityDecimal": 85,
    "keyFactors": "Brief explanation of key supporting factors",
    "explanation": "Detailed clinical explanation of why this diagnosis is being considered",
    "supportingEvidence": ["Evidence 1", "Evidence 2", "Evidence 3"],
    "icdCodes": [
      {
        "code": "M05.79",
        "description": "Rheumatoid arthritis with rheumatoid factor, multiple sites"
      }
    ]
  }
]

Please provide up to 5 differential diagnoses ranked by likelihood from highest to lowest. Include accurate ICD-10 codes for each diagnosis. The 'probabilityDecimal' field should be a number between 0 and 100.`;

      const userPrompt = `Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Please generate differential diagnoses based on this information.`;

      const completion = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1, // Set to 1 as requested
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;
      
      if (!response) {
        throw new Error('No response from GPT-4.1-mini for differential diagnoses');
      }

      // Parse JSON response
      const rawDifferentials = JSON.parse(response) as any[];

      const differentials: DifferentialDiagnosis[] = rawDifferentials.map((rawDiff, index) => {
        const probabilityDecimal = rawDiff.probabilityDecimal || 0;
        const qualitativeRisk = this.getLikelihoodCategory(probabilityDecimal);
        
        return {
          ...rawDiff,
          rank: index + 1,
          probabilityDecimal,
          qualitativeRisk,
          // For backward compatibility
          likelihood: qualitativeRisk,
          likelihoodPercentage: probabilityDecimal
        };
      });
      
      return differentials;
      
    } catch (error) {
      console.error('Error generating differential diagnoses:', error);
      // Fallback to basic differential
      return [
        {
          name: "Clinical evaluation needed",
          rank: 1,
          qualitativeRisk: "Moderate",
          probabilityDecimal: 50,
          likelihood: "Medium",
          likelihoodPercentage: 50,
          keyFactors: "Unable to generate differential diagnoses automatically",
          explanation: "Clinical data requires further analysis to determine accurate differential diagnoses",
          supportingEvidence: ["Automated analysis failed"],
          icdCodes: [
            {
              code: "Z00.00",
              description: "Encounter for general adult medical examination without abnormal findings"
            }
          ]
        } as DifferentialDiagnosis
      ];
    }
  }

  /**
   * Stage 3: Generate primary diagnosis and treatment plan using o4-mini
   */
  /**
   * Generate diagnosis only (separated from treatment generation)
   */
  private async generateDiagnosis(
    patientData: any,
    transcript: string,
    differentialDiagnoses: DifferentialDiagnosis[]
  ): Promise<Partial<DiagnosticResult>> {
    try {
      const systemPrompt = getDiagnosisPrompt();

      const userPrompt = `Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Differential Diagnoses from Colleague: ${JSON.stringify(differentialDiagnoses, null, 2)}

Please provide your primary diagnosis.`;

      const completion = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1,
        max_completion_tokens: 1500,
      });

      const response = completion.choices[0].message.content;
      
      if (!response) {
        throw new Error('No response from AI for diagnosis');
      }

      const result = JSON.parse(response);
      
      // Add differential diagnoses to result
      result.differentialDiagnoses = differentialDiagnoses;
      
      return result;
      
    } catch (error) {
      console.error('Error generating diagnosis:', error);
      // Fallback diagnosis
      return {
        diagnosisName: "Clinical evaluation pending",
        diagnosisCode: "Z00.00",
        confidence: 0.5,
        supportingEvidence: ["Clinical data requires further analysis"],
        differentialDiagnoses: differentialDiagnoses,
        recommendedTests: [],
      };
    }
  }

  /**
   * Generate treatment plan with decision trees (separated from diagnosis)
   */
  private async generateTreatmentPlan(
    patientData: any,
    transcript: string,
    diagnosis: Partial<DiagnosticResult>
  ): Promise<any> {
    try {
      // First, get clinical guidelines-based recommendations
      const guidelinesRecommendations = await this.getGuidelinesRecommendations(
        diagnosis.diagnosisName || '',
        patientData
      );

      const systemPrompt = getTreatmentPrompt();

      const userPrompt = `Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Established Diagnosis: ${JSON.stringify(diagnosis, null, 2)}

Clinical Guidelines Recommendations: ${guidelinesRecommendations}

Please provide a comprehensive treatment plan with decision tree.`;

      const completion = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1,
        max_completion_tokens: 3000,
      });

      const response = completion.choices[0].message.content;
      
      if (!response) {
        throw new Error('No response from AI for treatment plan');
      }

      const treatmentResult = JSON.parse(response);
      
      return treatmentResult;
      
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      // Fallback treatment
      return {
        treatments: [],
        decisionTree: {
          id: "root",
          label: "Clinical evaluation needed",
          type: "action",
          action: "Further assessment required",
          children: []
        },
        clinicalTrialMatches: [],
        nonPharmacologicalTreatments: [],
        followUpPlan: {
          timeline: "Follow-up as clinically indicated",
          parameters: [],
          reassessmentCriteria: "Clinical assessment"
        }
      };
    }
  }

  /**
   * Parse EHR treatment formats (JSON, plain text, tables)
   */
  private parseEHRTreatmentFormats(treatmentData: any): any[] {
    try {
      // If it's already a structured object/array, return as is
      if (Array.isArray(treatmentData)) {
        return treatmentData;
      }
      
      if (typeof treatmentData === 'object' && treatmentData !== null) {
        // If it's an object with treatments array
        if (treatmentData.treatments && Array.isArray(treatmentData.treatments)) {
          return treatmentData.treatments;
        }
        // If it's a single treatment object
        return [treatmentData];
      }

      // If it's a string, try to parse different formats
      if (typeof treatmentData === 'string') {
        // Try JSON first
        try {
          const parsed = JSON.parse(treatmentData);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Not JSON, try other formats
        }

        // Try to parse table-like format (common in EHR systems)
        if (treatmentData.includes('|') || treatmentData.includes('\t')) {
          return this.parseTableFormat(treatmentData);
        }

        // Try to parse list format
        if (treatmentData.includes('\n') || treatmentData.includes(';')) {
          return this.parseListFormat(treatmentData);
        }

        // Single treatment as plain text
        return [{
          medication: treatmentData.trim(),
          dosage: 'As prescribed',
          rationale: 'EHR import',
          duration: 'As needed'
        }];
      }

      return [];
    } catch (error) {
      console.error('Error parsing EHR treatment format:', error);
      return [];
    }
  }

  /**
   * Parse table format treatments (pipe or tab separated)
   */
  private parseTableFormat(data: string): any[] {
    const lines = data.split('\n').filter(line => line.trim());
    const treatments = [];
    
    // Assume first line might be headers
    const hasHeaders = lines[0]?.toLowerCase().includes('medication') || 
                      lines[0]?.toLowerCase().includes('drug') ||
                      lines[0]?.toLowerCase().includes('treatment');
    
    const dataLines = hasHeaders ? lines.slice(1) : lines;
    
    for (const line of dataLines) {
      const columns = line.split(/[|\t]/).map(col => col.trim());
      if (columns.length >= 1) {
        treatments.push({
          medication: columns[0] || 'Unknown medication',
          dosage: columns[1] || 'As prescribed',
          rationale: columns[2] || 'EHR import',
          duration: columns[3] || 'As needed',
          monitoring: columns[4] || undefined
        });
      }
    }
    
    return treatments;
  }

  /**
   * Parse list format treatments (newline or semicolon separated)
   */
  private parseListFormat(data: string): any[] {
    const items = data.split(/[;\n]/).filter(item => item.trim());
    
    return items.map(item => {
      const cleanItem = item.trim();
      
      // Try to extract dosage from common patterns
      const dosageMatch = cleanItem.match(/(\d+\s*mg|\d+\s*mcg|\d+\s*units|\d+\s*ml)/i);
      const medication = dosageMatch ? 
        cleanItem.replace(dosageMatch[0], '').trim() : 
        cleanItem;
      
      return {
        medication: medication || cleanItem,
        dosage: dosageMatch ? dosageMatch[0] : 'As prescribed',
        rationale: 'EHR import',
        duration: 'As needed'
      };
    });
  }

  /**
   * Get clinical guidelines recommendations using RAG
   */
  private async getGuidelinesRecommendations(
    diagnosisName: string,
    patientData: any
  ): Promise<string> {
    try {
      const systemPrompt = getTreatmentGuidelinesPrompt();

      const userPrompt = `Diagnosis: ${diagnosisName}

Patient Context: ${JSON.stringify({
        age: patientData.patient?.age,
        gender: patientData.patient?.gender,
        comorbidities: patientData.conditions?.map((c: any) => c.description) || [],
        allergies: patientData.allergies || [],
        currentMedications: patientData.treatments || []
      }, null, 2)}

Please provide evidence-based treatment recommendations from clinical guidelines.`;

      const completion = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for guidelines-based recommendations
        max_completion_tokens: 1500,
      });

      return completion.choices[0].message.content || 'No specific guidelines found for this diagnosis.';
      
    } catch (error) {
      console.error('Error getting guidelines recommendations:', error);
      return 'Clinical guidelines consultation recommended.';
    }
  }

  /**
   * Stage 4: Generate additional clinical fields using o4-mini
   */
  private async generateAdditionalFields(
    patientData: any,
    transcript: string,
    diagnosticResult: DiagnosticResult,
    encounterId: string
  ): Promise<void> {
    try {
      // Generate condition description
      const conditionDescription = await this.extractSingleField(
        patientData,
        transcript,
        diagnosticResult,
        "Extract a concise medical condition description suitable for a conditions table"
      );

      // Generate condition code
      const conditionCode = await this.extractSingleField(
        patientData,
        transcript,
        diagnosticResult,
        "Extract the most appropriate ICD-10 code for the primary condition"
      );

      // Generate encounter reason code
      const encounterReasonCode = await this.extractSingleField(
        patientData,
        transcript,
        diagnosticResult,
        "Extract a reason code (like CPT or ICD-10) for why this encounter occurred"
      );

      // Generate encounter reason display text
      const encounterReasonText = await this.extractSingleField(
        patientData,
        transcript,
        diagnosticResult,
        "Extract human-readable text explaining the reason for this encounter"
      );

      // Update the encounter with these fields
      await this.updateEncounterFields(encounterId, {
        reason_code: encounterReasonCode,
        reason_display_text: encounterReasonText
      });


      
    } catch (error) {
      console.error('Error generating additional fields:', error);
    }
  }

  /**
   * Extract a single field using o4-mini
   */
  private async extractSingleField(
    patientData: any,
    transcript: string,
    diagnosticResult: DiagnosticResult,
    instruction: string
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [
          { 
            role: "system", 
            content: `You are a medical coding expert. ${instruction}. Return only the requested value, no explanation.` 
          },
          { 
            role: "user", 
            content: `Patient Data: ${JSON.stringify(patientData)}
Transcript: ${transcript}
Diagnosis: ${diagnosticResult.diagnosisName}

Please extract the requested information.`
          }
        ],
        temperature: 1, // Set to 1 as requested
        max_completion_tokens: 100, // Fixed: o4-mini uses max_completion_tokens instead of max_tokens
      });

      return completion.choices[0].message.content?.trim() || '';
      
    } catch (error) {
      console.error('Error extracting single field:', error);
      return '';
    }
  }

  /**
   * Update encounter fields in database
   */
  private async updateEncounterFields(
    encounterId: string,
    fields: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('encounters')
      .update(fields)
      .eq('id', encounterId);
      
    if (error) {
      console.error('Error updating encounter fields:', error);
    }
  }

  /**
   * Generate SOAP note - Now focuses only on S/O sections with AI-generated content
   * Assessment and Plan are mirrored from differentials and treatments
   */
  private async generateSoapNote(
    patientData: any,
    transcript: string,
    diagnosticResult: DiagnosticResult,
    differentialDiagnoses: DifferentialDiagnosis[]
  ): Promise<SoapNote> {
    // Generate Subjective section from patient's input in transcript
    const subjective = await this.generateSubjectiveSection(transcript, patientData);
    
    // Generate Objective section from doctor's input in transcript
    const objective = await this.generateObjectiveSection(transcript, patientData);
    
    // Mirror Assessment from differential diagnoses
    const assessment = this.formatAssessmentFromDifferentials(differentialDiagnoses, diagnosticResult);
    
    // Mirror Plan from recommended treatments
    const plan = this.formatPlanFromTreatments(diagnosticResult.recommendedTreatments, diagnosticResult.recommendedTests);
    
    return {
      subjective,
      objective,
      assessment,
      plan,
      rawTranscriptSnippet: transcript?.slice(0, 100)
    };
  }

  /**
   * Generate Subjective section focusing on patient's narrative
   */
  private async generateSubjectiveSection(transcript: string, patientData: any): Promise<string> {
    if (!transcript || transcript.trim().length < 10) {
      return `Patient presents with concerns leading to clinical evaluation.`;
    }

    const prompt = `Extract and summarize the SUBJECTIVE information from this clinical transcript. Focus ONLY on:

WHAT TO INCLUDE (Patient's perspective):
- Chief complaint and history of present illness from patient's own words
- Patient-reported symptoms, pain levels, timing, quality
- Patient's description of functional impact and concerns
- Social/contextual factors mentioned by patient
- Medication adherence issues reported by patient
- Review of systems responses from patient

WHAT TO EXCLUDE (Doctor's perspective):
- Physical exam findings or interpretations
- Vital signs or lab results
- Clinical assessments or medical opinions
- Diagnostic impressions or medical reasoning
- Treatment recommendations

Patient Information:
- Name: ${patientData.patient?.firstName} ${patientData.patient?.lastName}
- Age: ${patientData.patient?.dateOfBirth ? new Date().getFullYear() - new Date(patientData.patient.dateOfBirth).getFullYear() : 'Unknown'}
- Gender: ${patientData.patient?.gender || 'Unknown'}

Transcript:
${transcript}

Generate a concise, professional Subjective section (2-4 sentences) that captures the patient's narrative and reported symptoms. Use third person and past tense.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || 
        `Patient presents with concerns documented in transcript.`;
    } catch (error) {
      console.error('Error generating subjective section:', error);
      return `Patient presents with concerns documented in transcript.`;
    }
  }

  /**
   * Generate Objective section focusing on doctor's findings
   */
  private async generateObjectiveSection(transcript: string, patientData: any): Promise<string> {
    if (!transcript || transcript.trim().length < 10) {
      return `Clinical examination performed as documented.`;
    }

    const prompt = `Extract and summarize the OBJECTIVE information from this clinical transcript. Focus ONLY on:

WHAT TO INCLUDE (Doctor's findings):
- Vital signs and physical examination findings
- Observable clinical signs and measurements
- Lab values, imaging results, test results mentioned
- Quantifiable clinical data and scores
- External verification points mentioned by clinician

WHAT TO EXCLUDE (Patient's perspective):
- Patient-reported symptoms or complaints
- Patient's subjective descriptions of pain/discomfort
- Patient's narrative or concerns
- Social factors reported by patient

Patient Information:
- Name: ${patientData.patient?.firstName} ${patientData.patient?.lastName}
- Prior Medical History: ${patientData.patient?.alerts ? patientData.patient.alerts.map((alert: any) => alert.msg).join('; ') : 'None documented'}

Transcript:
${transcript}

Generate a concise, professional Objective section (2-4 sentences) that captures the clinician's findings and measurable data. Focus on external verification and clinical observations.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || 
        `Clinical examination performed with findings documented.`;
    } catch (error) {
      console.error('Error generating objective section:', error);
      return `Clinical examination performed with findings documented.`;
    }
  }

  /**
   * Format Assessment section from differential diagnoses
   */
  private formatAssessmentFromDifferentials(
    differentialDiagnoses: DifferentialDiagnosis[],
    diagnosticResult: DiagnosticResult
  ): string {
    let assessment = '';
    
    // Primary diagnosis first
    if (diagnosticResult.diagnosisName && diagnosticResult.diagnosisCode) {
      assessment += `1. ${diagnosticResult.diagnosisName} (${diagnosticResult.diagnosisCode})`;
      if (diagnosticResult.confidence) {
        assessment += ` - Confidence: ${(diagnosticResult.confidence * 100).toFixed(0)}%`;
      }
      assessment += '\n';
    }
    
    // Add differential diagnoses
    if (differentialDiagnoses.length > 0) {
      differentialDiagnoses.forEach((diff, index) => {
        assessment += `${index + 2}. ${diff.name} - ${diff.qualitativeRisk} likelihood`;
        if (diff.keyFactors && diff.keyFactors.trim()) {
          assessment += ` (${diff.keyFactors})`;
        }
        assessment += '\n';
      });
    }
    
    return assessment.trim() || 'Clinical assessment in progress.';
  }

  /**
   * Format Plan section from treatments and tests
   */
  private formatPlanFromTreatments(
    recommendedTreatments: string[],
    recommendedTests: string[]
  ): string {
    let plan = '';
    
    // Add treatments
    if (recommendedTreatments.length > 0) {
      plan += 'Treatment:\n';
      recommendedTreatments.forEach((treatment, index) => {
        plan += `• ${treatment}\n`;
      });
    }
    
    // Add tests/diagnostic workup
    if (recommendedTests.length > 0) {
      if (plan) plan += '\n';
      plan += 'Diagnostic workup:\n';
      recommendedTests.forEach((test, index) => {
        plan += `• ${test}\n`;
      });
    }
    
    // Add follow-up
    if (plan) {
      plan += '\nFollow-up as clinically indicated.';
    }
    
    return plan.trim() || 'Treatment plan to be determined based on clinical assessment.';
  }

  /**
   * Generate referral document if needed
   */
  private async generateReferralIfNeeded(
    diagnosticResult: DiagnosticResult,
    patientData: any
  ): Promise<any> {
    // Logic for when referral is needed (rheumatology, cardiology, etc.)
    const needsReferral = diagnosticResult.diagnosisCode?.startsWith("M") || // Musculoskeletal
                          diagnosticResult.diagnosisCode?.startsWith("I") || // Cardiovascular
                          diagnosticResult.diagnosisName.toLowerCase().includes('specialist');
    
    if (needsReferral) {
      const specialtyMap: Record<string, string> = {
        'M': 'Rheumatology',
        'I': 'Cardiology',
        'C': 'Oncology',
        'E': 'Endocrinology'
      };
      
      const specialty = specialtyMap[diagnosticResult.diagnosisCode?.[0] || ''] || 'Internal Medicine';
      
      return {
        referralTo: specialty,
        reasonForReferral: diagnosticResult.diagnosisName,
        summaryOfFindings: diagnosticResult.supportingEvidence.join(' '),
        generatedContent: {
          date: new Date().toISOString(),
          specialist: { type: specialty, facility: "Regional Medical Center" },
          patientInformation: {
            name: `${patientData.patient.firstName} ${patientData.patient.lastName}`,
            dateOfBirth: patientData.patient.dateOfBirth || '',
            gender: patientData.patient.gender || ''
          },
          referralReason: {
            diagnosis: diagnosticResult.diagnosisName,
            diagnosisCode: diagnosticResult.diagnosisCode || '',
            reasonForReferral: `Further evaluation and management of ${diagnosticResult.diagnosisName}`
          }
        }
      };
    }
    
    return undefined;
  }

  /**
   * Generate prior authorization if needed
   */
  private async generatePriorAuthIfNeeded(
    diagnosticResult: DiagnosticResult,
    patientData: any
  ): Promise<any> {
    const needsPriorAuth = diagnosticResult.recommendedTreatments.some(treatment => 
      treatment.toLowerCase().includes('methotrexate') ||
      treatment.toLowerCase().includes('biologic') ||
      treatment.toLowerCase().includes('specialty')
    );
    
    if (needsPriorAuth) {
      const medication = diagnosticResult.recommendedTreatments.find(treatment => 
        treatment.toLowerCase().includes('methotrexate') ||
        treatment.toLowerCase().includes('biologic') ||
        treatment.toLowerCase().includes('specialty')
      );
      
      return {
        medicationOrService: medication || diagnosticResult.recommendedTreatments[0],
        reasonForRequest: diagnosticResult.diagnosisName,
        generatedContent: {
          patientInformation: {
            name: `${patientData.patient.firstName} ${patientData.patient.lastName}`,
            dateOfBirth: patientData.patient.dateOfBirth || '',
            insuranceId: "INS123456",
            gender: patientData.patient.gender || ''
          },
          serviceRequest: {
            diagnosis: diagnosticResult.diagnosisName,
            diagnosisCode: diagnosticResult.diagnosisCode || '',
            requestedService: medication || diagnosticResult.recommendedTreatments[0],
            serviceCode: "J1234",
            startDate: new Date().toISOString(),
            duration: "6 months",
            frequency: "As prescribed"
          },
          clinicalJustification: `Treatment for ${diagnosticResult.diagnosisName}`,
          supportingDocumentation: diagnosticResult.supportingEvidence
        }
      };
    }
    
    return undefined;
  }

  /**
   * Create rich content structure for diagnosis
   */
  private createDiagnosisRichContent(
    diagnosisResult?: Partial<DiagnosticResult>,
    soapNote?: SoapNote
  ): any {
    if (!diagnosisResult) return null;

    const textContent = [
      `Diagnosis: ${diagnosisResult.diagnosisName || 'Pending evaluation'}`,
      `ICD-10 Code: ${diagnosisResult.diagnosisCode || 'N/A'}`,
      `Confidence: ${diagnosisResult.confidence ? (diagnosisResult.confidence * 100).toFixed(0) + '%' : 'N/A'}`,
      '',
      'Supporting Evidence:',
      ...(diagnosisResult.supportingEvidence?.map(evidence => `• ${evidence}`) || []),
      '',
      'Reasoning:',
      diagnosisResult.reasoningExplanation || 'Clinical evaluation completed',
      '',
      'Assessment (from SOAP):',
      soapNote?.assessment || ''
    ].join('\n');

    return {
      content_type: 'text/markdown',
      text_content: textContent,
      rich_elements: [],
      created_at: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Create rich content structure for treatments
   */
  private createTreatmentsRichContent(
    treatmentResult?: any,
    diagnosticResult?: DiagnosticResult
  ): any {
    if (!treatmentResult && !diagnosticResult?.recommendedTreatments?.length) return null;

    const richElements = [];
    let textContent = 'Treatment Plan\n\n';

    // Add basic treatments text
    if (diagnosticResult?.recommendedTreatments?.length) {
      textContent += 'Recommended Treatments:\n';
      diagnosticResult.recommendedTreatments.forEach((treatment, index) => {
        textContent += `${index + 1}. ${treatment}\n`;
      });
      textContent += '\n';
    }

    // Add structured treatment data if available
    if (treatmentResult?.treatments?.length) {
      textContent += 'Detailed Treatment Plan:\n\n';
      
      treatmentResult.treatments.forEach((treatment: any, index: number) => {
        textContent += `**${treatment.medication || 'Treatment ' + (index + 1)}**\n`;
        textContent += `- Dosage: ${treatment.dosage || 'As prescribed'}\n`;
        textContent += `- Duration: ${treatment.duration || 'As needed'}\n`;
        textContent += `- Rationale: ${treatment.rationale || 'Clinical indication'}\n`;
        if (treatment.monitoring) {
          textContent += `- Monitoring: ${treatment.monitoring}\n`;
        }
        if (treatment.guidelines_reference) {
          textContent += `- Guidelines: ${treatment.guidelines_reference}\n`;
        }
        textContent += '\n';
      });
    }

    // Add decision tree as a rich element if available
    if (treatmentResult?.decisionTree) {
      richElements.push({
        id: 'decision_tree_1',
        type: 'decision_tree',
        data: treatmentResult.decisionTree,
        position: 1,
        editable: false
      });
      
      textContent += '\n**Treatment Decision Tree**\n(Interactive decision tree available in rich view)\n\n';
    }

    // Add follow-up plan
    if (treatmentResult?.followUpPlan) {
      textContent += '**Follow-up Plan:**\n';
      textContent += `Timeline: ${treatmentResult.followUpPlan.timeline || 'As clinically indicated'}\n`;
      if (treatmentResult.followUpPlan.parameters?.length) {
        textContent += `Monitoring Parameters: ${treatmentResult.followUpPlan.parameters.join(', ')}\n`;
      }
      if (treatmentResult.followUpPlan.reassessmentCriteria) {
        textContent += `Reassessment Criteria: ${treatmentResult.followUpPlan.reassessmentCriteria}\n`;
      }
    }

    return {
      content_type: 'text/markdown',
      text_content: textContent,
      rich_elements: richElements,
      created_at: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Save all results to database
   */
  private async saveResults(
    patientId: string,
    actualEncounterUuid: string,
    diagnosticResult: DiagnosticResult,
    soapNote: SoapNote,
    referralDoc: any,
    priorAuthDoc: any,
    differentialDiagnoses: DifferentialDiagnosis[],
    diagnosisResult?: Partial<DiagnosticResult>,
    treatmentResult?: any
  ): Promise<void> {
    try {
      // Get patient UUID
      const patientUuid = await this.getPatientUuid(patientId);
      if (!patientUuid) {
        throw new Error(`Could not find UUID for patient ${patientId}`);
      }
      
      // 1. Insert primary diagnosis
      if (diagnosticResult.diagnosisCode && diagnosticResult.diagnosisName) {
        const { error: dxError } = await this.supabase
          .from('conditions')
          .insert({
            patient_id: patientUuid,
            encounter_id: actualEncounterUuid,
            code: diagnosticResult.diagnosisCode,
            description: diagnosticResult.diagnosisName,
            category: 'encounter-diagnosis',
            note: `Confidence: ${(diagnosticResult.confidence * 100).toFixed(0)}%`
          });
          
        if (dxError) {
          console.error('Error inserting diagnosis:', dxError);
        }
      }
      
      // 2. Save differential diagnoses
      if (differentialDiagnoses.length > 0) {
        await this.supabase
          .from('differential_diagnoses')
          .delete()
          .eq('patient_id', patientUuid)
          .eq('encounter_id', actualEncounterUuid);

        const diffRecords = differentialDiagnoses.map((diff, index) => ({
          patient_id: patientUuid,
          encounter_id: actualEncounterUuid,
          diagnosis_name: diff.name,
          likelihood: diff.qualitativeRisk,
          key_factors: diff.keyFactors,
          rank_order: index + 1
        }));

        const { error: diffError } = await this.supabase
          .from('differential_diagnoses')
          .insert(diffRecords);

        if (diffError) {
          console.error('Error inserting differential diagnoses:', diffError);
        }
      }

      // 3. Create rich content structures
      const diagnosisRichContent = this.createDiagnosisRichContent(diagnosisResult, soapNote);
      const treatmentsRichContent = this.createTreatmentsRichContent(treatmentResult, diagnosticResult);

      // 4. Update encounter with SOAP note, treatments, and rich content
      const { error: encounterError } = await this.supabase
        .from('encounters')
        .update({
          soap_note: `S: ${soapNote.subjective}\nO: ${soapNote.objective}\nA: ${soapNote.assessment}\nP: ${soapNote.plan}`,
          treatments: diagnosticResult.recommendedTreatments,
          diagnosis_rich_content: diagnosisRichContent,
          treatments_rich_content: treatmentsRichContent,
          prior_auth_justification: priorAuthDoc ? priorAuthDoc.generatedContent.clinicalJustification : null
        })
        .eq('id', actualEncounterUuid);
        
      if (encounterError) {
        console.error('Error updating encounter:', encounterError);
      }
      
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }

  /**
   * Get patient UUID from patient ID
   */
  private async getPatientUuid(patientId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('id')
      .eq('patient_id', patientId)
      .single();
      
    if (error || !data) {
      console.error('Error getting patient UUID:', error);
      return null;
    }
    
    return data.id;
  }

  /**
   * Get evidence sources from patient data
   */
  private getEvidenceSources(patientData: any): ClinicalSource[] {
    const sources: ClinicalSource[] = [];
    
    // Add patient data as source
    sources.push({
      type: "patient_data",
      id: patientData.patient.id,
      title: `Patient Data for ${patientData.patient.firstName} ${patientData.patient.lastName}`,
      content: "Comprehensive patient medical record",
      relevanceScore: 1.0,
      accessTime: new Date().toISOString()
    });
    
    // Add encounters as sources
    patientData.encounters?.forEach((enc: any, index: number) => {
      if (enc.encounter.transcript) {
        sources.push({
          type: "patient_data",
          id: enc.encounter.id,
          title: `Encounter ${index + 1} Transcript`,
          content: enc.encounter.transcript,
          relevanceScore: 0.9,
          accessTime: new Date().toISOString()
        });
      }
    });
    
    return sources;
  }

  private getLikelihoodCategory(probabilityDecimal: number): "Negligible" | "Low" | "Moderate" | "High" | "Certain" {
    if (probabilityDecimal < 1) return "Negligible";
    if (probabilityDecimal < 10) return "Low";
    if (probabilityDecimal < 40) return "Moderate";
    if (probabilityDecimal < 70) return "High";
    return "Certain";
  }
}

// Export singleton instance
export const clinicalEngineServiceV3 = new ClinicalEngineServiceV3(); 