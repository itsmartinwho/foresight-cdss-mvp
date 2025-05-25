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
  LabResult
} from './types';
import { PatientContextLoader, FHIRPatientContext } from './patientContextLoader';
import { SymptomExtractor } from './symptomExtractor';
import { supabaseDataService } from './supabaseDataService';
import { getSupabaseClient } from './supabaseClient';

/**
 * Enhanced Clinical Engine Service V2
 * Implements the full diagnostic pipeline using FHIR-aligned data
 */
export class ClinicalEngineServiceV2 {
  private supabase = getSupabaseClient();

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
        // Fallback or error if the format is unexpected, though test data follows this.
        console.warn(`Unexpected compositeEncounterId format: ${compositeEncounterId}. Could not reliably extract actualEncounterId.`);
        actualEncounterId = compositeEncounterId; // Or handle as an error
      }

      // Stage 1: Load patient context using FHIR-aligned data
      const context = await PatientContextLoader.fetch(patientId, actualEncounterId);
      
      // Get transcript from current encounter if not provided
      const finalTranscript = transcript || context.currentEncounter?.transcript || '';
      
      // Stage 2: Extract symptoms from transcript
      const symptoms = SymptomExtractor.extract(finalTranscript);
      
      // Store extracted symptoms in encounter extra_data
      if (context.currentEncounter && symptoms.length > 0) {
        await this.storeExtractedSymptoms(context.currentEncounter.id, symptoms);
      }
      
      // Stage 3: Generate diagnostic plan based on symptoms and context
      const plan = await this.generateDiagnosticPlan(symptoms, context);
      
      // Stage 4: Execute diagnostic plan (mock execution for MVP)
      const executedPlan = await this.executeDiagnosticPlan(plan, context);
      
      // Stage 5: Synthesize diagnosis from findings
      const diagnosticResult = await this.synthesizeDiagnosis(symptoms, executedPlan, context);
      
      // Stage 6: Generate treatment plan
      const treatments = await this.generateTreatmentPlan(diagnosticResult, context);
      
      // Stage 7: Generate SOAP note
      const soapNote = await this.generateSoapNote(context, symptoms, diagnosticResult, treatments);
      
      // Stage 8: Generate optional documents (referral, prior auth)
      const referralDoc = await this.generateReferralIfNeeded(diagnosticResult, context);
      const priorAuthDoc = await this.generatePriorAuthIfNeeded(diagnosticResult, treatments, context);
      
      // Stage 9: Write results back to database
      if (context.currentEncounter?.id) {
        await this.saveResults(patientId, context.currentEncounter.id, diagnosticResult, treatments, soapNote, referralDoc, priorAuthDoc);
      } else {
        console.warn(`Skipping saveResults as context.currentEncounter.id is not available for patient ${patientId}, compositeEncounterId ${compositeEncounterId}`);
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
        evidenceSources: this.getMockEvidenceSources()
      };
      
    } catch (error) {
      console.error('Error in diagnostic pipeline:', error);
      throw error;
    }
  }

  /**
   * Store extracted symptoms in encounter extra_data
   */
  private async storeExtractedSymptoms(actualEncounterUuid: string, symptoms: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('encounters')
      .update({ 
        extra_data: {
          extracted_symptoms: symptoms
        }
      })
      .eq('id', actualEncounterUuid);
      
    if (error) {
      console.error('Error storing extracted symptoms:', error);
    }
  }

  /**
   * Generate a diagnostic plan based on symptoms and patient context
   */
  private async generateDiagnosticPlan(
    symptoms: string[], 
    context: FHIRPatientContext
  ): Promise<DiagnosticPlan> {
    // Check for specific symptom patterns
    if (symptoms.includes('fatigue') && symptoms.includes('joint pain')) {
      // Autoimmune-focused plan
      return {
        steps: [
          {
            id: "step1",
            description: "Initial symptom assessment",
            query: "Evaluate fatigue and joint pain characteristics, duration, and pattern",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step2",
            description: "Review existing conditions",
            query: "Check patient's problem list for autoimmune conditions",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step3",
            description: "Laboratory review",
            query: "Review recent lab results for inflammatory markers",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step4",
            description: "Differential diagnosis",
            query: "Consider rheumatoid arthritis, lupus, fibromyalgia",
            completed: false,
            sources: [],
            findings: ""
          }
        ],
        rationale: "Fatigue and joint pain suggest possible autoimmune etiology requiring systematic evaluation"
      };
    } else if (symptoms.includes('chest pain') || symptoms.includes('shortness of breath')) {
      // Cardiac-focused plan
      return {
        steps: [
          {
            id: "step1",
            description: "Cardiac risk assessment",
            query: "Evaluate cardiac risk factors and symptom characteristics",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step2",
            description: "Review cardiac history",
            query: "Check for prior cardiac conditions or procedures",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step3",
            description: "Diagnostic testing plan",
            query: "Consider ECG, troponins, chest X-ray",
            completed: false,
            sources: [],
            findings: ""
          }
        ],
        rationale: "Chest pain and dyspnea require urgent cardiac evaluation"
      };
    } else {
      // General diagnostic plan
      return {
        steps: [
          {
            id: "step1",
            description: "Symptom characterization",
            query: `Evaluate ${symptoms.join(', ')}`,
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step2",
            description: "Medical history review",
            query: "Review relevant past medical history",
            completed: false,
            sources: [],
            findings: ""
          },
          {
            id: "step3",
            description: "Physical examination focus",
            query: "Target exam based on presenting symptoms",
            completed: false,
            sources: [],
            findings: ""
          }
        ],
        rationale: "Systematic evaluation of presenting symptoms"
      };
    }
  }

  /**
   * Execute diagnostic plan with mock findings based on context
   */
  private async executeDiagnosticPlan(
    plan: DiagnosticPlan,
    context: FHIRPatientContext
  ): Promise<DiagnosticPlan> {
    const executedSteps = plan.steps.map(step => {
      let findings = "";
      
      if (step.description.includes("symptom assessment")) {
        findings = "Patient reports symptoms for 3 months with progressive worsening. ";
        if (context.currentEncounter?.reasonCode) {
          findings += `Chief complaint: ${context.currentEncounter.reasonCode}. `;
        }
      } else if (step.description.includes("existing conditions")) {
        if (context.conditions.length > 0) {
          findings = `Patient has ${context.conditions.length} conditions on problem list: `;
          findings += context.conditions.map(c => c.description || c.code).join(', ');
        } else {
          findings = "No significant past medical history documented.";
        }
      } else if (step.description.includes("Laboratory review") || step.description.includes("lab")) {
        if (context.observations.length > 0) {
          findings = "Recent lab results:\n";
          context.observations.slice(0, 5).forEach(lab => {
            findings += `- ${lab.name}: ${lab.value} ${lab.units || ''}`;
            if (lab.flag) findings += ` (${lab.flag})`;
            findings += '\n';
          });
        } else {
          findings = "No recent laboratory results available.";
        }
      } else {
        findings = "Evaluation completed as per protocol.";
      }
      
      return {
        ...step,
        completed: true,
        findings: findings
      };
    });
    
    return {
      ...plan,
      steps: executedSteps
    };
  }

  /**
   * Synthesize diagnosis from plan findings and context
   */
  private async synthesizeDiagnosis(
    symptoms: string[],
    plan: DiagnosticPlan,
    context: FHIRPatientContext
  ): Promise<DiagnosticResult> {
    // Mock diagnosis logic based on symptoms and findings
    let primaryDx = { code: "R53.83", name: "Other fatigue" };
    let confidence = 0.65;
    let differentials: any[] = [];
    
    // Check for specific patterns
    if (symptoms.includes('fever') && symptoms.includes('cough')) {
      primaryDx = { code: "J06.9", name: "Acute upper respiratory infection, unspecified" };
      confidence = 0.85;
      differentials = [
        { name: "Influenza", likelihood: "Low", keyFactors: "No body aches or high fever" },
        { name: "COVID-19", likelihood: "Low", keyFactors: "No known exposure" }
      ];
    } else if (symptoms.includes('fatigue') && symptoms.includes('joint pain')) {
      // Check if patient has existing autoimmune condition
      const hasAutoimmune = context.conditions.some(c => 
        c.description?.toLowerCase().includes('arthritis') ||
        c.code?.startsWith('M05') || c.code?.startsWith('M06')
      );
      
      if (hasAutoimmune) {
        primaryDx = { code: "M06.9", name: "Rheumatoid arthritis, unspecified" };
        confidence = 0.80;
      } else {
        primaryDx = { code: "M79.3", name: "Myalgia" };
        confidence = 0.70;
        differentials = [
          { name: "Early rheumatoid arthritis", likelihood: "Moderate", keyFactors: "Joint pain pattern" },
          { name: "Fibromyalgia", likelihood: "Low", keyFactors: "Localized symptoms" }
        ];
      }
    } else if (symptoms.includes('chest pain')) {
      primaryDx = { code: "R07.9", name: "Chest pain, unspecified" };
      confidence = 0.60;
      differentials = [
        { name: "Costochondritis", likelihood: "Moderate", keyFactors: "Reproducible pain" },
        { name: "GERD", likelihood: "Low", keyFactors: "No GI symptoms" }
      ];
    }
    
    return {
      diagnosisName: primaryDx.name,
      diagnosisCode: primaryDx.code,
      confidence: confidence,
      supportingEvidence: [
        `Patient presents with ${symptoms.join(', ')}`,
        ...plan.steps.filter(s => s.findings).map(s => s.findings).slice(0, 3)
      ],
      differentialDiagnoses: differentials,
      recommendedTests: this.getRecommendedTests(primaryDx.code),
      recommendedTreatments: [], // Will be filled by generateTreatmentPlan
      clinicalTrialMatches: []
    };
  }

  /**
   * Generate treatment plan based on diagnosis
   */
  private async generateTreatmentPlan(
    diagnosis: DiagnosticResult,
    context: FHIRPatientContext
  ): Promise<Treatment[]> {
    const treatments: Treatment[] = [];
    
    if (diagnosis.diagnosisCode === "J06.9") {
      // URI treatment
      treatments.push(
        { drug: "Acetaminophen 500mg", status: "recommended", rationale: "Fever and pain relief" },
        { drug: "Rest and hydration", status: "recommended", rationale: "Supportive care" }
      );
    } else if (diagnosis.diagnosisCode?.startsWith("M05") || diagnosis.diagnosisCode?.startsWith("M06")) {
      // RA treatment
      treatments.push(
        { drug: "Methotrexate 15mg weekly", status: "recommended", rationale: "DMARD for RA" },
        { drug: "Folic acid 1mg daily", status: "recommended", rationale: "Prevent MTX side effects" },
        { drug: "NSAIDs PRN", status: "recommended", rationale: "Symptom control" }
      );
    } else if (diagnosis.diagnosisCode === "R07.9") {
      // Chest pain treatment
      treatments.push(
        { drug: "Aspirin 81mg daily", status: "consider", rationale: "If cardiac risk factors" },
        { drug: "PPI therapy", status: "consider", rationale: "If GERD suspected" }
      );
    } else {
      // General symptomatic treatment
      treatments.push(
        { drug: "Symptomatic treatment", status: "recommended", rationale: "Based on specific symptoms" }
      );
    }
    
    return treatments;
  }

  /**
   * Generate SOAP note
   */
  private async generateSoapNote(
    context: FHIRPatientContext,
    symptoms: string[],
    diagnosis: DiagnosticResult,
    treatments: Treatment[]
  ): Promise<SoapNote> {
    const subjective = context.currentEncounter?.transcript 
      ? context.currentEncounter.transcript.slice(0, 200) + '...'
      : `Patient reports ${symptoms.join(', ')}.`;
      
    const objective = context.observations.length > 0
      ? `Recent labs: ${context.observations.slice(0, 2).map(o => `${o.name} ${o.value}${o.units || ''}`).join(', ')}`
      : "Vital signs stable. Physical exam as documented.";
      
    const assessment = `${diagnosis.diagnosisName} (${diagnosis.diagnosisCode}). ` +
      `Confidence: ${(diagnosis.confidence * 100).toFixed(0)}%. ` +
      (diagnosis.differentialDiagnoses.length > 0 
        ? `Differentials include ${diagnosis.differentialDiagnoses[0].name}.`
        : '');
        
    const plan = treatments.map(t => `${t.drug} - ${t.rationale}`).join('; ') +
      (diagnosis.recommendedTests.length > 0 
        ? `. Recommended tests: ${diagnosis.recommendedTests.join(', ')}.`
        : '');
    
    return {
      subjective,
      objective,
      assessment,
      plan,
      rawTranscriptSnippet: context.currentEncounter?.transcript?.slice(0, 100)
    };
  }

  /**
   * Generate referral document if needed
   */
  private async generateReferralIfNeeded(
    diagnosis: DiagnosticResult,
    context: FHIRPatientContext
  ): Promise<any> {
    // Generate referral for certain conditions
    if (diagnosis.diagnosisCode?.startsWith("M05") || diagnosis.diagnosisCode?.startsWith("M06")) {
      return {
        referralTo: "Rheumatology",
        reasonForReferral: diagnosis.diagnosisName,
        summaryOfFindings: diagnosis.supportingEvidence.join(' '),
        generatedContent: {
          date: new Date().toISOString(),
          specialist: { type: "Rheumatology", facility: "Regional Medical Center" },
          patientInformation: {
            name: `${context.patient.firstName} ${context.patient.lastName}`,
            dateOfBirth: context.patient.dateOfBirth || '',
            gender: context.patient.gender || ''
          },
          referralReason: {
            diagnosis: diagnosis.diagnosisName,
            diagnosisCode: diagnosis.diagnosisCode || '',
            reasonForReferral: "Further evaluation and management of rheumatoid arthritis"
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
    diagnosis: DiagnosticResult,
    treatments: Treatment[],
    context: FHIRPatientContext
  ): Promise<any> {
    // Check if any treatments need prior auth
    const needsPriorAuth = treatments.some(t => 
      t.drug.toLowerCase().includes('methotrexate') ||
      t.drug.toLowerCase().includes('biologic')
    );
    
    if (needsPriorAuth) {
      return {
        medicationOrService: treatments[0].drug,
        reasonForRequest: diagnosis.diagnosisName,
        generatedContent: {
          patientInformation: {
            name: `${context.patient.firstName} ${context.patient.lastName}`,
            dateOfBirth: context.patient.dateOfBirth || '',
            insuranceId: "INS123456", // Mock
            gender: context.patient.gender || ''
          },
          serviceRequest: {
            diagnosis: diagnosis.diagnosisName,
            diagnosisCode: diagnosis.diagnosisCode || '',
            requestedService: treatments[0].drug,
            serviceCode: "J1234", // Mock
            startDate: new Date().toISOString(),
            duration: "6 months",
            frequency: "As prescribed"
          },
          clinicalJustification: `Patient diagnosed with ${diagnosis.diagnosisName}. ${treatments[0].rationale}`,
          supportingDocumentation: diagnosis.supportingEvidence
        }
      };
    }
    
    return undefined;
  }

  /**
   * Save all results back to the database
   */
  private async saveResults(
    patientId: string,
    actualEncounterUuid: string,
    diagnosis: DiagnosticResult,
    treatments: Treatment[],
    soapNote: SoapNote,
    referralDoc: any,
    priorAuthDoc: any
  ): Promise<void> {
    try {
      // Get the Supabase UUID for the patient
      const patientUuid = await this.getPatientUuid(patientId);
      if (!patientUuid) {
        throw new Error(`Could not find UUID for patient ${patientId}`);
      }
      
      // 1. Insert primary diagnosis into conditions table
      if (diagnosis.diagnosisCode && diagnosis.diagnosisName) {
        const { error: dxError } = await this.supabase
          .from('conditions')
          .insert({
            patient_id: patientUuid,
            encounter_id: actualEncounterUuid,
            code: diagnosis.diagnosisCode,
            description: diagnosis.diagnosisName,
            category: 'encounter-diagnosis',
            note: `Confidence: ${(diagnosis.confidence * 100).toFixed(0)}%`
          });
          
        if (dxError) {
          console.error('Error inserting diagnosis:', dxError);
        }
      }
      
      // 2. Update encounter with SOAP note and treatments
      if (actualEncounterUuid) {
        const { error: encounterError } = await this.supabase
          .from('encounters')
          .update({
            soap_note: `S: ${soapNote.subjective}\nO: ${soapNote.objective}\nA: ${soapNote.assessment}\nP: ${soapNote.plan}`,
            treatments: treatments,
            prior_auth_justification: priorAuthDoc ? priorAuthDoc.generatedContent.clinicalJustification : null
          })
          .eq('id', actualEncounterUuid);
          
        if (encounterError) {
          console.error('Error updating encounter:', encounterError);
        }
      }
      
      // 3. Optionally store referral/prior auth documents in extra_data
      if (referralDoc || priorAuthDoc) {
        const documents: any = {};
        if (referralDoc) documents.referral = referralDoc;
        if (priorAuthDoc) documents.priorAuth = priorAuthDoc;
        
        if (actualEncounterUuid) {
          const { error: docError } = await this.supabase
            .from('encounters')
            .update({
              extra_data: {
                documents: documents
              }
            })
            .eq('id', actualEncounterUuid);
            
          if (docError) {
            console.error('Error storing documents:', docError);
          }
        }
      }
      
    } catch (error) {
      console.error('Error saving results:', error);
      throw error;
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
   * Get recommended tests based on diagnosis code
   */
  private getRecommendedTests(diagnosisCode: string): string[] {
    const testMap: Record<string, string[]> = {
      'J06.9': ['Throat culture', 'Rapid strep test'],
      'M05': ['RF', 'Anti-CCP', 'ESR', 'CRP', 'Hand X-rays'],
      'M06': ['RF', 'Anti-CCP', 'ESR', 'CRP', 'Hand X-rays'],
      'R07.9': ['ECG', 'Troponins', 'Chest X-ray'],
      'R53.83': ['CBC', 'TSH', 'Vitamin D', 'B12']
    };
    
    // Find matching tests
    for (const [codePrefix, tests] of Object.entries(testMap)) {
      if (diagnosisCode.startsWith(codePrefix)) {
        return tests;
      }
    }
    
    // Default tests
    return ['CBC', 'CMP'];
  }

  /**
   * Get mock evidence sources
   */
  private getMockEvidenceSources(): ClinicalSource[] {
    return [
      {
        type: "guideline",
        id: "uptodate_001",
        title: "UpToDate: Diagnosis and differential diagnosis of rheumatoid arthritis",
        content: "Rheumatoid arthritis (RA) should be considered in any patient with polyarticular inflammatory arthritis...",
        relevanceScore: 0.92,
        accessTime: new Date().toISOString()
      },
      {
        type: "research",
        id: "pubmed_12345",
        title: "Early diagnosis of rheumatoid arthritis",
        content: "Early diagnosis and treatment of RA is crucial for preventing joint damage...",
        relevanceScore: 0.85,
        accessTime: new Date().toISOString()
      }
    ];
  }
} 