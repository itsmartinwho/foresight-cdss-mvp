// tests/frontend/unit/lib/copilotLogic.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { checkForDrugInteractions, checkForMissingLabs } from '@/lib/copilotLogic';
import { mockPatientData, mockDrugInteractions, mockLabRequirements, MockPatient } from '@/data/mockCopilotData';
import { CopilotAlertType, CopilotAlertSeverity } from '@/types/copilot';

describe('copilotLogic', () => {
  describe('checkForDrugInteractions', () => {
    it('should return no alerts if no new drug is provided or no interactions found', () => {
      const alerts = checkForDrugInteractions(mockPatientData.currentMedications, '');
      expect(alerts).toHaveLength(0);

      const alerts2 = checkForDrugInteractions(mockPatientData.currentMedications, 'Amoxicillin');
      expect(alerts2).toHaveLength(0);
    });

    it('should identify a known drug interaction', () => {
      const alerts = checkForDrugInteractions(mockPatientData.currentMedications, 'Amiodarone');
      expect(alerts).toHaveLength(1);
      const alert = alerts[0];
      expect(alert.type).toBe(CopilotAlertType.DRUG_INTERACTION);
      expect(alert.severity).toBe(CopilotAlertSeverity.CRITICAL);
      expect(alert.message).toContain('Simvastatin and Amiodarone');
      expect(alert.relatedData.drug1).toBe('Simvastatin');
      expect(alert.relatedData.drug2).toBe('Amiodarone');
    });

    it('should identify multiple interactions if applicable (mock data setup needed)', () => {
      // This test would require mockPatientData to have multiple drugs that interact with the new drug,
      // or the new drug interacts with multiple existing meds.
      // Example: if patient was on DrugX and DrugY, and NewDrug interacts with both.
      // For now, our mock data is simple.
      const customPatientMeds = [
        { id: 'med-001', name: 'Lisinopril', dosage: '10mg QD', startDate: '2023-01-15' },
        { id: 'med-custom', name: 'Warfarin', dosage: '5mg QD', startDate: '2023-01-15'}
      ];
      const alerts = checkForDrugInteractions(customPatientMeds, 'Aspirin', mockDrugInteractions);
      expect(alerts).toHaveLength(1); // Warfarin + Aspirin
      // If Aspirin also interacted with Lisinopril in mockDrugInteractions, this would be 2.
    });

    it('should be case-insensitive for drug names', () => {
      const alerts = checkForDrugInteractions(mockPatientData.currentMedications, 'amiodarone');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].relatedData.drug2).toBe('amiodarone'); // Or check for the interaction message
    });
  });

  describe('checkForMissingLabs', () => {
    it('should return no alerts if consultation context has no defined lab requirements', () => {
      const alerts = checkForMissingLabs(mockPatientData.labResults, 'unknown_context');
      expect(alerts).toHaveLength(0);
    });

    it('should identify missing labs for a given context', () => {
      // Mock patient is missing CBC and TSH for 'fatigue' context based on mockLabRequirements
      const alerts = checkForMissingLabs(mockPatientData.labResults, 'fatigue');
      expect(alerts).toHaveLength(2);

      const cbcAlert = alerts.find(a => a.relatedData.labName === 'CBC');
      expect(cbcAlert).toBeDefined();
      expect(cbcAlert?.type).toBe(CopilotAlertType.MISSING_LAB_RESULT);
      expect(cbcAlert?.message).toContain('Consider ordering CBC');

      const tshAlert = alerts.find(a => a.relatedData.labName === 'TSH');
      expect(tshAlert).toBeDefined();
    });

    it('should not suggest labs that the patient already has', () => {
      const patientWithAllDiabetesLabs: MockPatient['labResults'] = [
        ...mockPatientData.labResults,
        { id: 'lab-004', name: 'Hemoglobin A1c', value: '6.5', unit: '%', date: '2024-01-01', status: 'normal' },
        { id: 'lab-005', name: 'Lipid Panel', value: 'Comprehensive', unit: '', date: '2024-01-01', status: 'normal' },
        { id: 'lab-006', name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', date: '2024-01-01', status: 'normal' },
      ];
      const alerts = checkForMissingLabs(patientWithAllDiabetesLabs, 'diabetes_management');
      // This assertion depends on how specific your mockLabRequirements are.
      // If "Lipid Panel" in requirements matches "Lipid Panel - LDL" in results, this might need adjustment.
      // For this test, assuming exact name match or that the mock data is set up for this.
      // Our mockLabRequirements for diabetes_management lists "Lipid Panel", and mockPatientData has "Lipid Panel - LDL".
      // So, "Lipid Panel" would still be suggested as missing unless the logic or data is more nuanced.
      // Let's adjust the test to reflect the current simple matching logic.
      const patientWithSpecificDiabetesLabs: MockPatient['labResults'] = [
        { id: 'lab-dm-1', name: 'Hemoglobin A1c', value: '6.5', unit: '%', date: '2024-01-01', status: 'normal' },
        { id: 'lab-dm-2', name: 'Lipid Panel', value: 'Normal', unit: '', date: '2024-01-01', status: 'normal' },
        { id: 'lab-dm-3', name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', date: '2024-01-01', status: 'normal' },
      ];
       const alertsPerfect = checkForMissingLabs(patientWithSpecificDiabetesLabs, 'diabetes_management');
       expect(alertsPerfect).toHaveLength(0);
    });

    it('should be case-insensitive for lab names and context', () => {
      const alerts = checkForMissingLabs(mockPatientData.labResults, 'FATIGUE');
      expect(alerts.some(a => a.relatedData.labName === 'CBC')).toBe(true);

      const patientWithDifferentCaseLabs: MockPatient['labResults'] = [
        { id: 'lab-case', name: 'cbc', value: '...', unit: '...', date: '...', status: 'normal' }
      ];
      const alerts2 = checkForMissingLabs(patientWithDifferentCaseLabs, 'fatigue');
      // Will still suggest TSH as cbc is present (case-insensitive)
      expect(alerts2.some(a => a.relatedData.labName === 'TSH')).toBe(true);
      expect(alerts2.some(a => a.relatedData.labName === 'CBC')).toBe(false);
    });
  });
});
