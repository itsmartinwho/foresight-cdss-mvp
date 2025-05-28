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
  isDemoMode = false, // Default to false
  initialDemoTranscript,
  demoDiagnosis,
  demoTreatment,
  onDemoClinicalPlanClick,
  isDemoGeneratingPlan = false, // Default to false
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
  
  // Refs
  const transcriptEditorRef = useRef<RichTextEditorRef>(null);
  const diagnosisEditorRef = useRef<RichTextEditorRef>(null);
  const treatmentEditorRef = useRef<RichTextEditorRef>(null);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus and cursor positioning for transcript textarea
  useEffect(() => {
    if (started && transcriptEditorRef.current) {
      transcriptEditorRef.current.focus();
    }
  }, [started]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, patient.id, encounter?.id]); // transcriptText captured in closure for API call

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCurrentlyCreatingEncounter.current) {
      return;
    }

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
      isCurrentlyCreatingEncounter.current = false;
    }
  }, [patient?.id, reason, scheduledDate, duration, onConsultationCreated, onClose, toast]);

  // Track if we should create encounter on open to prevent infinite loops
  const shouldCreateEncounterRef = useRef(false);

  // Reset form when panel opens and create encounter
  useEffect(() => {
    if (isOpen) {
      // Common resets for both modes
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      setActiveTab('transcript');
      setTabBarVisible(false);
      setIsGeneratingPlan(false);
      setStarted(false);
      setTranscriptText('');
      setDiagnosisText('');
      setTreatmentText('');
      setPlanGenerated(false);
      
      // Reset the creation flag
      shouldCreateEncounterRef.current = !isDemoMode;
      
      if (isDemoMode) {
        setTranscriptText(initialDemoTranscript || '');
        setDiagnosisText(demoDiagnosis || '');
        setTreatmentText(demoTreatment || '');
        setStarted(true);

        // If demo provides diagnosis or treatment, assume plan is "generated"
        if (demoDiagnosis || demoTreatment) {
          setPlanGenerated(true);
          if (demoDiagnosis) setActiveTab('diagnosis');
          else if (demoTreatment) setActiveTab('treatment');
          else setActiveTab('transcript');
        } else {
          setPlanGenerated(false);
          setActiveTab('transcript');
        }
        // DO NOT call createEncounter in demo mode
      } else {
        setStarted(true);
      }
    } else {
      // Reset creation flag when panel closes
      shouldCreateEncounterRef.current = false;
    }
  }, [isOpen, isDemoMode, initialDemoTranscript, demoDiagnosis, demoTreatment]);

  // Create encounter for non-demo mode in a separate effect
  useEffect(() => {
    if (shouldCreateEncounterRef.current && !encounter && !isCreating) {
      shouldCreateEncounterRef.current = false; // Prevent multiple calls
      createEncounter();
    }
  }, [encounter, isCreating, createEncounter]);

  const handleClose = useCallback(async () => {
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
      // Save transcript
      if (transcriptText && transcriptText.trim()) {
        await supabaseDataService.updateEncounterTranscript(patient.id, compositeId, transcriptText);
      }

      // Save diagnosis as primary diagnosis in conditions table
      if (diagnosisText && diagnosisText.trim()) {
        await supabaseDataService.savePrimaryDiagnosis(
          patient.id, 
          encounter.encounterIdentifier,
          diagnosisText
        );
      }

      // Save treatments
      if (treatmentText && treatmentText.trim()) {
        // Parse treatment text into Treatment objects
        const treatmentLines = treatmentText.split('\n').filter(line => line.trim());
        const treatments = treatmentLines.map((line, index) => ({
          drug: line.trim(),
          status: 'recommended',
          rationale: `Treatment plan item ${index + 1}`
        }));
        
        await supabaseDataService.updateEncounterTreatments(patient.id, compositeId, treatments);
      }

      // Save combined SOAP note if we have diagnosis and/or treatment
      if ((diagnosisText && diagnosisText.trim()) || (treatmentText && treatmentText.trim())) {
        const soapNote = `S: ${transcriptText || 'See transcript'}\nO: Clinical examination performed\nA: ${diagnosisText || 'See diagnosis'}\nP: ${treatmentText || 'See treatment plan'}`;
        await supabaseDataService.updateEncounterSOAPNote(patient.id, compositeId, soapNote);
      }

      toast({ title: "Consultation Saved", description: "All consultation data saved successfully." });
      
      // Small delay to ensure data change notifications propagate to patient workspace
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onClose();
    } catch (error) {
      console.error('Failed to save consultation data:', error);
      toast({ title: "Save Failed", description: "Could not save consultation data. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, patient.id, encounter, transcriptText, diagnosisText, treatmentText, onClose, toast, isSaving]);

  // Discard handler: close without saving and remove the created encounter
  const handleDiscard = useCallback(() => {
    if (isDemoMode) {
      onClose();
      return;
    }
    if (encounter) {
      const compositeId = `${patient.id}_${encounter.encounterIdentifier}`;
      supabaseDataService.permanentlyDeleteEncounter(patient.id, compositeId);
    }
    onClose();
  }, [isDemoMode, encounter, patient.id, onClose]);

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

  // Pause/resume transcription controls
  const pauseTranscription = useCallback(() => {
    if (isDemoMode) return; // Disable in demo mode
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isDemoMode]);

  const resumeTranscription = useCallback(() => {
    if (isDemoMode) return; // Disable in demo mode
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isDemoMode]);

  const startVoiceInput = useCallback(async () => {
    if (isDemoMode) return; // Disable in demo mode

    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      toast({ title: "Error", description: "Deepgram API key not configured.", variant: "destructive" });
      return;
    }
    if (isTranscribing && !isPaused) {
      return; // Already transcribing
    }
    
    // Start conversation if not already started
    if (!started) setStarted(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=false',
        ['token', apiKey]
      );
      socketRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.channel && data.is_final && data.channel.alternatives?.[0]?.transcript) {
            const chunk = data.channel.alternatives[0].transcript;
            if (chunk.trim()) {
              // Use RichTextEditor's insertText method for better integration
              if (transcriptEditorRef.current) {
                const textToAdd = chunk + (chunk.endsWith(' ') ? '' : ' ');
                transcriptEditorRef.current.insertText(textToAdd);
              } else {
                // Fallback to state update if ref not available
                setTranscriptText(prev => {
                  const current = prev || '';
                  return current + (current.length > 0 && !current.endsWith(' ') && !chunk.startsWith(' ') ? ' ' : '') + chunk;
                });
              }
            }
          }
        } catch {
          // ignore
        }
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
        setIsTranscribing(false);
        setIsPaused(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        stream.getTracks().forEach(t => t.stop());
      };
      ws.onerror = () => {
        setIsTranscribing(false);
        setIsPaused(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        stream.getTracks().forEach(t => t.stop());
        toast({ title: "Error", description: "Transcription service error.", variant: "destructive" });
      };
    } catch (err) {
      toast({ title: "Error", description: `Transcription error: ${err instanceof Error ? err.message : String(err)}`, variant: "destructive" });
    }
  }, [isDemoMode, isTranscribing, isPaused, started, transcriptText, toast]);

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl relative w-[90%] max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Discard (X) button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
          onClick={handleDiscard}
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
          {(!encounter && !isCreating) ? (
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
                {!started ? (
                  // Initial state - show start button
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground">Ready to begin consultation</p>
                      <Button 
                        variant="default" 
                        size="lg"
                        onClick={startVoiceInput}
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
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startVoiceInput}
                              disabled={isDemoMode || isGeneratingPlan || isSaving || isTranscribing}
                              className="flex items-center gap-2"
                            >
                              <Mic className="h-4 w-4" />
                              Transcribe
                            </Button>
                            {isTranscribing && !isDemoMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={isPaused ? resumeTranscription : pauseTranscription}
                                className="flex items-center gap-2"
                              >
                                {isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                                {isPaused ? "Resume" : "Pause"}
                              </Button>
                            )}
                            <Button
                              variant={(isGeneratingPlan || isDemoGeneratingPlan) ? "secondary" : "default"}
                              onClick={() => {
                                if (isDemoMode && onDemoClinicalPlanClick) {
                                  onDemoClinicalPlanClick();
                                } else if (!isDemoMode) {
                                  handleClinicalPlan();
                                }
                              }}
                              disabled={isDemoMode ? isDemoGeneratingPlan : (isGeneratingPlan || transcriptText.length < 10 || isDemoGeneratingPlan)}
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
                          </div>
                        </div>
                        <RichTextEditor
                          ref={transcriptEditorRef}
                          content={transcriptText}
                          onContentChange={setTranscriptText}
                          placeholder={isDemoMode ? "Demo transcript loaded." : "Type or dictate the consultation notes here..."}
                          disabled={isDemoMode && !initialDemoTranscript}
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
                          minHeight="300px"
                          className="flex-1"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Actions */}
              {started && (
                <div className="border-t border-border/50 pt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleDiscard} disabled={isSaving && !isDemoMode}>
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
    </div>
  );

  return createPortal(panelContent, document.body);
}