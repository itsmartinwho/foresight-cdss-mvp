'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';
import { Mic } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import type { Patient, Encounter } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';

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
  const [started, setStarted] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [treatmentText, setTreatmentText] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [planGenerated, setPlanGenerated] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      console.log('Simulating AI/engine call...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Shortened for testing

      // Simulate an error condition
      if (Math.random() < 0.5) { // Adjust probability as needed for testing
        throw new Error("Simulated AI engine failure!");
      }

      const mockDiagnosis = "Based on the transcript, the preliminary diagnosis is Acute Bronchitis. Common cold symptoms present, with persistent cough.";
      const mockTreatment = "Recommended treatment: Rest, increase fluid intake. Consider over-the-counter cough suppressant. If symptoms worsen or fever develops, schedule a follow-up.";
      
      setDiagnosisText(mockDiagnosis);
      setTreatmentText(mockTreatment);
      setPlanGenerated(true);
      setActiveTab('diagnosis'); // Switch to diagnosis tab on success
      console.log('AI/engine call simulation complete.', { diagnosis: mockDiagnosis, treatment: mockTreatment });

    } catch (error) {
      console.error("Error during clinical plan generation:", error);
      toast({
        title: "Error Generating Plan",
        description: "An unexpected error occurred. Please try again or complete the plan manually.",
        variant: "destructive",
      });
      // setPlanGenerated(false); // Not strictly needed if it's default false and only set true on success
      // setActiveTab('transcript'); // Optionally revert, but default behavior is fine
    } finally {
      setIsGeneratingPlan(false);
      console.log('handleClinicalPlan finished (finally), isGeneratingPlan: false');
    }
  }, [setIsGeneratingPlan, setDiagnosisText, setTreatmentText, setPlanGenerated, setActiveTab, toast]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCreating) return;
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: '', // Will be filled from transcript later
        scheduledStart: new Date().toISOString(),
      });
      
      setEncounter(newEncounter);
      
      if (onConsultationCreated) {
        onConsultationCreated(newEncounter);
      }
    } catch (error) {
      console.error('Failed to create encounter:', error);
      toast({
        title: "Error",
        description: `Failed to create consultation encounter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [patient?.id, isCreating, onConsultationCreated, onClose, toast]);

  // Create encounter immediately when panel opens
  useEffect(() => {
    if (isOpen && !encounter && !isCreating) {
      createEncounter();
    }
  }, [isOpen, encounter, isCreating, createEncounter]);

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
  }, [
    encounter, isSaving, transcriptText, diagnosisText, treatmentText, 
    onClose, toast, setIsSaving // Removed commented-out state setters as per instruction
  ]);

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

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-xl relative w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-hidden">
        {/* Header with patient context and close button */}
        <div className="absolute top-4 right-6 text-sm text-foreground/70">
          {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id} – {format(new Date(), 'PPP')}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-3 right-3 h-8 w-8"
          onClick={handleClose}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Main content area */}
        <div className="pt-8">
          {isCreating ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Creating consultation...</p>
              </div>
            </div>
          ) : encounter ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">New Consultation</h2>
                <p className="text-sm text-muted-foreground">
                  Consultation ID: {encounter.id}
                </p>
              </div>
              
              {/* Tab Buttons - Rendered if planGenerated is true, with fade-in animation */}
              {planGenerated && (
                <div className={`transition-opacity duration-500 ${tabBarVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex space-x-2 border-b mb-4">
                    <Button 
                      variant={activeTab === 'transcript' ? 'default' : 'ghost'} 
                      onClick={() => setActiveTab('transcript')}
                    >
                      Transcript
                    </Button>
                    <Button 
                      variant={activeTab === 'diagnosis' ? 'default' : 'ghost'} 
                      onClick={() => setActiveTab('diagnosis')}
                    >
                      Diagnosis
                    </Button>
                    <Button 
                      variant={activeTab === 'treatment' ? 'default' : 'ghost'} 
                      onClick={() => setActiveTab('treatment')}
                    >
                      Treatment
                    </Button>
                  </div>
                </div>
              )}

              {/* Conditional rendering for prompt or existing content */}
                  >
                    Transcript
                  </Button>
                  <Button 
                    variant={activeTab === 'diagnosis' ? 'default' : 'ghost'} 
                    onClick={() => setActiveTab('diagnosis')}
                  >
                    Diagnosis
                  </Button>
                  <Button 
                    variant={activeTab === 'treatment' ? 'default' : 'ghost'} 
                    onClick={() => setActiveTab('treatment')}
                  >
                    Treatment
                  </Button>
                </div>
              )}

              {/* Conditional rendering for prompt or existing content */}
              {!started && encounter && !isCreating && (
                <div
                  className={`transition-opacity duration-300 ease-in-out ${
                    started ? 'opacity-0' : 'opacity-100'
                  } flex flex-col items-center justify-center p-8 min-h-[300px]`}
                >
                  <p className="text-center text-xl text-foreground/80">
                    Start typing to begin the consultation...
                  </p>
                  <Button variant="secondary" size="lg" className="mt-4" onClick={startVoiceInput}>
                    <Mic className="mr-2 h-5 w-5" />
                    Transcribe Audio
                  </Button>
                </div>
              )}
              
              {started && encounter && !isCreating && (
                <>
                  {planGenerated ? (
                    <div className="mt-0"> {/* Container for tabbed content */}
                      <div key={activeTab} className="animate-fadeIn"> {/* Keyed div for fade-in animation */}
                        {activeTab === 'transcript' && (
                          <Textarea
                            ref={transcriptTextareaRef}
                            value={transcriptText}
                            onChange={(e) => setTranscriptText(e.target.value)}
                            placeholder="Document the conversation here..."
                            className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                          />
                        )}
                        {activeTab === 'diagnosis' && (
                          <Textarea
                            value={diagnosisText}
                            onChange={(e) => setDiagnosisText(e.target.value)}
                            placeholder="Enter diagnosis details here..."
                            className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                        )}
                        {activeTab === 'treatment' && (
                          <Textarea
                            value={treatmentText}
                            onChange={(e) => setTreatmentText(e.target.value)}
                            placeholder="Enter treatment plan here..."
                            className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    // If plan NOT generated, show only the transcript editor (original behavior)
                    <div
                      className={`transition-opacity duration-300 ease-in-out delay-150 ${
                        !started ? 'opacity-0' : 'opacity-100' // This handles initial fade-in of the editor
                      } bg-background/50 rounded-lg`}
                    >
                      <Textarea
                        ref={transcriptTextareaRef}
                        value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          placeholder="Document the conversation here..."
                          className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                        />
                      )}
                      {activeTab === 'diagnosis' && (
                        <Textarea
                          value={diagnosisText}
                          onChange={(e) => setDiagnosisText(e.target.value)}
                          placeholder="Enter diagnosis details here..."
                          className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                      )}
                      {activeTab === 'treatment' && (
                        <Textarea
                          value={treatmentText}
                          onChange={(e) => setTreatmentText(e.target.value)}
                          placeholder="Enter treatment plan here..."
                          className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                      )}
                    </div>
                  ) : (
                    // If plan NOT generated, show only the transcript editor (original behavior)
                    <div
                      className={`transition-opacity duration-300 ease-in-out delay-150 ${
                        !started ? 'opacity-0' : 'opacity-100' // This handles initial fade-in of the editor
                      } bg-background/50 rounded-lg`}
                    >
                      <Textarea
                        ref={transcriptTextareaRef}
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                        placeholder="Document the conversation here..."
                        className="w-full min-h-[40vh] h-64 resize-none p-4 text-base bg-transparent outline-none border border-border/30 rounded-md focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Close"}
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleClinicalPlan}
                  disabled={transcriptText.length < 10 || isGeneratingPlan}
                >
                  {isGeneratingPlan ? "Generating..." : "Clinical Plan"}
                </Button>
              </div>
            </div>
          ) : (
            // Fallback if encounter creation fails
            <div className="flex items-center justify-center p-8 min-h-[300px]">
              <p className="text-sm text-muted-foreground">Failed to create consultation. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
} 