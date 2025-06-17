// Demo Data Service - Contains all demo-specific data and logic
import { Patient, ComplexCaseAlert, SoapNote } from '@/lib/types';

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
export const DEMO_ENCOUNTER_ID = "cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8";

// Dorothy Robinson demo patient data - Updated with real enriched data
const dorothyRobinsonPatientData: Patient = {
  id: DEMO_PATIENT_ID,
  name: "Dorothy Robinson",
  firstName: "Dorothy",
  lastName: "Robinson",
  gender: "female",
  dateOfBirth: "1978-10-02",
  photo: "https://ui-avatars.com/api/?name=DR&background=D0F0C0&color=ffffff&size=60&rounded=true",
  race: "White",
  ethnicity: "Hispanic or Latino",
  maritalStatus: "Unknown",
  language: "Spanish",
  povertyPercentage: 19.16,
  alerts: [
    {
      id: "0681FA35-A794-4684-97BD-00B88370DB41_malignancy_history",
      patientId: DEMO_PATIENT_ID,
      msg: "History of acute myelomonocytic leukemia in complete remission; higher risk of secondary malignancies and infection.",
      date: "2025-01-15",
      type: "oncology",
      severity: "moderate",
      triggeringFactors: ["Previous AML", "Immunocompromised history"],
      suggestedActions: ["Monitor for infection signs", "Regular oncology follow-up"],
      createdAt: "2025-01-15T09:00:00Z",
      confidence: 95,
      likelihood: 4,
      conditionType: "Cancer History"
    }
  ] as ComplexCaseAlert[],
  nextAppointment: "2025-07-01T10:00:00Z",
  reason: "Oncology follow-up and general health maintenance"
};

// Most recent encounter data from database (May 17, 2025 - Constipation case)
const dorothyRobinsonEncounterJSON: Omit<DemoEncounterData, 'diagnosis'> = {
  id: DEMO_ENCOUNTER_ID,
  patientId: DEMO_PATIENT_ID,
  encounterIdentifier: "ENC-0681FA35-A794-4684-97BD-00B88370DB41-003",
  actualStart: "2025-05-17T14:11:57.063Z",
  actualEnd: "2025-05-17T14:56:57.063Z",
  reasonCode: "E11.9",
  reasonDisplayText: "Type 2 diabetes mellitus without complications",
  transcript: `Dr. Chen: Good afternoon, Ms. Robinson. I'm Dr. Chen. I see you're here for your diabetes follow-up. How have you been feeling lately?

Patient: Hi doctor. I've been having some issues. My blood sugars have been all over the place, and I've been getting these dizzy spells, especially when I stand up.

Dr. Chen: I see. Tell me about your current medications. What are you taking for your diabetes?

Patient: Well, I'm taking metformin 1000mg twice a day, and my family doctor just started me on glyburide about three weeks ago. Oh, and I'm also taking warfarin because I had that blood clot last year.

Dr. Chen: Warfarin and glyburide together - that's something we need to be careful about. Have you noticed any unusual bleeding or bruising?

Patient: Actually, yes. I had a nosebleed yesterday that took forever to stop, and I've been bruising really easily. Is that related?

Dr. Chen: It could be. When was your last INR check for the warfarin?

Patient: Um, I think it was about two months ago? My primary care doctor said it was fine then.

Dr. Chen: And when was your last hemoglobin A1C and comprehensive metabolic panel?

Patient: I'm not sure what that is. I haven't had any blood work in probably four months.

Dr. Chen: Okay, we definitely need to get some labs today. With your diabetes and being on warfarin, we need to monitor things more closely. Tell me about your symptoms - the dizziness, when does it happen?

Patient: Mostly when I get up from sitting or lying down. Sometimes I feel like I might faint. And I've been really thirsty lately and urinating a lot more than usual.

Dr. Chen: Those symptoms suggest your blood sugar might not be well controlled. Are you checking your blood sugar at home?

Patient: I was, but my meter broke last month and I haven't gotten a new one yet.

Dr. Chen: Let me check your vital signs. Your blood pressure today is 95/60, which is lower than normal. Heart rate is 88. Let me examine you.

[Physical Examination]
General: Alert but appears mildly dehydrated
HEENT: Dry mucous membranes noted
Cardiovascular: Regular rate and rhythm, no murmurs
Extremities: Multiple small bruises on both arms, no peripheral edema
Neurologic: Positive orthostatic changes - blood pressure drops to 85/55 when standing

Dr. Chen: Ms. Robinson, I'm concerned about several things. First, the combination of glyburide and warfarin can increase your bleeding risk significantly. Second, your symptoms and examination suggest your diabetes may not be well controlled, and you might be dehydrated.

Patient: Oh no, is that dangerous?

Dr. Chen: We can manage this, but we need to make some changes. I'm going to order some urgent lab work - we need to check your blood sugar, kidney function, hemoglobin A1C, and your INR to see how thin your blood is.

Patient: Okay, whatever you think is best.

Dr. Chen: I'm also going to hold your glyburide for now and switch you to a different diabetes medication that's safer with warfarin. We'll need to coordinate with your primary care doctor about your warfarin dosing.

Patient: Will I be okay? I'm worried about my cancer history too - I had leukemia a few years ago.

Dr. Chen: Your leukemia history is important to consider, especially with the bleeding issues. We'll need to be extra careful with your blood counts. I'm going to admit you for observation so we can stabilize your blood sugar, adjust your medications safely, and get your bleeding risk under control.

Patient: I understand. Thank you for taking good care of me.

Dr. Chen: Of course. The nurse will get your lab work started, and I'll be back to discuss the results and our plan once we have them.`,
  soapNote: `S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent nosebleed and multiple bruises. Last INR check 2 months ago, no recent diabetes monitoring labs. Broken glucometer, not checking blood sugars at home.

O: Vital signs: BP 95/60 (orthostatic to 85/55), HR 88, Temp 98.6°F, RR 16. General: Alert, mildly dehydrated appearance. HEENT: Dry mucous membranes. CVS: RRR, no murmurs. Extremities: Multiple small bruises on bilateral arms, no edema. Neurologic: Positive orthostatic vital signs.

A:
1. E11.9 Type 2 diabetes mellitus, poorly controlled - based on polyuria, polydipsia, and lack of monitoring
2. Drug interaction risk: Glyburide + Warfarin - increased bleeding risk
3. Z87.891 Personal history of nicotine dependence (leukemia)
4. Orthostatic hypotension, likely multifactorial (dehydration, medications)
5. Supratherapeutic anticoagulation suspected - easy bruising, nosebleed

P:
• STAT labs: BMP, HbA1c, PT/INR, CBC with diff
• Hold glyburide immediately due to drug interaction with warfarin
• Admit for observation and medication adjustment
• IV hydration with NS at 100 mL/hr
• Fingerstick glucose q6h
• Coordinate with primary care for warfarin management
• Endocrine consult for diabetes management
• New glucometer and diabetes education before discharge`,
  treatments: [
    { 
      drug: "Discontinue glyburide immediately", 
      status: "Discontinued", 
      rationale: "High risk drug interaction with warfarin causing increased bleeding risk" 
    },
    { 
      drug: "Continue metformin 1000mg twice daily", 
      status: "Continued", 
      rationale: "Well-tolerated first-line diabetes medication, safer with anticoagulation" 
    },
    { 
      drug: "Start insulin glargine 10 units subcutaneous daily", 
      status: "New prescription", 
      rationale: "Long-acting insulin for better glucose control without warfarin interaction" 
    },
    { 
      drug: "Normal saline IV at 100 mL/hour", 
      status: "Inpatient", 
      rationale: "Correct dehydration and orthostatic hypotension" 
    },
    { 
      drug: "Hold warfarin pending INR results", 
      status: "Held temporarily", 
      rationale: "Evaluate current anticoagulation level due to bleeding symptoms" 
    }
  ]
};

const dorothyRobinsonDiagnosisJSON: DemoDiagnosisData = {
  patientId: DEMO_PATIENT_ID,
  encounterId: DEMO_ENCOUNTER_ID,
  code: "E11.9",
  description: "Type 2 diabetes mellitus without complications, currently poorly controlled with drug interaction requiring medication adjustment and monitoring"
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
        .join('\n\n');
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

  /**
   * Get SOAP notes for the demo encounter (Dorothy Robinson)
   */
  static getSoapNotes(): SoapNote {
    return {
      subjective: "46-year-old Hispanic female with Type 2 diabetes mellitus presents with orthostatic dizziness, polyuria, polydipsia, and easy bruising. Patient reports blood sugars have been 'all over the place' and experiences dizziness when standing. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent prolonged nosebleed and increased bruising. Last INR check approximately 2 months ago, no recent diabetes monitoring labs for 4 months. Home glucometer broken for 1 month, not monitoring blood sugars.\n\nPatient has history of acute myelomonocytic leukemia, currently in remission for 3 years. Expresses concern about cancer history in relation to current bleeding symptoms. Social history includes working as an office manager, married with two teenage children. She denies tobacco, alcohol, or illicit drug use but admits to poor medication adherence monitoring.\n\nReview of systems positive for orthostatic symptoms, polyuria, polydipsia, fatigue, and easy bruising. Denies chest pain, shortness of breath, abdominal pain, nausea, vomiting, or neurologic symptoms other than dizziness with position changes.",
      
      objective: "Vital signs: Temperature 98.6°F, Blood pressure 95/60 mmHg supine, 85/55 mmHg standing, Heart rate 88 bpm, Respiratory rate 16/min, Oxygen saturation 98% on room air, Weight 68 kg, Height 165 cm, BMI 25.0. General appearance: Alert, oriented, appears mildly dehydrated but in no acute distress. HEENT: Normocephalic, atraumatic, PERRLA, EOMI, dry mucous membranes noted, no lymphadenopathy. Cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops, peripheral pulses intact. Pulmonary: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi. Abdomen: Soft, non-distended, no tenderness, normal bowel sounds, no masses palpable. Extremities: Multiple small bruises noted on bilateral arms, no edema, cyanosis, or clubbing. Neurological: Alert and oriented x3, cranial nerves II-XII intact, motor strength 5/5 throughout, positive orthostatic vital signs with symptomatic dizziness on standing.\n\nLaboratory results pending: STAT basic metabolic panel, hemoglobin A1C, PT/INR, and complete blood count with differential have been ordered but results not yet available at time of initial assessment.",
      
      assessment: "1. E11.9 Type 2 diabetes mellitus, poorly controlled - High likelihood\n   - Classic symptoms of polyuria, polydipsia, and dizziness\n   - No recent glucose monitoring or hemoglobin A1C for 4 months\n   - Broken glucometer preventing home monitoring\n   - Requires immediate assessment and optimization\n\n2. T88.7 Drug interaction: Glyburide + Warfarin - High likelihood\n   - Recently started glyburide (3 weeks ago) with existing warfarin therapy\n   - Known significant interaction increasing bleeding risk\n   - Patient reporting easy bruising and prolonged nosebleed\n   - Requires immediate medication review and adjustment\n\n3. Z87.2 Personal history of venous thromboembolism - Established\n   - On warfarin therapy for previous DVT\n   - INR monitoring overdue (last check 2 months ago)\n   - Current bleeding symptoms concerning for supratherapeutic levels\n\n4. Z85.6 Personal history of leukemia in remission - Established\n   - 3 years in remission from acute myelomonocytic leukemia\n   - Bleeding symptoms require consideration of hematologic causes\n   - Close monitoring needed due to cancer history\n\n5. I95.1 Orthostatic hypotension - Moderate likelihood\n   - Positive orthostatic vital signs with symptoms\n   - Likely multifactorial: dehydration, medication effects, poor diabetes control\n   - Requires fluid management and medication adjustment",
      
      plan: "Immediate management:\n• Admit to medical ward for observation and medication optimization\n• STAT laboratory studies: BMP, HbA1c, PT/INR, CBC with differential\n• IV hydration with normal saline at 100 mL/hour\n• Fingerstick glucose monitoring every 6 hours\n• Strict intake and output monitoring\n\nMedication management:\n• HOLD glyburide immediately due to warfarin interaction and bleeding risk\n• Continue metformin 1000mg BID if kidney function normal\n• HOLD warfarin pending INR results and bleeding assessment\n• Start sliding scale insulin if glucose >250 mg/dL\n• Consider insulin glargine once glucose patterns established\n\nDiagnostic monitoring:\n• Monitor for signs of bleeding (hemoglobin, hematocrit trends)\n• Orthostatic vital signs every 8 hours\n• Daily weights and fluid balance assessment\n• Glucose monitoring q6h until stable\n• Repeat INR in 24 hours after holding warfarin\n\nConsultations:\n• Endocrinology for diabetes management optimization\n• Hematology if INR significantly elevated or bleeding worsens\n• Pharmacy for medication reconciliation and interaction review\n• Diabetes educator for glucometer training and education\n\nPatient education:\n• Drug interaction awareness between glyburide and warfarin\n• Importance of regular INR monitoring on warfarin\n• Signs and symptoms of bleeding to report immediately\n• Diabetes management and importance of regular monitoring\n• Proper use of glucometer and when to check blood sugars\n\nDischarge planning:\n• Patient may be discharged when glucose stable, orthostatic symptoms resolved\n• INR in therapeutic range or bleeding risk minimized\n• New glucometer provided with education completed\n• Medication reconciliation completed with safer alternatives\n• Follow-up appointments: Primary care in 1 week, Endocrine in 2 weeks\n• Return precautions for bleeding, severe hypoglycemia, or uncontrolled hyperglycemia\n\nLong-term management:\n• Establish regular endocrinology follow-up for diabetes management\n• Consider diabetes education classes for comprehensive management\n• Regular INR monitoring per anticoagulation clinic\n• Annual ophthalmology and podiatry screening for diabetes complications\n• Continued monitoring of leukemia remission status with oncology",
      
      rawTranscriptSnippet: "Well, I'm taking metformin 1000mg twice a day, and my family doctor just started me on glyburide about three weeks ago. Oh, and I'm also taking warfarin because I had that blood clot last year."
    };
  }
} 