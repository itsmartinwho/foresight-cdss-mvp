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
import { Microphone as Mic, FloppyDisk as Save, Pause as PauseIcon, Play as PlayIcon, TextBold as Bold, TextItalic as Italic, ListBullets as List, ArrowCounterClockwise as Undo, ArrowClockwise as Redo } from 'phosphor-react';

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

  const admissionStateForAutoSaveRef = useRef<{
    patientId: string | undefined;
    admissionId: string | undefined;
    transcriptToSave: string;
    lastSaved: string;
  } | null>(null);

  useEffect(() => {
    const initialTranscript = currentDetailedAdmission?.transcript || "";
    setEditableTranscript(initialTranscript);
    setLastSavedTranscript(initialTranscript);
    setTranscriptChanged(false);

    admissionStateForAutoSaveRef.current = {
      patientId: patient?.id,
      admissionId: currentDetailedAdmission?.id,
      transcriptToSave: initialTranscript,
      lastSaved: initialTranscript,
    };
  }, [currentDetailedAdmission?.id, currentDetailedAdmission?.transcript, patient?.id]);

  useEffect(() => {
    if (admissionStateForAutoSaveRef.current && admissionStateForAutoSaveRef.current.admissionId === currentDetailedAdmission?.id) {
      admissionStateForAutoSaveRef.current.transcriptToSave = editableTranscript;
      admissionStateForAutoSaveRef.current.lastSaved = lastSavedTranscript;
    }
  }, [editableTranscript, lastSavedTranscript, currentDetailedAdmission?.id]);


  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const performSave = async (patientId: string, admissionId: string, transcriptToSave: string, currentLastSaved: string) => {
    if (transcriptToSave !== currentLastSaved) {
      console.log(`Attempting to save. Changed: ${transcriptToSave !== currentLastSaved}. To Save: "${transcriptToSave.substring(0,100)}...", Last Saved: "${currentLastSaved.substring(0,100)}..."`);
      try {
        await supabaseDataService.updateAdmissionTranscript(patientId, admissionId, transcriptToSave);
        if (admissionId === currentDetailedAdmission?.id) {
            setLastSavedTranscript(transcriptToSave);
            setTranscriptChanged(false);
        }
        if (admissionStateForAutoSaveRef.current && admissionStateForAutoSaveRef.current.admissionId === admissionId) {
            admissionStateForAutoSaveRef.current.lastSaved = transcriptToSave;
        }
        console.log("Transcript saved successfully via performSave for admission:", admissionId);
        return true;
      } catch (error) {
        console.error("Error saving transcript via performSave for admission:", admissionId, error);
        return false;
      }
    } else {
        if (transcriptChanged && admissionId === currentDetailedAdmission?.id){
            setTranscriptChanged(false);
        }
    }
    return false;
  };
  
  const handleSaveTranscript = async () => {
    if (!patient?.id || !currentDetailedAdmission?.id) {
      console.warn("Cannot save: Patient or admission data missing for current view.");
      return;
    }
    performSave(patient.id, currentDetailedAdmission.id, editableTranscript, lastSavedTranscript);
  };
  
  useEffect(() => {
    const autoSaveOnCleanup = () => {
      const stateToSave = admissionStateForAutoSaveRef.current;
      if (stateToSave && stateToSave.patientId && stateToSave.admissionId && (stateToSave.transcriptToSave !== stateToSave.lastSaved)) {
        console.log(`Auto-saving transcript for previous/unmounting admission ${stateToSave.admissionId}`);
        performSave(stateToSave.patientId, stateToSave.admissionId, stateToSave.transcriptToSave, stateToSave.lastSaved);
      }
    };
    return autoSaveOnCleanup;
  }, [currentDetailedAdmission?.id]);

  const getCursorPosition = () => {
    const selection = window.getSelection();
    const editor = transcriptAreaRef.current;
    if (selection && selection.rangeCount > 0 && editor && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editor);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      return preCaretRange.toString().length;
    }
    return null;
  };

  const startTranscription = async () => {
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
    }
    if (isTranscribing && !isPaused) return;

    const currentCursor = getCursorPosition();
    setCursorPosition(currentCursor);
    console.log("Starting transcription, cursor at:", currentCursor);

    let admissionToUse = currentDetailedAdmission;

    if (isStartingNewConsultation && onStartTranscriptionForNewConsult) {
      const newAdmission = await onStartTranscriptionForNewConsult();
      if (!newAdmission) {
        alert("Failed to create new consultation entry. Cannot start transcription.");
        return;
      }
      admissionToUse = newAdmission;
      setEditableTranscript("");
      setLastSavedTranscript("");
      setTranscriptChanged(false);
      setCursorPosition(0);
    } else if (!admissionToUse) {
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
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3-medical&punctuate=true&interim_results=true&smart_format=true&diarize=false',
        ['token', apiKey]
      );
      socketRef.current = ws;
      mediaRecorderRef.current = mediaRecorder;

      ws.onmessage = (e) => {
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

      ws.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        });
        mediaRecorder.start(250);
        setIsTranscribing(true);
        setIsPaused(false);
        console.log("Transcription started via WebSocket.");
      };

      ws.onclose = (event) => {
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

      ws.onerror = (error) => {
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
    }, 250);
  };

  const handleTranscriptChange = (newText: string) => {
    setEditableTranscript(newText);
    if (newText !== lastSavedTranscript) {
      setTranscriptChanged(true);
    }
  };
  
  const showStartTranscriptionOverlay = !isStartingNewConsultation && !currentDetailedAdmission?.transcript && !editableTranscript && !isTranscribing;

  const handleDivFocus = () => {
    // setCursorPosition(getCursorPosition()); // Removed manual cursor position update on focus
  };

  const handleDivKeyUpOrMouseUp = () => {
    // setCursorPosition(getCursorPosition()); // Removed manual cursor position update on keyup/mouseup
  };

  const applyFormat = (command: string, value?: string) => {
    if (transcriptAreaRef.current) {
      transcriptAreaRef.current.focus(); // Ensure editor has focus
      document.execCommand(command, false, value);
      // Update state from DOM after execCommand
      const newText = transcriptAreaRef.current.innerHTML;
      handleTranscriptChange(newText); // This will set editableTranscript and transcriptChanged
    }
  };

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
              <div className="mx-1 h-5 border-l border-border"></div> {/* Separator */}
              <Button variant="outline" size="sm" onClick={() => applyFormat('undo')} title="Undo">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyFormat('redo')} title="Redo">
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          )}

        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm relative">
          {(isStartingNewConsultation || currentDetailedAdmission?.transcript || editableTranscript || isTranscribing) ? (
            <div
              ref={transcriptAreaRef}
              contentEditable={!isTranscribing}
              suppressContentEditableWarning
              onInput={(e) => handleTranscriptChange((e.currentTarget as HTMLDivElement).innerHTML)}
              onFocus={handleDivFocus}
              onKeyUp={handleDivKeyUpOrMouseUp}
              onMouseUp={handleDivKeyUpOrMouseUp}
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