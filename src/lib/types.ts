// Type definitions for Foresight CDSS

export interface Patient {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  race?: string;
  maritalStatus?: string;
  language?: string;
  povertyPercentage?: number;
  photo?: string;
  // Optional fields coming from dashboard-specific dataset
  primaryDiagnosis?: string;
  diagnosis?: string; // alias when primaryDiagnosis not provided
  nextAppointment?: string; // ISO or human string
  reason?: string; // reason for visit / chief complaint
}

export interface Treatment {
  drug: string;
  status: string;
  rationale: string;
}

export interface Admission {
  id: string;
  patientId: string;
  // Deprecated: kept for backward-compat (equals actualStart / actualEnd)
  startDate?: string;
  endDate?: string;

  // New schema
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  scheduledDuration?: number; // minutes
  reason?: string;
  transcript?: string;
  soapNote?: string;
  treatments?: Treatment[];
}

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

export interface TranscriptSegment {
  speaker: "doctor" | "patient";
  text: string;
  timestamp: string;
}

export interface Transcript {
  id: string;
  patientId: string;
  segments: TranscriptSegment[];
  startTime: string;
  endTime?: string;
  status: "in-progress" | "completed";
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  transcriptId: string;
  createdAt: string;
  updatedAt: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
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

export interface ComplexCaseAlert {
  id: string;
  patientId: string;
  type: "autoimmune" | "inflammatory" | "oncology";
  severity: "low" | "medium" | "high";
  triggeringFactors: string[];
  suggestedActions: string[];
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
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
