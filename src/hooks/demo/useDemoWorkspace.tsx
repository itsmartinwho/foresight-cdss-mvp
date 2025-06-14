'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Patient } from '@/lib/types';
import { DEMO_PATIENT_ID } from '@/services/demo/DemoDataService';
import { DemoStage } from '@/services/demo/DemoStateService';

export interface DemoWorkspaceBehavior {
  shouldRunDemoUi: boolean;
  isDemoPanelOpen: boolean;
  exitDemo: () => void;
}

interface UseDemoWorkspaceProps {
  patient: Patient;
  isDemoActive: boolean;
  demoStage: DemoStage;
  demoPatient: Patient | null;
  exitDemo: () => void;
  advanceDemoStage: (stage: DemoStage) => void;
}

export function useDemoWorkspace({
  patient,
  isDemoActive,
  demoStage,
  demoPatient,
  exitDemo,
  advanceDemoStage,
}: UseDemoWorkspaceProps): DemoWorkspaceBehavior {
  const searchParams = useSearchParams();
  const isDemoRouteActive = searchParams.get('demo') === 'true';
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(false);

  // Determine if we should run demo UI
  const shouldRunDemoUi = isDemoActive && 
                         isDemoRouteActive && 
                         demoPatient?.id === patient.id;

  // Debug logging
  console.log('useDemoWorkspace debug:', {
    isDemoActive,
    isDemoRouteActive,
    demoPatientId: demoPatient?.id,
    patientId: patient.id,
    shouldRunDemoUi,
    demoStage,
    isDemoPanelOpen
  });

  // Handle demo lifecycle and panel visibility
  useEffect(() => {
    // Simplified logic: if we're on demo route and in the right stage, open panel
    if (isDemoRouteActive && isDemoActive) {
      if (demoStage === 'consultationPanelReady') {
        console.log('Opening demo consultation panel');
        setIsDemoPanelOpen(true);
        advanceDemoStage('animatingTranscript');
      } else if (demoStage === 'finished' || !isDemoActive) {
        setIsDemoPanelOpen(false);
      }
    } else if (isDemoPanelOpen) {
      // If demo conditions are no longer met, close panel
      setIsDemoPanelOpen(false);
    }
  }, [demoStage, isDemoRouteActive, isDemoActive, advanceDemoStage, isDemoPanelOpen]);
  
  // Exit demo if patient ID mismatches or demo is no longer active on this route
  useEffect(() => {
    if (isDemoActive && isDemoRouteActive && demoPatient?.id !== patient.id) {
      exitDemo();
    }
    if (isDemoActive && !isDemoRouteActive && patient.id === demoPatient?.id) {
      // If demo was active for this patient, but demo param is gone, exit
      exitDemo();
    }
  }, [isDemoActive, isDemoRouteActive, demoPatient?.id, patient.id, exitDemo]);

  return {
    shouldRunDemoUi,
    isDemoPanelOpen,
    exitDemo,
  };
} 