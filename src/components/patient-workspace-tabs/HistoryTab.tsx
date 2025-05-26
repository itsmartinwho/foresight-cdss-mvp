'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface HistoryTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function HistoryTab({ patient, allEncounters }: HistoryTabProps) {
  if (!patient) {
    return <div className="p-6 text-muted-foreground">No patient data available.</div>;
  }

  if (!allEncounters || allEncounters.length === 0) {
    return <div className="p-6 text-muted-foreground">No historical encounter data to display.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="text-step-0">Encounter History</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {allEncounters.sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime()).map(({ encounter, diagnoses, labResults }) => (
            <div key={encounter.id} className="p-3 border border-border/50 rounded-md shadow-sm bg-background/30">
              <h3 className="font-semibold text-base">
                {new Date(encounter.scheduledStart).toLocaleDateString()} - {encounter.reasonDisplayText || encounter.reasonCode || "Encounter"}
              </h3>
              <p className="text-xs text-muted-foreground mb-1">
                ID: {encounter.encounterIdentifier}
              </p>
              {diagnoses && diagnoses.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-medium text-muted-foreground">Diagnoses:</p>
                  <ul className="list-disc list-inside pl-2 text-xs">
                    {diagnoses.map((dx, i) => <li key={`dx-${dx.code || i}`}>{dx.description || dx.code}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}