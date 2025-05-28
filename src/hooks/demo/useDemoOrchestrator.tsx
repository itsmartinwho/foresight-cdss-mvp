'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  advanceDemoStage: (stage: DemoStage) => void;
  setDemoModalOpen: (isOpen: boolean) => void;
}

export type UseDemoOrchestratorReturn = DemoOrchestratorState & DemoOrchestratorActions;

export function useDemoOrchestrator(): UseDemoOrchestratorReturn {
  const router = useRouter();
  const demoStageRef = useRef<DemoStage>('introModal');

  // Core state
  const [hasDemoRun, setHasDemoRunState] = useState<boolean>(() => DemoStateService.hasDemoRun());
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(() => DemoStateService.shouldShowDemoModal());
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [demoStage, setDemoStage] = useState<DemoStage>(() => DemoStateService.getInitialDemoStage());
  
  // Data state
  const [demoPatient, setDemoPatient] = useState<Patient | null>(null);
  const [animatedTranscript, setAnimatedTranscript] = useState<string>('');

  // Update ref when stage changes
  useEffect(() => {
    demoStageRef.current = demoStage;
  }, [demoStage]);

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

  // Demo stage management
  const advanceDemoStage = useCallback((stage: DemoStage) => {
    console.log(`Advancing demo stage to: ${stage}`);
    setDemoStage(stage);
  }, []);

  // Animation management
  useEffect(() => {
    if (isDemoActive && demoStage === 'animatingTranscript') {
      const transcriptLines = DemoDataService.getTranscriptLines();
      
      DemoAnimationService.startTranscriptAnimation(
        transcriptLines,
        setAnimatedTranscript,
        () => advanceDemoStage('simulatingPlanGeneration')
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
    router.push('/dashboard');
  }, [resetDemoAnimationStates, router]);

  const startDemo = useCallback(async () => {
    resetDemoAnimationStates();
    setIsDemoModalOpen(false);
    setIsDemoActive(true);
    setDemoStage('selectingPatient');
    
    try {
      // Use mock demo patient data instead of fetching from database
      const demoPatient = DemoDataService.getPatientData();
      setDemoPatient(demoPatient);
      DemoStateService.setDemoRun(true);
      setHasDemoRunState(true);
      
      const encounterData = DemoDataService.getEncounterData();
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
    advanceDemoStage,
    setDemoModalOpen,
  };
} 