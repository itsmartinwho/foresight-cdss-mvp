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
  
  // Demo transcript progression based on stage
  const getDemoTranscript = () => {
    if (!isDemoMode) return undefined;
    
    // Always return the full transcript when in demo mode
    // The animation will handle showing it progressively
    return "Patient presents with joint pain and stiffness, particularly in the morning. Reports fatigue and general malaise over the past few weeks. No recent trauma or injury. Family history of autoimmune conditions.";
  };
  
  // Demo diagnosis based on stage
  const getDemoDiagnosis = () => {
    if (!isDemoMode) return undefined;
    
    switch (demoStage) {
      case 'showingPlan':
      case 'finished':
        return "Based on the clinical presentation, patient history, and symptoms, the primary diagnosis is Rheumatoid Arthritis (RA). The morning stiffness, joint pain, and systemic symptoms are characteristic of early RA.";
      default:
        return undefined;
    }
  };
  
  // Demo treatment based on stage
  const getDemoTreatment = () => {
    if (!isDemoMode) return undefined;
    
    switch (demoStage) {
      case 'showingPlan':
      case 'finished':
        return "Recommended treatment plan:\n• Start methotrexate 15mg weekly with folic acid supplementation\n• Short-term prednisone 10mg daily for 2 weeks, then taper\n• Regular monitoring with CBC, liver function tests\n• Rheumatology referral for ongoing management\n• Patient education on joint protection and exercise";
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