'use client';

import { useEffect, useState, useRef } from 'react';
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
  const lastDebugKeyRef = useRef<string>('');

  // Determine if we should run demo UI
  const shouldRunDemoUi = isDemoActive && 
                         isDemoRouteActive && 
                         demoPatient?.id === patient.id;

  // Debug logging - only in development and throttled
  if (process.env.NODE_ENV === 'development') {
    const debugKey = `${isDemoActive}-${isDemoRouteActive}-${demoStage}-${isDemoPanelOpen}`;
    if (lastDebugKeyRef.current !== debugKey) {
      console.log('useDemoWorkspace debug:', {
        isDemoActive,
        isDemoRouteActive,
        demoPatientId: demoPatient?.id,
        patientId: patient.id,
        shouldRunDemoUi,
        demoStage,
        isDemoPanelOpen
      });
      lastDebugKeyRef.current = debugKey;
    }
  }

  // Handle demo lifecycle and panel visibility - only run when necessary conditions change
  useEffect(() => {
    // Only log when significant changes occur
    const shouldLog = demoStage === 'consultationPanelReady' || demoStage === 'finished';
    if (shouldLog) {
      console.log('[useDemoWorkspace] Effect triggered:', {
        isDemoRouteActive,
        isDemoActive,
        demoStage,
        isDemoPanelOpen
      });
    }
    
    // Simplified logic: if we're on demo route and in the right stage, open panel
    if (isDemoRouteActive && isDemoActive) {
      if (demoStage === 'consultationPanelReady' && !isDemoPanelOpen) {
        console.log('[useDemoWorkspace] Opening demo consultation panel');
        setIsDemoPanelOpen(true);
        // Don't advance stage here - let PatientWorkspaceViewModern handle it with delay
      } else if (demoStage === 'finished' && isDemoPanelOpen) {
        console.log('[useDemoWorkspace] Closing demo consultation panel - demo finished');
        setIsDemoPanelOpen(false);
      }
    } else if (isDemoPanelOpen) {
      console.log('[useDemoWorkspace] Closing demo consultation panel - conditions not met');
      // If demo conditions are no longer met, close panel
      setIsDemoPanelOpen(false);
    }
  }, [demoStage, isDemoRouteActive, isDemoActive]); // Remove isDemoPanelOpen to prevent loops
  
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