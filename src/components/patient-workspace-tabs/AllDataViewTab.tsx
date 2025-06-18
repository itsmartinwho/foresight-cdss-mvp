'use client';
import React, { useState } from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { supabaseDataService } from "@/lib/supabaseDataService"; // For restore/delete
import { toast } from "@/hooks/use-toast";

interface AllDataViewTabProps {
  detailedPatientData: { patient: Patient; encounters: EncounterDetailsWrapper[] } | null;
  setDetailedPatientData: React.Dispatch<React.SetStateAction<{ patient: Patient; encounters: EncounterDetailsWrapper[] } | null>>;
}

export default function AllDataViewTab({ detailedPatientData, setDetailedPatientData }: AllDataViewTabProps) {
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  if (!detailedPatientData || !detailedPatientData.patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-center text-muted-foreground">No data loaded or patient missing.</p>
      </div>
    );
  }

  const { patient, encounters } = detailedPatientData;

  const deletedEncounters = (encounters || []).filter(ew => ew.encounter.isDeleted);

  const handleRestore = async (encounterToRestore: Encounter) => {
    if (!patient) return;
    
    setRestoringIds(prev => new Set([...prev, encounterToRestore.id]));
    
    try {
      const success = await supabaseDataService.restoreEncounter(patient.id, encounterToRestore.id);
      
      if (success) {
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
        
        toast({ title: "Success", description: "Encounter restored successfully." });
      } else {
        toast({ title: "Error", description: "Failed to restore encounter. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to restore encounter", error);
      toast({ title: "Error", description: `Failed to restore encounter: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setRestoringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(encounterToRestore.id);
        return newSet;
      });
    }
  };

  const handlePermanentDelete = async (encounterToDelete: Encounter) => {
    if (!patient) return;
    
    setDeletingIds(prev => new Set([...prev, encounterToDelete.id]));
    
    try {
      const success = await supabaseDataService.permanentlyDeleteEncounter(patient.id, encounterToDelete.id);
      
      if (success) {
        setDetailedPatientData((prevData) => {
          if (!prevData) return prevData;
          const newEncounters = prevData.encounters.filter(ew => ew.encounter.id !== encounterToDelete.id);
          return { ...prevData, encounters: newEncounters };
        });
        
        toast({ title: "Success", description: "Encounter permanently deleted." });
      } else {
        toast({ title: "Error", description: "Failed to permanently delete encounter. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to permanently delete encounter", error);
      toast({ title: "Error", description: `Failed to permanently delete encounter: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(encounterToDelete.id);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
      {/* Demographics */}
      <div className="glass-dense rounded-lg p-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">Patient Demographics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {Object.entries(patient).map(([key, value]) => (
            (typeof value !== 'object' || value === null) && (
              <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-muted-foreground capitalize min-w-24">
                  {key.replace(/([A-Z])/g, ' $1')}:
                </span>
                <span className="text-foreground">{String(value)}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Active Encounters History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Encounters History</h2>
        {encounters.filter(ew => !ew.encounter.isDeleted)
          .sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime())
          .map((encounterWrapper: EncounterDetailsWrapper, index: number) => {
          const { encounter, diagnoses, labResults } = encounterWrapper;

          return (
            <div key={encounter.id || index} className="glass-dense rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Encounter on {new Date(encounter.scheduledStart).toLocaleDateString()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  ID: {encounter.encounterIdentifier} • Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Actual Start:</span>
                  <span className="ml-2 text-foreground">
                    {encounter.actualStart ? new Date(encounter.actualStart).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Actual End:</span>
                  <span className="ml-2 text-foreground">
                    {encounter.actualEnd ? new Date(encounter.actualEnd).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {encounter.transcript && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="font-semibold text-sm text-muted-foreground/80 mb-2">Transcript</h4>
                  <pre className="whitespace-pre-wrap text-xs text-foreground">{encounter.transcript}</pre>
                </div>
              )}

              {encounter.soapNote && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="font-semibold text-sm text-muted-foreground/80 mb-2">SOAP Note</h4>
                  <pre className="whitespace-pre-wrap text-xs text-foreground">{encounter.soapNote}</pre>
                </div>
              )}

              <div className="space-y-3">
                <RenderDetailTable title="Diagnoses" dataArray={diagnoses || []} headers={['Code', 'Description']} columnAccessors={['code', 'description']} />
                <RenderDetailTable title="Lab Results" dataArray={labResults || []} headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} />
                <RenderDetailTable title="Treatments" dataArray={encounter.treatments || []} headers={['Drug', 'Status', 'Rationale']} columnAccessors={['drug', 'status', 'rationale']} />
              </div>
            </div>
          );
        })}
        {encounters.filter(ew => !ew.encounter.isDeleted).length === 0 && (
          <p className="text-muted-foreground text-center py-8">No active encounter history for this patient.</p>
        )}
      </div>

      {/* Deleted Items Section */}
      {deletedEncounters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Deleted Items</h2>
          {deletedEncounters.map((encounterWrapper: EncounterDetailsWrapper, index: number) => {
            const { encounter } = encounterWrapper;
            return (
              <div key={encounter.id || index} className="bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-colors rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Encounter • {new Date(encounter.scheduledStart).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deleted at {encounter.deletedAt ? new Date(encounter.deletedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRestore(encounter)}
                      disabled={restoringIds.has(encounter.id) || deletingIds.has(encounter.id)}
                    >
                      <ArrowCounterClockwise className="mr-2 h-4 w-4"/>
                      {restoringIds.has(encounter.id) ? "Restoring..." : "Restore"}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handlePermanentDelete(encounter)}
                      disabled={restoringIds.has(encounter.id) || deletingIds.has(encounter.id)}
                    >
                      <Trash className="mr-2 h-4 w-4"/>
                      {deletingIds.has(encounter.id) ? "Deleting..." : "Delete permanently"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 