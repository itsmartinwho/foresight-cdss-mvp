'use client';

import { useEffect, useState, useRef } from 'react';
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
  animatedTranscript,
  onAdvanceStage,
}: {
  patient?: Patient | null;
  isDemoActive: boolean;
  demoStage: DemoStage;
  animatedTranscript?: string;
  onAdvanceStage?: (stage: DemoStage) => void;
}): DemoConsultationBehavior {
  const searchParams = useSearchParams();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const prevDemoStage = useRef<DemoStage | null>(null);
  const prevTranscriptLength = useRef<number>(0);
  
  // Check if this is the demo patient and demo is active
  // Also check URL parameter for demo mode
  const isDemoRoute = searchParams.get('demo') === 'true';
  const isDemoMode = isDemoActive && (patient?.id === DEMO_PATIENT_ID || isDemoRoute);
  
  // Debug only on stage changes
  if (demoStage !== prevDemoStage.current) {
    console.log('Demo stage changed:', { from: prevDemoStage.current, to: demoStage, isDemoMode });
    prevDemoStage.current = demoStage;
  }
  
  // Demo transcript progression based on stage - use real enriched data
  const getDemoTranscript = () => {
    if (!isDemoMode) {
      console.log('getDemoTranscript: not in demo mode');
      return undefined;
    }
    
    // During animation stage, use the animated transcript
    if (demoStage === 'animatingTranscript' && animatedTranscript) {
      return animatedTranscript;
    }
    
    // After animation completes, use the full transcript
    if (demoStage === 'simulatingPlanGeneration' || demoStage === 'showingPlan' || demoStage === 'finished') {
      const encounterData = DemoDataService.getEncounterData();
      return encounterData.transcript || undefined;
    }
    
    // Before animation starts, return empty or undefined
    return undefined;
  };
  
  // Only log if transcript content changes significantly
  const currentTranscriptLength = getDemoTranscript()?.length || 0;
  if (Math.abs(currentTranscriptLength - (prevTranscriptLength.current || 0)) > 100) {
    console.log('Transcript updated:', { length: currentTranscriptLength, stage: demoStage });
    prevTranscriptLength.current = currentTranscriptLength;
  }
  
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
    
    // Note: Clinical plan generation delay is handled by DemoAnimationService
    // This is just for UI state management
    setTimeout(() => {
      setIsGeneratingPlan(false);
      onAdvanceStage('showingPlan');
    }, 200); // Quick UI update, actual delay handled by orchestrator
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