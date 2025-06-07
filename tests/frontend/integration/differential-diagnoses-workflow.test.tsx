import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicalEngineProvider } from '@/contexts/ClinicalEngineContext';
import ConsultationPanel from '@/components/modals/ConsultationPanel';
import { Patient } from '@/lib/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock createPortal to render in the same container
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

const mockPatient: Patient = {
  id: 'patient-1',
  firstName: 'John',
  lastName: 'Doe',
  gender: 'Male',
  dateOfBirth: '1980-01-01',
};

const mockDifferentialDiagnoses = [
  {
    name: 'Rheumatoid Arthritis',
    likelihood: 'High',
    likelihoodPercentage: 85,
    keyFactors: 'Joint pain, morning stiffness, positive RF',
    explanation: 'Patient presents with symmetric joint pain and positive rheumatoid factor',
    supportingEvidence: ['Positive rheumatoid factor', 'Symmetric joint involvement'],
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

const mockFinalDiagnosis = {
  diagnosisName: 'Rheumatoid Arthritis',
  diagnosisCode: 'M05.79',
  confidence: 0.85,
  supportingEvidence: ['Positive RF', 'Symmetric involvement'],
  reasoningExplanation: 'Based on clinical presentation and lab results, RA is most likely',
  differentialDiagnoses: mockDifferentialDiagnoses,
  recommendedTests: ['Anti-CCP antibodies', 'ESR'],
  recommendedTreatments: ['Methotrexate 15mg weekly', 'Folic acid 5mg weekly'],
  clinicalTrialMatches: []
};

describe('Differential Diagnoses Workflow Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful encounter creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'encounter-1',
        patientId: 'patient-1',
        scheduledStart: new Date().toISOString(),
        scheduledEnd: new Date().toISOString(),
      }),
    });
  });

  it('completes full differential diagnoses workflow', async () => {
    // Mock differential diagnoses API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        differentialDiagnoses: mockDifferentialDiagnoses,
      }),
    });

    // Mock final diagnosis API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        diagnosticResult: mockFinalDiagnosis,
      }),
    });

    const mockOnClose = vi.fn();
    const mockOnConsultationCreated = vi.fn();

    render(
      <ClinicalEngineProvider>
        <ConsultationPanel
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onConsultationCreated={mockOnConsultationCreated}
        />
      </ClinicalEngineProvider>
    );

    // Wait for encounter creation and initial setup
    await waitFor(() => {
      expect(screen.getByText('New Consultation')).toBeInTheDocument();
    });

    // Add some transcript content
    const transcriptArea = screen.getByPlaceholderText('Transcription will appear here...');
    fireEvent.change(transcriptArea, {
      target: { value: 'Patient complains of joint pain and morning stiffness' }
    });

    // Click Clinical Plan button
    const clinicalPlanButton = screen.getByText('Clinical Plan');
    fireEvent.click(clinicalPlanButton);

    // Should show analyzing state
    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    // Should switch to differentials tab and show differential diagnoses
    await waitFor(() => {
      expect(screen.getByText('Differentials')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on differentials tab to see the content
    const differentialsTab = screen.getByText('Differentials');
    fireEvent.click(differentialsTab);

    // Should show differential diagnoses
    await waitFor(() => {
      expect(screen.getByText('#1 Rheumatoid Arthritis')).toBeInTheDocument();
      expect(screen.getByText('#2 Osteoarthritis')).toBeInTheDocument();
    });

    // Should show likelihood indicators
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();

    // Should show ICD codes
    expect(screen.getByText('M05.79')).toBeInTheDocument();
    expect(screen.getByText('M15.9')).toBeInTheDocument();

    // Wait for final diagnosis processing to complete
    await waitFor(() => {
      expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on diagnosis tab
    const diagnosisTab = screen.getByText('Diagnosis');
    fireEvent.click(diagnosisTab);

    // Should show final diagnosis
    await waitFor(() => {
      expect(screen.getByDisplayValue('Rheumatoid Arthritis')).toBeInTheDocument();
    });

    // Verify API calls were made correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/clinical-engine/differential-diagnoses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
        transcript: 'Patient complains of joint pain and morning stiffness',
      }),
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/clinical-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
        transcript: 'Patient complains of joint pain and morning stiffness',
      }),
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock failed differential diagnoses API call
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const mockOnClose = vi.fn();
    const mockOnConsultationCreated = vi.fn();

    render(
      <ClinicalEngineProvider>
        <ConsultationPanel
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onConsultationCreated={mockOnConsultationCreated}
        />
      </ClinicalEngineProvider>
    );

    // Wait for setup
    await waitFor(() => {
      expect(screen.getByText('New Consultation')).toBeInTheDocument();
    });

    // Add transcript content
    const transcriptArea = screen.getByPlaceholderText('Transcription will appear here...');
    fireEvent.change(transcriptArea, {
      target: { value: 'Test transcript content' }
    });

    // Click Clinical Plan button
    const clinicalPlanButton = screen.getByText('Clinical Plan');
    fireEvent.click(clinicalPlanButton);

    // Should show error toast or message
    await waitFor(() => {
      // The exact error handling depends on implementation
      // This test verifies the system doesn't crash on API errors
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows progressive loading states', async () => {
    let resolveDifferentials: (value: any) => void;
    let resolveFinal: (value: any) => void;

    const differentialsPromise = new Promise((resolve) => {
      resolveDifferentials = resolve;
    });

    const finalPromise = new Promise((resolve) => {
      resolveFinal = resolve;
    });

    // Mock delayed responses
    mockFetch
      .mockReturnValueOnce(differentialsPromise)
      .mockReturnValueOnce(finalPromise);

    const mockOnClose = vi.fn();
    const mockOnConsultationCreated = vi.fn();

    render(
      <ClinicalEngineProvider>
        <ConsultationPanel
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onConsultationCreated={mockOnConsultationCreated}
        />
      </ClinicalEngineProvider>
    );

    // Wait for setup
    await waitFor(() => {
      expect(screen.getByText('New Consultation')).toBeInTheDocument();
    });

    // Add transcript and start processing
    const transcriptArea = screen.getByPlaceholderText('Transcription will appear here...');
    fireEvent.change(transcriptArea, {
      target: { value: 'Test transcript' }
    });

    const clinicalPlanButton = screen.getByText('Clinical Plan');
    fireEvent.click(clinicalPlanButton);

    // Should show analyzing state
    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    // Resolve differentials
    resolveDifferentials!({
      ok: true,
      json: async () => ({ differentialDiagnoses: mockDifferentialDiagnoses }),
    });

    await waitFor(() => {
      expect(screen.getByText('Differentials')).toBeInTheDocument();
    });

    // Resolve final diagnosis
    resolveFinal!({
      ok: true,
      json: async () => ({ diagnosticResult: mockFinalDiagnosis }),
    });

    await waitFor(() => {
      expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    });
  });
}); 