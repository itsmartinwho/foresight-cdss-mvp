'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult } from "@/lib/types";

interface DiagnosisTabProps {
  patient: Patient | null;
  allEncounters: Array<{ encounter: Encounter; diagnoses: Diagnosis[]; labResults: LabResult[] }> | null;
}

export default function DiagnosisTab({ patient, allEncounters }: DiagnosisTabProps) {
  if (!patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No patient data available.</p>
      </div>
    );
  }

  if (!allEncounters || allEncounters.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No encounter data to display diagnoses for.</p>
      </div>
    );
  }

  const encountersWithDiagnoses = allEncounters.filter(encWrapper => encWrapper.diagnoses && encWrapper.diagnoses.length > 0);

  if (encountersWithDiagnoses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No diagnoses found across all encounters for this patient.</p>
          <p className="text-sm text-muted-foreground/60">Diagnoses will appear here once they are recorded during encounters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {encountersWithDiagnoses.map(({ encounter, diagnoses }) => (
        <div key={encounter.id} className="bg-muted/20 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Encounter: {new Date(encounter.scheduledStart).toLocaleDateString()}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
            </p>
          </div>
          
          {diagnoses.length > 0 ? (
            <div className="space-y-2">
              {diagnoses.map((dx, index) => (
                <div key={`${encounter.id}-dx-${index}-${dx.code || 'unknown'}`} className="bg-background/30 rounded-md p-3 space-y-1">
                  <p className="font-semibold text-foreground">{dx.description || "No description"}</p>
                  {dx.code && (
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded w-fit">
                      Code: {dx.code}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No diagnoses recorded for this encounter.</p>
          )}
        </div>
      ))}
    </div>
  );
} 