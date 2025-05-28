/**
 * @deprecated This symptom extractor is deprecated.
 * 
 * This implementation uses basic keyword matching which is insufficient for clinical use.
 * ClinicalEngineServiceV3 now uses GPT-based transcript analysis for symptom extraction
 * as part of its comprehensive clinical reasoning process.
 * 
 * The new approach provides:
 * - Context-aware symptom understanding
 * - Recognition of symptom negations and qualifiers
 * - Integration with overall clinical reasoning
 * 
 * Migration: Use ClinicalEngineServiceV3 for all clinical reasoning including symptom analysis
 */

/**
 * SymptomExtractor - Extracts symptoms and clinical observations from consultation transcripts
 * This is a simple keyword-based implementation for MVP
 */
export class SymptomExtractor {
  // Common symptoms and their variations
  private static readonly symptomKeywords: Record<string, string[]> = {
    'headache': ['headache', 'head pain', 'migraine', 'cephalalgia'],
    'fever': ['fever', 'febrile', 'temperature', 'pyrexia', 'chills'],
    'fatigue': ['fatigue', 'tired', 'exhausted', 'weakness', 'lethargy'],
    'joint pain': ['joint pain', 'arthralgia', 'joint ache', 'joint stiffness'],
    'cough': ['cough', 'coughing', 'productive cough', 'dry cough'],
    'nausea': ['nausea', 'nauseous', 'queasy', 'sick to stomach'],
    'vomiting': ['vomiting', 'vomit', 'throwing up', 'emesis'],
    'diarrhea': ['diarrhea', 'loose stools', 'watery stools'],
    'constipation': ['constipation', 'constipated', 'hard stools', 'difficulty passing stool'],
    'abdominal pain': ['abdominal pain', 'stomach pain', 'belly pain', 'stomach ache'],
    'chest pain': ['chest pain', 'chest discomfort', 'chest tightness', 'angina'],
    'shortness of breath': ['shortness of breath', 'dyspnea', 'difficulty breathing', 'breathless'],
    'dizziness': ['dizziness', 'dizzy', 'lightheaded', 'vertigo'],
    'rash': ['rash', 'skin lesion', 'eruption', 'dermatitis'],
    'weight loss': ['weight loss', 'losing weight', 'weight decrease'],
    'weight gain': ['weight gain', 'gaining weight', 'weight increase'],
    'blurred vision': ['blurred vision', 'vision problems', 'visual disturbance'],
    'sore throat': ['sore throat', 'throat pain', 'pharyngitis'],
    'muscle pain': ['muscle pain', 'myalgia', 'muscle ache'],
    'back pain': ['back pain', 'backache', 'lumbar pain'],
    'anxiety': ['anxiety', 'anxious', 'worried', 'nervous'],
    'depression': ['depression', 'depressed', 'sad', 'low mood'],
    'insomnia': ['insomnia', 'trouble sleeping', 'cant sleep', 'sleep problems']
  };

  /**
   * Extract symptoms from a transcript using keyword matching
   * @param transcript The consultation transcript
   * @returns Array of identified symptoms
   */
  static extract(transcript: string): string[] {
    if (!transcript || transcript.trim().length === 0) {
      return [];
    }

    const normalizedTranscript = transcript.toLowerCase();
    const foundSymptoms = new Set<string>();

    // Check for each symptom category
    for (const [symptom, keywords] of Object.entries(this.symptomKeywords)) {
      for (const keyword of keywords) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
        if (regex.test(normalizedTranscript)) {
          foundSymptoms.add(symptom);
          break; // Found this symptom, no need to check other keywords
        }
      }
    }

    // If no specific symptoms found but transcript is substantial, add general observation
    if (foundSymptoms.size === 0 && normalizedTranscript.length > 50) {
      foundSymptoms.add('general malaise');
    }

    return Array.from(foundSymptoms);
  }

  /**
   * Extract and store symptoms in the encounter record
   * @param encounterId The encounter ID
   * @param transcript The consultation transcript
   * @returns The extracted symptoms
   */
  static async extractAndStore(
    encounterId: string,
    transcript: string
  ): Promise<string[]> {
    const symptoms = this.extract(transcript);
    
    // Store in extra_data for record-keeping
    // Note: This would need to be implemented in supabaseDataService
    // For now, we just return the symptoms
    
    return symptoms;
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enhanced extraction with context awareness (future enhancement)
   * This could use more sophisticated NLP or LLM-based extraction
   */
  static async extractWithContext(
    transcript: string,
    patientHistory?: any
  ): Promise<{
    symptoms: string[];
    duration?: string;
    severity?: string;
    context?: string;
  }> {
    // For MVP, just use basic extraction
    const symptoms = this.extract(transcript);
    
    // Future: Extract duration, severity, and context using more advanced NLP
    return {
      symptoms,
      duration: undefined,
      severity: undefined,
      context: undefined
    };
  }
}

const basicSymptoms = ["fever", "cough", "headache"];

/**
 * Placeholder for symptom extraction logic.
 * In a real system, this would involve NLP or other advanced techniques.
 * For MVP, it might involve keyword spotting or simple pattern matching.
 * 
 * TODO:
 * - Implement actual symptom extraction logic based on project requirements.
 * - Consider using an external NLP service or library.
 * - For MVP, a basic keyword spotter might suffice.
 * - Integrate with the main data service to update the encounter record.
 */
export const extractSymptomsForPatient = (
  consultationText: string,
  knownSymptoms: string[] = basicSymptoms
): string[] => {
  // Implementation of extractSymptomsForPatient function
  return [];
};

// Example of a more complex function that might be part of the clinical engine
/**
 * Hypothetical function to process a consultation, extract symptoms, and update records.
 * This is a conceptual placeholder.
 *
 * @param consultationText The full text of the consultation.
 * @param patientId The ID of the patient.
 * @param encounterId The encounter ID to associate symptoms with.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function processConsultationAndExtractSymptoms(
  consultationText: string,
  patientId: string, 
  encounterId: string,
): Promise<boolean> {
  console.log(`Processing consultation for patient ${patientId}, encounter ${encounterId}...`);

  // Step 1: Extract symptoms
  const extractedSymptoms = SymptomExtractor.extract(consultationText);
  console.log("Extracted Symptoms:", extractedSymptoms);

  if (extractedSymptoms.length === 0) {
    console.log("No symptoms extracted.");
    return false;
  }

  // Step 2: Store symptoms (conceptual - requires data service integration)
  // This is where you would call a function like: 
  // await supabaseDataService.updateEncounterSymptoms(patientId, encounterId, extractedSymptoms);
  // For now, just logging.
  console.log(`Symptoms [${extractedSymptoms.join(", ")}] would be stored for patient ${patientId}, encounter ${encounterId}.`);
  
  // Placeholder for actual storage logic
  // This might involve updating an 'observations' field in the 'encounters' table
  // or creating new records in a dedicated 'symptoms' or 'observations' table.

  // Example: Update encounter with observations (if your service supports this)
  /*
  try {
    // Assuming encounterId is the Supabase UUID of the encounter
    // The actual parameters for updateEncounterObservations would depend on its definition in supabaseDataService
    // await supabaseDataService.updateEncounterObservations(patientId, encounterId, extractedSymptoms); 
    console.log('Successfully updated encounter observations.');
    return true;
  } catch (error) {
    console.error('Failed to update encounter observations:', error);
    return false;
  }
  */
  return true; // Placeholder success
}

// Functions related to the "Tool A" AI Advisor might also use symptom lists.
// For example, to pre-populate a query or provide context.

/**
 * Mock function to simulate extracting symptoms from a consultation transcript
 * and preparing them for use with an AI advisor.
 *
 * @param transcript The consultation transcript.
 * @param encounterId The encounter ID (for logging/context).
 * @returns {string[]} A list of extracted symptom keywords.
 */
export function getSymptomsForAIAdvisor(transcript: string, encounterId: string): string[] {
  if (!transcript) return [];

  // Use the same basic extraction logic for now
  const symptoms = SymptomExtractor.extract(transcript);
  
  console.log(`Symptoms extracted for AI Advisor (encounter ${encounterId}): ${symptoms.join(", ")}`);
  return symptoms;
}

/**
 * TODO: Placeholder for fetching symptoms associated with a specific encounter.
 * This would typically query a database table where symptoms are stored per encounter.
 * 
 * @param encounterId The ID of the encounter.
 * @returns {Promise<string[]>} A list of symptoms for the encounter.
 */
export async function getSymptomsForEncounter(encounterId: string): Promise<string[]> {
  // In a real implementation, this would fetch from Supabase or another data source.
  // Example: 
  // const { data, error } = await supabase
  //   .from('encounter_symptoms') // or 'observations' table
  //   .select('symptom_description')
  //   .eq('encounter_id', encounterId);
  // if (error) throw error;
  // return data.map(item => item.symptom_description);

  console.warn(`getSymptomsForEncounter is a placeholder and not fetching real data for encounter ${encounterId}.`);
  // Return some mock data based on encounterId for now
  if (encounterId.includes("cough")) return ["cough", "fever"];
  if (encounterId.includes("pain")) return ["joint pain", "headache"];
  return ["fatigue"]; 
} 