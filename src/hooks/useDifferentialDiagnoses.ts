import { useState, useEffect, useCallback } from 'react';
import { DifferentialDiagnosis } from '@/lib/types';

interface UseDifferentialDiagnosesProps {
  patientId: string;
  encounterId?: string;
  autoLoad?: boolean;
}

interface UseDifferentialDiagnosesReturn {
  differentialDiagnoses: DifferentialDiagnosis[];
  isLoading: boolean;
  error: string | null;
  generateDifferentialDiagnoses: (transcript?: string, patientData?: any) => Promise<void>;
  refreshDifferentialDiagnoses: () => Promise<void>;
  updateDifferentialDiagnosis: (index: number, updatedDiagnosis: DifferentialDiagnosis) => void;
  clearDifferentialDiagnoses: () => void;
}

export function useDifferentialDiagnoses({
  patientId,
  encounterId,
  autoLoad = false,
}: UseDifferentialDiagnosesProps): UseDifferentialDiagnosesReturn {
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<DifferentialDiagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate differential diagnoses via API
  const generateDifferentialDiagnoses = useCallback(async (transcript?: string, patientData?: any) => {
    if (!patientId || !encounterId) {
      setError('Patient ID and Encounter ID are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clinical-engine/differential-diagnoses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          transcript,
          patientData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate differential diagnoses: ${response.statusText}`);
      }

      const result = await response.json();
      setDifferentialDiagnoses(result.differentialDiagnoses || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating differential diagnoses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, encounterId]);

  // Refresh differential diagnoses from database
  const refreshDifferentialDiagnoses = useCallback(async () => {
    if (!patientId || !encounterId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement API endpoint to fetch existing differential diagnoses from database
      // For now, this is a placeholder
      const response = await fetch(`/api/differential-diagnoses?patientId=${patientId}&encounterId=${encounterId}`);
      
      if (response.ok) {
        const result = await response.json();
        setDifferentialDiagnoses(result.differentialDiagnoses || []);
      } else {
        // If endpoint doesn't exist yet, just clear the error
        setError(null);
      }
    } catch (err) {
      // For now, don't treat this as an error since the endpoint might not exist
      console.log('Differential diagnoses refresh not available yet:', err);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, encounterId]);

  // Update a specific differential diagnosis
  const updateDifferentialDiagnosis = useCallback((index: number, updatedDiagnosis: DifferentialDiagnosis) => {
    setDifferentialDiagnoses(prev => {
      const newDiagnoses = [...prev];
      if (index >= 0 && index < newDiagnoses.length) {
        newDiagnoses[index] = updatedDiagnosis;
      }
      return newDiagnoses;
    });
  }, []);

  // Clear all differential diagnoses
  const clearDifferentialDiagnoses = useCallback(() => {
    setDifferentialDiagnoses([]);
    setError(null);
  }, []);

  // Auto-load differential diagnoses if requested
  useEffect(() => {
    if (autoLoad && patientId && encounterId) {
      refreshDifferentialDiagnoses();
    }
  }, [autoLoad, patientId, encounterId, refreshDifferentialDiagnoses]);

  return {
    differentialDiagnoses,
    isLoading,
    error,
    generateDifferentialDiagnoses,
    refreshDifferentialDiagnoses,
    updateDifferentialDiagnosis,
    clearDifferentialDiagnoses,
  };
} 