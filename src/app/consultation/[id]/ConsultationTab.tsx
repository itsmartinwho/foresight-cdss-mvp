'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea was used, or a contentEditable div
import { RichTextEditor, RichTextEditorRef } from '@/components/ui/rich-text-editor';
import { Microphone as Mic, FloppyDisk as Save, PauseCircle, PlayCircle } from '@phosphor-icons/react';
import { AudioWaveform } from '@/components/ui/AudioWaveform';
import { getSupabaseClient } from '@/lib/supabaseClient'; // Corrected import path
import { Encounter, Patient, ClinicalOutputPackage, DifferentialDiagnosis } from '@/lib/types'; // Renamed Admission to Encounter
import { supabaseDataService } from '@/lib/supabaseDataService'; // Import supabaseDataService
import AIAnalysisPanel from '@/components/AIAnalysisPanel'; // Ensure this is the correct path
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast"; // Corrected: import useToast hook
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function useDebouncedCallback(callback: (...args: any[]) => void, delay: number): (...args: any[]) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

interface ConsultationTabProps {
  selectedEncounter: Encounter | null;
  patientName?: string; // Made optional as it might not always be directly passed if patient object is available
  patient: Patient | null;
  // Props for new consultation UI, passed from PatientWorkspaceViewModern
  isStartingNewConsultation?: boolean;
  newConsultationReason?: string;
  onNewConsultationReasonChange?: (reason: string) => void;
  newConsultationDate?: Date | null;
  onNewConsultationDateChange?: (date: Date | null) => void;
  newConsultationDuration?: number | null;
  onNewConsultationDurationChange?: (duration: number | null) => void;
  onStartTranscriptionForNewConsult?: () => Promise<Encounter | null>; // Callback when starting transcription for a new (just created) consult
}

const ConsultationTab: React.FC<ConsultationTabProps> = ({ 
  selectedEncounter, 
  patientName, 
  patient, 
  isStartingNewConsultation,
  newConsultationReason,
  onNewConsultationReasonChange,
  newConsultationDate,
  onNewConsultationDateChange,
  newConsultationDuration,
  onNewConsultationDurationChange,
  onStartTranscriptionForNewConsult
}) => {
  const supabase = getSupabaseClient(); // Initialize supabase client
  const { toast } = useToast(); // Corrected: call useToast hook to get the toast function
  const [isLoading, setIsLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const [editableTranscript, setEditableTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [lastSavedTranscript, setLastSavedTranscript] = useState<string>('');
  const [transcriptChanged, setTranscriptChanged] = useState<boolean>(false);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false); // Added isPaused state
  const [showPriorAuthModal, setShowPriorAuthModal] = useState(false);

  const transcriptAreaRef = useRef<HTMLDivElement>(null);
  const richTextEditorRef = useRef<RichTextEditorRef>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Added mediaRecorderRef
  const socketRef = useRef<WebSocket | null>(null); // Added socketRef for consistency with original file
  const isSavingRef = useRef(false); // Track save state to prevent race conditions

  const encounterStateForAutoSaveRef = useRef<{
    patientBusinessId: string | undefined; // Business ID of the patient
    encounterSupabaseId: string | undefined; // Stores selectedEncounter.id (UUID)
    transcriptToSave: string;
    lastSaved: string;
  } | null>(null);

  // State for AI Analysis Panel
  const [aiOutput, setAiOutput] = useState<ClinicalOutputPackage | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [referralDetails, setReferralDetails] = useState<any>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [priorAuthDetails, setPriorAuthDetails] = useState<any>(null);

  const stopTranscription = useCallback(() => {
    let stopped = false;
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          stopped = true;
        }
      } catch (e) {}
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
  }, []);

  useEffect(() => {
    // Stop any active transcription when the selected encounter changes or is cleared
    stopTranscription();
    
    if (selectedEncounter && patient) { 
      const currentTranscript = selectedEncounter.transcript || '';
      setEditableTranscript(currentTranscript);
      setLastSavedTranscript(currentTranscript);
      setTranscriptChanged(false);
      // Set content in the RichTextEditor
      if (richTextEditorRef.current) {
        richTextEditorRef.current.setContent(currentTranscript);
      }
      
      setAiOutput(null);
      encounterStateForAutoSaveRef.current = {
        patientBusinessId: selectedEncounter.patientId, 
        encounterSupabaseId: selectedEncounter.id, // Using the UUID for this ref state
        transcriptToSave: currentTranscript,
        lastSaved: currentTranscript,
      };
    } else {
      setEditableTranscript("");
      setLastSavedTranscript("");
      setTranscriptChanged(false);
      // Clear content in the RichTextEditor
      if (richTextEditorRef.current) {
        richTextEditorRef.current.setContent("");
      }
      
      setAiOutput(null);
      encounterStateForAutoSaveRef.current = null;
    }
    
    // Cleanup function
    return () => {
      // Final cleanup on unmount
      stopTranscription();
    };
  }, [selectedEncounter, patient, stopTranscription]);

  const getCursorPosition = (): number | null => {
    // Note: With Tiptap, cursor position management is handled internally
    // We can get the current selection position if needed using editor.state.selection
    if (richTextEditorRef.current?.editor) {
      return richTextEditorRef.current.editor.state.selection.from;
    }
    return null;
  };

  const debouncedSaveTranscript = useDebouncedCallback(async () => {
    const currentSaveState = encounterStateForAutoSaveRef.current;
    
    // Prevent multiple simultaneous saves
    if (isSavingRef.current) {
      return;
    }
    
    if (currentSaveState && selectedEncounter && currentSaveState.patientBusinessId && selectedEncounter.encounterIdentifier && currentSaveState.transcriptToSave !== currentSaveState.lastSaved) {
      console.log("Auto-saving transcript for patient (business ID):", currentSaveState.patientBusinessId, "encounter (business ID):", selectedEncounter.encounterIdentifier);
      
      isSavingRef.current = true;
      try {
        const encounterIdVal = typeof selectedEncounter.encounterIdentifier === 'string' 
          ? selectedEncounter.encounterIdentifier
          : String(selectedEncounter.encounterIdentifier);

        const compositeEncounterId = `${currentSaveState.patientBusinessId}_${encounterIdVal}`;
        
        await supabaseDataService.updateEncounterTranscript(currentSaveState.patientBusinessId, compositeEncounterId, currentSaveState.transcriptToSave);
        console.log("Transcript auto-saved for encounter (business ID):", encounterIdVal);
        if (encounterStateForAutoSaveRef.current && encounterStateForAutoSaveRef.current.encounterSupabaseId === selectedEncounter.id) {
          encounterStateForAutoSaveRef.current.lastSaved = currentSaveState.transcriptToSave;
        }
        setLastSavedTranscript(currentSaveState.transcriptToSave);
        setTranscriptChanged(false);
        toast({ title: "Transcript Auto-Saved", description: "Changes to the transcript have been saved automatically." });
      } catch (error) {
        console.error("Error auto-saving transcript:", error);
        toast({ title: "Save Error", description: "Could not auto-save transcript.", variant: "destructive" });
      } finally {
        isSavingRef.current = false;
      }
    }
  }, 1000);

  const handleTranscriptChange = (newTranscript: string) => {
    setEditableTranscript(newTranscript);
    const changed = newTranscript !== (encounterStateForAutoSaveRef.current?.lastSaved || "");
    setTranscriptChanged(changed);
    if (encounterStateForAutoSaveRef.current) {
      encounterStateForAutoSaveRef.current.transcriptToSave = newTranscript;
    }
    if (changed) {
      debouncedSaveTranscript();
    }
  };
  
  const handleDivFocus = () => {
    // Intentionally left blank - Tiptap handles focus internally
  };

  const handleDivKeyUpOrMouseUp = () => {
    // Intentionally left blank - Tiptap handles cursor position internally
  };

  const startTranscription = async () => {
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
    }
    if (isTranscribing && !isPaused) return;

    const currentCursor = getCursorPosition();
    console.log("Starting transcription, cursor at:", currentCursor);

    let encounterToUse = selectedEncounter;

    // Only create new encounter if we're starting a new consultation AND no encounter exists
    if (!encounterToUse && isStartingNewConsultation && onStartTranscriptionForNewConsult) {
        // Add guard to prevent multiple creation attempts
        if (isTranscribing) {
          console.log("Already transcribing, skipping encounter creation");
          return;
        }
        
        try {
          setIsTranscribing(true); // Set early to prevent race conditions
          encounterToUse = await onStartTranscriptionForNewConsult();
          if (!encounterToUse) {
            alert("Failed to create new consultation. Cannot start transcription.");
            setIsTranscribing(false);
            return;
          }
        } catch (error) {
          console.error("Error creating new consultation:", error);
          alert("Failed to create new consultation. Cannot start transcription.");
          setIsTranscribing(false);
          return;
        }
    }

    if (!encounterToUse) {
        alert("No active consultation selected. Cannot start transcription.");
        return;
    }
    
    if (isPaused) {
       if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        setIsTranscribing(true);
        console.log("Resumed transcription");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const wsInstance = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=true',
        ['token', apiKey]
      );
      socketRef.current = wsInstance;
      mediaRecorderRef.current = mediaRecorder;

      wsInstance.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.channel && data.is_final && data.channel.alternatives[0]?.transcript) {
            const newTextChunk = data.channel.alternatives[0].transcript.trim();
            const speaker = data.channel.alternatives[0]?.words?.[0]?.speaker ?? null;
            
            if (newTextChunk !== '') {
              let textToAdd = newTextChunk;
              
              // Add speaker label if available
              if (speaker !== null && speaker !== undefined) {
                const speakerLabel = `Speaker ${speaker}: `;
                // Get current content from state to avoid ref/state sync issues
                const currentContent = editableTranscript;
                const lines = currentContent.split('\n');
                const lastLine = lines[lines.length - 1] || '';
                
                // Add speaker label if starting fresh or speaker changed
                if (!lastLine.includes('Speaker ') || !lastLine.startsWith(`Speaker ${speaker}:`)) {
                  textToAdd = (currentContent ? '\n' : '') + speakerLabel + newTextChunk;
                } else {
                  textToAdd = ' ' + newTextChunk;
                }
              } else {
                // No speaker info, just add appropriate spacing
                textToAdd = (editableTranscript ? ' ' : '') + newTextChunk;
              }
              
              // Only update state to trigger single change event
              setEditableTranscript((prevText) => {
                const updatedText = prevText + textToAdd;
                // Update the ref state tracker for auto-save
                if (encounterStateForAutoSaveRef.current) {
                  encounterStateForAutoSaveRef.current.transcriptToSave = updatedText;
                }
                
                // Auto-scroll to bottom after content update
                setTimeout(() => {
                  if (richTextEditorRef.current?.editor) {
                    richTextEditorRef.current.editor.commands.focus('end');
                  }
                }, 100);
                
                return updatedText;
              });
            }
          }
        } catch (error) {
          console.warn('[ConsultationTab] Error processing WebSocket message:', error);
        }
      };

      wsInstance.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(event.data);
          }
        });
        mediaRecorder.start(250);
        setIsTranscribing(true);
        setIsPaused(false);
        console.log("Transcription started via WebSocket.");
      };

      wsInstance.onclose = (event) => {
        console.log("WebSocket closed", event.reason, event.code);
        stopTranscription();
      };

      wsInstance.onerror = (error) => {
        console.error("WebSocket error:", error);
        stopTranscription();
      }

    } catch (err: unknown) {
      console.error('Error starting transcription system', err);
      alert(`Error starting transcription system: ${err instanceof Error ? err.message : String(err)}`);
      stopTranscription();
    }
  };

  const pauseTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log("Transcription paused.");
    }
  };

  const stopTranscriptionAndSave = () => {
    console.log("Stop & Save initiated.");
    stopTranscription();
    
    setTimeout(() => {
      handleSaveTranscript();
    }, 250); // Delay to allow final transcript processing
  };

  const handleAIResultsSave = async () => {
    if (!aiOutput || !aiOutput.diagnosticResult || !selectedEncounter || !patient) {
      toast({ title: "Error", description: "No AI analysis results to save or patient/encounter not available.", variant: "destructive" });
      return;
    }
    setIsSavingAI(true);
    try {
      let soapNoteString: string | null = null;
      if (aiOutput.soapNote) {
        soapNoteString = typeof aiOutput.soapNote === 'string' ? aiOutput.soapNote : JSON.stringify(aiOutput.soapNote);
      }

      if (aiOutput.diagnosticResult.differentialDiagnoses && selectedEncounter.encounterIdentifier) {
        await supabaseDataService.saveDifferentialDiagnoses(
          selectedEncounter.patientId, // patient business ID
          selectedEncounter.encounterIdentifier, // encounter business ID
          aiOutput.diagnosticResult.differentialDiagnoses as DifferentialDiagnosis[] // Type assertion
        );
      }
      
      if (soapNoteString && selectedEncounter.patientId && selectedEncounter.encounterIdentifier) {
          const compositeEncounterId = `${selectedEncounter.patientId}_${selectedEncounter.encounterIdentifier}`;
          await supabaseDataService.updateEncounterSOAPNote(selectedEncounter.patientId, compositeEncounterId, soapNoteString);
          // Update local encounter state if necessary
          if(selectedEncounter.soapNote !== soapNoteString) {
            // This would typically involve re-fetching or updating the selectedEncounter object in parent state
            console.log("SOAP note updated, UI refresh might be needed for selectedEncounter");
          }
      }

      toast({ title: "Success", description: "AI Analysis (Differentials & SOAP) saved." });
    } catch (error) {
      console.error("Error saving AI Analysis to encounter:", error);
      toast({ title: "Error", description: `Failed to save AI Analysis: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSavingAI(false);
    }
  };

  const openReferralModal = () => {
    if (aiOutput?.referralDocument?.generatedContent) {
      setReferralDetails(aiOutput.referralDocument.generatedContent);
      setShowReferralModal(true);
    } else {
      toast({title: "No Referral Document", description: "AI analysis did not generate a referral document.", variant: "default"})
    }
  }

  const openPriorAuthModal = () => {
    if (aiOutput?.priorAuthDocument?.generatedContent) {
      setPriorAuthDetails(aiOutput.priorAuthDocument.generatedContent);
      setShowPriorAuthModal(true);
    }
     else {
      toast({title: "No Prior Auth Document", description: "AI analysis did not generate a prior authorization document.", variant: "default"})
    }
  }

  const handleSaveTranscript = async () => {
    const currentSaveState = encounterStateForAutoSaveRef.current;
    if (currentSaveState && selectedEncounter && currentSaveState.patientBusinessId && selectedEncounter.encounterIdentifier && currentSaveState.transcriptToSave !== currentSaveState.lastSaved) {
      setIsLoading(true); // Indicate loading state
      console.log("Manually saving transcript for patient (business ID):", currentSaveState.patientBusinessId, "encounter (business ID):", selectedEncounter.encounterIdentifier);
      try {
        const encounterIdVal = typeof selectedEncounter.encounterIdentifier === 'string' 
        ? selectedEncounter.encounterIdentifier
        : String(selectedEncounter.encounterIdentifier); // Or handle error/default

        const compositeEncounterId = `${currentSaveState.patientBusinessId}_${encounterIdVal}`;
        await supabaseDataService.updateEncounterTranscript(currentSaveState.patientBusinessId, compositeEncounterId, currentSaveState.transcriptToSave);
        console.log("Transcript manually saved for encounter (business ID):", selectedEncounter.encounterIdentifier);
        if (encounterStateForAutoSaveRef.current && encounterStateForAutoSaveRef.current.encounterSupabaseId === selectedEncounter.id) {
          encounterStateForAutoSaveRef.current.lastSaved = currentSaveState.transcriptToSave;
        }
        setLastSavedTranscript(currentSaveState.transcriptToSave);
        setTranscriptChanged(false);
        toast({ title: "Transcript Saved", description: "The transcript has been successfully saved." });
      } catch (error) {
        console.error("Error manually saving transcript:", error);
        toast({ title: "Save Error", description: `Failed to save transcript: ${(error as Error).message}`, variant: "destructive" });
      } finally {
        setIsLoading(false); // Reset loading state
      }
    } else if (currentSaveState && currentSaveState.transcriptToSave === currentSaveState.lastSaved) {
      toast({ title: "No Changes", description: "No changes to save in the transcript.", variant: "default" });
    } else {
      toast({ title: "Save Error", description: "Cannot save transcript. Patient or encounter context is missing.", variant: "destructive" });
    }
  };
  
  const handleManualSave = handleSaveTranscript; // Alias for JSX

  // Auto-start transcription for new consultations
  useEffect(() => {
    if (isStartingNewConsultation && !isTranscribing && !selectedEncounter) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        startTranscription();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStartingNewConsultation, isTranscribing, selectedEncounter]);

  // JSX for rendering will be added here
  return (
    <div className="space-y-4">
      {isStartingNewConsultation && (
        <Card>
          <CardHeader>
            <CardTitle>New Consultation Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reason for consultation</label>
              <input
                type="text"
                placeholder="E.g., joint pain, generalized inflammation"
                className="w-full px-3 py-2 border rounded-md bg-background text-step--1 border-border"
                value={newConsultationReason || ''}
                onChange={(e) => onNewConsultationReasonChange?.(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date and time</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border rounded-md bg-background text-step--1 border-border"
                value={newConsultationDate ? newConsultationDate.toISOString().slice(0, 16) : ''}
                onChange={(e) => onNewConsultationDateChange?.(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Duration</label>
              <select
                value={newConsultationDuration || ''}
                onChange={(e) => onNewConsultationDurationChange?.(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-md bg-background text-step--1 border-border"
              >
                <option value="" disabled>Select duration</option>
                {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map(minutes => (
                  <option key={minutes} value={minutes}>{minutes} min</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Consultation Notes & Transcript
          <div className="flex items-center gap-2">
            {transcriptChanged && !isTranscribing && (
              <Button variant="default" size="sm" onClick={handleManualSave}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            )}
            {!isTranscribing && (selectedEncounter || isStartingNewConsultation) && (
              <Button variant="ghost" size="icon" onClick={startTranscription} title="Start Transcription">
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardTitle>
        

      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto relative">
        {(selectedEncounter || editableTranscript || isTranscribing || isStartingNewConsultation) ? (
          <>
            <RichTextEditor
              ref={richTextEditorRef}
              content={editableTranscript}
              onContentChange={handleTranscriptChange}
              placeholder="Start typing your consultation notes or transcription will appear here automatically..."
              disabled={isTranscribing}
              showToolbar={!isTranscribing}
              minHeight="300px"
              className="h-full"
            />
            {isTranscribing && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <AudioWaveform
                  isRecording={isTranscribing}
                  isPaused={isPaused}
                  mediaStream={mediaRecorderRef.current?.stream || null}
                  onPause={pauseTranscription}
                  onResume={startTranscription}
                  onStop={stopTranscriptionAndSave}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>
              No transcript available. Select an encounter or start a new consultation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* AI Analysis Panel */}
    {selectedEncounter && patient?.id && (
      <AIAnalysisPanel
        patientId={patient.id}
        encounterId={selectedEncounter.id}
        onSave={handleAIResultsSave}
      />
    )}
    </div>
  );
};

export default ConsultationTab; 