import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DifferentialDiagnosisCard from '@/components/diagnosis/DifferentialDiagnosisCard';
import { DifferentialDiagnosis } from '@/lib/types';

const mockDiagnosis: DifferentialDiagnosis = {
  name: 'Rheumatoid Arthritis',
  likelihood: 'High',
  likelihoodPercentage: 85,
  keyFactors: 'Joint pain, morning stiffness, positive RF',
  explanation: 'Patient presents with symmetric joint pain and positive rheumatoid factor',
  supportingEvidence: [
    'Positive rheumatoid factor',
    'Symmetric joint involvement',
    'Morning stiffness > 1 hour'
  ],
  icdCodes: [
    {
      code: 'M05.79',
      description: 'Rheumatoid arthritis with rheumatoid factor, multiple sites'
    }
  ]
};

describe('DifferentialDiagnosisCard', () => {
  it('renders diagnosis information correctly', () => {
    render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
      />
    );

    expect(screen.getByText('#1 Rheumatoid Arthritis')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Joint pain, morning stiffness, positive RF')).toBeInTheDocument();
  });

  it('displays ICD codes when provided', () => {
    render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
      />
    );

    expect(screen.getByText('M05.79')).toBeInTheDocument();
    expect(screen.getByText('Rheumatoid arthritis with rheumatoid factor, multiple sites')).toBeInTheDocument();
  });

  it('shows supporting evidence when provided', () => {
    render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
      />
    );

    expect(screen.getByText('Positive rheumatoid factor')).toBeInTheDocument();
    expect(screen.getByText('Symmetric joint involvement')).toBeInTheDocument();
    expect(screen.getByText('Morning stiffness > 1 hour')).toBeInTheDocument();
  });

  it('calls onEdit when card is clicked in editable mode', () => {
    const mockOnEdit = vi.fn();
    
    render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
        isEditable={true}
        onEdit={mockOnEdit}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnEdit).toHaveBeenCalledWith(mockDiagnosis);
  });

  it('applies correct likelihood color for high likelihood', () => {
    render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
      />
    );

    const progressBar = screen.getByText('85%').parentElement?.nextElementSibling;
    expect(progressBar?.firstElementChild).toHaveClass('bg-red-500');
  });

  it('highlights rank 1 diagnosis with ring', () => {
    const { container } = render(
      <DifferentialDiagnosisCard
        diagnosis={mockDiagnosis}
        rank={1}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('ring-2', 'ring-primary/50');
  });

  it('handles diagnosis without optional fields gracefully', () => {
    const minimalDiagnosis: DifferentialDiagnosis = {
      name: 'Test Diagnosis',
      likelihood: 'Medium',
      keyFactors: 'Some factors'
    };

    render(
      <DifferentialDiagnosisCard
        diagnosis={minimalDiagnosis}
        rank={2}
      />
    );

    expect(screen.getByText('#2 Test Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Some factors')).toBeInTheDocument();
  });
}); 