'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

export default function LabsTab({ patient, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ 
    admission: Admission; 
    diagnoses: Diagnosis[]; 
    labResults: LabResult[] 
  }>
}) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display labs for.</p>}
      {allAdmissions.map(({ admission, labResults }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          <RenderDetailTable title='Labs for this visit' dataArray={labResults} headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} />
        </div>
      ))}
    </div>
  );
} 