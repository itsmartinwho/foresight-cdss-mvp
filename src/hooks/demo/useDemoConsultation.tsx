'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Patient } from '@/lib/types';
import { DEMO_PATIENT_ID, DemoDataService } from '@/services/demo/DemoDataService';
import { DemoStage } from '@/services/demo/DemoStateService';

export interface DemoConsultationBehavior {
  isDemoMode: boolean;
  initialDemoTranscript?: string;
  demoDiagnosis?: string;
  demoTreatment?: string;
  isDemoGeneratingPlan?: boolean;
  onDemoClinicalPlanClick?: () => void;
}

export function useDemoConsultation({
  patient,
  isDemoActive,
  demoStage,
  onAdvanceStage,
}: {
  patient?: Patient | null;
  isDemoActive: boolean;
  demoStage: DemoStage;
  onAdvanceStage?: (stage: DemoStage) => void;
}): DemoConsultationBehavior {
  const searchParams = useSearchParams();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Check if this is the demo patient and demo is active
  // Also check URL parameter for demo mode
  const isDemoRoute = searchParams.get('demo') === 'true';
  const isDemoMode = isDemoActive && (patient?.id === DEMO_PATIENT_ID || isDemoRoute);
  
  console.log('useDemoConsultation:', {
    isDemoActive,
    patientId: patient?.id,
    DEMO_PATIENT_ID,
    isDemoRoute,
    isDemoMode,
    demoStage
  });
  
  // Demo transcript progression based on stage - use real enriched data
  const getDemoTranscript = () => {
    if (!isDemoMode) return undefined;
    
    // Use the real enriched transcript from DemoDataService
    const encounterData = DemoDataService.getEncounterData();
    return encounterData.transcript || undefined;
  };
  
  // Additional debug logging after functions are declared
  console.log('useDemoConsultation transcript debug:', {
    hasTranscript: !!getDemoTranscript(),
    transcriptLength: getDemoTranscript()?.length || 0,
    transcriptPreview: getDemoTranscript()?.substring(0, 50) + '...'
  });
  
  // Demo diagnosis based on stage - use real enriched data
  const getDemoDiagnosis = () => {
    if (!isDemoMode) return undefined;
    
    switch (demoStage) {
      case 'showingPlan':
      case 'finished':
        // Use the real enriched diagnosis from DemoDataService
        return DemoDataService.getDiagnosisText();
      default:
        return undefined;
    }
  };
  
  // Demo treatment based on stage - use real enriched data
  const getDemoTreatment = () => {
    if (!isDemoMode) return undefined;
    
    switch (demoStage) {
      case 'showingPlan':
      case 'finished':
        // Use the real enriched treatment plan from DemoDataService
        return DemoDataService.getTreatmentPlanText();
      default:
        return undefined;
    }
  };
  
  // Handle demo clinical plan generation
  const handleDemoClinicalPlan = () => {
    if (!isDemoMode || !onAdvanceStage) return;
    
    setIsGeneratingPlan(true);
    
    // Simulate clinical plan generation delay
    setTimeout(() => {
      setIsGeneratingPlan(false);
      onAdvanceStage('showingPlan');
    }, 1800); // Match the demo system timing
  };
  
  // Reset generation state when stage changes
  useEffect(() => {
    if (demoStage !== 'simulatingPlanGeneration') {
      setIsGeneratingPlan(false);
    }
  }, [demoStage]);
  
  return {
    isDemoMode,
    initialDemoTranscript: getDemoTranscript(),
    demoDiagnosis: getDemoDiagnosis(),
    demoTreatment: getDemoTreatment(),
    isDemoGeneratingPlan: isGeneratingPlan,
    onDemoClinicalPlanClick: isDemoMode ? handleDemoClinicalPlan : undefined,
  };
} 