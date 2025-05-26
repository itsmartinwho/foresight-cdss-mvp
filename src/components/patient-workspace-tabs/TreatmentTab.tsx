'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult, Treatment } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TreatmentTab({ patient, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ 
    admission: Admission; 
    diagnoses: Diagnosis[]; 
    labResults: LabResult[]; 
    treatments?: Treatment[] 
  }>
}) {
  return (
    <ScrollArea className="h-full p-1">
      <div className="space-y-4 p-3">
        {allAdmissions.map(({ admission }) => (
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
              <h4 className="text-sm font-medium mb-2">Treatments for this encounter:</h4>
              <RenderDetailTable title='Treatments for this encounter' dataArray={admission.treatments || []} headers={['Drug', 'Status', 'Rationale']} columnAccessors={['drug', 'status', 'rationale']} />
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 