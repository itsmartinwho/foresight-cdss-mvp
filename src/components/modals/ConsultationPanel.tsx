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
  const shouldCreateEncounterRef = useRef(false);

  // --- LIFECYCLE & SETUP ---

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopTranscription = useCallback(() => {
    if (isDemoMode) return;
    let stopped = false;
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          stopped = true;
        }
      } catch (e) {
        // ignore
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        stopped = true;
      }
      mediaRecorderRef.current = null;
    }
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }
      } catch (e) {}
      socketRef.current = null;
    }
    setIsTranscribing(false);
    setIsPaused(false);
    if (stopped) {
      console.log('[Transcription] Cleaned up media recorder and tracks.');
    }
  }, [isDemoMode]);

  const handleClose = useCallback(async () => {
    stopTranscription();
    if (isDemoMode) {
      onClose();
      return;
    }
    if (!encounter) {
      onClose();
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    const compositeId = `${patient.id}_${encounter.encounterIdentifier}`;
    try {
      if (transcriptText && transcriptText.trim()) {
        await supabaseDataService.updateEncounterTranscript(patient.id, compositeId, transcriptText);
      }
      if (diagnosisText && diagnosisText.trim()) {
        await supabaseDataService.savePrimaryDiagnosis(patient.id, encounter.encounterIdentifier, diagnosisText);
      }
      if (treatmentText && treatmentText.trim()) {
        const treatmentLines = treatmentText.split('\n').filter(line => line.trim());
        const treatments = treatmentLines.map((line, index) => ({
          drug: line.trim(), status: 'recommended', rationale: `Treatment plan item ${index + 1}`
        }));
        await supabaseDataService.updateEncounterTreatments(patient.id, compositeId, treatments);
      }
      if ((diagnosisText && diagnosisText.trim()) || (treatmentText && treatmentText.trim())) {
        const soapNote = `S: ${transcriptText || 'See transcript'}\nO: Clinical examination performed\nA: ${diagnosisText || 'See diagnosis'}\nP: ${treatmentText || 'See treatment plan'}`;
        await supabaseDataService.updateEncounterSOAPNote(patient.id, compositeId, soapNote);
      }
      toast({ title: "Consultation Saved", description: "All consultation data saved successfully." });
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Failed to save consultation data:', error);
      toast({ title: "Save Failed", description: "Could not save consultation data. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, patient.id, encounter, transcriptText, diagnosisText, treatmentText, onClose, toast, isSaving, stopTranscription]);

  const handleDiscard = useCallback(() => {
    stopTranscription();
    if (isDemoMode) {
      onClose();
      return;
    }
    if (encounter) {
      const compositeId = `${patient.id}_${encounter.encounterIdentifier}`;
      supabaseDataService.permanentlyDeleteEncounter(patient.id, compositeId);
    }
    onClose();
  }, [isDemoMode, encounter, patient.id, onClose, stopTranscription]);
  
  const handleCloseRequest = useCallback(() => {
    if (isDemoMode) {
      onClose();
      return;
    }
    if (transcriptText && transcriptText.trim()) {
      setShowConfirmationDialog(true);
    } else {
      handleDiscard();
    }
  }, [isDemoMode, transcriptText, onClose, handleDiscard]);

  const handleConfirmSave = useCallback(async () => {
    setShowConfirmationDialog(false);
    await handleClose();
  }, [handleClose]);

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
    if (isDemoMode) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isDemoMode]);

  const resumeTranscription = useCallback(() => {
    if (isDemoMode) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isDemoMode]);

  const startVoiceInput = useCallback(async () => {
    if (isDemoMode || isTranscribing) return;

    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      toast({ title: "Error", description: "Deepgram API key not configured.", variant: "destructive" });
      return;
    }
    if (!started) setStarted(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=true',
        ['token', apiKey]
      );
      socketRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const chunk = data.channel?.alternatives?.[0]?.transcript;
          if (chunk?.trim()) {
            const speaker = data.channel.alternatives[0]?.words?.[0]?.speaker ?? null;
            let textToAdd = chunk;
            if (speaker !== null) {
              const speakerLabel = `Speaker ${speaker}: `;
              const currentContent = transcriptEditorRef.current?.getContent() || transcriptText;
              const lines = currentContent.split('\n');
              const lastLine = lines[lines.length - 1] || '';
              if (!lastLine.startsWith(speakerLabel)) {
                textToAdd = (currentContent ? '\n' : '') + speakerLabel + chunk;
              } else {
                textToAdd = ' ' + chunk;
              }
            } else {
              textToAdd = chunk + (chunk.endsWith(' ') ? '' : ' ');
            }
            if (transcriptEditorRef.current) {
              if (editedWhilePaused) {
                transcriptEditorRef.current.setContent(transcriptText + (transcriptText ? '\n' : '') + textToAdd);
                setEditedWhilePaused(false);
              } else {
                transcriptEditorRef.current.insertText(textToAdd);
              }
            } else {
              setTranscriptText(prev => prev + textToAdd);
            }
          }
        } catch {}
      };

      ws.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        });
        mediaRecorder.start(250);
        setIsTranscribing(true);
        setIsPaused(false);
      };

      ws.onclose = () => {
        // The stopTranscription function will handle cleanup
        if (socketRef.current) { // Check if it's an intentional close
          stopTranscription();
        }
      };
      ws.onerror = () => {
        toast({ title: "Error", description: "Transcription service error.", variant: "destructive" });
        stopTranscription();
      };
    } catch (err) {
      toast({ title: "Error", description: `Transcription error: ${err instanceof Error ? err.message : String(err)}`, variant: "destructive" });
    }
  }, [isDemoMode, isTranscribing, started, toast, transcriptText, editedWhilePaused, stopTranscription]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCurrentlyCreatingEncounter.current) return;
    isCurrentlyCreatingEncounter.current = true;
    setIsCreating(true);
    try {
      const newEncounterData = {
        reason: reason || undefined,
        scheduledStart: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        duration: duration || undefined,
      };
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, newEncounterData);
      setEncounter(newEncounter);
      if (onConsultationCreated) onConsultationCreated(newEncounter);
    } catch (error) {
      console.error('Failed to create encounter:', error);
      toast({ title: "Error", description: `Failed to create consultation encounter: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      onClose();
    } finally {
      setIsCreating(false);
      isCurrentlyCreatingEncounter.current = false;
    }
  }, [patient?.id, reason, scheduledDate, duration, onConsultationCreated, onClose, toast]);

  const handleClinicalPlan = useCallback(async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/clinical-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, encounterId: encounter?.id, transcript: transcriptText }),
      });
      if (!response.ok) throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      const result = await response.json();
      const diagnosis = result.diagnosticResult?.diagnosisName || "Based on the transcript, a preliminary diagnosis has been generated.";
      const treatment = result.diagnosticResult?.recommendedTreatments?.join('\n') || "Recommended treatment plan has been generated based on the diagnosis.";
      setDiagnosisText(diagnosis);
      setTreatmentText(treatment);
      setPlanGenerated(true);
      setActiveTab('diagnosis');
    } catch (error) {
      console.error("Error during clinical plan generation:", error);
      setPlanGenerated(true);
      setDiagnosisText('');
      setTreatmentText('');
      setActiveTab('diagnosis');
      toast({ title: "Unable to Generate Plan", description: "Unable to generate plan automatically. You can complete the plan manually.", variant: "destructive" });
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
      if (!isDemoMode || !transcriptText) setTranscriptText('');
      setDiagnosisText('');
      setTreatmentText('');
      setPlanGenerated(false);
      setShowConfirmationDialog(false);
      setEditedWhilePaused(false);
      
      shouldCreateEncounterRef.current = !isDemoMode;
      
      if (isDemoMode) {
        setStarted(true);
        if (initialDemoTranscript) setTranscriptText(initialDemoTranscript);
        setDiagnosisText(demoDiagnosis || '');
        setTreatmentText(demoTreatment || '');
        setPlanGenerated(!!(demoDiagnosis || demoTreatment));
      } else {
        setStarted(true);
      }
    } else if (mounted) {
      // Cleanup on close
      stopTranscription();
      shouldCreateEncounterRef.current = false;
      demoInitializedRef.current = false;
    }
  }, [isOpen, isDemoMode, initialDemoTranscript, demoDiagnosis, demoTreatment]);
  
  useEffect(() => {
    if (!isDemoMode && shouldCreateEncounterRef.current && !encounter && !isCreating) {
      shouldCreateEncounterRef.current = false;
      createEncounter();
    }
  }, [isDemoMode, encounter, isCreating, createEncounter]);
  
  useEffect(() => {
    if (!isDemoMode && encounter && started && !isTranscribing) {
      const timer = setTimeout(() => startVoiceInput(), 500);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode, encounter, started, isTranscribing, startVoiceInput]);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && handleCloseRequest();
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleCloseRequest]);
  
  useEffect(() => {
    // Stop transcription when component unmounts
    return () => {
      if (isTranscribing) {
        stopTranscription();
      }
    };
  }, [isTranscribing, stopTranscription]);

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div 
      className="fixed inset-0 z-[9999] glass-backdrop flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleCloseRequest()}
    >
      <div className="glass-dense rounded-2xl shadow-2xl relative w-[90%] max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Discard (X) button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
          onClick={handleCloseRequest}
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
          {(!encounter && !isCreating && !isDemoMode) ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-muted-foreground">Failed to create consultation</p>
            </div>
          ) : (
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
                {started ? (
                  // Content based on active tab
                  <>
                    {(!planGenerated || activeTab === 'transcript') && (
                      <div className="h-full flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Consultation Transcript</h3>
                          <div className="flex items-center gap-2">
                            {!isTranscribing && !isDemoMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={startVoiceInput}
                                disabled={isGeneratingPlan || isSaving}
                                className="flex items-center gap-2"
                              >
                                <Mic className="h-4 w-4" />
                                Start Recording
                              </Button>
                            )}
                            {isTranscribing && !isDemoMode && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={isPaused ? resumeTranscription : pauseTranscription}
                                  className="flex items-center gap-2"
                                >
                                  {isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                                  {isPaused ? "Resume" : "Pause"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={stopTranscription}
                                  className="flex items-center gap-2"
                                >
                                  Stop Recording
                                </Button>
                              </>
                            )}
                            {!(isDemoMode && planGenerated) && (
                              <Button
                                variant={(isGeneratingPlan || isDemoGeneratingPlan) ? "secondary" : "default"}
                                onClick={handleClinicalPlan}
                                disabled={isDemoMode || isGeneratingPlan || transcriptText.length < 10 || isDemoGeneratingPlan}
                                className="flex items-center gap-2"
                              >
                                {(isGeneratingPlan || isDemoGeneratingPlan) ? (
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
                            )}
                          </div>
                        </div>
                        <RichTextEditor
                          ref={transcriptEditorRef}
                          content={transcriptText}
                          onContentChange={handleTranscriptChange}
                          placeholder={isDemoMode ? "Demo transcript loaded." : "Transcription will appear here automatically when recording starts..."}
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
                        <RichTextEditor
                          ref={diagnosisEditorRef}
                          content={diagnosisText}
                          onContentChange={setDiagnosisText}
                          placeholder={isDemoMode ? "Demo diagnosis loaded." : "Enter or edit the diagnosis..."}
                          disabled={isDemoMode || isTranscribing}
                          showToolbar={!isDemoMode && !isTranscribing}
                          minHeight="300px"
                          className="flex-1"
                        />
                      </div>
                    )}

                    {planGenerated && activeTab === 'treatment' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Treatment Plan</h3>
                        <RichTextEditor
                          ref={treatmentEditorRef}
                          content={treatmentText}
                          onContentChange={setTreatmentText}
                          placeholder={isDemoMode ? "Demo treatment plan loaded." : "Enter or edit the treatment plan..."}
                          disabled={isDemoMode || isTranscribing}
                          showToolbar={!isDemoMode && !isTranscribing}
                          minHeight="300px"
                          className="flex-1"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground">Setting up consultation...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {started && (
                <div className="border-t border-border/50 pt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCloseRequest} disabled={isSaving && !isDemoMode}>
                    Close
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleClose}
                    disabled={isSaving && !isDemoMode}
                  >
                    {(isSaving && !isDemoMode) ? "Saving..." : "Save & Close"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmationDialog && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Save transcript content?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You have transcript content that will be lost if you don't save it. What would you like to do?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={handleConfirmDiscard}>
                Delete
              </Button>
              <Button variant="default" onClick={handleConfirmSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(panelContent, document.body);
}