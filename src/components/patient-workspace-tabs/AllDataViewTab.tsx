'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { supabaseDataService } from "@/lib/supabaseDataService"; // For restore/delete

interface AllDataViewTabProps {
  detailedPatientData: { patient: Patient; encounters: EncounterDetailsWrapper[] } | null;
  setDetailedPatientData: React.Dispatch<React.SetStateAction<{ patient: Patient; encounters: EncounterDetailsWrapper[] } | null>>;
}

export default function AllDataViewTab({ detailedPatientData, setDetailedPatientData }: AllDataViewTabProps) {
  if (!detailedPatientData || !detailedPatientData.patient) return <div className="p-6 text-center text-muted-foreground">No data loaded or patient missing.</div>;

  const { patient, encounters } = detailedPatientData;

  const deletedEncounters = (encounters || []).filter(ew => ew.encounter.isDeleted);

  const handleRestore = (encounterToRestore: Encounter) => {
    if (patient && supabaseDataService.restoreEncounter(patient.id, encounterToRestore.id)) {
      setDetailedPatientData((prevData) => {
        if (!prevData) return prevData;
        const newEncounters = prevData.encounters.map(ew => {
          if (ew.encounter.id === encounterToRestore.id) {
            return {
              ...ew,
              encounter: {
                ...ew.encounter,
                isDeleted: false,
                deletedAt: undefined,
              },
            };
          }
          return ew;
        });
        return { ...prevData, encounters: newEncounters };
      });
    }
  };

  const handlePermanentDelete = (encounterToDelete: Encounter) => {
    if (patient && supabaseDataService.permanentlyDeleteEncounter(patient.id, encounterToDelete.id)) {
      setDetailedPatientData((prevData) => {
        if (!prevData) return prevData;
        const newEncounters = prevData.encounters.filter(ew => ew.encounter.id !== encounterToDelete.id);
        return { ...prevData, encounters: newEncounters };
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Demographics */}
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader><CardTitle className="text-step-1">Patient Demographics</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {Object.entries(patient).map(([key, value]) => (
            (typeof value !== 'object' || value === null) &&
            <div key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(value)}</div>
          ))}
        </CardContent>
      </Card>

      {/* Active Encounters History */}
      <h3 className="text-lg font-semibold mt-4 text-step-1">Encounters History</h3>
      {encounters.filter(ew => !ew.encounter.isDeleted).map((encounterWrapper: EncounterDetailsWrapper, index: number) => {
        const { encounter, diagnoses, labResults } = encounterWrapper;

        return (
          <Card key={encounter.id || index} className="mt-2 bg-glass glass-dense backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-step-0">Encounter on {new Date(encounter.scheduledStart).toLocaleString()} (ID: {encounter.encounterIdentifier})</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/80">Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><strong>Actual Start:</strong> {encounter.actualStart ? new Date(encounter.actualStart).toLocaleString() : 'N/A'}</div>
              <div><strong>Actual End:</strong> {encounter.actualEnd ? new Date(encounter.actualEnd).toLocaleString() : 'N/A'}</div>
              {encounter.transcript && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">Transcript:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{encounter.transcript}</pre></div>}
              {encounter.soapNote && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">SOAP Note:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{encounter.soapNote}</pre></div>}
              <RenderDetailTable title="Diagnoses" dataArray={diagnoses || []} headers={['Code', 'Description']} columnAccessors={['code', 'description']} />
              <RenderDetailTable title="Lab Results" dataArray={labResults || []} headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} />
              <RenderDetailTable title="Treatments" dataArray={encounter.treatments || []} headers={['Drug', 'Status', 'Rationale']} columnAccessors={['drug', 'status', 'rationale']} />
            </CardContent>
          </Card>
        );
      })}
      {encounters.filter(ew => !ew.encounter.isDeleted).length === 0 && <p className="text-muted-foreground">No active encounter history for this patient.</p>}

      {/* Deleted Items Section */}
      <h3 className="text-lg font-semibold mt-8 text-red-500">Deleted Items</h3>
      {deletedEncounters.length === 0 && <p className="text-muted-foreground">No deleted items.</p>}

      {deletedEncounters.map((encounterWrapper: EncounterDetailsWrapper, index: number) => {
        const { encounter } = encounterWrapper;
        return (
          <Card key={encounter.id || index} className="mt-2 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 transition">
            <CardHeader>
              <CardTitle className="text-step-0">Encounter • {new Date(encounter.scheduledStart).toLocaleString()}</CardTitle>
              <CardDescription className="text-xs">Deleted at {encounter.deletedAt ? new Date(encounter.deletedAt).toLocaleString() : '—'}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>handleRestore(encounter)}><ArrowCounterClockwise className="mr-2 h-4 w-4"/>Restore</Button>
              <Button variant="destructive" size="sm" onClick={()=>handlePermanentDelete(encounter)}><Trash className="mr-2 h-4 w-4"/>Delete permanently</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 