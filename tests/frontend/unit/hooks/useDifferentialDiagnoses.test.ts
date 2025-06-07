import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDifferentialDiagnoses } from '@/hooks/useDifferentialDiagnoses';
import { DifferentialDiagnosis } from '@/lib/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockDifferentialDiagnoses: DifferentialDiagnosis[] = [
  {
    name: 'Rheumatoid Arthritis',
    likelihood: 'High',
    likelihoodPercentage: 85,
    keyFactors: 'Joint pain, morning stiffness',
    explanation: 'Autoimmune condition affecting joints',
    supportingEvidence: ['Positive RF', 'Symmetric involvement'],
    icdCodes: [{ code: 'M05.79', description: 'RA with RF, multiple sites' }]
  },
  {
    name: 'Osteoarthritis',
    likelihood: 'Medium',
    likelihoodPercentage: 60,
    keyFactors: 'Age-related joint wear',
    explanation: 'Degenerative joint disease',
    supportingEvidence: ['Age > 50', 'Joint space narrowing'],
    icdCodes: [{ code: 'M15.9', description: 'Polyosteoarthritis, unspecified' }]
  }
];

describe('useDifferentialDiagnoses', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    expect(result.current.differentialDiagnoses).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('generates differential diagnoses successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        differentialDiagnoses: mockDifferentialDiagnoses,
      }),
    });

    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    await act(async () => {
      await result.current.generateDifferentialDiagnoses('test transcript');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/clinical-engine/differential-diagnoses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
        transcript: 'test transcript',
        patientData: undefined,
      }),
    });

    expect(result.current.differentialDiagnoses).toEqual(mockDifferentialDiagnoses);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    await act(async () => {
      await result.current.generateDifferentialDiagnoses('test transcript');
    });

    expect(result.current.differentialDiagnoses).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to generate differential diagnoses: Internal Server Error');
  });

  it('requires patientId and encounterId for generation', async () => {
    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: '',
        encounterId: 'encounter-1',
      })
    );

    await act(async () => {
      await result.current.generateDifferentialDiagnoses('test transcript');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Patient ID and Encounter ID are required');
  });

  it('updates differential diagnosis correctly', () => {
    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    // First set some diagnoses
    act(() => {
      result.current.updateDifferentialDiagnosis(0, mockDifferentialDiagnoses[0]);
    });

    // Update the first diagnosis
    const updatedDiagnosis = {
      ...mockDifferentialDiagnoses[0],
      likelihood: 'Medium' as const,
      likelihoodPercentage: 70,
    };

    act(() => {
      result.current.updateDifferentialDiagnosis(0, updatedDiagnosis);
    });

    expect(result.current.differentialDiagnoses[0]).toEqual(updatedDiagnosis);
  });

  it('clears differential diagnoses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        differentialDiagnoses: mockDifferentialDiagnoses,
      }),
    });

    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    // Generate some diagnoses first
    await act(async () => {
      await result.current.generateDifferentialDiagnoses('test transcript');
    });

    expect(result.current.differentialDiagnoses).toHaveLength(2);

    // Clear them
    act(() => {
      result.current.clearDifferentialDiagnoses();
    });

    expect(result.current.differentialDiagnoses).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('sets loading state during generation', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(promise);

    const { result } = renderHook(() =>
      useDifferentialDiagnoses({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
      })
    );

    // Start generation
    act(() => {
      result.current.generateDifferentialDiagnoses('test transcript');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ differentialDiagnoses: mockDifferentialDiagnoses }),
      });
      await promise;
    });

    // Should no longer be loading
    expect(result.current.isLoading).toBe(false);
  });
}); 