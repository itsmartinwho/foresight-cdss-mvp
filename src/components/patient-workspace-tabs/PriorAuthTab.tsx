'use client';
import React, { useState, useEffect } from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, Treatment, EncounterDetailsWrapper } from "@/lib/types";
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No encounters available for this patient.</p>
          <p className="text-sm text-muted-foreground/60">Prior authorization requests will appear here once encounters are recorded.</p>
        </div>
      </div>
    );
  }

  const selectedEncounterDetails = allEncounters.find(ew => ew.encounter.id === selectedEncounterState?.id);
  const medicationForAuth = selectedEncounterDetails?.encounter.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = selectedEncounterDetails?.diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = selectedEncounterDetails?.diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedEncounterDetails?.encounter.priorAuthJustification || "No specific justification provided for this encounter.";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="priorauth-encounter-select" className="block text-sm font-semibold text-muted-foreground mb-2">
          Select Encounter for Prior Authorization:
        </label>
        <Select
          value={selectedEncounterState?.id || ""}
          onValueChange={(encounterId) => {
            const newSelected = allEncounters.find(ew => ew.encounter.id === encounterId)?.encounter || null;
            setSelectedEncounterState(newSelected);
          }}
        >
          <SelectTrigger className="w-full sm:w-96">
            <SelectValue placeholder="Select an encounter..." />
          </SelectTrigger>
          <SelectContent>
            {allEncounters
              .sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime())
              .map(({ encounter }) => (
              <SelectItem key={encounter.id} value={encounter.id}>
                {new Date(encounter.scheduledStart).toLocaleDateString()} - {encounter.reasonDisplayText || encounter.reasonCode || 'Encounter'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEncounterState ? (
        <div className="glass-dense rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Prior Authorization Draft</h2>
            <p className="text-sm text-muted-foreground/80">
              For encounter on: {new Date(selectedEncounterState.scheduledStart).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pa-patient-name" className="block text-sm font-medium text-muted-foreground mb-1">Patient Name</label>
              <Input id="pa-patient-name" disabled value={`${currentPatientInfo.name || 'N/A'}`} className="bg-white/5" />
            </div>
            <div>
              <label htmlFor="pa-dob" className="block text-sm font-medium text-muted-foreground mb-1">Date of Birth</label>
              <Input id="pa-dob" disabled value={`${currentPatientInfo.dateOfBirth ? new Date(currentPatientInfo.dateOfBirth).toLocaleDateString() : 'N/A'}`} className="bg-white/5" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pa-medication" className="block text-sm font-medium text-muted-foreground mb-1">Medication / Treatment</label>
              <Input id="pa-medication" disabled value={medicationForAuth} className="bg-white/5" />
            </div>
            <div>
              <label htmlFor="pa-diag-desc" className="block text-sm font-medium text-muted-foreground mb-1">Diagnosis (Description)</label>
              <Input id="pa-diag-desc" disabled value={diagnosisForAuth} className="bg-white/5" />
            </div>
            <div>
              <label htmlFor="pa-diag-code" className="block text-sm font-medium text-muted-foreground mb-1">Diagnosis (ICD-10 Code)</label>
              <Input id="pa-diag-code" disabled value={diagnosisCodeForAuth} className="bg-white/5" />
            </div>
          </div>

          <div>
            <label htmlFor="pa-justification" className="block text-sm font-medium text-muted-foreground mb-1">Justification:</label>
            <textarea
              id="pa-justification"
              disabled
              value={justificationForAuth}
              className="w-full h-24 p-3 text-sm border border-white/10 rounded-md bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon/50 resize-none"
            />
          </div>

          <Button className="w-full sm:w-auto" size="default">
            <FileText className="mr-2 h-4 w-4" /> 
            Generate PDF (Placeholder)
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-center text-muted-foreground">Please select an encounter to view prior authorization details.</p>
        </div>
      )}
    </div>
  );
} 