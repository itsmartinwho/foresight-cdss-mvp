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
import { Mic } from "lucide-react";

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

  useEffect(() => {
    if (currentDetailedAdmission?.transcript) {
      setEditableTranscript(currentDetailedAdmission.transcript);
    } else {
      setEditableTranscript("");
    }
  }, [currentDetailedAdmission?.transcript, selectedAdmission]);

  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startTranscription = async () => {
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
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
    }
    
    if (!admissionToUse) {
        alert("No active consultation selected. Cannot start transcription.");
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
            const alt = data.channel.alternatives[0];
            if (alt && alt.transcript) {
              setEditableTranscript((prev) => (prev ? prev + '\n' + alt.transcript : alt.transcript));
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
    }
  };

  const pauseTranscription = () => {
    if (mediaRecorderRef.current && socketRef.current) {
      if (!isPaused) {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      } else {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      }
    }
  };

  const endTranscription = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      socketRef.current.close();
    }
    setIsTranscribing(false);
    setIsPaused(false);
    
    const admissionToSaveTo = currentDetailedAdmission || selectedAdmission;

    if (patient && admissionToSaveTo) {
      supabaseDataService.updateAdmissionTranscript(patient.id, admissionToSaveTo.id, editableTranscript);
    } else {
      console.warn("Could not save transcript: patient or admission data missing.");
    }
  };

  const handleTranscriptChange = (text: string) => {
    setEditableTranscript(text);
    if (!isTranscribing && patient && currentDetailedAdmission) {
      supabaseDataService.updateAdmissionTranscript(patient.id, currentDetailedAdmission.id, text);
    }
  };

  const showStartTranscriptionOverlay = !isStartingNewConsultation && !currentDetailedAdmission?.transcript && !isTranscribing;

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
      
      <Card className={cn("lg:col-span-2 bg-glass glass-dense backdrop-blur-lg", isStartingNewConsultation ? "lg:col-span-3" : "")}>
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
              Live Transcript
            </div>
            {!isTranscribing && !isStartingNewConsultation && currentDetailedAdmission?.transcript && (
              <Button variant="ghost" size="icon" onClick={startTranscription} title="Start/Restart Transcription">
                <Mic className="h-5 w-5 text-neon" />
              </Button>
            )}
          </CardTitle>
          {!isTranscribing && (isStartingNewConsultation || currentDetailedAdmission?.transcript) && (
            <div className="mt-2 p-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Editing tools (TODO)</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm">
          {(isStartingNewConsultation || currentDetailedAdmission?.transcript || isTranscribing || editableTranscript) ? (
            <div
              contentEditable={!isTranscribing}
              suppressContentEditableWarning
              onInput={(e) => handleTranscriptChange((e.currentTarget as HTMLDivElement).innerText)}
              className="whitespace-pre-wrap outline-none p-1 min-h-[50px]"
              dangerouslySetInnerHTML={{ __html: editableTranscript }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {isStartingNewConsultation ? "Begin typing or start transcription." : "No transcript available for this consultation. Click Start Transcription."}
            </p>
          )}
        </CardContent>
        {isTranscribing ? (
          <div className="absolute bottom-4 right-4 flex gap-4 z-20">
            <Button onClick={pauseTranscription} variant="secondary" size="sm" className="rounded-full">
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={endTranscription} variant="destructive" size="sm" className="rounded-full">
              End
            </Button>
          </div>
        ) : (
          isStartingNewConsultation && !editableTranscript && (
            <div className="absolute bottom-4 right-4 z-20">
              <Button 
                onClick={startTranscription} 
                className="rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none w-[140px] h-[40px] flex items-center justify-center"
              >
                Start Transcription
              </Button>
            </div>
          )
        )}
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