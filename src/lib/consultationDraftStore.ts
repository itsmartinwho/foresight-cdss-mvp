export interface ConsultationDraft {
  transcriptText?: string;
  diagnosisText?: string;
  treatmentText?: string;
  differentialDiagnoses?: any;
  soapNote?: any;
}

const drafts: Record<string, ConsultationDraft> = {};

export function saveConsultationDraft(id: string, partial: Partial<ConsultationDraft>): void {
  drafts[id] = { ...drafts[id], ...partial };
}

export function loadConsultationDraft(id: string): ConsultationDraft | undefined {
  return drafts[id];
}

export function clearConsultationDraft(id: string): void {
  delete drafts[id];
} 