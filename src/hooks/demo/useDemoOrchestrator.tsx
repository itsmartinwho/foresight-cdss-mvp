'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { Patient } from '@/lib/types';
import { DemoStateService, DemoStage } from '@/services/demo/DemoStateService';
import { DemoDataService, DEMO_PATIENT_ID } from '@/services/demo/DemoDataService';
import { DemoAnimationService } from '@/services/demo/DemoAnimationService';

export interface DemoOrchestratorState {
  hasDemoRun: boolean;
  isDemoModalOpen: boolean;
  isDemoActive: boolean;
  demoStage: DemoStage;
  demoPatient: Patient | null;
  animatedTranscript: string;
  diagnosisText: string;
  treatmentPlanText: string;
}

export interface DemoOrchestratorActions {
  startDemo: () => Promise<void>;
  skipDemo: () => void;
  exitDemo: () => void;
  exitDemoStayOnPage: () => void;
  advanceDemoStage: (stage: DemoStage) => void;
  setDemoModalOpen: (isOpen: boolean) => void;
}

export type UseDemoOrchestratorReturn = DemoOrchestratorState & DemoOrchestratorActions;

export function useDemoOrchestrator(): UseDemoOrchestratorReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoStageRef = useRef<DemoStage>('introModal');
  const [mounted, setMounted] = useState(false);

  // Core state
  const [hasDemoRun, setHasDemoRunState] = useState<boolean>(() => {
    const hasRun = DemoStateService.hasDemoRun();
    console.log('Demo orchestrator initializing - hasDemoRun:', hasRun);
    return hasRun;
  });
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(() => {
    const shouldShow = DemoStateService.shouldShowDemoModal();
    console.log('Demo orchestrator initializing - shouldShowDemoModal:', shouldShow);
    return shouldShow;
  });
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [demoStage, setDemoStage] = useState<DemoStage>(() => {
    const stage = DemoStateService.getInitialDemoStage();
    console.log('Demo orchestrator initializing - initialDemoStage:', stage);
    return stage;
  });
  
  // Data state
  const [demoPatient, setDemoPatient] = useState<Patient | null>(null);
  const [animatedTranscript, setAnimatedTranscript] = useState<string>('');

  // Update ref when stage changes
  useEffect(() => {
    demoStageRef.current = demoStage;
  }, [demoStage]);

  // Set mounted to true on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with localStorage changes (cross-tab)
  useEffect(() => {
    return DemoStateService.addStorageListener((hasRun) => {
      if (hasDemoRun !== hasRun) {
        setHasDemoRunState(hasRun);
        if (hasRun) {
          setDemoStage('finished');
          setIsDemoModalOpen(false);
          setIsDemoActive(false);
        } else {
          setDemoStage('introModal');
          setIsDemoModalOpen(true);
        }
      }
    });
  }, [hasDemoRun]);

  // Detect demo route after navigation to restore active state
  useEffect(() => {
    if (mounted) {
      const isDemoRoute = searchParams.get('demo') === 'true';
      if (isDemoRoute && !isDemoActive) {
        console.log('Restoring demo active state from URL');
        setIsDemoActive(true);
      }
    }
  }, [searchParams, isDemoActive, mounted]);

  // Demo stage management
  const advanceDemoStage = useCallback((stage: DemoStage) => {
    console.log(`Advancing demo stage to: ${stage}`);
    setDemoStage(stage);
  }, []);

  // Animation management
  useEffect(() => {
    console.log('[DemoOrchestrator] Animation effect triggered:', { isDemoActive, demoStage });
    if (isDemoActive && demoStage === 'animatingTranscript') {
      const transcriptLines = DemoDataService.getTranscriptLines();
      console.log('[DemoOrchestrator] Starting transcript animation with lines:', transcriptLines.length);
      
      DemoAnimationService.startTranscriptAnimation(
        transcriptLines,
        (animatedText) => {
          console.log('[DemoOrchestrator] Updating animated transcript, length:', animatedText.length);
          setAnimatedTranscript(animatedText);
        },
        () => {
          console.log('[DemoOrchestrator] Animation completed, advancing to simulatingPlanGeneration');
          advanceDemoStage('simulatingPlanGeneration');
        }
      );
    }

    return () => {
      if (demoStage !== 'animatingTranscript') {
        DemoAnimationService.clearTranscriptAnimation();
      }
    };
  }, [isDemoActive, demoStage, advanceDemoStage]);

  useEffect(() => {
    if (isDemoActive && demoStage === 'simulatingPlanGeneration') {
      DemoAnimationService.startClinicalPlanSimulation(
        () => advanceDemoStage('showingPlan')
      );
    }

    return () => {
      if (demoStage !== 'simulatingPlanGeneration') {
        DemoAnimationService.clearClinicalPlanSimulation();
      }
    };
  }, [isDemoActive, demoStage, advanceDemoStage]);

  // Demo actions
  const resetDemoAnimationStates = useCallback(() => {
    DemoAnimationService.clearAllAnimations();
    setAnimatedTranscript('');
  }, []);

  const exitDemo = useCallback(() => {
    resetDemoAnimationStates();
    setIsDemoActive(false);
    DemoStateService.setDemoRun(true);
    setHasDemoRunState(true);
    setDemoStage('finished');
    setIsDemoModalOpen(false);
    router.push('/');
    supabaseDataService.clearDemoPatientData(DEMO_PATIENT_ID);
  }, [resetDemoAnimationStates, router]);

  const exitDemoStayOnPage = useCallback(() => {
    resetDemoAnimationStates();
    setIsDemoActive(false);
    DemoStateService.setDemoRun(true);
    setHasDemoRunState(true);
    setDemoStage('finished');
    setIsDemoModalOpen(false);
    router.push('/');
    supabaseDataService.clearDemoPatientData(DEMO_PATIENT_ID);
  }, [resetDemoAnimationStates, router]);

  const startDemo = useCallback(async () => {
    console.log('Starting demo...');
    resetDemoAnimationStates();
    setIsDemoModalOpen(false);
    setIsDemoActive(true);
    setDemoStage('selectingPatient');
    
    try {
      // Use mock demo patient data instead of fetching from database
      const demoPatient = DemoDataService.getPatientData();
      console.log('Demo patient data:', demoPatient);
      setDemoPatient(demoPatient);
      DemoStateService.setDemoRun(true);
      setHasDemoRunState(true);
      
      const encounterData = DemoDataService.getEncounterData();
      console.log('Demo encounter data:', encounterData);
      console.log('Navigating to patient workspace...');
      router.push(`/patients/${demoPatient.id}?demo=true&encounterId=${encounterData.id}`);
      advanceDemoStage('navigatingToWorkspace');
    } catch (error) {
      console.error("Error starting demo:", error);
      exitDemo();
    }
  }, [resetDemoAnimationStates, router, advanceDemoStage, exitDemo]);

  const skipDemo = useCallback(() => {
    resetDemoAnimationStates();
    setIsDemoModalOpen(false);
    setIsDemoActive(false);
    DemoStateService.setDemoRun(true);
    setHasDemoRunState(true);
    setDemoStage('finished');
    supabaseDataService.clearDemoPatientData(DEMO_PATIENT_ID);
  }, [resetDemoAnimationStates]);

  const setDemoModalOpen = useCallback((open: boolean) => {
    setIsDemoModalOpen(open);
    if (!open && !isDemoActive && !hasDemoRun && demoStageRef.current === 'introModal') {
      advanceDemoStage('fabVisible');
    }
  }, [isDemoActive, hasDemoRun, advanceDemoStage]);

  return {
    // State
    hasDemoRun,
    isDemoModalOpen,
    isDemoActive,
    demoStage,
    demoPatient,
    animatedTranscript,
    diagnosisText: DemoDataService.getDiagnosisText(),
    treatmentPlanText: DemoDataService.getTreatmentPlanText(),
    
    // Actions
    startDemo,
    skipDemo,
    exitDemo,
    exitDemoStayOnPage,
    advanceDemoStage,
    setDemoModalOpen,
  };
} 