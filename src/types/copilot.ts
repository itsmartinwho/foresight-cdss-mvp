// src/types/copilot.ts

export enum CopilotAlertType {
  DRUG_INTERACTION = 'DRUG_INTERACTION',
  MISSING_LAB_RESULT = 'MISSING_LAB_RESULT',
  CLINICAL_GUIDELINE = 'CLINICAL_GUIDELINE',
  ABNORMAL_VITAL = 'ABNORMAL_VITAL',
  COMORBIDITY_REMINDER = 'COMORBIDITY_REMINDER',
}

export enum CopilotAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface CopilotAlert {
  id: string; // Unique identifier for the alert
  type: CopilotAlertType;
  severity: CopilotAlertSeverity;
  message: string; // Description of the alert
  suggestion?: string; // Optional suggested action
  timestamp: Date; // When the alert was generated
  relatedData?: any; // Optional related data (e.g., interacting drugs, missing lab name)
}

// Example of more specific alert data (optional, can be expanded later)
export interface DrugInteractionAlertData {
  drug1: string;
  drug2: string;
  interactionDetails: string;
}

export interface MissingLabAlertData {
  labName: string;
  reasonForSuggestion: string;
}
