'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LabsTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function LabsTab({ patient, allEncounters }: LabsTabProps) {
  if (!patient) {
    return <div className="p-4 text-muted-foreground">No patient data available.</div>;
  }

  if (!allEncounters || allEncounters.length === 0) {
    return <div className="p-4 text-muted-foreground">No encounter data to display labs for.</div>;
  }
  
  const encountersWithLabs = allEncounters.filter(
    encWrapper => encWrapper.labResults && encWrapper.labResults.length > 0
  );

  if (encountersWithLabs.length === 0) {
    return <div className="p-4 text-muted-foreground">No lab results found across all encounters for this patient.</div>;
  }

  return (
    <ScrollArea className="h-full p-1">
      <div className="space-y-4 p-3">
        {encountersWithLabs.map(({ encounter, labResults }) => (
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
              <h4 className="text-sm font-medium mb-2">Labs for this encounter:</h4>
              <RenderDetailTable 
                title='Labs' 
                dataArray={labResults} 
                headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} 
                columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} 
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 