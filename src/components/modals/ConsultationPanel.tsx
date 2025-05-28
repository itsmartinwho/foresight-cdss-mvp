'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  
  // Refs
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus and cursor positioning for transcript textarea
  useEffect(() => {
    if (started && transcriptTextareaRef.current) {
      transcriptTextareaRef.current.focus();
      const textLength = transcriptTextareaRef.current.value.length;
      transcriptTextareaRef.current.setSelectionRange(textLength, textLength);
      transcriptTextareaRef.current.scrollTop = transcriptTextareaRef.current.scrollHeight;
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
  }, [toast, patient.id, encounter?.id, transcriptText]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCreating) return;
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: reason || undefined,
        scheduledStart: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        duration: duration || undefined,
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
  }, [patient?.id, isCreating, reason, scheduledDate, duration, onConsultationCreated, onClose, toast]);

  // Reset form when panel opens and create encounter
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      // Common resets for both modes
      setEncounter(null); // Encounter object is not used directly in demo for DB ops
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      setActiveTab('transcript'); // Default tab
      setTabBarVisible(false);
      setIsGeneratingPlan(false); // Internal loading state
      
      if (isDemoMode) {
        setTranscriptText(initialDemoTranscript || '');
        setDiagnosisText(demoDiagnosis || '');
        setTreatmentText(demoTreatment || '');
        setStarted(true); // Show transcript area immediately

        // If demo provides diagnosis or treatment, assume plan is "generated"
        if (demoDiagnosis || demoTreatment) {
          setPlanGenerated(true);
          // Set active tab to diagnosis if available, else treatment, else transcript
          if (demoDiagnosis) setActiveTab('diagnosis');
          else if (demoTreatment) setActiveTab('treatment');
          else setActiveTab('transcript');
        } else {
          setPlanGenerated(false);
          setActiveTab('transcript');
        }
        // DO NOT call createEncounter in demo mode
      } else {
        // Existing logic for non-demo mode
        setStarted(true); // Or false if you want the "Start Consultation" button first
        setTranscriptText('');
        setDiagnosisText('');
        setTreatmentText('');
        setPlanGenerated(false);
        createEncounter(); // Create real encounter for non-demo
      }
    }
  }, [isOpen, isDemoMode, initialDemoTranscript, demoDiagnosis, demoTreatment, createEncounter]); // createEncounter is memoized

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
      await supabaseDataService.updateEncounterTranscript(patient.id, compositeId, transcriptText);
      toast({ title: "Consultation Saved", description: "Transcript saved successfully." });
      onClose();
    } catch (error) {
      console.error('Failed to save data:', error);
      toast({ title: "Save Failed", description: "Could not save data. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, patient.id, encounter, transcriptText, onClose, toast, isSaving]);

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
    // Capture current cursor position in textarea
    const textarea = transcriptTextareaRef.current;
    const selStart = textarea ? textarea.selectionStart : transcriptText.length;
    setCursorPosition(selStart);
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
              setTranscriptText(prev => {
                const current = prev || '';
                const pos = cursorPosition !== null ? cursorPosition : current.length;
                const prefix = current.slice(0, pos);
                const suffix = current.slice(pos);
                const needSpace = prefix && !prefix.endsWith(' ') && !chunk.startsWith(' ');
                const newText = prefix + (needSpace ? ' ' : '') + chunk + suffix;
                const newCursor = pos + (needSpace ? 1 : 0) + chunk.length;
                setCursorPosition(newCursor);
                return newText;
              });
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
  }, [isDemoMode, cursorPosition, isTranscribing, isPaused, transcriptText, toast]);

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
                        <Textarea
                          ref={transcriptTextareaRef}
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)} // Keep local edits possible
                          placeholder={isDemoMode ? "Demo transcript loaded." : "Type or dictate the consultation notes here..."}
                          className="flex-1 resize-none text-base"
                          style={{ minHeight: '300px' }}
                          readOnly={isDemoMode && !initialDemoTranscript} // Example: make readOnly if no initial transcript in demo
                        />
                      </div>
                    )}

                    {planGenerated && activeTab === 'diagnosis' && (
                      <div className="h-full flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Diagnosis</h3>
                        <Textarea
                          value={diagnosisText}
                          onChange={(e) => setDiagnosisText(e.target.value)}
                          placeholder={isDemoMode ? "Demo diagnosis loaded." : "Enter or edit the diagnosis..."}
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
                          placeholder={isDemoMode ? "Demo treatment plan loaded." : "Enter or edit the treatment plan..."}
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