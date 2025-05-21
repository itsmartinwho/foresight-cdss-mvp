'use client';
import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from "@/lib/utils";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Admission, Diagnosis, LabResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Mic, Save, Pause as PauseIcon, Play as PlayIcon } from "lucide-react";

// Consultation Tab
export default function ConsultationTab({
  patient,
  allAdmissions,
  selectedAdmission,
  onSelectAdmission,
  isStartingNewConsultation,
  newConsultationReason,
  onNewConsultationReasonChange,
  newConsultationDate,
  onNewConsultationDateChange,
  newConsultationDuration,
  onNewConsultationDurationChange,
  onStartTranscriptionForNewConsult,
}: {
  patient: Patient;
  allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }>;
  selectedAdmission: Admission | null;
  onSelectAdmission: (admission: Admission | null) => void;
  isStartingNewConsultation?: boolean;
  newConsultationReason?: string;
  onNewConsultationReasonChange?: (reason: string) => void;
  newConsultationDate?: Date | null;
  onNewConsultationDateChange?: (date: Date | null) => void;
  newConsultationDuration?: number | null;
  onNewConsultationDurationChange?: (duration: number | null) => void;
  onStartTranscriptionForNewConsult?: () => Promise<Admission | null>;
}) {
  const availableAdmissions = allAdmissions.map(ad => ad.admission);
  const currentDetailedAdmission = !isStartingNewConsultation ? allAdmissions.find(ad => ad.admission.id === selectedAdmission?.id)?.admission : null;

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState<string>("");
  const [lastSavedTranscript, setLastSavedTranscript] = useState<string>("");
  const [transcriptChanged, setTranscriptChanged] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const transcriptAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initialTranscript = currentDetailedAdmission?.transcript || "";
    setEditableTranscript(initialTranscript);
    setLastSavedTranscript(initialTranscript);
    setTranscriptChanged(false);
  }, [currentDetailedAdmission?.transcript, selectedAdmission]);

  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleSaveTranscript = async () => {
    if (!patient || !currentDetailedAdmission) {
      console.warn("Cannot save: Patient or admission data missing.");
      return;
    }
    if (editableTranscript !== lastSavedTranscript) {
      try {
        await supabaseDataService.updateAdmissionTranscript(patient.id, currentDetailedAdmission.id, editableTranscript);
        setLastSavedTranscript(editableTranscript);
        setTranscriptChanged(false);
        console.log("Transcript saved.");
      } catch (error) {
        console.error("Error saving transcript:", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (transcriptChanged) {
        handleSaveTranscript();
      }
    };
  }, [transcriptChanged, selectedAdmission]);

  const getCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && transcriptAreaRef.current && transcriptAreaRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      return range.startOffset;
    }
    return null;
  };

  const startTranscription = async () => {
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
    }
    if (isTranscribing && !isPaused) return;

    if (document.activeElement === transcriptAreaRef.current) {
      setCursorPosition(getCursorPosition());
    } else {
      setCursorPosition(null);
    }

    let admissionToUse = currentDetailedAdmission;

    if (isStartingNewConsultation && onStartTranscriptionForNewConsult) {
      const newAdmission = await onStartTranscriptionForNewConsult();
      if (!newAdmission) {
        alert("Failed to create new consultation entry. Cannot start transcription.");
        return;
      }
      admissionToUse = newAdmission;
      if (!admissionToUse && selectedAdmission){
        admissionToUse = selectedAdmission;
      }
      if (!admissionToUse) {
         alert("Error: Could not determine active admission for new transcription.");
         return;
      }
      setEditableTranscript("");
      setLastSavedTranscript("");
      setTranscriptChanged(false);
    } else if (!admissionToUse) {
        alert("No active consultation selected. Cannot start transcription.");
        return;
    }
    
    if (isPaused) {
       if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      setIsPaused(false);
      setIsTranscribing(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true',
        ['token', apiKey]
      );
      socketRef.current = ws;
      mediaRecorderRef.current = mediaRecorder;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.channel && data.is_final) {
            const newTextChunk = data.channel.alternatives[0]?.transcript || '';
            if (newTextChunk) {
              setEditableTranscript((prev) => {
                const currentText = prev || '';
                let finalText;
                if (cursorPosition !== null && cursorPosition <= currentText.length) {
                  finalText = currentText.slice(0, cursorPosition) + newTextChunk + ' ' + currentText.slice(cursorPosition);
                  setCursorPosition(cursorPosition + newTextChunk.length + 1);
                } else {
                  finalText = (currentText ? currentText + '\n' : '') + newTextChunk;
                }
                setTranscriptChanged(true);
                return finalText;
              });
            }
          }
        } catch (_) {}
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
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err: unknown) {
      console.error('Error starting transcription', err);
      alert(`Error starting transcription: ${err instanceof Error ? err.message : String(err)}`);
      setIsTranscribing(false);
      setIsPaused(false);
    }
  };

  const pauseTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const stopTranscriptionAndSave = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      socketRef.current.close();
    }
    setIsTranscribing(false);
    setIsPaused(false);
    handleSaveTranscript();
  };

  const handleTranscriptChange = (newText: string) => {
    setEditableTranscript(newText);
    if (newText !== lastSavedTranscript) {
      setTranscriptChanged(true);
    }
  };

  const showStartTranscriptionOverlay = !isStartingNewConsultation && !currentDetailedAdmission?.transcript && !editableTranscript && !isTranscribing;

  const handleSelectionChange = () => {
    if (transcriptAreaRef.current && document.activeElement === transcriptAreaRef.current) {
        const pos = getCursorPosition();
        if (pos !== null) setCursorPosition(pos);
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [transcriptAreaRef.current]);

  return (
    <div className={cn("p-6 grid lg:grid-cols-3 gap-6", isStartingNewConsultation ? "lg:grid-cols-1" : "")}>
      {isStartingNewConsultation ? (
        <div className="lg:col-span-3 space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Reason for visit</label>
            <Input
              placeholder="E.g., joint pain, generalized inflammation"
              className="placeholder:text-muted-foreground text-step--1"
              value={newConsultationReason}
              onChange={(e) => onNewConsultationReasonChange?.(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date and time</label>
            <DatePicker
              selected={newConsultationDate}
              onChange={(d) => onNewConsultationDateChange?.(d)}
              showTimeSelect
              dateFormat="Pp"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-step--1 border-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Duration</label>
            <select
              value={newConsultationDuration || ''}
              onChange={(e) => onNewConsultationDurationChange?.(e.target.value ? parseInt(e.target.value) : null)}
              className={cn(
                "w-full mt-1 px-3 py-2 border rounded-md bg-background text-step--1 font-sans border-border",
                !newConsultationDuration ? "text-[var(--placeholder-color)] opacity-[var(--placeholder-opacity)]" : "text-foreground opacity-100"
              )}
            >
              <option value="" disabled>Select duration</option>
              {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map(minutes => (
                <option key={minutes} value={minutes}>{minutes} min</option>
              ))}
            </select>
          </div>
        </div>
      ) : selectedAdmission && (
        <div className="lg:col-span-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm rounded-md px-4 py-2 mb-4">
          <span className="font-semibold">Current Visit:</span> {new Date(selectedAdmission.scheduledStart).toLocaleString()} &nbsp;—&nbsp; {selectedAdmission.reason || 'N/A'}
        </div>
      )}
      
      <Card className={cn("lg:col-span-2 bg-glass glass-dense backdrop-blur-lg relative", isStartingNewConsultation ? "lg:col-span-3" : "")}>
        {showStartTranscriptionOverlay && (
          <button
            onClick={startTranscription}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-md text-neon hover:brightness-125 transition z-10"
          >
            <Mic size={48} className="mb-3 text-neon animate-pulse" />
            <span className="text-step-0 font-semibold">Start Transcription</span>
          </button>
        )}
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-step-0">
            <div className="flex items-center gap-2">
              <span className="text-neon"><svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.97-4.03 9-9 9-1.87 0-3.61-.57-5.07-1.54L3 21l1.54-3.93A8.967 8.967 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z'/></svg></span>
              Transcript
            </div>
            {transcriptChanged && !isTranscribing && (
              <Button variant="default" size="sm" onClick={handleSaveTranscript} className="ml-auto mr-2">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            )}
            {!isTranscribing && !isStartingNewConsultation && (editableTranscript || currentDetailedAdmission?.transcript) && !showStartTranscriptionOverlay && (
              <Button variant="ghost" size="icon" onClick={startTranscription} title="Start Transcription">
                <Mic className="h-5 w-5 text-neon" />
              </Button>
            )}
          </CardTitle>
          
          {isTranscribing && (
            <div className="mt-2 p-2 border-b border-border flex items-center gap-2">
              {!isPaused ? (
                <Button variant="secondary" size="sm" onClick={pauseTranscription} title="Pause Transcription">
                  <PauseIcon className="h-4 w-4 mr-2" /> Pause
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={startTranscription} title="Resume Transcription">
                  <PlayIcon className="h-4 w-4 mr-2" /> Resume
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={stopTranscriptionAndSave} title="Stop Transcription & Save">
                Stop & Save
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">{isPaused ? "Paused" : "Transcribing..."}</span>
            </div>
          )}

          {!isTranscribing && (isStartingNewConsultation || editableTranscript || currentDetailedAdmission?.transcript) && !showStartTranscriptionOverlay && (
             <div className="mt-2 p-2 border-b border-border"> 
              <span className="text-xs text-muted-foreground">Editing tools (TODO)</span>
            </div>
          )}

        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm relative">
          {(isStartingNewConsultation || currentDetailedAdmission?.transcript || editableTranscript || isTranscribing) ? (
            <div
              ref={transcriptAreaRef}
              contentEditable={!isTranscribing}
              suppressContentEditableWarning
              onInput={(e) => handleTranscriptChange((e.currentTarget as HTMLDivElement).innerText)}
              className="whitespace-pre-wrap outline-none p-1 min-h-[calc(60vh-40px)]"
              dangerouslySetInnerHTML={{ __html: editableTranscript }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {isStartingNewConsultation ? "Begin typing or start transcription." : "No transcript available for this consultation."}
            </p>
          )}
        </CardContent>
      </Card>

      {!isStartingNewConsultation && (
        <Card className="bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-step-0"><span className="text-neon"><svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 20h9M12 4h9M4 9h16M4 15h16'/></svg></span> Structured Note (SOAP)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 h-[60vh] overflow-y-auto">
            {currentDetailedAdmission?.soapNote ?
              currentDetailedAdmission.soapNote.split('\n').map((line, i) => <p key={i} className="text-step-0">{line}</p>) :
              <p className="text-muted-foreground">No SOAP note available for this consultation.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 