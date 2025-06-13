'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor, RichTextEditorRef } from '@/components/ui/rich-text-editor';
import { X, Brain, CircleNotch, PauseCircle, PlayCircle, FloppyDisk } from '@phosphor-icons/react';
import { AudioWaveform } from '@/components/ui/AudioWaveform';
import { DemoAudioWaveform } from '@/components/ui/DemoAudioWaveform';
import { format } from 'date-fns';
import type { Patient, Encounter, Treatment, DifferentialDiagnosis, SoapNote } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useGlassClass } from '@/lib/uiVariant';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDemo } from '@/contexts/DemoContext';
import DifferentialDiagnosesList from '@/components/diagnosis/DifferentialDiagnosesList';
import { SOAPNotesPanel } from '@/components/soap/SOAPNotesPanel';
import { DraggableModalWrapper } from '@/components/ui/draggable-modal-wrapper';
import { ModalDragAndMinimizeConfig } from '@/types/modal';
import { saveConsultationDraft, loadConsultationDraft, clearConsultationDraft } from '@/lib/consultationDraftStore';

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
  /** Initial differential diagnoses for demo mode */
  demoDifferentialDiagnoses?: DifferentialDiagnosis[];
  /** Initial SOAP notes for demo mode */
  demoSoapNote?: SoapNote;
  /** Callback for when "Clinical Plan" is clicked in demo mode */
  onDemoClinicalPlanClick?: () => void;
  /** Controls loading state of Clinical Plan button externally for demo */
  isDemoGeneratingPlan?: boolean;
  /** Enable draggable functionality */
  draggable?: boolean;
  /** Configuration for drag and minimize behavior */
  draggableConfig?: ModalDragAndMinimizeConfig;
}

// Styled DatePicker component to match the design
const StyledDatePicker = React.forwardRef<any, any>(({ className, onChange, selected, ...props }, ref) => (
  <DatePicker
    ref={ref}
    selected={selected}
    onChange={onChange}
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
  demoDifferentialDiagnoses,
  demoSoapNote,
  onDemoClinicalPlanClick,
  isDemoGeneratingPlan = false,
  draggable = false,
  draggableConfig,
}: ConsultationPanelProps) {
  // Debug demo mode detection
  useEffect(() => {
    if (isOpen) {
      console.log('[ConsultationPanel] Demo mode detection:', {
        isDemoMode,
        patientId: patient?.id,
        hasInitialTranscript: !!initialDemoTranscript,
        hasDemoDiagnosis: !!demoDiagnosis,
        hasDemoTreatment: !!demoTreatment,
        hasOnClickHandler: !!onDemoClinicalPlanClick
      });
    }
  }, [isOpen, isDemoMode, patient?.id, initialDemoTranscript, demoDiagnosis, demoTreatment, onDemoClinicalPlanClick]);
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
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<DifferentialDiagnosis[]>([]);
  const [isLoadingDifferentials, setIsLoadingDifferentials] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [planGenerated, setPlanGenerated] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // SOAP Notes state
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  
  // Transcription state and refs
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  // New state for confirmation dialog
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [editedWhilePaused, setEditedWhilePaused] = useState(false);
  
  // Refs
  const transcriptEditorRef = useRef<RichTextEditorRef>(null);
  const diagnosisEditorRef = useRef<RichTextEditorRef>(null);
  const treatmentEditorRef = useRef<RichTextEditorRef>(null);
  const demoInitializedRef = useRef<boolean>(false);
  const startVoiceInputRef = useRef<(() => Promise<any>) | null>(null);
  const autoStartAttemptedRef = useRef<Set<string>>(new Set());
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartSessionRef = useRef(false);
  const transcriptionActiveRef = useRef(false);

  // add refs
  const isTranscribingRef = useRef(false);
  const isPausedRef = useRef(false);
  useEffect(()=>{isTranscribingRef.current=isTranscribing;},[isTranscribing]);
  useEffect(()=>{isPausedRef.current=isPaused;},[isPaused]);

  // CRITICAL: Update both state and ref when transcription status changes
  // This ref is essential for cleanup functions that need current transcription state
  const setIsTranscribingAndRef = (val: boolean) => {
    setIsTranscribing(val);
    transcriptionActiveRef.current = val;
  };

  // CRITICAL: Store the original getUserMedia stream for complete cleanup
  const originalStreamRef = useRef<MediaStream | null>(null);

  // ---------- Draft persistence across page navigation ----------
  const draftId = (draggableConfig?.id) ?? `consultation-draft-${patient.id}`;

  // Load draft on open
  useEffect(() => {
    if (isOpen) {
      const draft = loadConsultationDraft(draftId);
      if (draft?.transcriptText) {
        setTranscriptText(draft.transcriptText);
      }
    }
  }, [isOpen, draftId]);

  // Persist transcript text whenever it changes
  useEffect(() => {
    if (isOpen) {
      saveConsultationDraft(draftId, { transcriptText });
    }
  }, [transcriptText, isOpen, draftId]);

  // Helper to clear draft and perform close
  const finalizeAndClose = useCallback(() => {
    clearConsultationDraft(draftId);
    onClose();
  }, [draftId, onClose]);

  // --- LIFECYCLE & SETUP ---

  useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL: Comprehensive audio cleanup function
  // This ensures ALL audio tracks are stopped from every possible source
  const cleanupAllAudioResources = useCallback(() => {
    console.log('[ConsultationPanel] Performing comprehensive audio cleanup');
    
    // Store references to all tracks before cleanup for verification
    const allTracks: MediaStreamTrack[] = [];
    
    // Stop MediaRecorder and its stream
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
      
      // Stop ALL tracks from MediaRecorder's stream
      if (mediaRecorderRef.current.stream) {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => {
          allTracks.push(track);
          console.log(`Stopping MediaRecorder track: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
          if (track.readyState === 'live') {
            track.stop();
            console.log(`MediaRecorder track stopped: ${track.kind}, new state: ${track.readyState}`);
          }
        });
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop ALL tracks from audioStreamRef
    if (audioStreamRef.current) {
      const tracks = audioStreamRef.current.getTracks();
      tracks.forEach(track => {
        allTracks.push(track);
        console.log(`Stopping audioStreamRef track: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
        if (track.readyState === 'live') {
          track.stop();
          console.log(`AudioStreamRef track stopped: ${track.kind}, new state: ${track.readyState}`);
        }
      });
      audioStreamRef.current = null;
    }
    
    // CRITICAL: Stop the original getUserMedia stream
    if (originalStreamRef.current) {
      const tracks = originalStreamRef.current.getTracks();
      tracks.forEach(track => {
        allTracks.push(track);
        console.log(`Stopping original stream track: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
        if (track.readyState === 'live') {
          track.stop();
          console.log(`Original stream track stopped: ${track.kind}, new state: ${track.readyState}`);
        }
      });
      originalStreamRef.current = null;
    }
    
    // Close WebSocket
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }
      } catch (e) {
        console.warn('Error closing WebSocket:', e);
      }
      socketRef.current = null;
    }
    
    // Verify all tracks are actually stopped
    setTimeout(() => {
      console.log('[ConsultationPanel] Verifying track cleanup:');
      allTracks.forEach((track, index) => {
        console.log(`Track ${index}: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
      });
      
      // Final verification: Log current track count
      console.log(`[ConsultationPanel] Total tracks processed: ${allTracks.length}`);
    }, 100);
    
    // Reset transcription state
    setIsTranscribingAndRef(false);
    setIsPaused(false);
    transcriptionActiveRef.current = false;
    
    console.log('[ConsultationPanel] Audio cleanup completed - all tracks stopped and streams cleared');
  }, []);

  // CRITICAL PATTERN: stopTranscription is NOT in any dependency arrays
  // Including it would cause immediate start/stop cycles due to React re-renders
  const stopTranscription = useCallback((resetPaused: boolean = true)=>{
    console.log("ConsultationPanel stopTranscription called",{resetPaused,isTranscribing:isTranscribingRef.current,isPaused:isPausedRef.current});
    if(isDemoMode) return;
    cleanupAllAudioResources();
    if(resetPaused) setIsPaused(false);
  },[isDemoMode, cleanupAllAudioResources]);

  const handleSaveAndClose = useCallback(async () => {
    // Call comprehensive cleanup if transcription is active
    if (!isDemoMode && transcriptionActiveRef.current) {
      cleanupAllAudioResources();
    }
    
    if (isDemoMode || !encounter) {
      finalizeAndClose();
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
      finalizeAndClose();
    } catch (error) {
      console.error("Failed to save consultation:", error);
      toast({ title: "Save Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, patient.id, encounter, transcriptText, diagnosisText, treatmentText, finalizeAndClose, toast, isSaving, cleanupAllAudioResources]);

  const handleDiscard = useCallback(async () => {
    // Call comprehensive cleanup if transcription is active
    if (!isDemoMode && transcriptionActiveRef.current) {
      cleanupAllAudioResources();
    }
    
    if (isDemoMode) {
      finalizeAndClose();
      return;
    }
    if (encounter) {
      await supabaseDataService.permanentlyDeleteEncounter(patient.id, encounter.id);
    }
    finalizeAndClose();
  }, [isDemoMode, encounter, patient.id, finalizeAndClose, cleanupAllAudioResources]);
  
  const handleCloseRequest = useCallback(() => {
    if (isDemoMode) {
      finalizeAndClose();
      return;
    }

    // First, handle transcription if it's running
    const isActivelyTranscribing = transcriptionActiveRef.current || isTranscribing || isPaused;
    const hasTranscriptContent = transcriptText.trim();
    const hasOtherContent = diagnosisText.trim() || treatmentText.trim();
    const hasAnyContent = hasTranscriptContent || hasOtherContent;

    // If transcription is active but no content, stop transcription and close immediately
    if (isActivelyTranscribing && !hasAnyContent) {
      console.log('[ConsultationPanel] Closing modal with active transcription but no content - stopping transcription');
      cleanupAllAudioResources();
      handleDiscard();
      return;
    }

    // If transcription is active AND there's content, ask for confirmation with transcription context
    if (isActivelyTranscribing && hasAnyContent) {
      console.log('[ConsultationPanel] Closing modal with active transcription and content - asking for confirmation');
      setShowConfirmationDialog(true);
      return;
    }

    // If no transcription is active, use the existing logic
    if (hasAnyContent) {
      setShowConfirmationDialog(true);
    } else {
      handleDiscard();
    }
  }, [isDemoMode, transcriptText, diagnosisText, treatmentText, finalizeAndClose, handleDiscard, isTranscribing, isPaused, cleanupAllAudioResources]);

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

  const handleTreatmentTextChange = useCallback((newText: string) => {
    setTreatmentText(newText);
    
    // Sync treatment changes back to SOAP plan (debounced)
    const timeoutId = setTimeout(() => {
      setSoapNote(prev => prev ? { ...prev, plan: newText } : null);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const pauseTranscription = useCallback(() => {
    console.log("ConsultationPanel pauseTranscription called - current states:", { isTranscribing, isPaused });
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log("ConsultationPanel: Transcription paused - mediaRecorder paused, isPaused set to true");
    } else {
      console.log("ConsultationPanel pauseTranscription: mediaRecorder not in recording state:", mediaRecorderRef.current?.state);
    }
  }, [isTranscribing, isPaused]);

  const resumeTranscription = useCallback(() => {
    console.log("ConsultationPanel resumeTranscription called - current states:", { isTranscribing, isPaused });
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setIsTranscribing(true); // Ensure we're in transcribing state
      console.log("ConsultationPanel: Transcription resumed - mediaRecorder resumed, isPaused set to false, isTranscribing set to true");
    } else {
      console.log("ConsultationPanel resumeTranscription: mediaRecorder not in paused state:", mediaRecorderRef.current?.state);
    }
  }, [isTranscribing, isPaused]);

  // CRITICAL PATTERN: Stable callback for child components
  // No dependencies prevents re-renders that could break transcription
  const handleAudioWaveformStop = useCallback(() => {
    cleanupAllAudioResources();
  }, [cleanupAllAudioResources]);

  const startVoiceInput = useCallback(async () => {
    console.log("ConsultationPanel startVoiceInput called - current states:", { isTranscribing, isPaused });
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error("ConsultationPanel startVoiceInput: No API key");
      return toast({ title: "Error", description: "Deepgram API key not configured.", variant: "destructive" });
    }
    if (isTranscribing) {
      console.log("ConsultationPanel startVoiceInput: Already transcribing, returning early");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isOpen) return stream.getTracks().forEach(track => track.stop());

      // CRITICAL: Store the original stream for complete cleanup
      originalStreamRef.current = stream;
      audioStreamRef.current = stream; // Store the original stream for waveform
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const mediaRecorder = mediaRecorderRef.current;
      
      const ws = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=true', ['token', apiKey]);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("ConsultationPanel: WebSocket opened successfully");
        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(event.data);
        });
        mediaRecorder.start(250);
        setIsTranscribingAndRef(true);
        setIsPaused(false); // Always reset paused state when starting new transcription
        console.log("ConsultationPanel: Transcription started - isTranscribing set to true, isPaused set to false");
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.channel && data.is_final && data.channel.alternatives[0]?.transcript) {
            const chunk = data.channel.alternatives[0].transcript.trim();
            if (chunk) {
              const speaker = data.channel.alternatives[0]?.words?.[0]?.speaker ?? null;
              
              setTranscriptText(prevText => {
                let textToAdd = chunk;
                
                // Add speaker label if available and appropriate
                if (speaker !== null && speaker !== undefined) {
                  const lines = prevText.split('\n');
                  const lastLine = lines[lines.length - 1] || '';
                  
                  // Add speaker label if starting fresh or speaker changed
                  if (!lastLine.includes('Speaker ') || !lastLine.startsWith(`Speaker ${speaker}:`)) {
                    textToAdd = (prevText ? '\n' : '') + `Speaker ${speaker}: ` + chunk;
                  } else {
                    textToAdd = ' ' + chunk;
                  }
                } else {
                  // No speaker info, just add appropriate spacing
                  textToAdd = (prevText ? ' ' : '') + chunk;
                }
                
                const updatedText = prevText + textToAdd;
                
                // Auto-scroll to bottom after content update
                setTimeout(() => {
                  if (transcriptEditorRef.current?.editor) {
                    transcriptEditorRef.current.editor.commands.focus('end');
                  }
                }, 100);
                
                return updatedText;
              });
            }
          }
        } catch (error) {
          console.warn('[ConsultationPanel] Error processing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[ConsultationPanel] WebSocket closed - cleaning up audio resources');
        cleanupAllAudioResources();
      };
      ws.onerror = () => {
        toast({ title: "Error", description: "Transcription service error.", variant: "destructive" });
        console.log('[ConsultationPanel] WebSocket error - cleaning up audio resources');
        cleanupAllAudioResources();
      };
    } catch (err) {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [isTranscribing, isPaused, isOpen, toast, cleanupAllAudioResources]);

  // Update ref whenever startVoiceInput changes
  useEffect(() => {
    startVoiceInputRef.current = startVoiceInput;
    console.log('[ConsultationPanel] Updated startVoiceInputRef, function available:', !!startVoiceInput);
  }, [startVoiceInput]);

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
      finalizeAndClose();
    } finally {
      setIsCreating(false);
      isCurrentlyCreatingEncounter.current = false;
    }
  }, [patient?.id, onConsultationCreated, finalizeAndClose, toast]);

  const handleClinicalPlan = useCallback(async () => {
    setIsGeneratingPlan(true);
    setIsLoadingDifferentials(true);
    setIsGeneratingSoap(true);
    
    try {
      // Step 1: Generate differential diagnoses first
      const differentialsResponse = await fetch('/api/clinical-engine/differential-diagnoses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: patient.id, 
          encounterId: encounter?.id, 
          transcript: transcriptText 
        }),
      });
      
      if (differentialsResponse.ok) {
        const differentialsResult = await differentialsResponse.json();
        setDifferentialDiagnoses(differentialsResult.differentialDiagnoses || []);
        setIsLoadingDifferentials(false);
        setPlanGenerated(true);
        setActiveTab('differentials');
      }

      // Step 2: Generate full clinical plan (including final diagnosis)
      const response = await fetch('/api/clinical-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, encounterId: encounter?.id, transcript: transcriptText }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const result = await response.json();
      
      // Update differential diagnoses from full result if available
      if (result.diagnosticResult?.differentialDiagnoses) {
        setDifferentialDiagnoses(result.diagnosticResult.differentialDiagnoses);
      }
      
      setDiagnosisText(result.diagnosticResult?.diagnosisName || '');
      setTreatmentText(result.diagnosticResult?.recommendedTreatments?.join('\n') || '');
      
      // Set SOAP note from the result if available
      if (result.soapNote) {
        setSoapNote(result.soapNote);
        setIsGeneratingSoap(false);
      }
      
      // Switch to diagnosis tab once everything is complete
      setActiveTab('diagnosis');
    } catch (error) {
      toast({ title: "Plan Generation Failed", variant: "destructive" });
      setIsLoadingDifferentials(false);
      setIsGeneratingSoap(false);
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [toast, patient.id, encounter?.id, transcriptText]);

  const handleSoapNoteChange = useCallback((section: keyof SoapNote, content: string) => {
    setSoapNote(prev => prev ? { ...prev, [section]: content } : null);
    
    // Debounced synchronization with other tabs
    const timeoutId = setTimeout(() => {
      if (section === 'assessment') {
        // Note: Bi-directional sync with differentials would be implemented here
        // For now, SOAP assessment is considered the source of truth when edited
      } else if (section === 'plan') {
        // Sync plan changes to treatment tab
        setTreatmentText(content);
      }
    }, 500); // 500ms debounce to prevent excessive updates
    
    return () => clearTimeout(timeoutId);
  }, []);

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
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      setActiveTab('transcript');
      setTabBarVisible(false);
      setIsGeneratingPlan(false);
      setStarted(false);
      // Preserve any previously restored draft data for non-demo sessions.
      if (isDemoMode) {
        setTranscriptText(initialDemoTranscript || '');
        setDiagnosisText(demoDiagnosis || '');
        setTreatmentText(demoTreatment || '');
        setDifferentialDiagnoses(demoDifferentialDiagnoses || []);
        setSoapNote(demoSoapNote || null);
      }
      setIsGeneratingSoap(false);
      setIsLoadingDifferentials(false);
      setPlanGenerated(!!(isDemoMode && (demoDiagnosis || demoTreatment || demoDifferentialDiagnoses)));
      setShowConfirmationDialog(false);
      setEditedWhilePaused(false);
      autoStartSessionRef.current = false;
      console.log('[ConsultationPanel] Modal opened, autoStartSessionRef reset');
      if (isDemoMode) {
        setStarted(true);
      }
    } else if (mounted) {
      setStarted(false);
      autoStartSessionRef.current = false;
      console.log('[ConsultationPanel] Modal closed, autoStartSessionRef reset');
    }
  }, [isOpen, isDemoMode, initialDemoTranscript, demoDiagnosis, demoTreatment, demoDifferentialDiagnoses, demoSoapNote, mounted]);
  
  useEffect(() => {
    if (!isDemoMode && isOpen && !encounter && !isCreating) {
      createEncounter();
    }
  }, [isDemoMode, isOpen, encounter, isCreating, createEncounter]);
  
  useEffect(() => {
    if (!isDemoMode && isOpen && encounter && !started && !isTranscribing && !autoStartSessionRef.current) {
      const encounterId = encounter.id;
      if (autoStartAttemptedRef.current.has(encounterId)) {
        console.log('[ConsultationPanel] Auto-start already attempted for encounter:', encounterId);
        setStarted(true);
        return;
      }
      console.log('[ConsultationPanel] Auto-starting transcription for encounter:', encounterId, { isDemoMode, encounter: !!encounter, started, isTranscribing, isOpen });
      autoStartAttemptedRef.current.add(encounterId);
      autoStartSessionRef.current = true;
      (async () => {
        console.log('[ConsultationPanel] Attempting immediate auto-start of transcription');
        try {
          if (isTranscribing) {
            console.log('[ConsultationPanel] Already transcribing, skipping auto-start');
            setStarted(true);
            return;
          }
          if (!startVoiceInputRef.current) {
            console.warn('[ConsultationPanel] startVoiceInputRef.current is null, cannot auto-start');
            toast({ title: "Auto-start Warning", description: "Transcription function not ready. Transcription will start automatically when ready.", variant: "destructive" });
            return;
          }
          const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
          if (!apiKey) {
            console.error('[ConsultationPanel] Missing Deepgram API key, cannot auto-start');
            toast({ title: "Error", description: "Deepgram API key not configured.", variant: "destructive" });
            return;
          }
          console.log('[ConsultationPanel] All checks passed, calling startVoiceInput via ref...');
          await startVoiceInputRef.current();
          setStarted(true);
          console.log('[ConsultationPanel] Auto-start transcription successful');
        } catch (error) {
          console.error('[ConsultationPanel] Auto-start transcription failed via ref:', error);
          try {
            console.log('[ConsultationPanel] Attempting fallback to direct function call...');
            await startVoiceInput();
            setStarted(true);
            console.log('[ConsultationPanel] Auto-start transcription successful via fallback');
          } catch (fallbackError) {
            console.error('[ConsultationPanel] Auto-start transcription failed completely:', fallbackError);
            toast({ title: "Auto-start Failed", description: "Could not automatically start transcription. Transcription will retry automatically.", variant: "destructive" });
          }
        }
      })();
    }
  }, [isDemoMode, encounter, isOpen, toast, startVoiceInput, isTranscribing, started]);
  
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
  
  useEffect(() => {
    if (!mounted) return;
    const handleVisibilityChange = () => {
      if (document.hidden && isTranscribingRef.current && !isPausedRef.current) {
        pauseTranscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, pauseTranscription]);

  // CRITICAL CLEANUP EFFECT: Only depends on isOpen to prevent race conditions
  // This was the key fix - dependency on stopTranscription was causing immediate cleanup
  useEffect(() => {
    // Only set up cleanup when modal is truly closing (isOpen becomes false)
    if (isOpen) return;
    
    // When modal closes, ensure transcription is stopped
    if (transcriptionActiveRef.current) {
      console.log('[ConsultationPanel] Modal closing: Stopping active transcription');
      cleanupAllAudioResources();
    }
  }, [isOpen, cleanupAllAudioResources]);

  useEffect(() => {
    return () => {
      // On unmount always persist latest text
      if (transcriptText) {
        saveConsultationDraft(draftId, { transcriptText });
      }
    };
  }, [draftId, transcriptText]);

  // Glass classes (called unconditionally at top level)
  const backdropGlassClass = useGlassClass('backdrop');
  const denseGlassClass = useGlassClass('dense');

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <>
      <div className="pt-2 pb-4 px-6 border-b border-border/50">
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
                  {['transcript', 'differentials', 'diagnosis', 'treatment'].map(tab => (
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
                      {tab === 'differentials' ? 'Differentials' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-hidden p-4 flex flex-col">
              {started ? (
                <>
                  {(!planGenerated || activeTab === 'transcript') && (
                    <div className={`flex-1 min-h-0 flex flex-col gap-4 ${(isGeneratingSoap || isGeneratingPlan || isDemoGeneratingPlan || !!soapNote) ? 'lg:flex-row' : ''}`}>
                      {/* Transcript Panel */}
                      <div className="flex-1 flex flex-col space-y-4 min-h-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Consultation Transcript</h3>
                          <div className="flex items-center gap-2">
                            {/* Save Icon Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveAndClose}
                              disabled={isSaving}
                              className="h-8 w-8 hover:bg-muted transition-all"
                              title="Save consultation"
                            >
                              {isSaving ? (
                                <CircleNotch className="h-4 w-4 animate-spin" />
                              ) : (
                                <FloppyDisk className="h-4 w-4" />
                              )}
                            </Button>
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
                        <div className="relative flex-1">
                          <RichTextEditor
                            ref={transcriptEditorRef}
                            content={transcriptText}
                            onContentChange={handleTranscriptChange}
                            placeholder="Transcription will appear here..."
                            disabled={isDemoMode || isTranscribing}
                            showToolbar={!isDemoMode && !isTranscribing}
                            minHeight="300px"
                            className="h-full"
                          />
                          {/* Always render pillbox container; AudioWaveform itself controls content visibility */}
                          {!isDemoMode && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                              <AudioWaveform
                                isRecording={isTranscribing}
                                isPaused={isPaused}
                                mediaStream={audioStreamRef.current}
                                onPause={pauseTranscription}
                                onResume={resumeTranscription}
                                onStop={handleAudioWaveformStop}
                              />
                            </div>
                          )}
                          {isDemoMode && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                              <DemoAudioWaveform />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* SOAP Notes Panel - Only show when clinical engine is running */}
                      {(isGeneratingSoap || isGeneratingPlan || isDemoGeneratingPlan || !!soapNote) && (
                        <div className="flex-1 min-h-0">
                          <SOAPNotesPanel
                            soapNote={soapNote}
                            isDemoMode={isDemoMode}
                            isGenerating={isGeneratingSoap}
                            isVisible={true}
                            onSoapNoteChange={handleSoapNoteChange}
                            className="h-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {planGenerated && activeTab === 'differentials' && (
                    <DifferentialDiagnosesList
                      diagnoses={differentialDiagnoses}
                      isLoading={isLoadingDifferentials}
                      isEditable={!isDemoMode}
                      className="flex-1 min-h-0"
                    />
                  )}
                  {planGenerated && activeTab === 'diagnosis' && (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                      <h3 className="text-lg font-medium">Diagnosis</h3>
                      <RichTextEditor content={diagnosisText} onContentChange={setDiagnosisText} placeholder="Enter diagnosis..." disabled={isDemoMode} showToolbar={!isDemoMode} minHeight="300px" className="flex-1" />
                    </div>
                  )}
                  {planGenerated && activeTab === 'treatment' && (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                      <h3 className="text-lg font-medium">Treatment Plan</h3>
                      <RichTextEditor content={treatmentText} onContentChange={handleTreatmentTextChange} placeholder="Enter treatment plan..." disabled={isDemoMode} showToolbar={!isDemoMode} minHeight="300px" className="flex-1" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Setting up consultation...</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

  const panelContent = draggable ? (
    <DraggableModalWrapper
      onClose={handleCloseRequest}
      config={{
        id: `consultation-panel-${patient.id}`,
        title: "New Consultation",
        persistent: true,
        ...draggableConfig,
      }}
      className="w-[95%] max-w-6xl max-h-[90vh]"
      showCloseButton={!isSaving}
    >
      {modalContent}
    </DraggableModalWrapper>
  ) : (
    <div 
      className={cn("fixed inset-0 z-[9999] flex items-center justify-center p-4", backdropGlassClass)}
      onClick={(e) => e.target === e.currentTarget && handleCloseRequest()}
    >
      <div className={cn("rounded-2xl shadow-2xl relative w-[95%] max-w-6xl max-h-[95vh] overflow-hidden flex flex-col", denseGlassClass)}>
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20 z-10"
          onClick={handleCloseRequest}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="pt-8">
          <h2 className="text-xl font-semibold px-6 pb-2">New Consultation</h2>
          {modalContent}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {panelContent}
      {showConfirmationDialog && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
            {(() => {
              const isActivelyTranscribing = transcriptionActiveRef.current || isTranscribing || isPaused;
              const hasTranscriptContent = transcriptText.trim();
              
              if (isActivelyTranscribing && hasTranscriptContent) {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Stop transcription and save content?</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Transcription is currently {isPaused ? 'paused' : 'running'} and you have transcript content. 
                      Closing will stop the transcription. Would you like to save your content before closing?
                    </p>
                  </>
                );
              } else if (isActivelyTranscribing && !hasTranscriptContent) {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Stop transcription?</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Transcription is currently {isPaused ? 'paused' : 'running'} but no content has been recorded yet. 
                      Closing will stop the transcription.
                    </p>
                  </>
                );
              } else {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Save transcript content?</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      You have transcript content that will be lost if you don&apos;t save it. What would you like to do?
                    </p>
                  </>
                );
              }
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={handleConfirmDiscard}>
                {(() => {
                  const isActivelyTranscribing = transcriptionActiveRef.current || isTranscribing || isPaused;
                  return isActivelyTranscribing ? 'Stop & Discard' : 'Delete';
                })()}
              </Button>
              <Button variant="default" onClick={handleConfirmSave}>
                {(() => {
                  const isActivelyTranscribing = transcriptionActiveRef.current || isTranscribing || isPaused;
                  return isActivelyTranscribing ? 'Stop & Save' : 'Save';
                })()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}