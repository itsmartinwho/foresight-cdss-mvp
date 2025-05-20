'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import SeverityBadge from "@/components/ui/SeverityBadge";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

export default function DiagnosisTab({ patient, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }>
}) {
  return (
    <div className="p-6 space-y-6">
      {patient.alerts && patient.alerts.length > 0 && (
        <Card className="mt-6 mb-6 bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-step-0">Active Complex Case Alerts for {patient.name || patient.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center space-x-3 p-3 border rounded-md shadow-sm"
              >
                <SeverityBadge severity={alert.severity || 'Unknown'} />
                <p className="flex-grow text-sm text-muted-foreground truncate" title={alert.msg}>{alert.msg || 'No message'}</p>
                <div className="text-xs text-muted-foreground/80 whitespace-nowrap">
                  {alert.confidence !== undefined ? `${Math.round(alert.confidence * 100)}%` : 'N/A'}
                  {' • '}
                  {alert.date || 'N/A'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display diagnoses for.</p>}
      {allAdmissions.map(({ admission, diagnoses }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          <RenderDetailTable title='Diagnoses for this visit' dataArray={diagnoses} headers={['Code', 'Description']} columnAccessors={['code', 'description']} />
        </div>
      ))}
    </div>
  );
} 