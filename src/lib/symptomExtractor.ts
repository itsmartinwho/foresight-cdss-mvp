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
   * Extract and store symptoms in the visit record
   * @param visitId The visit/encounter ID
   * @param transcript The consultation transcript
   * @returns The extracted symptoms
   */
  static async extractAndStore(
    visitId: string,
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