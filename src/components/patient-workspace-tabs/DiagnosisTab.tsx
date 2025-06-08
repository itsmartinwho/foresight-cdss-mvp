'use client';
import React, { useState, useEffect } from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, DifferentialDiagnosis } from "@/lib/types";
import DifferentialDiagnosesList from '@/components/diagnosis/DifferentialDiagnosesList';
import EditableDiagnosis from '@/components/diagnosis/EditableDiagnosis';
import { useDifferentialDiagnoses } from '@/hooks/useDifferentialDiagnoses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DiagnosisTabProps {
  patient: Patient | null;
  allEncounters: Array<{ encounter: Encounter; diagnoses: Diagnosis[]; labResults: LabResult[] }> | null;
}

export default function DiagnosisTab({ patient, allEncounters }: DiagnosisTabProps) {
  // Get the most recent encounter
  const mostRecentEncounter = allEncounters && allEncounters.length > 0 
    ? [...allEncounters].sort((a, b) => 
        new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime()
      )[0]
    : null;

  // Use the differential diagnoses hook
  const {
    differentialDiagnoses,
    isLoading: isLoadingDifferentials,
    error: differentialDiagnosesError,
    refreshDifferentialDiagnoses,
    updateDifferentialDiagnosis,
    addDifferentialDiagnosis,
    deleteDifferentialDiagnosis
  } = useDifferentialDiagnoses({
    patientId: patient?.id || '',
    encounterId: mostRecentEncounter?.encounter.encounterIdentifier || '',
    autoLoad: true
  });

  // Handle any errors
  useEffect(() => {
    if (differentialDiagnosesError) {
      console.error('Error with differential diagnoses:', differentialDiagnosesError);
    }
  }, [differentialDiagnosesError]);

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No patient data available.</p>
      </div>
    );
  }

  if (!allEncounters || allEncounters.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No encounter data to display diagnoses for.</p>
      </div>
    );
  }

  const encountersWithDiagnoses = allEncounters.filter(encWrapper => encWrapper.diagnoses && encWrapper.diagnoses.length > 0);

  const handleSaveFinalDiagnosis = async (newDiagnosis: string) => {
    // TODO: Implement saving final diagnosis to database
    console.log('Saving final diagnosis:', newDiagnosis);
  };

  const handleSaveReasoningExplanation = async (newExplanation: string) => {
    // TODO: Implement saving reasoning explanation to database
    console.log('Saving reasoning explanation:', newExplanation);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Diagnosis</TabsTrigger>
          <TabsTrigger value="history">Diagnosis History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Differential Diagnoses Section */}
          <Card>
            <CardHeader>
              <CardTitle>Differential Diagnoses</CardTitle>
              {mostRecentEncounter && (
                <p className="text-sm text-muted-foreground">
                  From encounter on {new Date(mostRecentEncounter.encounter.scheduledStart).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <DifferentialDiagnosesList
                diagnoses={differentialDiagnoses}
                isLoading={isLoadingDifferentials}
                isEditable={true}
                onSaveDiagnosis={(diagnosis, index) => updateDifferentialDiagnosis(index, diagnosis)}
                onDeleteDiagnosis={deleteDifferentialDiagnosis}
                onAddDiagnosis={addDifferentialDiagnosis}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Final Diagnosis Section */}
          <EditableDiagnosis
            title="Final Diagnosis"
            content={mostRecentEncounter?.diagnoses?.[0]?.description || ''}
            onSave={handleSaveFinalDiagnosis}
            isEditable={true}
            placeholder="Enter final diagnosis..."
            reasoningExplanation=""
            onSaveReasoningExplanation={handleSaveReasoningExplanation}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {encountersWithDiagnoses.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No diagnoses found across all encounters for this patient.</p>
                <p className="text-sm text-muted-foreground/60">Diagnoses will appear here once they are recorded during encounters.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {encountersWithDiagnoses.map(({ encounter, diagnoses }) => (
                <div key={encounter.id} className="glass-dense rounded-lg p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Encounter: {new Date(encounter.scheduledStart).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      Reason: {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
                    </p>
                  </div>
                  
                  {diagnoses.length > 0 ? (
                    <div className="space-y-2">
                      {diagnoses.map((dx, index) => (
                        <div key={`${encounter.id}-dx-${index}-${dx.code || 'unknown'}`} className="bg-white/5 border border-white/10 rounded-md p-3 space-y-1">
                          <p className="font-semibold text-foreground">{dx.description || "No description"}</p>
                          {dx.code && (
                            <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded w-fit">
                              Code: {dx.code}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No diagnoses recorded for this encounter.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 