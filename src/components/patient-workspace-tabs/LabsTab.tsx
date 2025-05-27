'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

interface LabsTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function LabsTab({ patient, allEncounters }: LabsTabProps) {
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
        <p className="text-muted-foreground text-center">No encounter data to display labs for.</p>
      </div>
    );
  }
  
  const encountersWithLabs = allEncounters.filter(
    encWrapper => encWrapper.labResults && encWrapper.labResults.length > 0
  );

  if (encountersWithLabs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No lab results found across all encounters for this patient.</p>
          <p className="text-sm text-muted-foreground/60">Lab results will appear here once they are ordered during encounters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {encountersWithLabs.map(({ encounter, labResults }) => (
        <div key={encounter.id} className="bg-muted/30 rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Encounter: {new Date(encounter.scheduledStart).toLocaleDateString()}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
            </p>
          </div>
          
          {labResults && labResults.length > 0 ? (
            <div className="bg-background/50 rounded-md p-4">
              <RenderDetailTable 
                title='Laboratory Results' 
                dataArray={labResults} 
                headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} 
                columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} 
              />
            </div>
          ) : (
            <p className="text-muted-foreground italic">No lab results recorded for this encounter.</p>
          )}
        </div>
      ))}
    </div>
  );
} 