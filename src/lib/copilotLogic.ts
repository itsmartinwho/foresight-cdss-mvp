// src/lib/copilotLogic.ts
import {
  CopilotAlert,
  CopilotAlertType,
  CopilotAlertSeverity,
  DrugInteractionAlertData,
  MissingLabAlertData // Added MissingLabAlertData
} from '@/types/copilot';
import {
  MockPatient,
  MockDrugInteraction,
  mockDrugInteractions,
  mockLabRequirements // Added mockLabRequirements
} from '@/data/mockCopilotData';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks for potential drug interactions when a new drug is considered.
 * @param currentMedications The patient's current list of medications.
 * @param newDrugName The name of the new drug being considered.
 * @param interactionDb A list of known drug interactions.
 * @returns An array of CopilotAlert objects for any found interactions.
 */
export const checkForDrugInteractions = (
  currentMedications: MockPatient['currentMedications'],
  newDrugName: string,
  interactionDb: MockDrugInteraction[] = mockDrugInteractions // Default to mock DB
): CopilotAlert[] => {
  const alerts: CopilotAlert[] = [];
  const newDrugLower = newDrugName.toLowerCase();

  for (const med of currentMedications) {
    const currentDrugLower = med.name.toLowerCase();
    for (const interaction of interactionDb) {
      const drugALower = interaction.drugA.toLowerCase();
      const drugBLower = interaction.drugB.toLowerCase();

      if ((drugALower === currentDrugLower && drugBLower === newDrugLower) ||
          (drugALower === newDrugLower && drugBLower === currentDrugLower)) {

        const alertData: DrugInteractionAlertData = {
          drug1: med.name,
          drug2: newDrugName,
          interactionDetails: interaction.interactionDetails,
        };

        alerts.push({
          id: uuidv4(),
          type: CopilotAlertType.DRUG_INTERACTION,
          severity: interaction.severity,
          message: `Potential interaction between ${med.name} and ${newDrugName}. ${interaction.interactionDetails}`,
          suggestion: 'Review medication regimen. Consider alternative if interaction is significant.',
          timestamp: new Date(),
          relatedData: alertData,
        });
      }
    }
  }
  return alerts;
};

/**
 * Checks for missing lab results based on consultation context (e.g., symptoms, conditions).
 * @param patientLabResults The patient's existing lab results.
 * @param consultationContext A string describing the reason for visit or primary complaint (e.g., 'fatigue', 'diabetes_management').
 * @param labRequirementsDb A record defining required labs for different contexts.
 * @returns An array of CopilotAlert objects for any suggested missing labs.
 */
export const checkForMissingLabs = (
  patientLabResults: MockPatient['labResults'],
  consultationContext: string, // e.g., 'fatigue', 'diabetes_management', 'hypertension_check'
  labRequirementsDb: Record<string, { labName: string; reason: string }[]> = mockLabRequirements
): CopilotAlert[] => {
  const alerts: CopilotAlert[] = [];
  const requiredLabs = labRequirementsDb[consultationContext.toLowerCase()];

  if (!requiredLabs) {
    return alerts; // No specific lab requirements for this context in the mock DB
  }

  const patientLabNames = patientLabResults.map(lab => lab.name.toLowerCase());

  for (const req of requiredLabs) {
    if (!patientLabNames.includes(req.labName.toLowerCase())) {
      const alertData: MissingLabAlertData = {
        labName: req.labName,
        reasonForSuggestion: req.reason,
      };
      alerts.push({
        id: uuidv4(),
        type: CopilotAlertType.MISSING_LAB_RESULT,
        severity: CopilotAlertSeverity.INFO,
        message: `Consider ordering ${req.labName}. ${req.reason}`,
        suggestion: `Order ${req.labName}.`,
        timestamp: new Date(),
        relatedData: alertData,
      });
    }
  }

  return alerts;
};
