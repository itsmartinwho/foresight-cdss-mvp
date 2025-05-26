'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LabsTab({ patient, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ 
    admission: Admission; 
    diagnoses: Diagnosis[]; 
    labResults: LabResult[] 
  }>
}) {
  return (
    <ScrollArea className="h-full p-1">
      <div className="space-y-4 p-3">
        {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display labs for.</p>}
        {allAdmissions.map(({ admission, labResults }) => (
          <Card key={admission.id} className="shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Encounter on: {new Date(admission.scheduledStart).toLocaleString()}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Reason: {admission.reasonDisplayText || admission.reasonCode || 'N/A'}
              </p>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-medium mb-2">Labs for this encounter:</h4>
              <RenderDetailTable title='Labs for this encounter' dataArray={labResults} headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} />
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 