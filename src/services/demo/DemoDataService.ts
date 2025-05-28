// Demo Data Service - Contains all demo-specific data and logic
import { Patient, ComplexCaseAlert } from '@/lib/types';

export interface DemoTreatmentData {
  drug: string;
  status: string;
  rationale: string;
}

export interface DemoDiagnosisData {
  patientId: string;
  encounterId: string;
  code: string;
  description: string;
}

export interface DemoEncounterData {
  id: string;
  patientId: string;
  encounterIdentifier: string;
  actualStart: string;
  actualEnd: string;
  reasonCode: string;
  reasonDisplayText: string;
  transcript: string;
  soapNote: string; 
  treatments: DemoTreatmentData[];
  diagnosis: DemoDiagnosisData;
}

export const DEMO_PATIENT_ID = "0681FA35-A794-4684-97BD-00B88370DB41";
export const DEMO_ENCOUNTER_ID = "097bf62e-9bd9-4972-a972-2714038ff55e";

// Dorothy Robinson demo patient data
const dorothyRobinsonPatientData: Patient = {
  id: DEMO_PATIENT_ID,
  name: "Dorothy Robinson",
  firstName: "Dorothy",
  lastName: "Robinson",
  gender: "female",
  dateOfBirth: "1978-04-15",
  photo: "/images/demo-patient-dorothy.jpg",
  race: "White",
  ethnicity: "Not Hispanic or Latino",
  maritalStatus: "Married",
  language: "English",
  povertyPercentage: 15,
  alerts: [
    {
      id: "demo-alert-1",
      patientId: DEMO_PATIENT_ID,
      msg: "Patient has a history of chronic lower back pain with episodes of inflammation.",
      date: "2024-01-15",
      type: "inflammatory",
      severity: "medium",
      triggeringFactors: ["Previous gastroenteritis", "HLA-B27 positive"],
      suggestedActions: ["Monitor inflammatory markers", "Consider rheumatology follow-up"],
      createdAt: "2024-01-15T09:00:00Z",
      confidence: 85,
      likelihood: 3,
      conditionType: "Reactive Arthritis"
    },
    {
      id: "demo-alert-2", 
      patientId: DEMO_PATIENT_ID,
      msg: "Monitor for GI side effects with current NSAID therapy.",
      date: "2024-01-20",
      type: "inflammatory",
      severity: "low",
      triggeringFactors: ["Long-term NSAID use"],
      suggestedActions: ["Monitor for GI symptoms", "Consider gastroprotection"],
      createdAt: "2024-01-20T14:30:00Z",
      confidence: 70,
      likelihood: 2,
      conditionType: "NSAID-related GI risk"
    }
  ] as ComplexCaseAlert[],
  nextAppointment: "2024-03-01T10:00:00Z",
  reason: "Follow-up for reactive arthritis management"
};

const dorothyRobinsonEncounterJSON: Omit<DemoEncounterData, 'diagnosis'> = {
  id: DEMO_ENCOUNTER_ID,
  patientId: DEMO_PATIENT_ID,
  encounterIdentifier: "2",
  actualStart: "2010-11-06T11:41:58Z",
  actualEnd: "2010-11-21T17:39:59Z",
  reasonCode: "Reactive arthritis (Reiter's)",
  reasonDisplayText: "Reiter's disease, vertebrae",
  transcript: "Clinician: Hi Dorothy, I understand you've been having back pain and some other symptoms. Can you tell me more about them?\nDorothy: Yes, for the past few weeks my lower back has been very stiff and painful, especially in the mornings. I've also had pain in my heels when I walk, and my eyes have been red and irritated.\nClinician: That's interesting. Did you notice any rash or any urinary symptoms, like pain when you urinate?\nDorothy: I haven't noticed a rash. I did have some burning when I urinate, on and off, but I wasn't sure if it was important.\nClinician: Any recent infections or illnesses before these symptoms started? Sometimes a stomach bug or other infection can trigger these kinds of symptoms.\nDorothy: Actually, yes – I had a really bad stomach flu about a month ago. It lasted a few days and I felt better, but then a couple weeks later this all started.\nClinician: Thank you. This combination of joint pain, heel pain, eye redness, and recent infection makes me suspect something called Reiter's syndrome, or reactive arthritis. It's an arthritis that can happen after an infection. Let's do a physical exam and some tests.\n[**Exam:** Tenderness over the lower back (sacroiliac joints) and heels (Achilles tendon areas). Slight swelling of the right knee. Redness in both eyes consistent with conjunctivitis.]\nClinician: On exam, you have some inflammation in your lower back and right knee, and your eyes are indeed red. I'm going to order some blood tests to check for inflammation and a genetic marker called HLA-B27, which is often positive in reactive arthritis. In the meantime, we'll start treatment to help with your pain.\nDorothy: Okay, thank you, doctor.\n",
  soapNote: "S: 32-year-old female with 3-week history of inflammatory low back pain (worse in the morning, improving with activity), plus bilateral heel pain and episodes of eye redness. Also had dysuria intermittently. Notable gastrointestinal illness ~1 month ago.\nO: Exam reveals tenderness at sacroiliac joints and Achilles tendon insertions, restricted lumbar flexion (positive Schober's test), and mild effusion of the right knee. Bilateral conjunctivitis present. Labs: ESR 40 mm/hr (elevated), HLA-B27 positive.\nA: Reactive Arthritis (Reiter's syndrome) triggered by recent infection (likely gastrointestinal). Differential diagnoses considered: ankylosing spondylitis (less likely given acute onset and GI trigger), rheumatoid arthritis (unlikely due to involvement of spine and enthesitis).\nP: Start NSAID therapy (Indomethacin 50 mg TID) for pain and inflammation. Monitor symptoms. If no improvement in 1-2 months or disease becomes chronic, initiate Sulfasalazine. Advise rest and stretching exercises. Ophthalmology consult for eye inflammation. Follow-up in 2 weeks.",
  treatments: [
    { drug: "Indomethacin 50 mg TID", status: "Prescribed", rationale: "NSAID for inflammation and pain relief in reactive arthritis." },
    { drug: "Sulfasalazine (start if no improvement in 1-2 months)", status: "Planned", rationale: "DMARD to help manage chronic reactive arthritis if initial NSAID therapy is insufficient." }
  ]
};

const dorothyRobinsonDiagnosisJSON: DemoDiagnosisData = {
  patientId: DEMO_PATIENT_ID,
  encounterId: DEMO_ENCOUNTER_ID,
  code: "M02.9",
  description: "Reactive arthritis (Reiter's syndrome)"
};

export const demoEncounterData: DemoEncounterData = {
  ...dorothyRobinsonEncounterJSON,
  diagnosis: dorothyRobinsonDiagnosisJSON,
};

export class DemoDataService {
  static getPatientData(): Patient {
    return dorothyRobinsonPatientData;
  }

  static getEncounterData(): DemoEncounterData {
    return demoEncounterData;
  }

  static getDiagnosisText(): string {
    return demoEncounterData.diagnosis.description || "Diagnosis information not available for demo.";
  }

  static getTreatmentPlanText(): string {
    if (Array.isArray(demoEncounterData.treatments) && demoEncounterData.treatments.length > 0) {
      return demoEncounterData.treatments
        .map(t => `${t.drug} (${t.status}): ${t.rationale}`)
        .join('\n');
    }
    return "Treatment information not available for demo.";
  }

  static getTranscriptLines(): string[] {
    if (demoEncounterData.transcript && typeof demoEncounterData.transcript === 'string' && demoEncounterData.transcript.trim() !== '') {
      return demoEncounterData.transcript.split('\n').filter(line => line.trim() !== '');
    }
    console.warn("Demo transcript is missing or empty. Returning empty array.");
    return [];
  }
} 