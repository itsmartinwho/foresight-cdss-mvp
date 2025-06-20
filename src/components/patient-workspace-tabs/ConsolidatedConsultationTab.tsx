'use client';
import React, { useState } from 'react';
import { createPortal } from "react-dom";
import type { Patient, Encounter, EncounterDetailsWrapper } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, Eye, X, Trash, CircleNotch } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDifferentialDiagnoses } from '@/hooks/useDifferentialDiagnoses';
import DifferentialDiagnosesList from '@/components/diagnosis/DifferentialDiagnosesList';
import { 
  EditableTextField, 
  EditableDateTimeField, 
  EditableTable, 
  EditableArrayField, 
  SOAPNoteEditor, 
  TranscriptEditorModal 
} from '@/components/ui/editable';
import { RichTreatmentEditor } from '@/components/ui/rich-treatment-editor';
import { useRichContentEditor } from '@/hooks/useRichContentEditor';
import PriorAuthorizationForm from '@/components/forms/PriorAuthorizationForm';
import ReferralForm from '@/components/forms/ReferralForm';
import { useEditableEncounterFields } from '@/hooks/useEditableEncounterFields';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { toast } from '@/hooks/use-toast';

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
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  // Initialize editable fields hook
  const { updateField, updateFields, isSaving } = useEditableEncounterFields({
    patientId: patient?.id || '',
    encounterId: selectedEncounter?.id || '',
    onSuccess: (updatedEncounter) => {
      toast({
        title: "Success",
        description: "Field updated successfully",
      });
      // Force a re-render by updating the page timestamp
      window.dispatchEvent(new CustomEvent('encounter-field-updated', { 
        detail: { 
          patientId: patient?.id, 
          encounterId: selectedEncounter?.id,
          updatedEncounter 
        } 
      }));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Set up unsaved changes warning
  useUnsavedChangesWarning({ when: isSaving });

  // Rich content hooks for diagnosis and treatment
  const diagnosisRichContent = useRichContentEditor({
    encounterId: selectedEncounter?.id || '',
    contentType: 'diagnosis',
    onError: (error) => {
      console.error('Diagnosis rich content error:', error);
      toast({ 
        title: "Error loading diagnosis", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const treatmentRichContent = useRichContentEditor({
    encounterId: selectedEncounter?.id || '',
    contentType: 'treatments',
    onError: (error) => {
      console.error('Treatment rich content error:', error);
      toast({ 
        title: "Error loading treatment", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Call hooks before any early returns to follow Rules of Hooks
  // Fixed: Use the database encounter ID (UUID) for differential diagnoses
  const {
    differentialDiagnoses,
    isLoading: isLoadingDifferentials,
    error: differentialDiagnosesError,
    addDifferentialDiagnosis,
    updateDifferentialDiagnosis,
    deleteDifferentialDiagnosis,
  } = useDifferentialDiagnoses({
    patientId: patient?.id || '',
    encounterId: selectedEncounter?.id || '', // Use the UUID, not encounterIdentifier
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
      <div className="glass-dense rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Consultation Details
          </h2>
          <span className="text-sm text-muted-foreground font-mono">
            ID: {selectedEncounter.encounterIdentifier}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Scheduled Start</h3>
            <EditableDateTimeField
              value={selectedEncounter.scheduledStart || ''}
              onSave={(value) => updateField('scheduledStart', value)}
              displayClassName="text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Scheduled End</h3>
            <EditableDateTimeField
              value={selectedEncounter.scheduledEnd || ''}
              onSave={(value) => updateField('scheduledEnd', value)}
              displayClassName="text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Actual Start</h3>
            <EditableDateTimeField
              value={selectedEncounter.actualStart || ''}
              onSave={(value) => updateField('actualStart', value)}
              displayClassName="text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Actual End</h3>
            <EditableDateTimeField
              value={selectedEncounter.actualEnd || ''}
              onSave={(value) => updateField('actualEnd', value)}
              displayClassName="text-sm"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Reason for Visit</h3>
            <EditableTextField
              value={selectedEncounter.reasonDisplayText || selectedEncounter.reasonCode || ''}
              onSave={(value) => updateField('reasonDisplayText', value)}
              placeholder="Enter reason for consultation"
              multiline
              displayClassName="text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Insurance Status</h3>
            <EditableTextField
              value={selectedEncounter.insuranceStatus || ''}
              onSave={(value) => updateField('insuranceStatus', value)}
              placeholder="Enter insurance status"
              displayClassName="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Notes (SOAP Notes) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-between">
            Summary Notes
            <div className="flex gap-2">
              {selectedEncounter.transcript && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranscriptModal(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Transcript
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SOAPNoteEditor
            soapNote={selectedEncounter.soapNote || ''}
            onSave={(value) => updateField('soapNote', value)}
          />
        </CardContent>
      </Card>

      {/* Diagnosis - Enhanced with Rich Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Rich Content Diagnosis */}
          {diagnosisRichContent.content ? (
            <div className="mb-6">
              <RichTreatmentEditor
                content={diagnosisRichContent.content}
                onSave={diagnosisRichContent.saveContent}
                isDemo={false}
                label="Clinical Diagnosis"
              />
            </div>
          ) : diagnosisRichContent.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading diagnosis...</span>
            </div>
          ) : (
            /* Fallback to Text-only Diagnosis */
            diagnoses.length > 0 ? (
              <div className="space-y-4 mb-6">
                {diagnoses.map((dx, index) => (
                  <div key={`dx-${index}-${dx.code || 'unknown'}`} className="bg-white/5 border border-white/10 rounded-md p-4 space-y-3">
                    {/* Full Diagnosis Description - prominently displayed */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Diagnosis</h4>
                      <p className="text-sm leading-relaxed">
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
              <p className="text-sm text-muted-foreground/70 mb-6">No final diagnosis recorded for this consultation</p>
            )
          )}
          
          {/* Differential Diagnoses Section */}
          <div className="pt-6 border-t border-border/50">
             <h3 className="text-lg font-medium text-foreground mb-4">Differential Diagnoses</h3>
             {differentialDiagnosesError ? (
               <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                 Error loading differential diagnoses: {differentialDiagnosesError}
               </div>
             ) : null}
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

      {/* Treatment - Enhanced with Rich Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Treatment Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Rich Content Treatment */}
          {treatmentRichContent.content ? (
            <div className="mb-6">
              <RichTreatmentEditor
                content={treatmentRichContent.content}
                onSave={treatmentRichContent.saveContent}
                isDemo={false}
                label="Treatment Plans"
              />
            </div>
          ) : treatmentRichContent.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading treatment plans...</span>
            </div>
          ) : (
            /* Fallback to Basic Treatment Table */
            <EditableTable
              label=""
              treatments={selectedEncounter.treatments}
              onSave={(value) => updateField('treatments', value)}
            />
          )}
        </CardContent>
      </Card>

      {/* Labs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Laboratory Results</CardTitle>
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
            <p className="text-sm text-muted-foreground/70">No lab results recorded for this consultation</p>
          )}
        </CardContent>
      </Card>

      {/* Prior Authorization */}
      <PriorAuthorizationForm
        patient={patient}
        encounter={selectedEncounter}
        diagnoses={diagnoses}
        onSave={async (formData) => {
          try {
            const response = await fetch('/api/forms/prior-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save', formData })
            });
            
            if (!response.ok) throw new Error('Failed to save form');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Save failed');
            
            // Update the encounter with relevant form data
            await updateField('priorAuthJustification', formData.clinicalJustification);
            
          } catch (error) {
            console.error('Error saving prior auth form:', error);
            throw error;
          }
        }}
        onGeneratePDF={async (formData) => {
          try {
            const response = await fetch('/api/forms/prior-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'generate-pdf', formData })
            });
            
            if (!response.ok) throw new Error('Failed to generate PDF');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'PDF generation failed');
            
            // Download the PDF data
            if (result.pdfData) {
              const binaryString = atob(result.pdfData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: result.mimeType || 'text/html' });
              
              // Import PDFGenerator for download function
              const { PDFGenerator } = await import('@/lib/forms/pdfGenerator');
              PDFGenerator.downloadBlob(blob, result.filename || 'prior_authorization.html');
            }
            
          } catch (error) {
            console.error('Error generating prior auth PDF:', error);
            throw error;
          }
        }}
      />

      {/* Referral */}
      <ReferralForm
        patient={patient}
        encounter={selectedEncounter}
        diagnoses={diagnoses}
        labResults={labResults}
        onSave={async (formData) => {
          try {
            const response = await fetch('/api/forms/referral', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save', formData })
            });
            
            if (!response.ok) throw new Error('Failed to save form');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Save failed');
            
          } catch (error) {
            console.error('Error saving referral form:', error);
            throw error;
          }
        }}
        onGeneratePDF={async (formData) => {
          try {
            const response = await fetch('/api/forms/referral', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'generate-pdf', formData })
            });
            
            if (!response.ok) throw new Error('Failed to generate PDF');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'PDF generation failed');
            
            // Download the PDF data
            if (result.pdfData) {
              const binaryString = atob(result.pdfData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: result.mimeType || 'text/html' });
              
              // Import PDFGenerator for download function
              const { PDFGenerator } = await import('@/lib/forms/pdfGenerator');
              PDFGenerator.downloadBlob(blob, result.filename || 'referral.html');
            }
            
          } catch (error) {
            console.error('Error generating referral PDF:', error);
            throw error;
          }
        }}
      />

      {/* Clinical Trials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Clinical Trials</CardTitle>
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
              <p className="text-sm text-muted-foreground/70">No clinical trial information available for this patient</p>
              <p className="text-sm text-muted-foreground/60">Trial recommendations will appear here based on patient diagnosis and treatment history</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Modal */}
      {showTranscriptModal && selectedEncounter && (
        <TranscriptEditorModal
          isOpen={showTranscriptModal}
          onClose={() => setShowTranscriptModal(false)}
          transcript={selectedEncounter.transcript || ''}
          onSave={(value) => updateField('transcript', value)}
          patientName={patient?.name || 'Patient'}
        />
      )}

      {/* Danger Zone */}
      <div className="space-y-4 pt-6 mt-6 border-t border-destructive/20">
        <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
        <div className="bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-colors rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                Delete This Consultation
              </h3>
              <p className="text-sm text-muted-foreground">
                This will mark the consultation as deleted. It can be restored later from the &quot;All Data&quot; tab
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