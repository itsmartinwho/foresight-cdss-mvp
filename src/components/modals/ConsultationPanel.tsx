'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor, RichTextEditorRef } from '@/components/ui/rich-text-editor';
import { X, Microphone as Mic, Brain, CircleNotch, PauseCircle, PlayCircle } from '@phosphor-icons/react';
import { format } from 'date-fns';
import type { Patient, Encounter, Treatment } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDemo } from '@/contexts/DemoContext';

interface ConsultationPanelProps {
  /** Controls open state from parent */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Patient to create consultation for */
  patient: Patient; // Remains required as per instructions, even if DB ops are skipped in demo
  /** Callback when consultation is successfully created */
  onConsultationCreated?: (encounter: Encounter) => void;
  /** If true, panel operates in demo mode, driven by external state */
  isDemoMode?: boolean;
  /** Initial transcript content for demo mode */
  initialDemoTranscript?: string;
  /** Initial diagnosis content for demo mode */
  demoDiagnosis?: string;
  /** Initial treatment content for demo mode */
  demoTreatment?: string;
  /** Callback for when "Clinical Plan" is clicked in demo mode */
  onDemoClinicalPlanClick?: () => void;
  /** Controls loading state of Clinical Plan button externally for demo */
  isDemoGeneratingPlan?: boolean;
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
  onConsultationCreated,
  isDemoMode = false,
  initialDemoTranscript,
  demoDiagnosis,
  demoTreatment,
  onDemoClinicalPlanClick,
  isDemoGeneratingPlan = false,
}: ConsultationPanelProps) {
  const { toast } = useToast();
  const demoState = useDemo();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const isCurrentlyCreatingEncounter = useRef(false);
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
  
  // Transcription state and refs
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  // New state for confirmation dialog
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [editedWhilePaused, setEditedWhilePaused] = useState(false);
  
  // Refs
  const transcriptEditorRef = useRef<RichTextEditorRef>(null);
  const diagnosisEditorRef = useRef<RichTextEditorRef>(null);
  const treatmentEditorRef = useRef<RichTextEditorRef>(null);
  const demoInitializedRef = useRef<boolean>(false);

  // --- LIFECYCLE & SETUP ---

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopTranscription = useCallback(() => {
    if (isDemoMode) return;
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close();
      socketRef.current = null;
    }
    setIsTranscribing(false);
    setIsPaused(false);
  }, [isDemoMode]);

  const handleSaveAndClose = useCallback(async () => {
    stopTranscription();
    if (isDemoMode || !encounter) {
      onClose();
      return;
    }
    if (isSaving) return;
  
    setIsSaving(true);
    try {
      if (!encounter) throw new Error("Encounter not available for saving.");
  
      const updatePromises = [];
      const compositeEncounterId = `${patient.id}_${encounter.encounterIdentifier}`;
  
      const finalTranscript = transcriptText.trim();
      if (finalTranscript) {
        updatePromises.push(supabaseDataService.updateEncounterTranscript(patient.id, compositeEncounterId, finalTranscript));
      }
      
      const finalDiagnosis = diagnosisText.trim();
      if (finalDiagnosis) {
        updatePromises.push(supabaseDataService.savePrimaryDiagnosis(patient.id, encounter.encounterIdentifier, finalDiagnosis));
      }
      
      const finalTreatmentText = treatmentText.trim();
      if (finalTreatmentText) {
        const treatments: Treatment[] = [{
          drug: finalTreatmentText,
          status: 'prescribed',
          rationale: 'Physician\'s assessment during consultation.'
        }];
        updatePromises.push(supabaseDataService.updateEncounterTreatments(patient.id, compositeEncounterId, treatments));
      }
      
      const soapNote = (finalTranscript || finalDiagnosis || finalTreatmentText) 
          ? `S: ${finalTranscript || 'See transcript'}\nO: Clinical examination performed\nA: ${finalDiagnosis || 'See diagnosis'}\nP: ${finalTreatmentText || 'See treatment plan'}`
          : undefined;
      
      if (soapNote) {
        updatePromises.push(supabaseDataService.updateEncounterSOAPNote(patient.id, compositeEncounterId, soapNote));
      }
      
      await Promise.all(updatePromises);
      
      toast({ title: "Consultation Saved" });
      onClose();
    } catch (error) {
      console.error("Failed to save consultation:", error);
      toast({ title: "Save Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, patient.id, encounter, transcriptText, diagnosisText, treatmentText, onClose, toast, isSaving, stopTranscription]);

  const handleDiscard = useCallback(async () => {
    stopTranscription();
    if (isDemoMode) {
      onClose();
      return;
    }
    if (encounter) {
      await supabaseDataService.permanentlyDeleteEncounter(patient.id, encounter.id);
    }
    onClose();
  }, [isDemoMode, encounter, patient.id, onClose, stopTranscription]);
  
  const handleCloseRequest = useCallback(() => {
    if (isDemoMode) {
      onClose();
      return;
    }
    const hasUnsavedContent = transcriptText.trim() || diagnosisText.trim() || treatmentText.trim();
    if (hasUnsavedContent) {
      setShowConfirmationDialog(true);
    } else {
      handleDiscard();
    }
  }, [isDemoMode, transcriptText, diagnosisText, treatmentText, onClose, handleDiscard]);

  const handleConfirmSave = useCallback(() => {
    setShowConfirmationDialog(false);
    handleSaveAndClose();
  }, [handleSaveAndClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowConfirmationDialog(false);
    handleDiscard();
  }, [handleDiscard]);

  const handleTranscriptChange = useCallback((newText: string) => {
    setTranscriptText(newText);
    if (isPaused) {
      setEditedWhilePaused(true);
    }
  }, [isPaused]);

  const pauseTranscription = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeTranscription = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const startVoiceInput = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) return toast({ title: "Error", description: "Deepgram API key not configured.", variant: "destructive" });
    if (isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isOpen) return stream.getTracks().forEach(track => track.stop());

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const mediaRecorder = mediaRecorderRef.current;
      
      const ws = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=true', ['token', apiKey]);
      socketRef.current = ws;

      ws.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(event.data);
        });
        mediaRecorder.start(250);
        setIsTranscribing(true);
        setIsPaused(false);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.channel && data.is_final && data.channel.alternatives[0]?.transcript) {
            const chunk = data.channel.alternatives[0].transcript.trim();
            if (chunk) {
              const speaker = data.channel.alternatives[0]?.words?.[0]?.speaker ?? null;
              let textToAdd = chunk;
              
              // Add speaker label if available and appropriate
              if (speaker !== null && speaker !== undefined) {
                const currentContent = transcriptText;
                const lines = currentContent.split('\n');
                const lastLine = lines[lines.length - 1] || '';
                
                // Add speaker label if starting fresh or speaker changed
                if (!lastLine.includes('Speaker ') || !lastLine.startsWith(`Speaker ${speaker}:`)) {
                  textToAdd = (currentContent ? '\n' : '') + `Speaker ${speaker}: ` + chunk;
                } else {
                  textToAdd = ' ' + chunk;
                }
              } else {
                // No speaker info, just add appropriate spacing
                textToAdd = (transcriptText ? ' ' : '') + chunk;
              }
              
              // Only update via state to avoid double updates
              setTranscriptText(prev => prev + textToAdd);
            }
          }
        } catch (error) {
          console.warn('[ConsultationPanel] Error processing WebSocket message:', error);
        }
      };

      ws.onclose = stopTranscription;
      ws.onerror = () => {
        toast({ title: "Error", description: "Transcription service error.", variant: "destructive" });
        stopTranscription();
      };
    } catch (err) {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [isTranscribing, isOpen, stopTranscription, toast]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCurrentlyCreatingEncounter.current) return;
    isCurrentlyCreatingEncounter.current = true;
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {});
      setEncounter(newEncounter);
      onConsultationCreated?.(newEncounter);
    } catch (error) {
      toast({ title: "Error", description: `Failed to create consultation: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      onClose();
    } finally {
      setIsCreating(false);
      isCurrentlyCreatingEncounter.current = false;
    }
  }, [patient?.id, onConsultationCreated, onClose, toast]);

  const handleClinicalPlan = useCallback(async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/clinical-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, encounterId: encounter?.id, transcript: transcriptText }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const result = await response.json();
      setDiagnosisText(result.diagnosticResult?.diagnosisName || '');
      setTreatmentText(result.diagnosticResult?.recommendedTreatments?.join('\n') || '');
      setPlanGenerated(true);
      setActiveTab('diagnosis');
    } catch (error) {
      toast({ title: "Plan Generation Failed", variant: "destructive" });
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [toast, patient.id, encounter?.id, transcriptText]);

  // --- EFFECT HOOKS ---

  useEffect(() => {
    if (planGenerated) {
      const timer = setTimeout(() => setTabBarVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setTabBarVisible(false);
    }
  }, [planGenerated]);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      setActiveTab('transcript');
      setTabBarVisible(false);
      setIsGeneratingPlan(false);
      setStarted(false);
      setTranscriptText(isDemoMode ? initialDemoTranscript || '' : '');
      setDiagnosisText(isDemoMode ? demoDiagnosis || '' : '');
      setTreatmentText(isDemoMode ? demoTreatment || '' : '');
      setPlanGenerated(!!(isDemoMode && (demoDiagnosis || demoTreatment)));
      setShowConfirmationDialog(false);
      setEditedWhilePaused(false);
      
      if (isDemoMode) {
        setStarted(true);
      }

    } else if (mounted) {
      stopTranscription();
    }
  }, [isOpen, isDemoMode, initialDemoTranscript, demoDiagnosis, demoTreatment, mounted, stopTranscription]);
  
  // Separate effect for encounter creation to avoid dependency cycles
  useEffect(() => {
    if (!isDemoMode && isOpen && !encounter && !isCreating) {
      createEncounter();
    }
  }, [isDemoMode, isOpen, encounter, isCreating, createEncounter]);
  
  // Single effect to handle encounter creation -> start transcription sequence
  useEffect(() => {
    if (!isDemoMode && encounter && !started && !isTranscribing && isOpen) {
      setStarted(true);
      // Auto-start transcription after encounter is created
      const timer = setTimeout(() => {
        startVoiceInput();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode, encounter, started, isTranscribing, isOpen, startVoiceInput]);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isDemoMode || (isDemoMode && !demoState.isDemoModalOpen)) {
          handleCloseRequest();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleCloseRequest, isDemoMode, demoState.isDemoModalOpen]);
  
  // Effect to handle transcription state on visibility change
  useEffect(() => {
    if (!mounted) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isTranscribing && !isPaused) {
        pauseTranscription();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup if transcription is running when component unmounts
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isTranscribing) {
        stopTranscription();
      }
    };
  }, [isTranscribing, isPaused, pauseTranscription, stopTranscription, mounted]);

  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div 
      className="fixed inset-0 z-[9999] glass-backdrop flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && handleCloseRequest()}
    >
      <div className="glass-dense rounded-2xl shadow-2xl relative w-[90%] max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
          onClick={handleCloseRequest}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="pt-8 pb-4 border-b border-border/50">
          <h2 className="text-xl font-semibold mb-2">New Consultation</h2>
          <p className="text-sm text-muted-foreground">
            Patient: {patient.firstName} {patient.lastName} • {encounter?.id ? `ID: ${encounter.id}` : 'Creating...'}
          </p>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {(!encounter && !isCreating && !isDemoMode) ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-muted-foreground">Failed to create consultation</p>
            </div>
          ) : (
            <>
              {planGenerated && (
                <div className={cn("border-b border-border/50 transition-all", tabBarVisible ? "opacity-100" : "opacity-0")}>
                  <div className="flex space-x-4 px-1 py-2">
                    {['transcript', 'diagnosis', 'treatment'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-md transition-all",
                          activeTab === tab
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-hidden p-4">
                {started ? (
                  <>
                    {(!planGenerated || activeTab === 'transcript') && (
                      <div className="h-full flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Consultation Transcript</h3>
                          <div className="flex items-center gap-2">
                            {!isDemoMode && !isTranscribing && (
                              <Button variant="outline" size="sm" onClick={startVoiceInput} disabled={isGeneratingPlan || isSaving} className="gap-2"><Mic className="h-4 w-4" /> Start Recording</Button>
                            )}
                            {!isDemoMode && isTranscribing && (
                              <>
                                <Button variant="outline" size="sm" onClick={isPaused ? resumeTranscription : pauseTranscription} className="gap-2">{isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}{isPaused ? "Resume" : "Pause"}</Button>
                                <Button variant="destructive" size="sm" onClick={stopTranscription} className="gap-2">Stop Recording</Button>
                              </>
                            )}
                            {!(isDemoMode && planGenerated) && (
                              <Button
                                variant={(isGeneratingPlan || isDemoGeneratingPlan) ? "secondary" : "default"}
                                onClick={isDemoMode ? onDemoClinicalPlanClick : handleClinicalPlan}
                                disabled={isGeneratingPlan || isDemoGeneratingPlan || transcriptText.length < 10}
                                className="gap-2"
                              >
                                {(isGeneratingPlan || isDemoGeneratingPlan) ? <><CircleNotch className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Brain className="h-4 w-4" /> Clinical Plan</>}
                              </Button>
                            )}
                          </div>
                        </div>
                        <RichTextEditor
                          ref={transcriptEditorRef}
                          content={transcriptText}
                          onContentChange={handleTranscriptChange}
                          placeholder="Transcription will appear here..."
                          disabled={isDemoMode || isTranscribing}
                          showToolbar={!isDemoMode && !isTranscribing}
                          minHeight="300px"
                          className="flex-1"
                        />
                      </div>
                    )}
                    {planGenerated && activeTab === 'diagnosis' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Diagnosis</h3>
                        <RichTextEditor content={diagnosisText} onContentChange={setDiagnosisText} placeholder="Enter diagnosis..." disabled={isDemoMode} showToolbar={!isDemoMode} minHeight="300px" className="flex-1" />
                      </div>
                    )}
                    {planGenerated && activeTab === 'treatment' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Treatment Plan</h3>
                        <RichTextEditor content={treatmentText} onContentChange={setTreatmentText} placeholder="Enter treatment plan..." disabled={isDemoMode} showToolbar={!isDemoMode} minHeight="300px" className="flex-1" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Setting up consultation...</p></div>
                )}
              </div>
              {started && (
                <div className="border-t border-border/50 pt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCloseRequest} disabled={isSaving}>Close</Button>
                  <Button onClick={handleSaveAndClose} disabled={isSaving}>{(isSaving && !isDemoMode) ? "Saving..." : "Save & Close"}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showConfirmationDialog && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Save transcript content?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You have transcript content that will be lost if you don&apos;t save it. What would you like to do?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={handleConfirmDiscard}>Delete</Button>
              <Button variant="default" onClick={handleConfirmSave}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  return createPortal(panelContent, document.body);
}