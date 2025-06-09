'use client';
import React, { useState } from 'react';
import { createPortal } from "react-dom";
import type { Patient, Encounter, EncounterDetailsWrapper } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, Eye, X, Trash } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDifferentialDiagnoses } from '@/hooks/useDifferentialDiagnoses';
import DifferentialDiagnosesList from '@/components/diagnosis/DifferentialDiagnosesList';

interface ConsolidatedConsultationTabProps {
  patient: Patient | null;
  selectedEncounter: Encounter | null;
  allEncounters: EncounterDetailsWrapper[] | null;
  onDeleteEncounter: (encounterId: string) => void;
}

export default function ConsolidatedConsultationTab({ 
  patient, 
  selectedEncounter, 
  allEncounters, 
  onDeleteEncounter 
}: ConsolidatedConsultationTabProps) {
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);

  // Call hooks before any early returns to follow Rules of Hooks
  const {
    differentialDiagnoses,
    isLoading: isLoadingDifferentials,
    error: differentialDiagnosesError,
    addDifferentialDiagnosis,
    updateDifferentialDiagnosis,
    deleteDifferentialDiagnosis,
  } = useDifferentialDiagnoses({
    patientId: patient?.id || '',
    encounterId: selectedEncounter?.encounterIdentifier || '',
    autoLoad: true,
  });

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No patient data available.</p>
      </div>
    );
  }

  if (!selectedEncounter) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No consultation selected.</p>
          <p className="text-sm text-muted-foreground/60">Please select a consultation from the dropdown above.</p>
        </div>
      </div>
    );
  }

  // Find the encounter details for the selected encounter
  const encounterDetails = allEncounters?.find(ew => ew.encounter.id === selectedEncounter.id);
  const { diagnoses = [], labResults = [] } = encounterDetails || {};

  // Mock trials data - same as TrialsTab
  const MOCK_TRIALS_DATA: Record<string, { id: string; title: string; distance: string; fit: number }[]> = {
    "1": [
      { id: "NCT055123", title: "Abatacept vs Placebo in Early RA", distance: "12 mi", fit: 0.82, },
      { id: "NCT061987", title: "JAK Inhibitor Tofacitinib Long-Term Safety", distance: "32 mi", fit: 0.77, },
    ],
  };
  const trialRows = MOCK_TRIALS_DATA[patient.id] || [];

  // Prior auth data - similar to PriorAuthTab logic
  const medicationForAuth = selectedEncounter.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedEncounter.priorAuthJustification || "No specific justification provided for this encounter.";

  return (
    <div className="space-y-6">
      {/* Encounter Header */}
      <div className="glass-dense rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            Consultation - {new Date(selectedEncounter.scheduledStart).toLocaleDateString()}
          </h2>
          <span className="text-sm text-muted-foreground font-mono">
            ID: {selectedEncounter.encounterIdentifier}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Reason:</span> {selectedEncounter.reasonDisplayText || selectedEncounter.reasonCode || "General encounter"}
        </p>
      </div>

      {/* Summary Notes (SOAP Notes) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Summary Notes
            {selectedEncounter.transcript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscriptPanel(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Transcript
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedEncounter.soapNote ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                {selectedEncounter.soapNote}
              </pre>
            </div>
          ) : (
            <p className="text-muted-foreground italic">No summary notes available for this consultation.</p>
          )}
        </CardContent>
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnoses.length > 0 ? (
            <div className="space-y-4">
              {diagnoses.map((dx, index) => (
                <div key={`dx-${index}-${dx.code || 'unknown'}`} className="bg-white/5 border border-white/10 rounded-md p-4 space-y-3">
                  {/* Full Diagnosis Description - prominently displayed */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Diagnosis</h4>
                    <p className="text-lg font-semibold text-foreground leading-relaxed">
                      {dx.description || "No description available"}
                    </p>
                  </div>
                  
                  {/* ICD Code - displayed below */}
                  {dx.code && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ICD Code:</span>
                        <span className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                          {dx.code}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No final diagnosis recorded for this consultation.</p>
          )}
          
          <div className="mt-6 pt-6 border-t border-border/50">
             <h3 className="text-base font-semibold text-foreground mb-4">Differential Diagnoses</h3>
             <DifferentialDiagnosesList
                diagnoses={differentialDiagnoses}
                isLoading={isLoadingDifferentials}
                isEditable={true}
                onAddDiagnosis={addDifferentialDiagnosis}
                onSaveDiagnosis={(diagnosis, index) => updateDifferentialDiagnosis(index, diagnosis)}
                onDeleteDiagnosis={deleteDifferentialDiagnosis}
                className="w-full"
              />
          </div>
        </CardContent>
      </Card>

      {/* Treatment */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedEncounter.treatments && selectedEncounter.treatments.length > 0 ? (
            <RenderDetailTable 
              title='' 
              dataArray={selectedEncounter.treatments} 
              headers={['Drug', 'Status', 'Rationale']} 
              columnAccessors={['drug', 'status', 'rationale']} 
            />
          ) : (
            <p className="text-muted-foreground italic">No treatments recorded for this consultation.</p>
          )}
        </CardContent>
      </Card>

      {/* Labs */}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Results</CardTitle>
        </CardHeader>
        <CardContent>
          {labResults.length > 0 ? (
            <RenderDetailTable 
              title='' 
              dataArray={labResults} 
              headers={['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag']} 
              columnAccessors={['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag']} 
            />
          ) : (
            <p className="text-muted-foreground italic">No lab results recorded for this consultation.</p>
          )}
        </CardContent>
      </Card>

      {/* Prior Authorization */}
      <Card>
        <CardHeader>
          <CardTitle>Prior Authorization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Patient Name</label>
                <Input disabled value={`${patient.name || 'N/A'}`} className="bg-white/5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date of Birth</label>
                <Input disabled value={`${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}`} className="bg-white/5" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Medication / Treatment</label>
                <Input disabled value={medicationForAuth} className="bg-white/5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Diagnosis (Description)</label>
                <Input disabled value={diagnosisForAuth} className="bg-white/5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Diagnosis (ICD-10 Code)</label>
                <Input disabled value={diagnosisCodeForAuth} className="bg-white/5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Clinical Justification</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-sm text-foreground">{justificationForAuth}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Prior Auth Document
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Referral
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Trials */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Trials</CardTitle>
        </CardHeader>
        <CardContent>
          {trialRows.length > 0 ? (
            <RenderDetailTable 
              title='' 
              dataArray={trialRows} 
              headers={['ID', 'Title', 'Distance', 'Fit Score']} 
              columnAccessors={['id', 'title', 'distance', 'fit']} 
            />
          ) : (
            <div className="text-center space-y-2 py-8">
              <p className="text-muted-foreground">No clinical trial information available for this patient.</p>
              <p className="text-sm text-muted-foreground/60">Trial recommendations will appear here based on patient diagnosis and treatment history.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Panel - Portal-rendered to document body */}
      {showTranscriptPanel && selectedEncounter?.transcript && 
        createPortal(
          <div className="fixed inset-0 z-[9999] glass-backdrop flex items-center justify-center">
            <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl relative w-[90%] max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
                onClick={() => setShowTranscriptPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="pt-8 pb-4 border-b border-border/50">
                <h2 className="text-xl font-semibold mb-2">Consultation Transcript</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedEncounter.scheduledStart).toLocaleDateString()} - {selectedEncounter.reasonDisplayText || selectedEncounter.reasonCode}
                </p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                    {selectedEncounter.transcript}
                  </pre>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Danger Zone */}
      <div className="space-y-4 pt-6 mt-6 border-t border-destructive/20">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <div className="bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-colors rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Delete This Consultation
              </h3>
              <p className="text-sm text-muted-foreground">
                This will mark the consultation as deleted. It can be restored later from the &quot;All Data&quot; tab.
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => selectedEncounter && onDeleteEncounter(selectedEncounter.id)}
              disabled={!selectedEncounter}
            >
              <Trash className="mr-2 h-4 w-4"/>
              Delete Consultation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 