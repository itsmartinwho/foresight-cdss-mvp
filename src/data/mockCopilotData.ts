// src/data/mockCopilotData.ts
import { CopilotAlertType, CopilotAlertSeverity } from '@/types/copilot';

// Mock Patient Data
export interface MockPatient {
  id: string;
  name: string;
  currentMedications: Array<{ id: string; name: string; dosage: string; startDate: string }>;
  labResults: Array<{ id: string; name: string; value: string; unit: string; date: string; status: 'normal' | 'abnormal' | 'pending' }>;
  conditions: Array<{ id: string; name: string; diagnosisDate: string }>;
  vitals: Array<{ id: string; type: string; value: string; unit: string; date: string; status: 'normal' | 'abnormal' }>;
}

export const mockPatientData: MockPatient = {
  id: 'patient-123',
  name: 'John Doe',
  currentMedications: [
    { id: 'med-001', name: 'Lisinopril', dosage: '10mg QD', startDate: '2023-01-15' },
    { id: 'med-002', name: 'Metformin', dosage: '500mg BID', startDate: '2022-11-20' },
    { id: 'med-003', name: 'Simvastatin', dosage: '20mg QHS', startDate: '2023-03-10' },
  ],
  labResults: [
    { id: 'lab-001', name: 'Hemoglobin A1c', value: '7.2', unit: '%', date: '2023-12-01', status: 'abnormal' },
    { id: 'lab-002', name: 'Lipid Panel - LDL', value: '130', unit: 'mg/dL', date: '2023-12-01', status: 'abnormal' },
    { id: 'lab-003', name: 'Serum Creatinine', value: '1.0', unit: 'mg/dL', date: '2023-12-01', status: 'normal' },
    // Missing CBC for a general checkup / fatigue complaint scenario
  ],
  conditions: [
    { id: 'cond-001', name: 'Hypertension', diagnosisDate: '2023-01-10' },
    { id: 'cond-002', name: 'Type 2 Diabetes', diagnosisDate: '2022-11-15' },
  ],
  vitals: [
    { id: 'vital-001', type: 'Blood Pressure', value: '145/90', unit: 'mmHg', date: '2024-03-10', status: 'abnormal'},
    { id: 'vital-002', type: 'Heart Rate', value: '75', unit: 'bpm', date: '2024-03-10', status: 'normal'},
  ]
};

// Mock Drug Interaction Database (very simplified)
export interface MockDrugInteraction {
  drugA: string;
  drugB: string;
  interactionDetails: string;
  severity: CopilotAlertSeverity;
}

export const mockDrugInteractions: MockDrugInteraction[] = [
  { drugA: 'Lisinopril', drugB: 'Spironolactone', interactionDetails: 'Increased risk of hyperkalemia.', severity: CopilotAlertSeverity.WARNING },
  { drugA: 'Simvastatin', drugB: 'Amiodarone', interactionDetails: 'Increased risk of myopathy.', severity: CopilotAlertSeverity.CRITICAL },
  { drugA: 'Metformin', drugB: 'Cimetidine', interactionDetails: 'Increased Metformin effect.', severity: CopilotAlertSeverity.INFO },
  { drugA: 'Warfarin', drugB: 'Aspirin', interactionDetails: 'Increased risk of bleeding.', severity: CopilotAlertSeverity.CRITICAL },
];

// Mock Lab Requirements (very simplified)
// Key: Condition/Symptom, Value: Required Labs
export const mockLabRequirements: Record<string, { labName: string; reason: string }[]> = {
  'fatigue': [
    { labName: 'CBC', reason: 'To check for anemia or other blood disorders.' },
    { labName: 'TSH', reason: 'To check for thyroid dysfunction.' },
  ],
  'diabetes_management': [
    { labName: 'Hemoglobin A1c', reason: 'To monitor long-term glucose control.' },
    { labName: 'Lipid Panel', reason: 'To assess cardiovascular risk.' },
    { labName: 'Serum Creatinine', reason: 'To monitor kidney function.' },
  ],
  'hypertension_check': [
    { labName: 'Basic Metabolic Panel', reason: 'To check electrolytes and kidney function.' },
    { labName: 'Urinalysis', reason: 'To check for kidney damage.'}
  ]
};
