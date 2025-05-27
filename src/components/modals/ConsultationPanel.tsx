'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Microphone as Mic, Brain, CircleNotch } from '@phosphor-icons/react';
import { format } from 'date-fns';
import type { Patient, Encounter } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ConsultationPanelProps {
  /** Controls open state from parent */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Patient to create consultation for */
  patient: Patient;
  /** Callback when consultation is successfully created */
  onConsultationCreated?: (encounter: Encounter) => void;
}

// Styled DatePicker component to match the design
const StyledDatePicker = React.forwardRef<any, any>(({ className, ...props }, ref) => (
  <DatePicker
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
StyledDatePicker.displayName = "StyledDatePicker";

export default function ConsultationPanel({
  isOpen,
  onClose,
  patient,
  onConsultationCreated
}: ConsultationPanelProps) {
  const { toast } = useToast();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Form state
  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState(30);
  
  // Consultation state
  const [started, setStarted] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [treatmentText, setTreatmentText] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [planGenerated, setPlanGenerated] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const encounterCreatedRef = useRef<boolean>(false);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus and cursor positioning for transcript textarea
  useEffect(() => {
    if (started && transcriptTextareaRef.current) {
      transcriptTextareaRef.current.focus();
      const textLength = transcriptText.length;
      transcriptTextareaRef.current.setSelectionRange(textLength, textLength);
      transcriptTextareaRef.current.scrollTop = transcriptTextareaRef.current.scrollHeight;
      console.log('Transcript textarea focused and cursor positioned.', { textLength: transcriptText.length });
    }
  }, [started, transcriptText]);

  // Log transcript length and Clinical Plan button enablement status
  useEffect(() => {
    console.log(`Transcript length: ${transcriptText.length}, Clinical Plan button enabled: ${transcriptText.length >= 10}`);
  }, [transcriptText]);

  // Log active tab changes
  useEffect(() => {
    console.log('Active tab is now:', activeTab);
  }, [activeTab]);

  // Effect to make tab bar visible with a delay for transition
  useEffect(() => {
    if (planGenerated) {
      const timer = setTimeout(() => {
        setTabBarVisible(true);
      }, 50); // Small delay to ensure element is in DOM for transition
      return () => clearTimeout(timer);
    } else {
      setTabBarVisible(false); // Reset if plan is no longer generated (e.g. panel reset)
    }
  }, [planGenerated]);

  const handleClinicalPlan = useCallback(async () => {
    setIsGeneratingPlan(true);
    console.log('handleClinicalPlan started, isGeneratingPlan: true');

    try {
      console.log('Calling clinical engine API...');
      
      // Call the clinical engine API
      const response = await fetch('/api/clinical-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: patient.id, 
          encounterId: encounter?.id,
          transcript: transcriptText
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract diagnosis and treatment from the result
      const diagnosis = result.diagnosticResult?.diagnosisName || 
                       result.diagnosticResult?.primaryDiagnosis || 
                       "Based on the transcript, a preliminary diagnosis has been generated.";
      
      const treatment = result.diagnosticResult?.recommendedTreatments?.join('\n') || 
                       result.diagnosticResult?.treatmentPlan || 
                       "Recommended treatment plan has been generated based on the diagnosis.";
      
      setDiagnosisText(diagnosis);
      setTreatmentText(treatment);
      setPlanGenerated(true);
      setActiveTab('diagnosis'); // Switch to diagnosis tab on success
      console.log('Clinical engine call complete.', { diagnosis, treatment });

    } catch (error) {
      console.error("Error during clinical plan generation:", error);
      
      // Graceful fallback - still transition to tabbed interface but leave fields blank
      setPlanGenerated(true);
      setDiagnosisText('');
      setTreatmentText('');
      setActiveTab('diagnosis');
      
      toast({
        title: "Unable to Generate Plan",
        description: "Unable to generate plan automatically. You can complete the plan manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPlan(false);
      console.log('handleClinicalPlan finished (finally), isGeneratingPlan: false');
    }
  }, [toast, patient.id, encounter?.id, transcriptText]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id) return;
    
    // Prevent multiple concurrent creations
    if (isCreating) {
      console.log('Encounter creation already in progress, skipping...');
      return;
    }
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: '', // Will be filled from transcript later
        scheduledStart: new Date().toISOString(),
        duration: 30, // Default duration
      });
      
      setEncounter(newEncounter);
      console.log('Encounter created successfully:', newEncounter.id);
      
      if (onConsultationCreated) {
        onConsultationCreated(newEncounter);
      }
    } catch (error) {
      console.error('Failed to create encounter:', error);
      encounterCreatedRef.current = false; // Reset so user can try again
      toast({
        title: "Error",
        description: `Failed to create consultation encounter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [patient?.id, onConsultationCreated, onClose, toast]);

  // Reset form when panel opens and create encounter
  useEffect(() => {
    if (isOpen) {
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      setStarted(false);
      setTranscriptText('');
      setDiagnosisText('');
      setTreatmentText('');
      setActiveTab('transcript');
      setPlanGenerated(false);
      setTabBarVisible(false);
      setIsGeneratingPlan(false);
      encounterCreatedRef.current = false;
      
      // Automatically create encounter when panel opens (only once per session)
      if (!encounterCreatedRef.current) {
        encounterCreatedRef.current = true;
        createEncounter();
      }
    } else {
      // Reset the ref when panel closes
      encounterCreatedRef.current = false;
    }
  }, [isOpen]);

  const handleClose = useCallback(async () => {
    if (!encounter?.id) {
      console.log('No encounter to save, closing directly.');
      onClose();
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    console.log('Attempting to save consultation data...', { 
      encounterId: encounter.id, 
      transcript: transcriptText, 
      diagnosis: diagnosisText, 
      treatment: treatmentText 
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate save

      const saveSuccess = Math.random() > 0.3; // 70% chance of success
      if (!saveSuccess) {
        throw new Error("Simulated save failure");
      }

      // Placeholder for actual Supabase call:
      console.log('Placeholder: supabaseDataService.updateEncounterDetails(encounter.id, { transcript, diagnosis, treatment }) would be called here.');
      // await supabaseDataService.updateEncounterDetails(encounter.id, {
      //   transcript: transcriptText,
      //   diagnosis_text: diagnosisText, 
      //   treatment_text: treatmentText,
      // });
      
      console.log('Data saved successfully (simulated).');
      toast({ title: "Consultation Saved", description: "Your changes have been saved." });
      
      // According to notes, don't reset state here, rely on parent unmount/re-init
      onClose(); // Close panel on success

    } catch (error) {
      console.error('Failed to save data:', error);
      toast({
        title: "Save Failed",
        description: "Could not save data. Please try again.",
        variant: "destructive",
      });
      // Do NOT call onClose() here. User can retry or edit.
    } finally {
      setIsSaving(false);
      console.log('Save attempt finished, isSaving set to false.');
    }
  }, [encounter, isSaving, transcriptText, diagnosisText, treatmentText, onClose, toast]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const startVoiceInput = useCallback(() => {
    // In a real app, this would initiate voice recognition.
    console.log("Voice input started - full functionality to be implemented");
    setStarted(true);
    setTranscriptText("Voice input received: (User's speech would go here)");
  }, []);

  const handleStartConsultation = useCallback(() => {
    setStarted(true);
    // Focus the transcript textarea
    setTimeout(() => {
      if (transcriptTextareaRef.current) {
        transcriptTextareaRef.current.focus();
      }
    }, 100);
  }, []);

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl relative w-[90%] max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Close button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
          onClick={handleClose}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="pt-8 pb-4 border-b border-border/50">
          <h2 className="text-xl font-semibold mb-2">New Consultation</h2>
          <p className="text-sm text-muted-foreground">
            Patient: {patient.firstName} {patient.lastName} • {encounter?.id ? `ID: ${encounter.id}` : 'Creating...'}
          </p>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isCreating ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Creating consultation...</p>
              </div>
            </div>
          ) : encounter ? (
            <>
              {/* Tab Navigation */}
              {planGenerated && (
                <div className={cn(
                  "border-b border-border/50 transition-all duration-300 ease-in-out",
                  tabBarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                )}>
                  <div className="flex space-x-4 px-1 py-2">
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                        activeTab === 'transcript'
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveTab('diagnosis')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                        activeTab === 'diagnosis'
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      Diagnosis
                    </button>
                    <button
                      onClick={() => setActiveTab('treatment')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                        activeTab === 'treatment'
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      Treatment
                    </button>
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-hidden p-4">
                {!started ? (
                  // Initial state - show start button
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground">Ready to begin consultation</p>
                      <Button 
                        variant="default" 
                        size="lg"
                        onClick={handleStartConsultation}
                        className="flex items-center gap-2"
                      >
                        <Mic className="h-5 w-5" />
                        Start Consultation
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Content based on active tab
                  <>
                    {(!planGenerated || activeTab === 'transcript') && (
                      <div className="h-full flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Consultation Transcript</h3>
                          <Button
                            variant={isGeneratingPlan ? "secondary" : "default"}
                            onClick={handleClinicalPlan}
                            disabled={isGeneratingPlan || transcriptText.length < 10}
                            className="flex items-center gap-2"
                          >
                            {isGeneratingPlan ? (
                              <>
                                <CircleNotch className="h-4 w-4 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4" />
                                Clinical Plan
                              </>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          ref={transcriptTextareaRef}
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          placeholder="Type or dictate the consultation notes here..."
                          className="flex-1 resize-none text-base"
                          style={{ minHeight: '300px' }}
                        />
                      </div>
                    )}

                    {planGenerated && activeTab === 'diagnosis' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Diagnosis</h3>
                        <Textarea
                          value={diagnosisText}
                          onChange={(e) => setDiagnosisText(e.target.value)}
                          placeholder="Enter or edit the diagnosis..."
                          className="flex-1 resize-none text-base"
                          style={{ minHeight: '300px' }}
                        />
                      </div>
                    )}

                    {planGenerated && activeTab === 'treatment' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Treatment Plan</h3>
                        <Textarea
                          value={treatmentText}
                          onChange={(e) => setTreatmentText(e.target.value)}
                          placeholder="Enter or edit the treatment plan..."
                          className="flex-1 resize-none text-base"
                          style={{ minHeight: '300px' }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Actions */}
              {started && (
                <div className="border-t border-border/50 pt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Close"}
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleClose}
                    disabled={isSaving}
                  >
                    Save & Close
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-muted-foreground">Failed to create consultation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
} 