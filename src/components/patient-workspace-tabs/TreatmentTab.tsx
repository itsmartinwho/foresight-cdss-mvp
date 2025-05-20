'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult, Treatment } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

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
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display treatments for.</p>}
      {allAdmissions.map(({ admission }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          <RenderDetailTable title='Treatments for this visit' dataArray={admission.treatments || []} headers={['Drug', 'Status', 'Rationale']} columnAccessors={['drug', 'status', 'rationale']} />
        </div>
      ))}
    </div>
  );
} 