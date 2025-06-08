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
  updateDifferentialDiagnosis: (index: number, updatedDiagnosis: DifferentialDiagnosis) => Promise<void>;
  addDifferentialDiagnosis: (newDiagnosis: Omit<DifferentialDiagnosis, 'likelihoodPercentage'>) => Promise<void>;
  deleteDifferentialDiagnosis: (index: number) => Promise<void>;
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
      const response = await fetch(`/api/differential-diagnoses?patientId=${patientId}&encounterId=${encounterId}`);
      
      if (response.ok) {
        const result = await response.json();
        // Convert database records to DifferentialDiagnosis format
        const convertedDiagnoses = (result.differentialDiagnoses || []).map((record: any) => ({
          name: record.diagnosis_name,
          likelihood: record.likelihood,
          keyFactors: record.key_factors || '',
          // These fields aren't in the current database schema but are part of the interface
          explanation: '',
          supportingEvidence: [],
          icdCodes: [],
          // Add database ID for editing purposes
          _databaseId: record.id,
          _rankOrder: record.rank_order
        }));
        setDifferentialDiagnoses(convertedDiagnoses);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch differential diagnoses');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching differential diagnoses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, encounterId]);

  // Update a specific differential diagnosis
  const updateDifferentialDiagnosis = useCallback(async (index: number, updatedDiagnosis: DifferentialDiagnosis) => {
    if (index < 0 || index >= differentialDiagnoses.length) return;
    
    const diagnosisToUpdate = differentialDiagnoses[index];
    const databaseId = (diagnosisToUpdate as any)._databaseId;
    
    if (!databaseId) {
      console.error('No database ID found for diagnosis to update');
      return;
    }

    try {
      const response = await fetch('/api/differential-diagnoses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: databaseId,
          diagnosisName: updatedDiagnosis.name,
          likelihood: updatedDiagnosis.likelihood,
          keyFactors: updatedDiagnosis.keyFactors,
        }),
      });

      if (response.ok) {
        // Update local state
        setDifferentialDiagnoses(prev => {
          const newDiagnoses = [...prev];
          newDiagnoses[index] = updatedDiagnosis;
          return newDiagnoses;
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update differential diagnosis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error updating differential diagnosis:', err);
    }
  }, [differentialDiagnoses]);

  // Add a new differential diagnosis
  const addDifferentialDiagnosis = useCallback(async (newDiagnosis: Omit<DifferentialDiagnosis, 'likelihoodPercentage'>) => {
    if (!patientId || !encounterId) {
      setError('Patient ID and Encounter ID are required');
      return;
    }

    try {
      const response = await fetch('/api/differential-diagnoses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          diagnosisName: newDiagnosis.name,
          likelihood: newDiagnosis.likelihood,
          keyFactors: newDiagnosis.keyFactors,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const convertedDiagnosis = {
          name: result.differentialDiagnosis.diagnosis_name,
          likelihood: result.differentialDiagnosis.likelihood,
          keyFactors: result.differentialDiagnosis.key_factors || '',
          explanation: '',
          supportingEvidence: [],
          icdCodes: [],
          _databaseId: result.differentialDiagnosis.id,
          _rankOrder: result.differentialDiagnosis.rank_order
        };
        
        setDifferentialDiagnoses(prev => [...prev, convertedDiagnosis]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add differential diagnosis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error adding differential diagnosis:', err);
    }
  }, [patientId, encounterId]);

  // Delete a differential diagnosis
  const deleteDifferentialDiagnosis = useCallback(async (index: number) => {
    if (index < 0 || index >= differentialDiagnoses.length) return;
    
    const diagnosisToDelete = differentialDiagnoses[index];
    const databaseId = (diagnosisToDelete as any)._databaseId;
    
    if (!databaseId) {
      console.error('No database ID found for diagnosis to delete');
      return;
    }

    try {
      const response = await fetch(`/api/differential-diagnoses?id=${databaseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDifferentialDiagnoses(prev => prev.filter((_, i) => i !== index));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete differential diagnosis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error deleting differential diagnosis:', err);
    }
  }, [differentialDiagnoses]);

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
    addDifferentialDiagnosis,
    deleteDifferentialDiagnosis,
    clearDifferentialDiagnoses,
  };
} 