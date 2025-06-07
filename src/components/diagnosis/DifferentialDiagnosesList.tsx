'use client';

import React from 'react';
import { DifferentialDiagnosis } from '@/lib/types';
import DifferentialDiagnosisCard from './DifferentialDiagnosisCard';
import { CircleNotch, Stethoscope } from '@phosphor-icons/react';

interface DifferentialDiagnosesListProps {
  diagnoses: DifferentialDiagnosis[];
  isLoading?: boolean;
  isEditable?: boolean;
  onEditDiagnosis?: (diagnosis: DifferentialDiagnosis, index: number) => void;
  maxCount?: number;
  className?: string;
}

export default function DifferentialDiagnosesList({
  diagnoses,
  isLoading = false,
  isEditable = false,
  onEditDiagnosis,
  maxCount = 5,
  className = '',
}: DifferentialDiagnosesListProps) {
  if (isLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-center py-8 space-x-2">
          <CircleNotch className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Generating differential diagnoses...</span>
        </div>
      </div>
    );
  }

  if (!diagnoses || diagnoses.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Stethoscope className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">No differential diagnoses available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Differential diagnoses will appear here once the clinical engine processes the consultation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Limit the number of diagnoses displayed
  const displayedDiagnoses = diagnoses.slice(0, maxCount);

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Differential Diagnoses</h3>
          <p className="text-sm text-muted-foreground">
            {diagnoses.length} diagnos{diagnoses.length === 1 ? 'is' : 'es'} ranked by likelihood
          </p>
        </div>
        {diagnoses.length > maxCount && (
          <span className="text-xs text-muted-foreground">
            Showing top {maxCount} of {diagnoses.length}
          </span>
        )}
      </div>

      {/* Diagnoses Grid */}
      <div className="grid gap-4">
        {displayedDiagnoses.map((diagnosis, index) => (
          <DifferentialDiagnosisCard
            key={`${diagnosis.name}-${index}`}
            diagnosis={diagnosis}
            rank={index + 1}
            isEditable={isEditable}
            onEdit={onEditDiagnosis ? (d) => onEditDiagnosis(d, index) : undefined}
          />
        ))}
      </div>

      {/* Footer info for truncated list */}
      {diagnoses.length > maxCount && (
        <div className="text-center pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {diagnoses.length - maxCount} additional diagnos{diagnoses.length - maxCount === 1 ? 'is' : 'es'} not shown
          </p>
        </div>
      )}
    </div>
  );
} 