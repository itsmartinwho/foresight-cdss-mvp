'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Patient } from '@/lib/types';
import { DEMO_PATIENT_ID } from '@/services/demo/DemoDataService';
import { DemoStage } from '@/services/demo/DemoStateService';

export interface DemoConsultationBehavior {
  isDemoMode: boolean;
  initialDemoTranscript?: string;
  demoDiagnosis?: string;
  demoTreatment?: string;
  isDemoGeneratingPlan?: boolean;
  onDemoClinicalPlanClick?: () => void;
}

interface UseDemoConsultationProps {
  patient: Patient;
  isDemoActive: boolean;
  demoStage: DemoStage;
  demoPatient: Patient | null;
  animatedTranscript: string;
  diagnosisText: string;
  treatmentPlanText: string;
  advanceDemoStage: (stage: DemoStage) => void;
}

export function useDemoConsultation({
  patient,
  isDemoActive,
  demoStage,
  demoPatient,
  animatedTranscript,
  diagnosisText,
  treatmentPlanText,
  advanceDemoStage,
}: UseDemoConsultationProps): DemoConsultationBehavior {
  const searchParams = useSearchParams();
  const isDemoRouteActive = searchParams.get('demo') === 'true';
  const [isDemoGeneratingPlan, setIsDemoGeneratingPlan] = useState(false);

  // Determine if we're in demo mode for this consultation
  const isDemoMode = isDemoActive && 
                    isDemoRouteActive && 
                    patient.id === DEMO_PATIENT_ID &&
                    demoPatient?.id === patient.id;

  // Handle clinical plan generation simulation
  useEffect(() => {
    if (isDemoMode && demoStage === 'simulatingPlanGeneration') {
      setIsDemoGeneratingPlan(true);
    } else if (isDemoMode && demoStage === 'showingPlan') {
      setIsDemoGeneratingPlan(false);
    }
  }, [isDemoMode, demoStage]);

  const handleDemoClinicalPlanClick = () => {
    if (isDemoMode && demoStage === 'animatingTranscript') {
      advanceDemoStage('simulatingPlanGeneration');
    }
  };

  return {
    isDemoMode,
    initialDemoTranscript: isDemoMode ? animatedTranscript : undefined,
    demoDiagnosis: isDemoMode ? diagnosisText : undefined,
    demoTreatment: isDemoMode ? treatmentPlanText : undefined,
    isDemoGeneratingPlan,
    onDemoClinicalPlanClick: isDemoMode ? handleDemoClinicalPlanClick : undefined,
  };
} 