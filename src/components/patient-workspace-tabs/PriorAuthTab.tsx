'use client';
import React, { useState, useEffect } from 'react';
import type { Patient, Admission, Diagnosis, LabResult, Treatment } from "@/lib/types";
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText } from '@phosphor-icons/react';
import LoadingAnimation from "@/components/LoadingAnimation";

export default function PriorAuthTab({ patient: currentPatientInfo, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ 
    admission: Admission; 
    diagnoses: Diagnosis[]; 
    labResults: LabResult[]; 
    treatments?: Treatment[] 
  }>
}) {
  const [selectedAdmissionState, setSelectedAdmissionState] = useState<Admission | null>(null);
  const [isLoadingPA, setIsLoadingPA] = useState(true);

  // const searchParams = useSearchParams(); // Not used in this tab directly, but kept if original logic had a reason

  useEffect(() => {
    if (allAdmissions && allAdmissions.length > 0) {
      const sortedAdmissions = [...allAdmissions].sort((a, b) =>
        new Date(b.admission.scheduledStart).getTime() - new Date(a.admission.scheduledStart).getTime()
      );
      setSelectedAdmissionState(sortedAdmissions[0].admission);
    } else {
      setSelectedAdmissionState(null);
    }
    setIsLoadingPA(false);
  }, [allAdmissions]);

  if (isLoadingPA) {
    return <LoadingAnimation />;
  }

  const selectedAdmissionDetails = allAdmissions.find(ad => ad.admission.id === selectedAdmissionState?.id);
  const medicationForAuth = selectedAdmissionDetails?.admission.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedAdmissionDetails?.admission.priorAuthJustification || "No specific justification provided for this admission.";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="priorauth-admission-select" className="block text-sm font-medium text-muted-foreground mb-1">Select Consultation for Prior Authorization:</label>
        <select
          id="priorauth-admission-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border bg-background focus:outline-none focus:ring-neon focus:border-neon rounded-md shadow-sm"
          value={selectedAdmissionState?.id || ""}
          onChange={(e) => {
            const admissionId = e.target.value;
            const newSelected = allAdmissions.find(ad => ad.admission.id === admissionId)?.admission || null;
            setSelectedAdmissionState(newSelected);
          }}
        >
          <option value="" disabled={!selectedAdmissionState}>-- Select a consultation --</option>
          {allAdmissions.map(({ admission }) => (
            <option key={admission.id} value={admission.id}>
              {new Date(admission.scheduledStart).toLocaleString()} - {admission.reason || 'N/A'}
            </option>
          ))}
        </select>
      </div>

      {selectedAdmissionState ? (
        <Card className="bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-step-0">Prior Authorization Draft</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">For consultation on: {new Date(selectedAdmissionState.scheduledStart).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <label htmlFor="pa-patient-name" className="block text-xs font-medium text-muted-foreground">Patient Name</label>
              <Input id="pa-patient-name" disabled value={`${currentPatientInfo.name || 'N/A'}`} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-dob" className="block text-xs font-medium text-muted-foreground">Date of Birth</label>
              <Input id="pa-dob" disabled value={`${currentPatientInfo.dateOfBirth ? new Date(currentPatientInfo.dateOfBirth).toLocaleDateString() : 'N/A'}`} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-medication" className="block text-xs font-medium text-muted-foreground">Medication / Treatment</label>
              <Input id="pa-medication" disabled value={medicationForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-diag-desc" className="block text-xs font-medium text-muted-foreground">Diagnosis (Description)</label>
              <Input id="pa-diag-desc" disabled value={diagnosisForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-diag-code" className="block text-xs font-medium text-muted-foreground">Diagnosis (ICD-10 Code)</label>
              <Input id="pa-diag-code" disabled value={diagnosisCodeForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-justification" className="block text-xs font-medium text-muted-foreground">Justification:</label>
              <textarea
                id="pa-justification"
                disabled
                value={justificationForAuth}
                className="mt-1 block w-full shadow-sm sm:text-sm border-border rounded-md h-24 bg-muted/30 p-2"
              />
            </div>
            <Button className="mt-3 text-step--1" size="sm" iconLeft={<FileText />}>Generate PDF (Placeholder)</Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground">Please select a consultation to view prior authorization details.</p>
      )}
    </div>
  );
} 