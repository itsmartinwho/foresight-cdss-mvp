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
  reasonCode: "K59.00",
  reasonDisplayText: "Constipation, unspecified",
  transcript: `Resident (Dr. Ramos): Buenas tardes, Señorita Robinson. Usted fue admitida anoche desde urgencias por estreñimiento severo y dolor abdominal. ¿Cuándo fue su última evacuación intestinal?

Patient (en español): Hace seis días. He intentado usar senna y supositorios de glicerina en casa, pero no he podido defecar.

Resident: ¿Ha tenido náuseas, vómitos o sangrado rectal?
Patient: Un poco de náuseas después de comer, pero no he vomitado y no hay sangre en las heces.

Resident: ¿Cómo está su dieta e ingesta de líquidos últimamente?
Patient: He estado comiendo comida rápida y solo bebo alrededor de un vaso de agua al día.

Resident: Entiendo. Revisemos su abdomen. (Palpa abdomen.)

—Examen físico breve:
Abdomen: Blando, distendido, ligero dolor en fosa iliaca izquierda sin rebote ni rigidez. Ruidos hidroaéreos hiporreactivos.
Signos vitales: Temp 37.0 °C, PA 116/74 mmHg, FC 80 lpm, FR 16/min.

Resident: Le hicimos una radiografía abdominal en urgencias. Dr. Chen viene a verla para el plan.

—Dr. Chen (turno de la mañana): Veo fecalomas en colon ascendente y transverso, sin niveles hidroaéreos ni signo de obstrucción completa. Sus electrolitos están dentro de límites normales y TSH normal.

Patient: Me preocupa que sea algo más serio.

Dr. Chen: Dado que tuvo un breve curso de opioides tras cirugía dental hace dos semanas, sospechamos estreñimiento por disminución del tránsito intestinal inducido por medicamentos y baja ingesta de fibra.

Patient: ¿Qué haremos?

Dr. Chen: Admitiremos para hidratación y régimen de evacuación agresivo. Le explico en español: 
• Manténgase NPO por 6 horas más, luego líquidos claros. 
• Le administraremos polietilenglicol 17 g en 240 mL cada 6 horas hasta que evacúe. 
• Docusato sodio 200 mg PO BID para ablandar heces. 
• Supositorio de glicerina PR cada 12 horas según necesidad. 
• IV suero salino 0.9% 1000 mL en 8 horas y luego evaluamos si tolera vía oral. 
• Dieta alta en fibra cuando tolere.
• Consultaremos a nutrición para plan de 25–30 g de fibra diaria y al fisioterapeuta para movilidad.

Patient: Entendido.

Dr. Chen: Evite medicamentos que constipen. Su hidrocodona se suspendió en urgencias. Esperamos que evacúe hoy o mañana. Si no, haremos enema.

Patient: Gracias, doctor.`,
  soapNote: `S: 46-year-old female admitted for 6-day history of constipation and mild diffuse abdominal discomfort. Reports low fiber diet and recent short-course opioid use (hydrocodone) post-dental surgery. No fever, no hematochezia, no weight loss.

O: Temp 37.0 °C, BP 116/74 mmHg, HR 80 bpm, RR 16/min. Abdomen soft, distended, mild LLQ tenderness, no rebound, hypoactive bowel sounds. Rectal exam: hard stool in vault, brown, guaiac-negative. Abdominal X-ray: diffuse colonic fecal retention, no SBO or perforation. Labs: Na 137 mmol/L, TSH 2.1 µIU/mL.

A:
1. K59.00 Functional constipation, likely opioid-induced + low-fiber diet.
2. Z85.6 Personal history of leukemia.
3. E86.0 Mild dehydration.

P:
• Admit for bowel regimen and hydration.
• NPO 6 h → clear liquids → advance to high-fiber diet when BM occurs.
• Polyethylene glycol 3350 17 g PO q6h until BM, luego 17 g nightly × 14 days.
• Docusate sodium 200 mg PO BID.
• Glycerin suppository PR q12h PRN si no defeca en 12 h.
• IV 0.9% NaCl 1000 mL over 8 h, luego evaluar estado hídrico y pasar a PO.
• Suspender hidrocodona; controlar dolor con acetaminofén.
• Consultas: Nutrición (plan de fibra 25–30 g/día), Fisioterapia promotora de movilidad.
• Dar de alta cuando pase 2 movimientos intestinales y tolera dieta.`,
  treatments: [
    { 
      drug: "Polyethylene glycol 3350 17g every 6 hours until bowel movement, then 17g nightly for 14 days", 
      status: "Prescribed", 
      rationale: "Osmotic laxative for severe fecal impaction with maintenance therapy to prevent recurrence" 
    },
    { 
      drug: "Docusate sodium 200mg twice daily", 
      status: "Prescribed", 
      rationale: "Stool softener to facilitate easier bowel movements and reduce straining" 
    },
    { 
      drug: "Glycerin suppository every 12 hours as needed", 
      status: "As needed", 
      rationale: "Rectal stimulant if no bowel movement occurs within 12 hours" 
    },
    { 
      drug: "High-fiber diet with 25-30g fiber daily", 
      status: "Patient education", 
      rationale: "Dietary modification to prevent future constipation episodes and promote regular bowel function" 
    },
    { 
      drug: "Increased fluid intake to 8-10 glasses of water daily", 
      status: "Patient education", 
      rationale: "Adequate hydration essential for preventing constipation and supporting treatment effectiveness" 
    }
  ]
};

const dorothyRobinsonDiagnosisJSON: DemoDiagnosisData = {
  patientId: DEMO_PATIENT_ID,
  encounterId: DEMO_ENCOUNTER_ID,
  code: "K56.41",
  description: "Fecal impaction with severe constipation requiring aggressive bowel regimen and medical intervention"
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
      subjective: "46-year-old Hispanic female presents with a 6-day history of severe constipation and mild diffuse abdominal discomfort. Patient reports her last bowel movement was 6 days ago despite trying senna and glycerin suppositories at home. She experiences some nausea after eating but denies vomiting or rectal bleeding. Recent history of hydrocodone use following dental surgery 2 weeks ago. Patient admits to poor dietary habits with frequent fast food consumption and minimal water intake (approximately 1 glass per day). No fever, no hematochezia, no significant weight loss.\n\nAdditional history reveals chronic constipation issues dating back several years, typically manageable with over-the-counter medications. Patient has a history of leukemia in remission for the past 3 years. She takes no regular medications except for occasional ibuprofen for headaches. Family history is significant for colorectal cancer in her father at age 65. Social history includes working as an office manager, married with two teenage children. She denies tobacco, alcohol, or illicit drug use. Patient expresses concern about missing work and the impact on her family responsibilities.\n\nReview of systems is positive for mild fatigue, decreased appetite, and feeling bloated. Patient denies urinary symptoms, gynecologic issues, or respiratory complaints. She reports sleeping poorly due to abdominal discomfort but denies night sweats or fever. Patient states this episode feels more severe than her usual constipation episodes.",
      
      objective: "Vital signs: Temperature 37.0°C, Blood pressure 116/74 mmHg, Heart rate 80 bpm, Respiratory rate 16/min, Oxygen saturation 98% on room air, Weight 68 kg, Height 165 cm, BMI 25.0. General appearance: Alert, oriented, appears mildly uncomfortable but in no acute distress. HEENT: Normocephalic, atraumatic, PERRLA, EOMI, mucous membranes slightly dry, no lymphadenopathy. Cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops, peripheral pulses intact. Pulmonary: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi. Abdomen: Soft, moderately distended, mild left lower quadrant tenderness to palpation, no rebound tenderness or guarding, hypoactive bowel sounds throughout, no masses palpable, tympanitic to percussion. Rectal examination: Hard stool in vault, brown in color, guaiac-negative, no masses or hemorrhoids. Extremities: No edema, cyanosis, or clubbing. Neurological: Alert and oriented x3, cranial nerves II-XII intact, motor strength 5/5 throughout, reflexes symmetric.\n\nLaboratory results: CBC shows mild leukocytosis (WBC 11.2), normal hemoglobin and hematocrit. Comprehensive metabolic panel reveals sodium 137 mmol/L, potassium 3.8 mmol/L, chloride 102 mmol/L, CO2 24 mmol/L, BUN 18 mg/dL, creatinine 0.9 mg/dL, glucose 95 mg/dL. Liver function tests within normal limits. TSH 2.1 µIU/mL within normal range. Urinalysis shows mild dehydration with specific gravity 1.025, otherwise normal. Abdominal X-ray demonstrates diffuse colonic fecal retention with moderate amount of stool throughout colon, no evidence of obstruction, perforation, or free air.",
      
      assessment: "1. K59.00 Functional constipation, likely opioid-induced combined with low-fiber diet - High likelihood\n   - Patient has classic presentation with 6-day history of no bowel movements\n   - Recent opioid use (hydrocodone) is a known precipitating factor\n   - Poor dietary habits and inadequate fluid intake contribute to severity\n   - Physical exam and imaging consistent with fecal retention\n\n2. Z85.6 Personal history of leukemia in remission - Established\n   - Patient reports 3 years in remission, no active oncologic issues\n   - No current hematologic abnormalities noted\n   - Requires monitoring but not directly related to current presentation\n\n3. E86.0 Mild dehydration secondary to poor fluid intake - Moderate likelihood\n   - Dry mucous membranes on physical exam\n   - Elevated urine specific gravity\n   - Poor reported fluid intake history\n   - Contributing factor to constipation severity\n\n4. K56.41 Fecal impaction - High likelihood\n   - Hard stool palpable on rectal examination\n   - Abdominal distension and discomfort\n   - Imaging shows significant fecal retention\n   - May require more aggressive intervention if simple measures fail\n\n5. Rule out intestinal obstruction - Low likelihood\n   - No evidence of mechanical obstruction on imaging\n   - Patient passing some flatus\n   - No vomiting or severe cramping\n   - Continue to monitor closely",
      
      plan: "Immediate management:\n• Admit to medical ward for comprehensive bowel regimen and close monitoring\n• NPO for 6 hours initially, then advance to clear liquids as tolerated\n• Progress to high-fiber diet (25-30g daily) once bowel movement occurs\n• Strict intake and output monitoring\n\nMedications:\n• Polyethylene glycol 3350 (MiraLAX) 17g PO every 6 hours until bowel movement, then 17g nightly for 14 days for maintenance\n• Docusate sodium (Colace) 200mg PO twice daily as stool softener\n• Glycerin suppository per rectum every 12 hours as needed if no bowel movement within 12 hours\n• Consider bisacodyl (Dulcolax) 10mg suppository if glycerin ineffective\n• IV 0.9% normal saline 1000mL over 8 hours for hydration, then reassess fluid status and transition to oral intake\n• Discontinue hydrocodone immediately; transition to acetaminophen 650mg every 6 hours as needed for pain\n• If no bowel movement within 24 hours, consider phosphate enema or manual disimpaction\n\nDiagnostic monitoring:\n• Daily abdominal examinations to assess for improvement\n• Monitor for signs of bowel obstruction or perforation\n• Repeat abdominal X-ray in 24-48 hours if no clinical improvement\n• Daily weights and fluid balance assessment\n• Monitor electrolytes daily while on aggressive bowel regimen\n\nConsultations:\n• Nutrition consultation for comprehensive fiber intake plan and dietary education\n• Physical therapy for mobility promotion and core strengthening exercises\n• Consider gastroenterology consultation if no improvement within 48 hours\n• Social work consultation for discharge planning and home support assessment\n\nPatient education:\n• Detailed discussion about opioid-induced constipation and prevention strategies\n• Importance of adequate fluid intake (8-10 glasses water daily)\n• High-fiber diet education with specific food recommendations\n• Recognition of warning signs requiring immediate medical attention\n• Importance of regular bowel regimen and not delaying urges\n\nDischarge planning:\n• Patient may be discharged when she has at least 2 spontaneous bowel movements\n• Must tolerate regular diet without nausea or vomiting\n• Adequate pain control with non-opioid medications\n• Home medications reconciled and patient educated on proper use\n• Follow-up appointment scheduled with primary care provider within 1 week\n• Return precautions provided for severe abdominal pain, vomiting, or inability to have bowel movements\n\nLong-term management:\n• Establish regular primary care follow-up for chronic constipation management\n• Consider referral to gastroenterology for chronic constipation evaluation if recurrent episodes\n• Annual screening colonoscopy due to family history of colorectal cancer\n• Continued monitoring of leukemia remission status with oncology",
      
      rawTranscriptSnippet: "Hace seis días. He intentado usar senna y supositorios de glicerina en casa..."
    };
  }
} 