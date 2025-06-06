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
    demoStage,
    hasAnimatedTranscript: !!animatedTranscript,
    animatedTranscriptLength: animatedTranscript?.length || 0
  });
  
  // Demo transcript progression based on stage - use real enriched data
  const getDemoTranscript = () => {
    if (!isDemoMode) {
      console.log('getDemoTranscript: not in demo mode');
      return undefined;
    }
    
    console.log('getDemoTranscript:', { demoStage, hasAnimatedTranscript: !!animatedTranscript, animatedLength: animatedTranscript?.length || 0 });
    
    // During animation stage, use the animated transcript
    if (demoStage === 'animatingTranscript' && animatedTranscript) {
      console.log('getDemoTranscript: returning animated transcript');
      return animatedTranscript;
    }
    
    // After animation completes, use the full transcript
    if (demoStage === 'simulatingPlanGeneration' || demoStage === 'showingPlan' || demoStage === 'finished') {
      const encounterData = DemoDataService.getEncounterData();
      console.log('Demo consultation getting full transcript:', {
        demoStage,
        hasEncounterData: !!encounterData,
        hasTranscript: !!encounterData.transcript,
        transcriptLength: encounterData.transcript?.length || 0,
        transcriptPreview: encounterData.transcript?.substring(0, 100) + '...'
      });
      return encounterData.transcript || undefined;
    }
    
    // Before animation starts, return empty or undefined
    console.log('getDemoTranscript: returning undefined (before animation)');
    return undefined;
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