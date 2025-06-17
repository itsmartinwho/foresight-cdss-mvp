// AI Prompt Templates for Alert Generation
// Contains carefully crafted prompts for different types of medical alerts

import { AIPromptTemplate, AIFewShotExample } from '@/types/ai-models';
import { AlertType } from '@/types/alerts';

// Base system prompt for all alert types
const BASE_SYSTEM_PROMPT = `You are an expert medical AI assistant specializing in clinical decision support. Your role is to analyze patient data and consultation transcripts to generate high-confidence medical alerts for healthcare providers.

CRITICAL INSTRUCTIONS:
1. Only generate alerts when you have HIGH CONFIDENCE (≥{CONFIDENCE_THRESHOLD}) in the clinical relevance
2. Focus on actionable, specific recommendations that can improve patient care
3. Do not repeat alerts that have already been generated (listed in existing alerts)
4. For real-time processing ({IS_REAL_TIME}), focus on new information in the transcript segment
5. Always provide clear clinical reasoning for each alert

ALERT TYPES TO CONSIDER: {ALERT_TYPES}

OUTPUT FORMAT: You must respond with valid JSON only. Return a JSON object with an "alerts" array containing alert objects with this structure:
{
  "alerts": [
    {
      "type": "ALERT_TYPE",
      "severity": "INFO|WARNING|CRITICAL", 
      "title": "Brief descriptive title",
      "message": "Detailed alert message",
      "suggestion": "Specific recommended action",
      "confidence": 0.0-1.0,
      "reasoning": "Clinical justification for this alert",
      "relatedData": {},
      "navigationTarget": "UI route for one-click navigation (if applicable)",
      "proposedEdit": {}
    }
  ]
}

IMPORTANT: Return only valid JSON. Do not include any explanatory text outside of the JSON response.`;

// Drug Interaction Alert Template
export const DRUG_INTERACTION_TEMPLATE: AIPromptTemplate = {
  id: 'drug_interaction',
  name: 'Drug Interaction Detection',
  description: 'Detects potential drug-drug interactions and contraindications',
  alertTypes: [AlertType.DRUG_INTERACTION],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Analyze the patient's current medications and any new drugs mentioned in the transcript. Look for:
1. Drug-drug interactions (major, moderate, minor)
2. Drug-allergy interactions
3. Drug-condition contraindications
4. Dosing concerns based on patient factors
5. Therapeutic duplications

Focus on clinically significant interactions that require immediate attention or medication adjustments.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 65-year-old male with hypertension, diabetes\nCurrent Medications:\n- Lisinopril 10mg daily\n- Metformin 500mg BID\n- Simvastatin 20mg nightly",
        transcriptSegment: "I'm going to prescribe you Amiodarone for your irregular heartbeat.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "DRUG_INTERACTION",
            severity: "CRITICAL",
            title: "Simvastatin-Amiodarone Interaction",
            message: "Concurrent use of Simvastatin with Amiodarone significantly increases risk of myopathy and rhabdomyolysis. Amiodarone inhibits CYP3A4, increasing simvastatin levels up to 3-fold.",
            suggestion: "Consider switching to a lower-risk statin (pravastatin, rosuvastatin) or reducing simvastatin dose to ≤20mg daily if amiodarone is essential.",
            confidence: 0.95,
            reasoning: "This is a well-documented, severe drug interaction with established clinical significance and clear management guidelines."
          }
        ]
      }
    }
  ],
  requiredContext: ['currentMedications', 'allergies', 'conditions'],
  outputFormat: 'json',
  confidenceThreshold: 0.8
};

// Comorbidity Detection Template
export const COMORBIDITY_TEMPLATE: AIPromptTemplate = {
  id: 'comorbidity_detection',
  name: 'Comorbidity Detection',
  description: 'Identifies potential undiagnosed comorbidities based on symptoms and patient history',
  alertTypes: [AlertType.COMORBIDITY],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Analyze the patient's symptoms, medical history, and current presentation for potential undiagnosed comorbidities. Consider:
1. Common comorbidities associated with existing conditions
2. Symptom clusters suggesting additional diagnoses
3. Risk factors that warrant screening
4. Medication side effects vs. new conditions
5. Age and demographic-appropriate screening needs

Focus on actionable findings that could significantly impact patient care.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 55-year-old female with Type 2 diabetes, BMI 32\nSymptoms: Fatigue, joint stiffness, difficulty sleeping\nLab Results: HbA1c 8.2%, Fasting glucose 180 mg/dL",
        transcriptSegment: "The morning stiffness in my hands and feet lasts about 2 hours. It's worst when I wake up and gets better as I move around.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "COMORBIDITY",
            severity: "WARNING",
            title: "Possible Rheumatoid Arthritis",
            message: "Morning stiffness lasting >1 hour in multiple joints suggests inflammatory arthritis, particularly rheumatoid arthritis. This is more common in patients with diabetes and can significantly impact quality of life if untreated.",
            suggestion: "Order rheumatoid factor (RF), anti-CCP antibodies, ESR, and CRP. Consider rheumatology referral if inflammatory markers are elevated.",
            confidence: 0.85,
            reasoning: "Prolonged morning stiffness (>1 hour) in multiple joints is a classic presentation of inflammatory arthritis, with strong specificity for rheumatoid arthritis."
          }
        ]
      }
    }
  ],
  requiredContext: ['conditions', 'symptoms', 'demographics', 'familyHistory'],
  outputFormat: 'json',
  confidenceThreshold: 0.75
};

// Assessment Questions Template
export const ASSESSMENT_QUESTIONS_TEMPLATE: AIPromptTemplate = {
  id: 'assessment_questions',
  name: 'Missing Assessment Questions',
  description: 'Suggests important clinical questions that should be asked but haven\'t been addressed',
  alertTypes: [AlertType.ASSESSMENT_QUESTION],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Review the consultation transcript and identify important clinical questions that should be asked but haven't been addressed. Consider:
1. Standard history elements for the presenting complaint
2. Review of systems relevant to the chief concern
3. Social history factors affecting health
4. Medication compliance and side effects
5. Red flag symptoms that need to be ruled out
6. Screening questions appropriate for patient demographics

Focus on questions that could significantly impact diagnosis or treatment decisions.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 45-year-old male\nChief Complaint: Chest pain\nVitals: BP 140/90, HR 85, normal",
        transcriptSegment: "The chest pain started yesterday. It's a sharp pain that comes and goes. Gets worse when I breathe deeply.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "ASSESSMENT_QUESTION",
            severity: "WARNING",
            title: "Cardiac Risk Assessment Incomplete",
            message: "For chest pain evaluation in a 45-year-old male, important cardiac risk factors haven't been assessed. Family history of early cardiac disease, smoking status, and exertional component are critical for risk stratification.",
            suggestion: "Ask about: 1) Family history of heart disease <60 years, 2) Smoking history, 3) Does pain occur with exertion or at rest? 4) Any associated symptoms (nausea, sweating, arm pain)?",
            confidence: 0.9,
            reasoning: "Chest pain in middle-aged males requires systematic cardiac risk assessment. Missing key risk factors could lead to inappropriate disposition decisions."
          }
        ]
      }
    }
  ],
  requiredContext: ['chiefComplaint', 'demographics', 'transcript'],
  outputFormat: 'json',
  confidenceThreshold: 0.8
};

// Diagnostic Gap Analysis Template
export const DIAGNOSTIC_GAP_TEMPLATE: AIPromptTemplate = {
  id: 'diagnostic_gaps',
  name: 'Diagnostic Gap Analysis',
  description: 'Identifies gaps or inconsistencies in diagnostic reasoning and treatment plans',
  alertTypes: [AlertType.DIAGNOSTIC_GAP],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Analyze the diagnostic reasoning and treatment plan for potential gaps or inconsistencies. Look for:
1. Symptoms that don't fit the proposed diagnosis
2. Missing differential diagnoses that should be considered
3. Inadequate workup for the suspected condition
4. Treatment plans that don't address all identified problems
5. Inconsistencies between clinical findings and conclusions
6. Red flag symptoms that warrant immediate attention

Focus on clinically significant gaps that could impact patient safety or outcomes.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 28-year-old female\nPresenting: Fatigue, weight loss 15 lbs over 2 months\nVitals: Temp 99.8°F, HR 110, BP 110/70",
        transcriptSegment: "Based on your symptoms, this sounds like stress and poor sleep. I'll prescribe a sleep aid and recommend stress management.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "DIAGNOSTIC_GAP",
            severity: "CRITICAL",
            title: "Unintentional Weight Loss Inadequately Evaluated",
            message: "Unintentional weight loss of 15 lbs in 2 months with low-grade fever and tachycardia requires systematic evaluation. Attributing this to stress without ruling out serious organic causes (malignancy, hyperthyroidism, infection) could delay critical diagnoses.",
            suggestion: "Order: CBC with differential, comprehensive metabolic panel, TSH, ESR/CRP. Consider chest X-ray. Reassess in 1-2 weeks rather than treating symptomatically.",
            confidence: 0.92,
            reasoning: "Unintentional weight loss >5% body weight warrants systematic evaluation. The combination with fever and tachycardia raises concern for serious underlying pathology."
          }
        ]
      }
    }
  ],
  requiredContext: ['symptoms', 'physicalExam', 'assessmentPlan', 'vitals'],
  outputFormat: 'json',
  confidenceThreshold: 0.8
};

// Complex Condition Alert Template
export const COMPLEX_CONDITION_TEMPLATE: AIPromptTemplate = {
  id: 'complex_conditions',
  name: 'Complex Condition Detection',
  description: 'Identifies patterns suggesting complex conditions requiring specialist care',
  alertTypes: [AlertType.COMPLEX_CONDITION],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Analyze the patient presentation for patterns suggesting complex conditions that may require specialist evaluation. Consider:
1. Autoimmune/rheumatologic conditions (systemic lupus, rheumatoid arthritis, vasculitis)
2. Oncologic concerns (unexplained weight loss, night sweats, masses)
3. Rare diseases with characteristic presentations
4. Multi-system involvement suggesting systemic disease
5. Treatment-resistant conditions
6. Red flag symptoms requiring urgent specialist care

Focus on pattern recognition that could lead to earlier diagnosis of serious conditions.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 32-year-old female\nSymptoms: Joint pain, fatigue, rash on face\nLab Results: ANA positive, low complement levels",
        transcriptSegment: "The rash gets worse in the sun. I've also been having mouth sores and my joints hurt, especially my hands and knees. The fatigue is overwhelming.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "COMPLEX_CONDITION",
            severity: "WARNING",
            title: "Possible Systemic Lupus Erythematosus",
            message: "Combination of photosensitive facial rash, oral ulcers, arthritis, fatigue, positive ANA, and low complement levels strongly suggests systemic lupus erythematosus. This requires prompt rheumatology evaluation and appropriate monitoring.",
            suggestion: "Urgent rheumatology referral (within 2-4 weeks). Order anti-dsDNA, anti-Sm antibodies, complete urinalysis with microscopy, and monitor for renal involvement.",
            confidence: 0.88,
            reasoning: "Patient meets multiple SLE criteria (malar rash, oral ulcers, arthritis, positive ANA, low complement). Early diagnosis and treatment are crucial for preventing organ damage."
          }
        ]
      }
    }
  ],
  requiredContext: ['symptoms', 'labResults', 'physicalExam', 'systemsReview'],
  outputFormat: 'json',
  confidenceThreshold: 0.75
};

// Missing Lab Results Template
export const MISSING_LAB_TEMPLATE: AIPromptTemplate = {
  id: 'missing_labs',
  name: 'Missing Laboratory Tests',
  description: 'Suggests important laboratory tests that should be ordered based on clinical context',
  alertTypes: [AlertType.MISSING_LAB_RESULT],
  systemPrompt: BASE_SYSTEM_PROMPT,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

CONSULTATION TRANSCRIPT:
{TRANSCRIPT}

EXISTING ALERTS:
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Review the clinical presentation and identify important laboratory tests that should be ordered. Consider:
1. Diagnostic workup for presenting symptoms
2. Monitoring tests for chronic conditions
3. Screening tests appropriate for patient demographics
4. Safety monitoring for medications
5. Follow-up tests for abnormal previous results
6. Pre-treatment baseline tests

Focus on tests that are clinically indicated and could significantly impact management.`,
  fewShotExamples: [
    {
      input: {
        patientContext: "Patient: 60-year-old male with diabetes, hypertension\nMedications: Metformin, Lisinopril\nLast HbA1c: 8.5% (6 months ago)",
        transcriptSegment: "My diabetes has been hard to control lately. I'm more tired than usual.",
        existingAlerts: []
      },
      output: {
        alerts: [
          {
            type: "MISSING_LAB_RESULT",
            severity: "INFO",
            title: "Diabetes Monitoring Labs Due",
            message: "For poorly controlled diabetes (last HbA1c 8.5%), current monitoring labs are needed to assess glycemic control and screen for complications. Patient reports increased fatigue, which could indicate worsening hyperglycemia or diabetic complications.",
            suggestion: "Order: HbA1c, comprehensive metabolic panel (kidney function), lipid panel, microalbumin/creatinine ratio. Consider adding vitamin B12 level given metformin use.",
            confidence: 0.9,
            reasoning: "ADA guidelines recommend HbA1c every 3-6 months for poorly controlled diabetes. Annual screening for diabetic complications is also due."
          }
        ]
      }
    }
  ],
  requiredContext: ['conditions', 'medications', 'labResults', 'symptoms'],
  outputFormat: 'json',
  confidenceThreshold: 0.8
};

// Combined real-time template
export const REAL_TIME_ALERTS_TEMPLATE: AIPromptTemplate = {
  id: 'real_time_combined',
  name: 'Real-time Alert Detection',
  description: 'Combined template for real-time processing of all alert types',
  alertTypes: [
    AlertType.DRUG_INTERACTION,
    AlertType.COMORBIDITY,
    AlertType.ASSESSMENT_QUESTION,
    AlertType.DIAGNOSTIC_GAP,
    AlertType.COMPLEX_CONDITION,
    AlertType.MISSING_LAB_RESULT
  ],
  systemPrompt: BASE_SYSTEM_PROMPT + `

REAL-TIME PROCESSING NOTES:
- Focus on the new transcript segment while considering full context
- Prioritize immediate safety concerns and actionable alerts
- Avoid overwhelming the clinician with too many simultaneous alerts
- Maximum 3 alerts per processing cycle unless critical safety issues identified`,
  userPromptTemplate: `
PATIENT CONTEXT:
{PATIENT_CONTEXT}

FULL TRANSCRIPT (for context):
{TRANSCRIPT}

EXISTING ALERTS (do not repeat):
{EXISTING_ALERTS}

ADDITIONAL CONTEXT:
{CONSULTATION_CONTEXT}

Analyze the transcript for immediate clinical alerts while considering the full patient context. Focus on actionable items that could improve patient care or safety.`,
  requiredContext: ['patientData', 'transcript', 'existingAlerts'],
  outputFormat: 'json',
  confidenceThreshold: 0.8
};

// Template registry
export const PROMPT_TEMPLATES: Record<string, AIPromptTemplate> = {
  [DRUG_INTERACTION_TEMPLATE.id]: DRUG_INTERACTION_TEMPLATE,
  [COMORBIDITY_TEMPLATE.id]: COMORBIDITY_TEMPLATE,
  [ASSESSMENT_QUESTIONS_TEMPLATE.id]: ASSESSMENT_QUESTIONS_TEMPLATE,
  [DIAGNOSTIC_GAP_TEMPLATE.id]: DIAGNOSTIC_GAP_TEMPLATE,
  [COMPLEX_CONDITION_TEMPLATE.id]: COMPLEX_CONDITION_TEMPLATE,
  [MISSING_LAB_TEMPLATE.id]: MISSING_LAB_TEMPLATE,
  [REAL_TIME_ALERTS_TEMPLATE.id]: REAL_TIME_ALERTS_TEMPLATE
};

// Utility functions
export function getTemplateForAlertType(alertType: AlertType): AIPromptTemplate {
  switch (alertType) {
    case AlertType.DRUG_INTERACTION:
      return DRUG_INTERACTION_TEMPLATE;
    case AlertType.COMORBIDITY:
      return COMORBIDITY_TEMPLATE;
    case AlertType.ASSESSMENT_QUESTION:
      return ASSESSMENT_QUESTIONS_TEMPLATE;
    case AlertType.DIAGNOSTIC_GAP:
      return DIAGNOSTIC_GAP_TEMPLATE;
    case AlertType.COMPLEX_CONDITION:
      return COMPLEX_CONDITION_TEMPLATE;
    case AlertType.MISSING_LAB_RESULT:
      return MISSING_LAB_TEMPLATE;
    default:
      return REAL_TIME_ALERTS_TEMPLATE;
  }
}

export function getTemplateById(id: string): AIPromptTemplate | undefined {
  return PROMPT_TEMPLATES[id];
}

export function getRealTimeTemplate(): AIPromptTemplate {
  return REAL_TIME_ALERTS_TEMPLATE;
} 