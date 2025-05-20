'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function HistoryTab({ patient, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ 
    admission: Admission; 
    diagnoses: Diagnosis[]; 
    labResults: LabResult[] 
  }>
}) {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="text-step-0">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>2025-04-24 – Initial consult: fatigue & joint pain.</p>
          <p>2025-04-24 – Labs ordered: ESR, CRP, RF, anti-CCP.</p>
          <p>2025-04-24 – AI suggested provisional RA diagnosis.</p>
        </CardContent>
      </Card>
    </div>
  );
} 