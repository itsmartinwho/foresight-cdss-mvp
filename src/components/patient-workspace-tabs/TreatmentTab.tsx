'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, Treatment, EncounterDetailsWrapper } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

interface TreatmentTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function TreatmentTab({ patient, allEncounters }: TreatmentTabProps) {
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
        <p className="text-muted-foreground text-center">No encounter data to display treatments for.</p>
      </div>
    );
  }

  const encountersWithTreatments = allEncounters.filter(
    encWrapper => encWrapper.encounter.treatments && encWrapper.encounter.treatments.length > 0
  );

  if (encountersWithTreatments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No treatments found across all encounters for this patient.</p>
          <p className="text-sm text-muted-foreground/60">Treatments will appear here once they are prescribed during encounters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {encountersWithTreatments.map(({ encounter }) => (
        <div key={encounter.id} className="glass-dense rounded-lg p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Encounter: {new Date(encounter.scheduledStart).toLocaleDateString()}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
            </p>
          </div>
          
          {encounter.treatments && encounter.treatments.length > 0 ? (
            <RenderDetailTable 
              title='Treatments' 
              dataArray={encounter.treatments} 
              headers={['Drug', 'Status', 'Rationale']} 
              columnAccessors={['drug', 'status', 'rationale']} 
            />
          ) : (
            <p className="text-muted-foreground italic">No treatments recorded for this encounter.</p>
          )}
        </div>
      ))}
    </div>
  );
} 