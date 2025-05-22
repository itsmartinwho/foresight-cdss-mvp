'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea was used, or a contentEditable div
import { Microphone as Mic, FloppyDisk as Save, PauseCircle, PlayCircle, TextBolder as Bold, TextItalic as Italic, ListBullets as List, ArrowCounterClockwise as Undo, ArrowClockwise as Redo } from 'phosphor-react';
import { getSupabaseClient } from '@/lib/supabaseClient'; // Corrected import
import { Admission, Patient } from '@/lib/types'; // Assuming types path, Import Patient type
import { supabaseDataService } from '@/lib/supabaseDataService'; // Import supabaseDataService

interface ConsultationTabProps {
  selectedAdmission: Admission | null;
  patientName: string;
  patient: Patient; // Add patient prop
}

const ConsultationTab: React.FC<ConsultationTabProps> = ({ selectedAdmission, patientName, patient }) => {
  const supabase = getSupabaseClient(); // Initialize supabase client

  const [editableTranscript, setEditableTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [lastSavedTranscript, setLastSavedTranscript] = useState<string>('');
  const [transcriptChanged, setTranscriptChanged] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false); // Added isPaused state

  const transcriptAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Added mediaRecorderRef
  const socketRef = useRef<WebSocket | null>(null); // Added socketRef for consistency with original file

  const admissionStateForAutoSaveRef = useRef<{
    patientId: string | undefined; // Corrected to patientId
    admissionId: string | undefined;
    transcriptToSave: string;
    lastSaved: string; // Corrected to lastSaved
  } | null>(null);

  useEffect(() => {
    if (selectedAdmission) {
      const currentTranscript = selectedAdmission.transcript || '';
      setEditableTranscript(currentTranscript);
      setLastSavedTranscript(currentTranscript);
      setTranscriptChanged(false);
      // Reset transcription state if admission changes
      if (ws) {
        ws.close();
        setWs(null);
      }
      setIsTranscribing(false);
      setTranscriptionStartTime(null);

      // Initialize admissionStateForAutoSaveRef
      admissionStateForAutoSaveRef.current = {
        patientId: patient?.id,
        admissionId: selectedAdmission.id, // selectedAdmission is confirmed to be non-null here
        transcriptToSave: currentTranscript,
        lastSaved: currentTranscript,
      };

    } else {
      setEditableTranscript('');
      setLastSavedTranscript('');
      setTranscriptChanged(false);
      admissionStateForAutoSaveRef.current = null; // Clear ref if no admission
    }
  }, [selectedAdmission, ws, patient?.id]); // Added patient?.id, ws is correctly in deps

  // Effect to keep the auto-save ref's transcript data up-to-date
  useEffect(() => {
    if (admissionStateForAutoSaveRef.current && admissionStateForAutoSaveRef.current.admissionId === selectedAdmission?.id) {
      admissionStateForAutoSaveRef.current.transcriptToSave = editableTranscript;
      admissionStateForAutoSaveRef.current.lastSaved = lastSavedTranscript;
    }
  }, [editableTranscript, lastSavedTranscript, selectedAdmission?.id]);

  const performSave = useCallback(async (patientId: string, admissionId: string, transcriptToSave: string, currentLastSaved: string) => {
    if (transcriptToSave !== currentLastSaved) {
      console.log(`Attempting to save. Changed: ${transcriptToSave !== currentLastSaved}. To Save: "${transcriptToSave.substring(0,100)}"...", Last Saved: "${currentLastSaved.substring(0,100)}"..."`);
      try {
        // Assuming supabaseDataService is available globally or imported elsewhere
        await supabaseDataService.updateAdmissionTranscript(patientId, admissionId, transcriptToSave);
        if (admissionId === selectedAdmission?.id) { // Use selectedAdmission from props
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
        if (transcriptChanged && admissionId === selectedAdmission?.id){ // Use selectedAdmission from props
            setTranscriptChanged(false);
        }
    }
    return false;
  }, [selectedAdmission, setLastSavedTranscript, setTranscriptChanged, transcriptChanged]); // Added transcriptChanged
  
  const handleSaveTranscript = async () => {
    if (!selectedAdmission || !patient?.id) { // Combined checks
        console.warn("Cannot save: Patient or admission data missing.");
        return;
    }
    performSave(patient.id, selectedAdmission.id, editableTranscript, lastSavedTranscript);
  };

  // Add auto-save effect
  useEffect(() => {
    const autoSaveOnCleanup = () => {
      const stateToSave = admissionStateForAutoSaveRef.current;
      if (stateToSave && stateToSave.patientId && stateToSave.admissionId && (stateToSave.transcriptToSave !== stateToSave.lastSaved)) {
        console.log(`Auto-saving transcript for previous/unmounting admission ${stateToSave.admissionId}`);
        performSave(stateToSave.patientId, stateToSave.admissionId, stateToSave.transcriptToSave, stateToSave.lastSaved);
      }
    };
    return autoSaveOnCleanup;
  }, [selectedAdmission?.id, performSave]); // Added performSave to dependencies

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

  const handleTranscriptChange = (newText: string) => {
    setEditableTranscript(newText);
    if (newText !== lastSavedTranscript) {
      setTranscriptChanged(true);
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

    let admissionToUse = selectedAdmission; // Use selectedAdmission from props

    if (!admissionToUse) {
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
      socketRef.current = wsInstance; // Use wsInstance to avoid confusion with state variable ws
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
                let nextCursorPos = cursorPosition; // Use state cursorPosition

                if (nextCursorPos !== null && nextCursorPos >= 0 && nextCursorPos <= currentText.length) {
                  newComposedText = currentText.slice(0, nextCursorPos) + newTextChunk + (newTextChunk.endsWith(' ') ? '' : ' ') + currentText.slice(nextCursorPos);
                  nextCursorPos = nextCursorPos + newTextChunk.length + (newTextChunk.endsWith(' ') ? 0 : 1);
                } else {
                  newComposedText = currentText + (currentText.length > 0 && !currentText.endsWith(' ') && !newTextChunk.startsWith(' ') ? ' ' : '') + newTextChunk;
                  nextCursorPos = newComposedText.length;
                }
                setCursorPosition(nextCursorPos); // Update state cursorPosition
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
      transcriptAreaRef.current.focus(); // Ensure editor has focus
      document.execCommand(command, false, value);
      // Update state from DOM after execCommand
      const newText = transcriptAreaRef.current.innerHTML;
      handleTranscriptChange(newText); // This will set editableTranscript and transcriptChanged
    }
  };

  // JSX for rendering will be added here
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Consultation Notes & Transcript
          <div className="flex items-center gap-2">
            {transcriptChanged && !isTranscribing && (
              <Button variant="default" size="sm" onClick={handleSaveTranscript}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            )}
            {!isTranscribing && selectedAdmission && (
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

        {!isTranscribing && selectedAdmission && (
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
      <CardContent className="flex-grow overflow-y-auto">
        {(selectedAdmission || editableTranscript || isTranscribing) ? (
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
              No transcript available. Select an admission or start a new consultation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsultationTab; 