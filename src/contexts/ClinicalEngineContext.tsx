'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DifferentialDiagnosis, DiagnosticResult } from '@/lib/types';

export type ClinicalEngineStage = 
  | 'idle' 
  | 'analyzing' 
  | 'differential' 
  | 'finalizing' 
  | 'complete' 
  | 'error';

interface ClinicalEngineState {
  stage: ClinicalEngineStage;
  isProcessing: boolean;
  differentialDiagnoses: DifferentialDiagnosis[];
  finalDiagnosis: DiagnosticResult | null;
  error: string | null;
  progress: number; // 0-100
}

interface ClinicalEngineContextType {
  state: ClinicalEngineState;
  startProcessing: (patientId: string, encounterId: string, transcript: string) => Promise<void>;
  updateStage: (stage: ClinicalEngineStage) => void;
  updateDifferentialDiagnoses: (diagnoses: DifferentialDiagnosis[]) => void;
  updateFinalDiagnosis: (diagnosis: DiagnosticResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ClinicalEngineState = {
  stage: 'idle',
  isProcessing: false,
  differentialDiagnoses: [],
  finalDiagnosis: null,
  error: null,
  progress: 0,
};

const ClinicalEngineContext = createContext<ClinicalEngineContextType | undefined>(undefined);

export function ClinicalEngineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClinicalEngineState>(initialState);

  const updateStage = useCallback((stage: ClinicalEngineStage) => {
    setState(prev => ({
      ...prev,
      stage,
      isProcessing: stage !== 'idle' && stage !== 'complete' && stage !== 'error',
      progress: getProgressForStage(stage),
    }));
  }, []);

  const updateDifferentialDiagnoses = useCallback((diagnoses: DifferentialDiagnosis[]) => {
    setState(prev => ({
      ...prev,
      differentialDiagnoses: diagnoses,
    }));
  }, []);

  const updateFinalDiagnosis = useCallback((diagnosis: DiagnosticResult) => {
    setState(prev => ({
      ...prev,
      finalDiagnosis: diagnosis,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      stage: error ? 'error' : prev.stage,
      isProcessing: error ? false : prev.isProcessing,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const startProcessing = useCallback(async (patientId: string, encounterId: string, transcript: string) => {
    reset();
    updateStage('analyzing');

    try {
      // Stage 1: Generate differential diagnoses
      updateStage('differential');
      const differentialsResponse = await fetch('/api/clinical-engine/differential-diagnoses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, encounterId, transcript }),
      });

      if (differentialsResponse.ok) {
        const differentialsResult = await differentialsResponse.json();
        updateDifferentialDiagnoses(differentialsResult.differentialDiagnoses || []);
      }

      // Stage 2: Generate final diagnosis and treatment plan
      updateStage('finalizing');
      const finalResponse = await fetch('/api/clinical-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, encounterId, transcript }),
      });

      if (!finalResponse.ok) {
        throw new Error(`Clinical engine failed: ${finalResponse.statusText}`);
      }

      const finalResult = await finalResponse.json();
      updateFinalDiagnosis(finalResult.diagnosticResult);
      
      // Update differential diagnoses from final result if available
      if (finalResult.diagnosticResult?.differentialDiagnoses) {
        updateDifferentialDiagnoses(finalResult.diagnosticResult.differentialDiagnoses);
      }

      updateStage('complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  }, [reset, updateStage, updateDifferentialDiagnoses, updateFinalDiagnosis, setError]);

  const contextValue: ClinicalEngineContextType = {
    state,
    startProcessing,
    updateStage,
    updateDifferentialDiagnoses,
    updateFinalDiagnosis,
    setError,
    reset,
  };

  return (
    <ClinicalEngineContext.Provider value={contextValue}>
      {children}
    </ClinicalEngineContext.Provider>
  );
}

export function useClinicalEngine() {
  const context = useContext(ClinicalEngineContext);
  if (context === undefined) {
    throw new Error('useClinicalEngine must be used within a ClinicalEngineProvider');
  }
  return context;
}

function getProgressForStage(stage: ClinicalEngineStage): number {
  switch (stage) {
    case 'idle':
      return 0;
    case 'analyzing':
      return 20;
    case 'differential':
      return 50;
    case 'finalizing':
      return 80;
    case 'complete':
      return 100;
    case 'error':
      return 0;
    default:
      return 0;
  }
} 