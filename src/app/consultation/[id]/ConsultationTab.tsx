'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea was used, or a contentEditable div
import { Microphone as Mic, FloppyDisk as Save, PauseCircle, PlayCircle, TextB as Bold, TextItalic as Italic, ListBullets as List, ArrowCounterClockwise as Undo, ArrowClockwise as Redo } from '@phosphor-icons/react';
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
  // Props for new consultation UI, passed from PatientWorkspaceView
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
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false); // Added isPaused state
  const [showPriorAuthModal, setShowPriorAuthModal] = useState(false);

  const transcriptAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Added mediaRecorderRef
  const socketRef = useRef<WebSocket | null>(null); // Added socketRef for consistency with original file

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

  useEffect(() => {
    if (selectedEncounter && patient) { 
      const currentTranscript = selectedEncounter.transcript || '';
      setEditableTranscript(currentTranscript);
      setLastSavedTranscript(currentTranscript);
      setTranscriptChanged(false);
      if (ws) {
        ws.close();
        setWs(null);
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
      if (ws) {
        ws.close();
        setWs(null);
      }
      setAiOutput(null);
      encounterStateForAutoSaveRef.current = null;
    }
  }, [selectedEncounter, patient, ws]);

  const getCursorPosition = (): number | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return range.startOffset;
    }
    return null;
  };

  const debouncedSaveTranscript = useDebouncedCallback(async () => {
    const currentSaveState = encounterStateForAutoSaveRef.current;
    if (currentSaveState && selectedEncounter && currentSaveState.patientBusinessId && selectedEncounter.encounterIdentifier && currentSaveState.transcriptToSave !== currentSaveState.lastSaved) {
      console.log("Auto-saving transcript for patient (business ID):", currentSaveState.patientBusinessId, "encounter (business ID):", selectedEncounter.encounterIdentifier);
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
    // Intentionally left blank for now, was: setCursorPosition(getCursorPosition());
  };

  const handleDivKeyUpOrMouseUp = () => {
    // Intentionally left blank for now, was: setCursorPosition(getCursorPosition());
  };

  const startTranscription = async () => {
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
    }
    if (isTranscribing && !isPaused) return;

    const currentCursor = getCursorPosition();
    setCursorPosition(currentCursor);
    console.log("Starting transcription, cursor at:", currentCursor);

    let encounterToUse = selectedEncounter;

    if (!encounterToUse && isStartingNewConsultation && onStartTranscriptionForNewConsult) {
        // Create new encounter first
        try {
          encounterToUse = await onStartTranscriptionForNewConsult();
          if (!encounterToUse) {
            alert("Failed to create new consultation. Cannot start transcription.");
            return;
          }
        } catch (error) {
          console.error("Error creating new consultation:", error);
          alert("Failed to create new consultation. Cannot start transcription.");
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
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=false',
        ['token', apiKey]
      );
      socketRef.current = wsInstance;
      mediaRecorderRef.current = mediaRecorder;

      wsInstance.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.channel && data.is_final && data.channel.alternatives[0].transcript) {
            const newTextChunk = data.channel.alternatives[0].transcript;
            if (newTextChunk.trim() !== '') {
              setEditableTranscript((prevText) => {
                const currentText = prevText || '';
                let newComposedText;
                let nextCursorPos = cursorPosition;

                if (nextCursorPos !== null && nextCursorPos >= 0 && nextCursorPos <= currentText.length) {
                  newComposedText = currentText.slice(0, nextCursorPos) + newTextChunk + (newTextChunk.endsWith(' ') ? '' : ' ') + currentText.slice(nextCursorPos);
                  nextCursorPos = nextCursorPos + newTextChunk.length + (newTextChunk.endsWith(' ') ? 0 : 1);
                } else {
                  newComposedText = currentText + (currentText.length > 0 && !currentText.endsWith(' ') && !newTextChunk.startsWith(' ') ? ' ' : '') + newTextChunk;
                  nextCursorPos = newComposedText.length;
                }
                setCursorPosition(nextCursorPos);
                setTranscriptChanged(true);
                return newComposedText;
              });
            }
          }
        } catch (_) { /* console.error("Error processing ws message", _); */ }
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => track.stop());
        }
        setIsTranscribing(false);
        setIsPaused(false);
      };

      wsInstance.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsTranscribing(false);
        setIsPaused(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => track.stop());
        }
      }

    } catch (err: unknown) {
      console.error('Error starting transcription system', err);
      alert(`Error starting transcription system: ${err instanceof Error ? err.message : String(err)}`);
      setIsTranscribing(false);
      setIsPaused(false);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      socketRef.current.close(); 
    } else {
      setIsTranscribing(false);
      setIsPaused(false);
    }
    
    setTimeout(() => {
      handleSaveTranscript();
    }, 250); // Delay to allow final transcript processing
  };

  const applyFormat = (command: string, value?: string) => {
    if (transcriptAreaRef.current) {
      transcriptAreaRef.current.focus();
      document.execCommand(command, false, value);
      const newText = transcriptAreaRef.current.innerHTML;
      handleTranscriptChange(newText); // Call with the string content
    }
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reason for visit</label>
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
        
        {isTranscribing && (
          <div className="mt-2 p-2 border-b border-border flex items-center gap-2">
            {!isPaused ? (
              <Button variant="secondary" size="sm" onClick={pauseTranscription} title="Pause Transcription">
                <PauseCircle className="h-4 w-4 mr-2" /> Pause
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={startTranscription} title="Resume Transcription">
                <PlayCircle className="h-4 w-4 mr-2" /> Resume
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={stopTranscriptionAndSave} title="Stop Transcription & Save">
              Stop & Save
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {isPaused ? "Paused" : "Transcribing..."}
            </span>
          </div>
        )}

        {!isTranscribing && selectedEncounter && (
           <div className="mt-2 p-2 border-b border-border flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => applyFormat('bold')} title="Bold">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyFormat('italic')} title="Italic">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyFormat('insertUnorderedList')} title="Bullet List">
              <List className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 border-l border-border"></div>
            <Button variant="outline" size="sm" onClick={() => applyFormat('undo')} title="Undo">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyFormat('redo')} title="Redo">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        )}

      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {(selectedEncounter || editableTranscript || isTranscribing || isStartingNewConsultation) ? (
          <div
            ref={transcriptAreaRef}
            contentEditable={!isTranscribing}
            suppressContentEditableWarning
            onInput={(e) => handleTranscriptChange((e.currentTarget as HTMLDivElement).innerHTML)}
            onFocus={handleDivFocus}
            onKeyUp={handleDivKeyUpOrMouseUp}
            onMouseUp={handleDivKeyUpOrMouseUp}
            className="whitespace-pre-wrap outline-none p-1 min-h-[300px] h-full border rounded-md"
            dangerouslySetInnerHTML={{ __html: editableTranscript }}
          />
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