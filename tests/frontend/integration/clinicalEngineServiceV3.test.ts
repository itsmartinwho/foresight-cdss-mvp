import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicalEngineServiceV3 } from '@/lib/clinicalEngineServiceV3';
import { supabaseDataService } from '@/lib/supabaseDataService';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
  // @ts-ignore
  return { default: vi.fn(() => mockOpenAI) };
});

// Mock supabaseDataService
vi.mock('@/lib/supabaseDataService', () => ({
  supabaseDataService: {
    getPatientData: vi.fn(),
  },
}));

// Mock getSupabaseClient
vi.mock('@/lib/supabaseClient', () => {
  const createMockSupabaseClient = () => {
    const clientSpies = {} as any;

    // All chainable methods return the clientSpies object itself.
    clientSpies.from = vi.fn(() => clientSpies);
    clientSpies.select = vi.fn(() => clientSpies);
    clientSpies.insert = vi.fn(() => clientSpies); 
    clientSpies.update = vi.fn(() => clientSpies); 
    clientSpies.delete = vi.fn(() => clientSpies); 
    clientSpies.eq = vi.fn(() => clientSpies);     
    
    // Set default resolutions for methods that terminate a chain or are directly awaited.
    clientSpies.single = vi.fn().mockResolvedValue({ data: { id: 'mock-patient-uuid' }, error: null });
    // For `await ...insert()`:
    clientSpies.insert.mockResolvedValue({ data: null, error: null }); 
    // For `await ...eq()` (e.g., after update, delete, or select):
    clientSpies.eq.mockResolvedValue({ data: null, error: null }); 
    // For `await ...select()` if not ending in .single() or .eq() that resolves:
    clientSpies.select.mockResolvedValue({ data: [], error: null });
    // For `await ...update()` or `await ...delete()` if directly awaited (less common without .eq()):
    clientSpies.update.mockResolvedValue({ data:null, error: null});
    clientSpies.delete.mockResolvedValue({ data:null, error: null});


    return clientSpies;
  };
  return { getSupabaseClient: vi.fn(createMockSupabaseClient) };
});


describe('ClinicalEngineServiceV3 Integration Tests', () => {
  let engine: ClinicalEngineServiceV3;
  let mockOpenAICreateCompletion: any;
  let supabaseSpies: any; 

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ClinicalEngineServiceV3(); 
    supabaseSpies = engine['supabase']; 

    const mockOpenAIInstance = new OpenAI() as any; 
    mockOpenAICreateCompletion = mockOpenAIInstance.chat.completions.create;

    (supabaseDataService.getPatientData as vi.Mock).mockResolvedValue({
      patient: { id: 'TEST_PATIENT_001', firstName: 'Test', lastName: 'Patient', dateOfBirth: '1980-01-01', gender: 'Other' },
      encounters: [{
        encounter: { id: 'TEST_PATIENT_001_TEST_ENC_001', encounterIdentifier: 'TEST_PATIENT_001_TEST_ENC_001', transcript: 'Initial patient transcript.' }
      }],
    });
    
    mockOpenAICreateCompletion.mockImplementation(async (params: any) => {
      if (params.model === "gpt-4.1-mini") { 
        return {
          choices: [{ message: { content: JSON.stringify([
            { name: "Common Cold", likelihood: "High", keyFactors: "Fever, cough" },
            { name: "Flu", likelihood: "Medium", keyFactors: "Fever, cough, fatigue" }
          ])}}],
        };
      }
      if (params.model === "o4-mini") { 
         if (params.messages[0].content.includes("Extract a concise medical condition description")) {
          return { choices: [{ message: { content: "Viral respiratory infection" } }] };
        }
        if (params.messages[0].content.includes("Extract the most appropriate ICD-10 code")) {
          return { choices: [{ message: { content: "J06.9" } }] };
        }
        if (params.messages[0].content.includes("Extract a reason code")) {
          return { choices: [{ message: { content: "99213" } }] };
        }
        if (params.messages[0].content.includes("Extract human-readable text explaining the reason")) {
          return { choices: [{ message: { content: "Office visit for acute illness" } }] };
        }
        return {
          choices: [{ message: { content: JSON.stringify({
            diagnosisName: "Influenza",
            diagnosisCode: "J11.1",
            confidence: 0.9,
            supportingEvidence: ["Fever, cough, fatigue", "Positive flu test (mocked)"],
            recommendedTests: ["Rest"],
            recommendedTreatments: ["Oseltamivir 75mg BID for 5 days"],
            clinicalTrialMatches: []
          })}}],
        };
      }
      return { choices: [{ message: { content: "{}" }}] };
    });
  });

  it('should run diagnostic pipeline and return a valid diagnosis', async () => {
    const result = await engine.runDiagnosticPipeline(
      'TEST_PATIENT_001',
      'TEST_PATIENT_001_TEST_ENC_001',
      'Patient presents with fever, cough, and fatigue for 3 days. No recent travel. No known sick contacts.'
    );

    expect(result.requestId).toBeDefined();
    expect(result.patientId).toBe('TEST_PATIENT_001');
    expect(result.diagnosticResult.diagnosisName).not.toBe('Clinical evaluation pending');
    expect(result.diagnosticResult.diagnosisName).toBe('Influenza');
    expect(result.diagnosticResult.confidence).toBe(0.9);
    expect(result.diagnosticResult.recommendedTreatments).toContain('Oseltamivir 75mg BID for 5 days');
    expect(result.soapNote).toBeDefined();
    expect(result.soapNote?.assessment).toContain('Influenza (J11.1)');

    expect(mockOpenAICreateCompletion).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4.1-mini" }));
    expect(mockOpenAICreateCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: "o4-mini",
      messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("Please provide your primary diagnosis and treatment plan.") })])
    }));
    
    expect(supabaseDataService.getPatientData).toHaveBeenCalledWith('TEST_PATIENT_001');

    // Check the calls to `from`
    expect(supabaseSpies.from.mock.calls).toEqual(
      expect.arrayContaining([
        ['encounters'], // From generateAdditionalFields -> updateEncounterFields
        ['patients'],   // From saveResults -> getPatientUuid
        ['conditions'], // From saveResults
        ['differential_diagnoses'], // From saveResults (for delete then insert)
      ])
    );
    // More specific count for encounters as it's called multiple times
    const encounterFromCalls = supabaseSpies.from.mock.calls.filter((call: string[]) => call[0] === 'encounters');
    expect(encounterFromCalls.length).toBe(2);
    
    // Check calls to specific action methods
    expect(supabaseSpies.insert).toHaveBeenCalledTimes(2); // conditions, differential_diagnoses
    expect(supabaseSpies.update).toHaveBeenCalledTimes(2); // encounters (once in generateAdditionalFields, once in saveResults)
    expect(supabaseSpies.delete).toHaveBeenCalledTimes(1); // differential_diagnoses
    expect(supabaseSpies.select).toHaveBeenCalled();      // from getPatientUuid
    expect(supabaseSpies.single).toHaveBeenCalled();      // from getPatientUuid
    expect(supabaseSpies.eq).toHaveBeenCalled();          // Used with update, delete, and select().single()
  });

  it('should return fallback diagnosis if LLM calls fail to produce parsable content', async () => {
    mockOpenAICreateCompletion.mockResolvedValue({ choices: [{ message: { content: "This is not JSON" }}] });

    const result = await engine.runDiagnosticPipeline(
      'TEST_PATIENT_002',
      'TEST_PATIENT_002_TEST_ENC_002',
      'Patient has headache.'
    );
    
    expect(result.diagnosticResult.diagnosisName).toBe('Clinical evaluation pending');
    expect(result.diagnosticResult.confidence).toBe(0.5);
  });
});
