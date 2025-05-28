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

/**
 * Enhanced Clinical Engine Service V3
 * Implements GPT-based clinical reasoning with multi-step diagnostic process
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
   * Run the complete diagnostic pipeline for a patient encounter
   */
  async runDiagnosticPipeline(
    patientId: string,
    compositeEncounterId: string,
    transcript?: string
  ): Promise<ClinicalOutputPackage> {
    try {
      console.log(`Starting enhanced diagnostic pipeline for patient ${patientId}, encounter ${compositeEncounterId}`);

      // Extract actual encounter_id for context loading
      let actualEncounterId = '';
      if (compositeEncounterId.startsWith(patientId + '_')) {
        actualEncounterId = compositeEncounterId.substring(patientId.length + 1);
      } else {
        console.warn(`Unexpected compositeEncounterId format: ${compositeEncounterId}`);
        actualEncounterId = compositeEncounterId;
      }

      // Stage 1: Load comprehensive patient data
      console.log('Stage 1: Loading comprehensive patient data...');
      const patientData = await supabaseDataService.getPatientData(patientId);
      
      if (!patientData || !patientData.patient) {
        throw new Error(`Patient data not found for ID: ${patientId}`);
      }

      // Get the current encounter and transcript
      const currentEncounter = patientData.encounters.find(
        enc => enc.encounter.id === actualEncounterId || enc.encounter.encounterIdentifier === actualEncounterId
      );
      
      const finalTranscript = transcript || currentEncounter?.encounter.transcript || '';
      
      // Stage 2: Generate differential diagnoses using GPT-4.1
      console.log('Stage 2: Generating differential diagnoses...');
      const differentialDiagnoses = await this.generateDifferentialDiagnoses(patientData, finalTranscript);
      
      // Stage 3: Generate primary diagnosis and treatment plan using GPT-4o-mini
      console.log('Stage 3: Generating diagnosis and treatment plan...');
      const diagnosticResult = await this.generateDiagnosisAndTreatment(
        patientData, 
        finalTranscript, 
        differentialDiagnoses
      );
      
      // Stage 4: Generate additional clinical fields
      console.log('Stage 4: Generating additional clinical fields...');
      await this.generateAdditionalFields(patientData, finalTranscript, diagnosticResult, actualEncounterId);
      
      // Stage 5: Generate SOAP note
      console.log('Stage 5: Generating SOAP note...');
      const soapNote = await this.generateSoapNote(patientData, finalTranscript, diagnosticResult);
      
      // Stage 6: Generate optional documents
      console.log('Stage 6: Generating optional documents...');
      const referralDoc = await this.generateReferralIfNeeded(diagnosticResult, patientData);
      const priorAuthDoc = await this.generatePriorAuthIfNeeded(diagnosticResult, patientData);
      
      // Stage 7: Save results to database
      console.log('Stage 7: Saving results to database...');
      if (currentEncounter?.encounter.id) {
        await this.saveResults(
          patientId, 
          currentEncounter.encounter.id, 
          diagnosticResult, 
          soapNote, 
          referralDoc, 
          priorAuthDoc,
          differentialDiagnoses
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
   * Stage 2: Generate differential diagnoses using GPT-4.1
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
    "likelihood": "High|Medium|Low",
    "keyFactors": "Brief explanation of key supporting factors"
  }
]

Please provide 3-5 differential diagnoses ranked by likelihood.`;

      const userPrompt = `Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Please generate differential diagnoses based on this information.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini", // Corrected: Using the actual model name you specified
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
      const differentials = JSON.parse(response) as DifferentialDiagnosis[];
      
      console.log(`Generated ${differentials.length} differential diagnoses`);
      return differentials;
      
    } catch (error) {
      console.error('Error generating differential diagnoses:', error);
      // Fallback to basic differential
      return [
        {
          name: "Clinical evaluation needed",
          likelihood: "Medium",
          keyFactors: "Unable to generate differential diagnoses automatically"
        }
      ];
    }
  }

  /**
   * Stage 3: Generate primary diagnosis and treatment plan using GPT-4o-mini
   */
  private async generateDiagnosisAndTreatment(
    patientData: any,
    transcript: string,
    differentialDiagnoses: DifferentialDiagnosis[]
  ): Promise<DiagnosticResult> {
    try {
      const systemPrompt = `You are a US-based doctor tasked to create a diagnosis and treatment plan based on the provided patient information, data from the latest encounter, and differential diagnosis provided by another doctor.

Return your response as JSON with this exact structure:
{
  "diagnosisName": "Primary diagnosis name",
  "diagnosisCode": "ICD-10 code",
  "confidence": 0.85,
  "supportingEvidence": ["Evidence 1", "Evidence 2", "Evidence 3"],
  "recommendedTests": ["Test 1", "Test 2"],
  "recommendedTreatments": ["Treatment 1 with dosage and rationale", "Treatment 2 with dosage and rationale"],
  "clinicalTrialMatches": []
}`;

      const userPrompt = `Patient Data: ${JSON.stringify(patientData, null, 2)}

Latest Encounter Transcript: ${transcript}

Differential Diagnoses from Colleague: ${JSON.stringify(differentialDiagnoses, null, 2)}

Please provide your primary diagnosis and treatment plan.`;

      const completion = await this.openai.chat.completions.create({
        model: "o4-mini", // Corrected: Using the actual model name you specified
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1, // Set to 1 as requested
        max_completion_tokens: 2000, // Fixed: o4-mini uses max_completion_tokens instead of max_tokens
      });

      const response = completion.choices[0].message.content;
      
      if (!response) {
        throw new Error('No response from o4-mini for diagnosis and treatment');
      }

      const result = JSON.parse(response);
      
      // Add differential diagnoses to result
      result.differentialDiagnoses = differentialDiagnoses;
      
      console.log(`Generated primary diagnosis: ${result.diagnosisName}`);
      return result as DiagnosticResult;
      
    } catch (error) {
      console.error('Error generating diagnosis and treatment:', error);
      // Fallback diagnosis
      return {
        diagnosisName: "Clinical evaluation pending",
        diagnosisCode: "Z00.00",
        confidence: 0.5,
        supportingEvidence: ["Clinical data requires further analysis"],
        differentialDiagnoses: differentialDiagnoses,
        recommendedTests: [],
        recommendedTreatments: [],
        clinicalTrialMatches: []
      };
    }
  }

  /**
   * Stage 4: Generate additional clinical fields using GPT-4o-mini
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

      console.log('Updated additional clinical fields');
      
    } catch (error) {
      console.error('Error generating additional fields:', error);
    }
  }

  /**
   * Extract a single field using GPT-4o-mini
   */
  private async extractSingleField(
    patientData: any,
    transcript: string,
    diagnosticResult: DiagnosticResult,
    instruction: string
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "o4-mini", // Corrected: Using the actual model name you specified
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
   * Generate SOAP note
   */
  private async generateSoapNote(
    patientData: any,
    transcript: string,
    diagnosticResult: DiagnosticResult
  ): Promise<SoapNote> {
    const subjective = transcript 
      ? transcript.slice(0, 300) + (transcript.length > 300 ? '...' : '')
      : `Patient presents with concerns leading to ${diagnosticResult.diagnosisName}.`;
      
    const objective = patientData.encounters?.[0]?.labResults?.length > 0
      ? `Recent labs: ${patientData.encounters[0].labResults.slice(0, 2).map((lab: any) => 
          `${lab.name} ${lab.value}${lab.units || ''}`
        ).join(', ')}`
      : "Vital signs stable. Physical exam findings as documented.";
      
    const assessment = `${diagnosticResult.diagnosisName} (${diagnosticResult.diagnosisCode}). ` +
      `Confidence: ${(diagnosticResult.confidence * 100).toFixed(0)}%.`;
        
    const plan = diagnosticResult.recommendedTreatments.join('; ') +
      (diagnosticResult.recommendedTests.length > 0 
        ? `. Tests: ${diagnosticResult.recommendedTests.join(', ')}.`
        : '');
    
    return {
      subjective,
      objective,
      assessment,
      plan,
      rawTranscriptSnippet: transcript?.slice(0, 100)
    };
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
            insuranceId: "INS123456", // Mock
            gender: patientData.patient.gender || ''
          },
          serviceRequest: {
            diagnosis: diagnosticResult.diagnosisName,
            diagnosisCode: diagnosticResult.diagnosisCode || '',
            requestedService: medication || diagnosticResult.recommendedTreatments[0],
            serviceCode: "J1234", // Mock
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
   * Save all results to database
   */
  private async saveResults(
    patientId: string,
    actualEncounterUuid: string,
    diagnosticResult: DiagnosticResult,
    soapNote: SoapNote,
    referralDoc: any,
    priorAuthDoc: any,
    differentialDiagnoses: DifferentialDiagnosis[]
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
          likelihood: diff.likelihood,
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

      // 3. Update encounter with SOAP note and treatments
      const { error: encounterError } = await this.supabase
        .from('encounters')
        .update({
          soap_note: `S: ${soapNote.subjective}\nO: ${soapNote.objective}\nA: ${soapNote.assessment}\nP: ${soapNote.plan}`,
          treatments: diagnosticResult.recommendedTreatments,
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
}

// Export singleton instance
export const clinicalEngineServiceV3 = new ClinicalEngineServiceV3(); 