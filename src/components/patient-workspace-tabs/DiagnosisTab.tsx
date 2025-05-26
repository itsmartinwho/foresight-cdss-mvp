'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiagnosisTabProps {
  patient: Patient | null;
  allEncounters: Array<{ encounter: Encounter; diagnoses: Diagnosis[]; labResults: LabResult[] }> | null;
}

export default function DiagnosisTab({ patient, allEncounters }: DiagnosisTabProps) {
  if (!patient) {
    return <div className="p-4 text-muted-foreground">No patient data available.</div>;
  }

  if (!allEncounters || allEncounters.length === 0) {
    return <div className="p-4 text-muted-foreground">No encounter data to display diagnoses for.</div>;
  }

  const encountersWithDiagnoses = allEncounters.filter(encWrapper => encWrapper.diagnoses && encWrapper.diagnoses.length > 0);

  if (encountersWithDiagnoses.length === 0) {
    return <div className="p-4 text-muted-foreground">No diagnoses found across all encounters for this patient.</div>;
  }

  return (
    <ScrollArea className="h-full p-1">
      <div className="space-y-4 p-3">
        {encountersWithDiagnoses.map(({ encounter, diagnoses }) => (
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
              {diagnoses.length > 0 ? (
                <ul className="divide-y divide-border">
                  {diagnoses.map((dx, index) => (
                    <li key={`${encounter.id}-dx-${dx.code || index}`} className="py-2">
                      <p className="font-medium text-sm">{dx.description || "No description"}</p>
                      {dx.code && <p className="text-xs text-muted-foreground">Code: {dx.code}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No diagnoses recorded for this encounter.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 