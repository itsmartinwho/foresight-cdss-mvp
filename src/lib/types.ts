// Type definitions for Foresight CDSS

export interface Patient {
  id: string;
  name?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  race?: string;
  ethnicity?: string;
  maritalStatus?: string;
  language?: string;
  povertyPercentage?: number;
  photo?: string;
  nextAppointment?: string;
  reason?: string; // Patient-level general reason
  alerts?: ComplexCaseAlert[];
}

export interface Treatment {
  drug: string;
  status: string;
  rationale: string;
}

export interface Encounter {
  id: string;
  encounterIdentifier: string; // Human-readable/external ID for the encounter
  patientId: string;
  encounter_type?: string; // FHIR Encounter.type (e.g. 'consultation', 'ambulatory')
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  reasonCode?: string; // FHIR Encounter.reasonCode.text
  reasonDisplayText?: string; // User-friendly, verbose reason for visit
  transcript?: string;
  observations?: string[]; // New field for observations
  soapNote?: string;
  treatments?: Treatment[];
  priorAuthJustification?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// TODO: delete in July 2024 when all downstream code is migrated
export type Admission = Encounter; // TEMPORARY alias for backward compatibility

export interface Diagnosis {
  patientId: string;
  admissionId: string;
  code?: string;
  description?: string;
}

export interface LabResult {
  patientId: string;
  admissionId: string;
  name: string;
  value: number | string;
  units?: string;
  dateTime?: string;
  referenceRange?: string;
  flag?: string;
}

export interface ComplexCaseAlert {
  id: string;
  patientId: string;
  msg?: string;
  date?: string;
  type?: "autoimmune" | "inflammatory" | "oncology";
  severity: "low" | "medium" | "high" | string;
  triggeringFactors?: string[];
  suggestedActions?: string[];
  createdAt?: string;
  acknowledged?: boolean;
  acknowledgedAt?: string;
  confidence?: number;
  likelihood?: number; // Scale of 1-5
  conditionType?: string;
}

export interface ClinicalSource {
  type: "patient_data" | "guideline" | "clinical_trial" | "research";
  id: string;
  title: string;
  content: string;
  relevanceScore?: number;
  accessTime: string;
}

export interface DiagnosticStep {
  id: string;
  description: string;
  query: string;
  completed: boolean;
  sources: ClinicalSource[];
  findings: string;
}

export interface DiagnosticPlan {
  steps: DiagnosticStep[];
  rationale: string;
}

export interface DifferentialDiagnosis {
  name: string;
  likelihood: string;
  keyFactors: string;
}

// Database record for differential diagnoses
export interface DifferentialDiagnosisRecord {
  id: string;
  patient_id: string;
  encounter_id: string;
  diagnosis_name: string;
  likelihood: string;
  key_factors?: string;
  rank_order: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicalTrial {
  id: string;
  title: string;
  phase: string;
  location: string;
  contact: string;
  eligibility: string;
}

export interface DiagnosticResult {
  diagnosisName: string;
  diagnosisCode?: string;
  confidence: number;
  supportingEvidence: string[];
  differentialDiagnoses: DifferentialDiagnosis[];
  recommendedTests: string[];
  recommendedTreatments: string[];
  clinicalTrialMatches: ClinicalTrial[];
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  rawTranscriptSnippet?: string;
}

export interface GeneratedReferralDocument {
  referralTo: string;
  reasonForReferral: string;
  summaryOfFindings: string;
  generatedContent: SpecialistReferral; // Or Record<string, any> if more flexible
}

export interface GeneratedPriorAuthDocument {
  medicationOrService: string;
  reasonForRequest: string;
  generatedContent: PriorAuthorization; // Or Record<string, any>
}

export interface ClinicalOutputPackage {
  requestId: string;
  timestamp: string;
  patientId: string;
  diagnosticResult: DiagnosticResult;
  soapNote?: SoapNote;
  referralDocument?: GeneratedReferralDocument;
  priorAuthDocument?: GeneratedPriorAuthDocument;
  evidenceSources: ClinicalSource[];
}

export interface PriorAuthorization {
  patientInformation: {
    name: string;
    dateOfBirth: string;
    insuranceId: string;
    gender: string;
  };
  providerInformation: {
    name: string;
    npi: string;
    facility: string;
    contactPhone: string;
    contactEmail: string;
  };
  serviceRequest: {
    diagnosis: string;
    diagnosisCode: string;
    requestedService: string;
    serviceCode: string;
    startDate: string;
    duration: string;
    frequency: string;
  };
  clinicalJustification: string;
  supportingDocumentation: string[];
}

export interface SpecialistReferral {
  date: string;
  referringProvider: {
    name: string;
    npi: string;
    facility: string;
    contactPhone: string;
    contactEmail: string;
  };
  specialist: {
    type: string;
    facility: string;
  };
  patientInformation: {
    name: string;
    dateOfBirth: string;
    gender: string;
    contactPhone: string;
    insurance: string;
  };
  referralReason: {
    diagnosis: string;
    diagnosisCode: string;
    reasonForReferral: string;
  };
  clinicalInformation: {
    historyOfPresentIllness: string;
    relevantPastMedicalHistory: string[];
    currentMedications: string[];
    allergies: string[];
    physicalExamination: string;
    recentLabResults: {
      name: string;
      value: number;
      units: string;
      date: string;
      flag: "H" | "L" | "N";
    }[];
  };
  requestedEvaluation: string[];
}

export interface CopilotSuggestion {
  id: string;
  type: "question" | "test" | "medication" | "guideline" | "alert";
  content: string;
  context: string;
  relevanceScore: number;
  createdAt: string;
  dismissed: boolean;
  actioned: boolean;
}

export interface Consultation {
  dateTime: string; // ISO string
  reason?: string;
}

// New type for the wrapper around admission details
export interface AdmissionDetailsWrapper {
  admission: Admission;
  diagnoses: Diagnosis[];
  labResults: LabResult[];
  // Treatments are typically part of the Admission object itself now as per `Admission` type above.
  // If a specific tab needs treatments at this wrapper level, it can be added, but prefer it on Admission.
}

export interface PatientDataPayload {
  patient: Patient | null;
  admissions: Array<{
    admission: Admission;
    diagnoses: Diagnosis[];
    labResults: LabResult[];
  }>;
}
