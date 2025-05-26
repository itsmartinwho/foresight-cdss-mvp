'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, Treatment, EncounterDetailsWrapper } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TreatmentTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function TreatmentTab({ patient, allEncounters }: TreatmentTabProps) {
  if (!patient) {
    return <div className="p-4 text-muted-foreground">No patient data available.</div>;
  }

  if (!allEncounters || allEncounters.length === 0) {
    return <div className="p-4 text-muted-foreground">No encounter data to display treatments for.</div>;
  }

  const encountersWithTreatments = allEncounters.filter(
    encWrapper => encWrapper.encounter.treatments && encWrapper.encounter.treatments.length > 0
  );

  if (encountersWithTreatments.length === 0) {
    return <div className="p-4 text-muted-foreground">No treatments found across all encounters for this patient.</div>;
  }

  return (
    <ScrollArea className="h-full p-1">
      <div className="space-y-4 p-3">
        {encountersWithTreatments.map(({ encounter }) => (
          <Card key={encounter.id} className="shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Encounter on: {new Date(encounter.scheduledStart).toLocaleString()}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
              </p>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-medium mb-2">Treatments for this encounter:</h4>
              <RenderDetailTable 
                title='Treatments' 
                dataArray={encounter.treatments || []} 
                headers={['Drug', 'Status', 'Rationale']} 
                columnAccessors={['drug', 'status', 'rationale']} 
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 