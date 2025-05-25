'use client';
import React from 'react';
import type { Patient, Admission, Diagnosis, LabResult, AdmissionDetailsWrapper } from "@/lib/types";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { supabaseDataService } from "@/lib/supabaseDataService"; // For restore/delete

interface AllDataViewTabProps {
  detailedPatientData: { patient: Patient; admissions: AdmissionDetailsWrapper[] } | null;
  setDetailedPatientData: React.Dispatch<React.SetStateAction<{ patient: Patient; admissions: AdmissionDetailsWrapper[] } | null>>;
}

export default function AllDataViewTab({ detailedPatientData, setDetailedPatientData }: AllDataViewTabProps) {
  if (!detailedPatientData || !detailedPatientData.patient) return <div className="p-6 text-center text-muted-foreground">No data loaded or patient missing.</div>;

  const { patient, admissions } = detailedPatientData;

  const deletedAdmissions = (admissions || []).filter(adWrapper => adWrapper.admission.isDeleted);

  const handleRestore = (adToRestore: Admission) => {
    if (patient && supabaseDataService.restoreAdmission(patient.id, adToRestore.id)) {
      setDetailedPatientData((prevData) => {
        if (!prevData) return prevData;
        const newAdmissions = prevData.admissions.map(adWrapper => {
          if (adWrapper.admission.id === adToRestore.id) {
            return {
              ...adWrapper,
              admission: {
                ...adWrapper.admission,
                isDeleted: false,
                deletedAt: undefined,
              },
            };
          }
          return adWrapper;
        });
        return { ...prevData, admissions: newAdmissions };
      });
    }
  };

  const handlePermanentDelete = (adToDelete: Admission) => {
    if (patient && supabaseDataService.permanentlyDeleteAdmission(patient.id, adToDelete.id)) {
      setDetailedPatientData((prevData) => {
        if (!prevData) return prevData;
        const newAdmissions = prevData.admissions.filter(adWrapper => adWrapper.admission.id !== adToDelete.id);
        return { ...prevData, admissions: newAdmissions };
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

      {/* Active Admissions History */}
      <h3 className="text-lg font-semibold mt-4 text-step-1">Admissions History</h3>
      {admissions.filter(adWrapper => !adWrapper.admission.isDeleted).map((adWrapper: AdmissionDetailsWrapper, index: number) => {
        const adm: Admission = adWrapper.admission;
        const diagnoses: Diagnosis[] = adWrapper.diagnoses || [];
        const labResults: LabResult[] = adWrapper.labResults || [];

        return (
          <Card key={adm.id || index} className="mt-2 bg-glass glass-dense backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-step-0">Admission on {new Date(adm.scheduledStart).toLocaleString()} (ID: {adm.id})</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/80">Reason: {adm.reasonCode || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><strong>Actual Start:</strong> {adm.actualStart ? new Date(adm.actualStart).toLocaleString() : 'N/A'}</div>
              <div><strong>Actual End:</strong> {adm.actualEnd ? new Date(adm.actualEnd).toLocaleString() : 'N/A'}</div>
              {adm.transcript && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">Transcript:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{adm.transcript}</pre></div>}
              {adm.soapNote && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">SOAP Note:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{adm.soapNote}</pre></div>}
              <RenderDetailTable title="Diagnoses" dataArray={diagnoses} headers={['Code', 'Description']} columnAccessors={['code', 'description']} />
              <RenderDetailTable title="Lab Results" dataArray={labResults} headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} />
              <RenderDetailTable title="Treatments" dataArray={adm.treatments || []} headers={['Drug', 'Status', 'Rationale']} columnAccessors={['drug', 'status', 'rationale']} />
            </CardContent>
          </Card>
        );
      })}
      {admissions.filter(adWrapper => !adWrapper.admission.isDeleted).length === 0 && <p className="text-muted-foreground">No admission history for this patient.</p>}

      {/* Deleted Items Section */}
      <h3 className="text-lg font-semibold mt-8 text-red-500">Deleted Items</h3>
      {deletedAdmissions.length === 0 && <p className="text-muted-foreground">No deleted items.</p>}

      {deletedAdmissions.map((admWrapper: AdmissionDetailsWrapper, index: number) => {
        const adm: Admission = admWrapper.admission;
        return (
          <Card key={adm.id || index} className="mt-2 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 transition">
            <CardHeader>
              <CardTitle className="text-step-0">Consultation • {new Date(adm.scheduledStart).toLocaleString()}</CardTitle>
              <CardDescription className="text-xs">Deleted at {adm.deletedAt ? new Date(adm.deletedAt).toLocaleString() : '—'}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" size="sm" iconLeft={<ArrowCounterClockwise />} onClick={()=>handleRestore(adm)}>Restore</Button>
              <Button variant="destructive" size="sm" iconLeft={<Trash />} onClick={()=>handlePermanentDelete(adm)}>Delete permanently</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 