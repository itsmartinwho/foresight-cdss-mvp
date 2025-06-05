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
      drug: "Polyethylene glycol 3350 17g q6h until BM, then 17g nightly × 14 days", 
      status: "Prescribed", 
      rationale: "Osmotic laxative for severe constipation and maintenance therapy." 
    },
    { 
      drug: "Docusate sodium 200mg PO BID", 
      status: "Prescribed", 
      rationale: "Stool softener to facilitate easier bowel movements." 
    },
    { 
      drug: "Glycerin suppository PR q12h PRN", 
      status: "As needed", 
      rationale: "Rectal stimulant if no bowel movement within 12 hours." 
    },
    { 
      drug: "High-fiber diet counseling with 25-30g fiber daily", 
      status: "Patient education", 
      rationale: "Prevention of future constipation episodes through dietary modification." 
    }
  ]
};

const dorothyRobinsonDiagnosisJSON: DemoDiagnosisData = {
  patientId: DEMO_PATIENT_ID,
  encounterId: DEMO_ENCOUNTER_ID,
  code: "K59.00",
  description: "Functional constipation, likely opioid-induced with contributing low-fiber diet"
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
} 