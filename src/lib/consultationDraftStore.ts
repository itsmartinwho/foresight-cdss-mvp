export interface ConsultationDraft {
  transcriptText?: string;
  diagnosisText?: string;
  treatmentText?: string;
  differentialDiagnoses?: any;
  soapNote?: any;
}

const MEMORY_STORE: Record<string, ConsultationDraft> = {};

function persistToSession(id: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('consultationDraft_' + id, JSON.stringify(MEMORY_STORE[id]));
}

function restoreFromSession(id: string): ConsultationDraft | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.sessionStorage.getItem('consultationDraft_' + id);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ConsultationDraft;
  } catch {
    return undefined;
  }
}

export function saveConsultationDraft(id: string, partial: Partial<ConsultationDraft>): void {
  MEMORY_STORE[id] = { ...MEMORY_STORE[id], ...partial };
  persistToSession(id);
}

export function loadConsultationDraft(id: string): ConsultationDraft | undefined {
  if (MEMORY_STORE[id]) return MEMORY_STORE[id];
  const restored = restoreFromSession(id);
  if (restored) {
    MEMORY_STORE[id] = restored;
  }
  return restored;
}

export function clearConsultationDraft(id: string): void {
  delete MEMORY_STORE[id];
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('consultationDraft_' + id);
  }
} 