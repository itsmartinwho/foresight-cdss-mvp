'use client';
import React, { useState, useEffect } from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, Treatment, EncounterDetailsWrapper } from "@/lib/types";
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText } from '@phosphor-icons/react';
import LoadingAnimation from "@/components/LoadingAnimation";

interface PriorAuthTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function PriorAuthTab({ patient: currentPatientInfo, allEncounters }: PriorAuthTabProps) {
  const [selectedEncounterState, setSelectedEncounterState] = useState<Encounter | null>(null);
  const [isLoadingPA, setIsLoadingPA] = useState(true);

  useEffect(() => {
    if (allEncounters && allEncounters.length > 0) {
      const sortedEncounters = [...allEncounters].sort((a, b) =>
        new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime()
      );
      setSelectedEncounterState(sortedEncounters[0].encounter);
    } else {
      setSelectedEncounterState(null);
    }
    setIsLoadingPA(false);
  }, [allEncounters]);

  if (isLoadingPA || !currentPatientInfo) {
    return <LoadingAnimation />;
  }

  if (!allEncounters || allEncounters.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No encounters available for this patient.</div>;
  }

  const selectedEncounterDetails = allEncounters.find(ew => ew.encounter.id === selectedEncounterState?.id);
  const medicationForAuth = selectedEncounterDetails?.encounter.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = selectedEncounterDetails?.diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = selectedEncounterDetails?.diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedEncounterDetails?.encounter.priorAuthJustification || "No specific justification provided for this encounter.";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="priorauth-encounter-select" className="block text-sm font-medium text-muted-foreground mb-1">Select Encounter for Prior Authorization:</label>
        <select
          id="priorauth-encounter-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border bg-background focus:outline-none focus:ring-neon focus:border-neon rounded-md shadow-sm"
          value={selectedEncounterState?.id || ""}
          onChange={(e) => {
            const encounterId = e.target.value;
            const newSelected = allEncounters.find(ew => ew.encounter.id === encounterId)?.encounter || null;
            setSelectedEncounterState(newSelected);
          }}
        >
          <option value="" disabled={!selectedEncounterState}>-- Select an encounter --</option>
          {allEncounters.map(({ encounter }) => (
            <option key={encounter.id} value={encounter.id}>
              {new Date(encounter.scheduledStart).toLocaleString()} - {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
            </option>
          ))}
        </select>
      </div>

      {selectedEncounterState ? (
        <Card className="bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-step-0">Prior Authorization Draft</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">For encounter on: {new Date(selectedEncounterState.scheduledStart).toLocaleString()}</CardDescription>
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
            <Button className="mt-3 text-step--1" size="sm">
              <FileText className="mr-2 h-4 w-4" /> Generate PDF (Placeholder)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground">Please select an encounter to view prior authorization details.</p>
      )}
    </div>
  );
} 