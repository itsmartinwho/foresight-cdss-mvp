'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission, Diagnosis, LabResult, Treatment } from "@/lib/types"; // Added Treatment
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"; // For renderDetailTable
import { Input } from "@/components/ui/input"; // <--- ADD THIS LINE
import { useSearchParams } from 'next/navigation';

// Helper: renderDetailTable (copied from ForesightApp.tsx, approx lines 66-105)
function renderDetailTable(title: string, dataArray: any[], headers: string[], columnAccessors?: string[]) {
  if (!dataArray || dataArray.length === 0) {
    return <p className="text-sm text-muted-foreground mt-1">No {title.toLowerCase()} data available.</p>;
  }
  const displayHeaders = headers;
  const accessors = columnAccessors || headers.map(h => h.toLowerCase().replace(/\s+/g, ''));

  return (
    <div className="mt-3 p-4 rounded-xl bg-glass glass-dense backdrop-blur-lg">
      <h4 className="font-semibold text-sm text-muted-foreground/80 mb-1">{title}</h4>
      <Table className="text-xs mobile-card:block sm:table">
        <TableHeader className="mobile-card:hidden sm:table-header-group">
          <TableRow>
            {displayHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody className="mobile-card:block sm:table-row-group">
          {dataArray.map((item, index) => (
            <TableRow
              key={index}
              className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row"
            >
              {accessors.map((accessor, colIndex) => (
                <TableCell
                  key={accessor}
                  className="mobile-card:flex mobile-card:flex-col sm:table-cell"
                  data-column={displayHeaders[colIndex]}
                >
                  <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">{displayHeaders[colIndex]}: </span>
                  {item[accessor] !== undefined && item[accessor] !== null ? String(item[accessor]) : 'N/A'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper: AllDataView (copied from ForesightApp.tsx, approx lines 107-154)
function AllDataView({ detailedPatientData }: { detailedPatientData: any }) {
  if (!detailedPatientData) return <p className="p-4 text-muted-foreground">No detailed data available.</p>;
  const { patient, admissions } = detailedPatientData;

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader><CardTitle className="text-step-1">Patient Demographics</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {Object.entries(patient).map(([key, value]) => (
            (typeof value !== 'object' || value === null) &&
            <div key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(value)}</div>
          ))}
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold mt-4 text-step-1">Admissions History</h3>
      {admissions.map((admMockWrapper: any, index: number) => {
        const adm: Admission = admMockWrapper.admission;
        const diagnoses: Diagnosis[] = admMockWrapper.diagnoses || [];
        const labResults: LabResult[] = admMockWrapper.labResults || [];

        return (
          <Card key={adm.id || index} className="mt-2 bg-glass glass-dense backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-step-0">Admission on {new Date(adm.scheduledStart).toLocaleString()} (ID: {adm.id})</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/80">Reason: {adm.reason || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><strong>Actual Start:</strong> {adm.actualStart ? new Date(adm.actualStart).toLocaleString() : 'N/A'}</div>
              <div><strong>Actual End:</strong> {adm.actualEnd ? new Date(adm.actualEnd).toLocaleString() : 'N/A'}</div>
              {adm.transcript && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">Transcript:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{adm.transcript}</pre></div>}
              {adm.soapNote && <div><h4 className="font-semibold text-xs text-muted-foreground mb-1">SOAP Note:</h4><pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{adm.soapNote}</pre></div>}
              {renderDetailTable("Diagnoses", diagnoses, ['Code', 'Description'], ['code', 'description'])}
              {renderDetailTable("Lab Results", labResults, ['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag'], ['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag'])}
              {renderDetailTable("Treatments", adm.treatments || [], ['Drug', 'Status', 'Rationale'], ['drug', 'status', 'rationale'])}
            </CardContent>
          </Card>
        );
      })}
       {admissions.length === 0 && <p className="text-muted-foreground">No admission history for this patient.</p>}
    </div>
  );
}

// Helper: SeverityBadge (copied from ForesightApp.tsx, approx lines 156-169)
function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "High"
      ? "bg-red-600"
      : severity === "Medium"
      ? "bg-orange-500"
      : "bg-slate-500";
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full`}>
      {severity}
    </span>
  );
}

// Consultation Tab (copied from ForesightApp.tsx, approx lines 544-608)
function ConsultationTab({ patient, allAdmissions, selectedAdmission, onSelectAdmission }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }>; selectedAdmission: Admission | null; onSelectAdmission: (admission: Admission | null) => void; }) {
  const availableAdmissions = allAdmissions.map(ad => ad.admission);
  const currentDetailedAdmission = allAdmissions.find(ad => ad.admission.id === selectedAdmission?.id)?.admission;

  // NEW STATE FOR LIVE TRANSCRIPTION
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
  const socketRef = React.useRef<WebSocket | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);

  const startTranscription = async () => {
    if (!apiKey) {
      alert('Deepgram API key not configured');
      return;
    }
    // Reset live transcript for a fresh run – user can still undo via browser undo if needed.
    setLiveTranscript('');
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
              setLiveTranscript((prev) => (prev ? prev + '\n' + alt.transcript : alt.transcript));
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
      };
    } catch (err: any) {
      console.error('Error starting transcription', err);
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
    // Persist transcript to patient data service
    if (patient && selectedAdmission) {
      patientDataService.updateAdmissionTranscript(patient.id, selectedAdmission.id, liveTranscript);
    }
  };

  const displayTranscript = currentDetailedAdmission?.transcript || liveTranscript;

  return (
    <div className="p-6 grid lg:grid-cols-3 gap-6">
      {selectedAdmission && (
        <div className="lg:col-span-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm rounded-md px-4 py-2 mb-4">
          <span className="font-semibold">Current Visit:</span> {new Date(selectedAdmission.scheduledStart).toLocaleString()} &nbsp;—&nbsp; {selectedAdmission.reason || 'N/A'}
        </div>
      )}
      <Card className="lg:col-span-2 bg-glass glass-dense backdrop-blur-lg relative">
        {/* Overlay when not transcribing & no transcript */}
        {!displayTranscript && !isTranscribing && (
          <button
            onClick={startTranscription}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-md text-neon hover:brightness-125 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-neon animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 01-14 0v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19v4m-4 0h8" />
            </svg>
            <span className="text-step-0 font-semibold">Start Transcription</span>
          </button>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-step-0"><span className="text-neon"><svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.97-4.03 9-9 9-1.87 0-3.61-.57-5.07-1.54L3 21l1.54-3.93A8.967 8.967 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z'/></svg></span> Live Transcript</CardTitle>
        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm">
          {displayTranscript ?
            <div
              contentEditable={!isTranscribing}
              suppressContentEditableWarning
              onInput={(e) => {
                const text = (e.currentTarget as HTMLDivElement).innerText;
                if (!isTranscribing && patient && selectedAdmission) {
                  patientDataService.updateAdmissionTranscript(patient.id, selectedAdmission.id, text);
                }
              }}
              className="whitespace-pre-wrap outline-none"
            >
              {displayTranscript}
            </div>
            :
            <p className="text-muted-foreground">No transcript available for this consultation.</p>
          }
        </CardContent>
        {/* Controls */}
        {isTranscribing ? (
          <div className="absolute bottom-2 right-4 flex gap-4">
            <button onClick={pauseTranscription} className="rounded-full bg-purple-600 text-white px-4 py-1 text-xs shadow hover:bg-purple-500 transition">
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={endTranscription} className="rounded-full bg-red-600 text-white px-4 py-1 text-xs shadow hover:bg-red-500 transition">
              End
            </button>
          </div>
        ) : (
          <div className="absolute bottom-2 right-4">
            <button onClick={startTranscription} className="rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none w-[140px] h-[40px] flex items-center justify-center">
              Start transcription
            </button>
          </div>
        )}
      </Card>
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
    </div>
  );
}

// Diagnosis Tab (copied from ForesightApp.tsx, approx lines 610-647)
function DiagnosisTab({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 space-y-6">
      {patient.alerts && patient.alerts.length > 0 && (
        <Card className="mt-6 mb-6 bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-step-0">Active Complex Case Alerts for {patient.name || patient.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center space-x-3 p-3 border rounded-md shadow-sm"
              >
                <SeverityBadge severity={alert.severity || 'Unknown'} />
                <p className="flex-grow text-sm text-muted-foreground truncate" title={alert.msg}>{alert.msg || 'No message'}</p>
                <div className="text-xs text-muted-foreground/80 whitespace-nowrap">
                  {alert.confidence !== undefined ? `${Math.round(alert.confidence * 100)}%` : 'N/A'}
                  {' • '}
                  {alert.date || 'N/A'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display diagnoses for.</p>}
      {allAdmissions.map(({ admission, diagnoses }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Diagnoses for this visit', diagnoses, ['Code', 'Description'], ['code', 'description'])}
        </div>
      ))}
    </div>
  );
}

// Treatment Tab (copied from ForesightApp.tsx, approx lines 649-662)
function TreatmentTab({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[]; treatments?: Treatment[] }> }) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display treatments for.</p>}
      {allAdmissions.map(({ admission }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Treatments for this visit', admission.treatments || [], ['Drug', 'Status', 'Rationale'], ['drug', 'status', 'rationale'])}
        </div>
      ))}
    </div>
  );
}

// Labs Tab (copied from ForesightApp.tsx, approx lines 664-678)
function LabsTab({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p className="text-muted-foreground">No admission data to display labs for.</p>}
      {allAdmissions.map(({ admission, labResults }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-step-0 font-semibold text-foreground mb-1">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Labs for this visit', labResults, ['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag'], ['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag'])}
        </div>
      ))}
    </div>
  );
}

// PriorAuth Tab (copied from ForesightApp.tsx, approx lines 680-781)
function PriorAuthTab({ patient: currentPatientInfo, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[]; treatments?: Treatment[] }> }) {
  const [selectedAdmissionState, setSelectedAdmissionState] = useState<Admission | null>(null);
  const [isLoadingPA, setIsLoadingPA] = useState(true); // Renamed to avoid conflict

  const searchParams = useSearchParams();

  useEffect(() => {
    if (allAdmissions && allAdmissions.length > 0) {
      const sortedAdmissions = [...allAdmissions].sort((a, b) =>
        new Date(b.admission.scheduledStart).getTime() - new Date(a.admission.scheduledStart).getTime()
      );
      setSelectedAdmissionState(sortedAdmissions[0].admission);
    } else {
      setSelectedAdmissionState(null);
    }
    setIsLoadingPA(false);
  }, [allAdmissions]);

  if (isLoadingPA) {
    return <div className="p-6 text-center text-muted-foreground">Loading prior auth information...</div>;
  }

  const selectedAdmissionDetails = allAdmissions.find(ad => ad.admission.id === selectedAdmissionState?.id);
  const medicationForAuth = selectedAdmissionDetails?.admission.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedAdmissionDetails?.admission.priorAuthJustification || "No specific justification provided for this admission.";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="priorauth-admission-select" className="block text-sm font-medium text-muted-foreground mb-1">Select Consultation for Prior Authorization:</label>
        <select
          id="priorauth-admission-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border bg-background focus:outline-none focus:ring-neon focus:border-neon rounded-md shadow-sm"
          value={selectedAdmissionState?.id || ""}
          onChange={(e) => {
            const admissionId = e.target.value;
            const newSelected = allAdmissions.find(ad => ad.admission.id === admissionId)?.admission || null;
            setSelectedAdmissionState(newSelected);
          }}
        >
          <option value="" disabled={!selectedAdmissionState}>-- Select a consultation --</option>
          {allAdmissions.map(({ admission }) => (
            <option key={admission.id} value={admission.id}>
              {new Date(admission.scheduledStart).toLocaleString()} - {admission.reason || 'N/A'}
            </option>
          ))}
        </select>
      </div>

      {selectedAdmissionState ? (
        <Card className="bg-glass glass-dense backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-step-0">Prior Authorization Draft</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">For consultation on: {new Date(selectedAdmissionState.scheduledStart).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <label htmlFor="pa-patient-name" className="block text-xs font-medium text-muted-foreground">Patient Name</label>
              <Input id="pa-patient-name" disabled value={`${currentPatientInfo.name || 'N/A'}`} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-dob" className="block text-xs font-medium text-muted-foreground">Date of Birth</label>
              <Input id="pa-dob" disabled value={`${currentPatientInfo.dateOfBirth ? new Date(currentPatientInfo.dateOfBirth).toLocaleDateString() : 'N/A'}`} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-medication" className="block text-xs font-medium text-muted-foreground">Medication / Treatment</label>
              <Input id="pa-medication" disabled value={medicationForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-diag-desc" className="block text-xs font-medium text-muted-foreground">Diagnosis (Description)</label>
              <Input id="pa-diag-desc" disabled value={diagnosisForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-diag-code" className="block text-xs font-medium text-muted-foreground">Diagnosis (ICD-10 Code)</label>
              <Input id="pa-diag-code" disabled value={diagnosisCodeForAuth} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <label htmlFor="pa-justification" className="block text-xs font-medium text-muted-foreground">Justification:</label>
              <textarea
                id="pa-justification"
                disabled
                value={justificationForAuth}
                className="mt-1 block w-full shadow-sm sm:text-sm border-border rounded-md h-24 bg-muted/30 p-2"
              />
            </div>
            <Button className="mt-3 text-step--1" size="sm">Generate PDF (Placeholder)</Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground">Please select a consultation to view prior authorization details.</p>
      )}
    </div>
  );
}

// Trials Tab (copied from ForesightApp.tsx, approx lines 783-801)
function TrialsTab({ patient }: { patient: Patient }) {
  const MOCK_TRIALS_DATA: Record<string, { id: string; title: string; distance: string; fit: number }[]> = {
    "1": [
      { id: "NCT055123", title: "Abatacept vs Placebo in Early RA", distance: "12 mi", fit: 0.82, },
      { id: "NCT061987", title: "JAK Inhibitor Tofacitinib Long-Term Safety", distance: "32 mi", fit: 0.77, },
    ],
  };
  const trialRows = MOCK_TRIALS_DATA[patient.id] || [];

  if (trialRows.length === 0) {
    return <div className="p-6"><p className="text-muted-foreground">No clinical trial information available for this patient.</p></div>;
  }
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {renderDetailTable('Clinical Trials', trialRows, ['ID', 'Title', 'Distance', 'Fit Score'], ['id', 'title', 'distance', 'fit'])}
    </div>
  );
}

// History Tab (copied from ForesightApp.tsx, approx lines 803-823)
function HistoryTab({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="text-step-0">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>2025-04-24 – Initial consult: fatigue & joint pain.</p>
          <p>2025-04-24 – Labs ordered: ESR, CRP, RF, anti-CCP.</p>
          <p>2025-04-24 – AI suggested provisional RA diagnosis.</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface PatientWorkspaceProps {
  patient: Patient;
  initialTab: string;
  onBack: () => void;
}

export default function PatientWorkspaceView({ patient: initialPatient, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [detailedPatientData, setDetailedPatientData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdmissionForConsultation, setSelectedAdmissionForConsultation] = useState<Admission | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const loadData = async () => {
      if (!initialPatient?.id) {
        setError("No patient ID provided.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = patientDataService.getPatientData(initialPatient.id);
        if (data) {
          setDetailedPatientData(data);
          const paramAd = searchParams?.get('ad');
          if (paramAd) {
            const found = data.admissions.find((a: any) => a.admission.id === paramAd)?.admission || null;
            if (found) {
              setSelectedAdmissionForConsultation(found);
            } else if (data.admissions && data.admissions.length > 0) {
              setSelectedAdmissionForConsultation(data.admissions[0]?.admission || null);
            }
          } else if (data.admissions && data.admissions.length > 0) {
            setSelectedAdmissionForConsultation(data.admissions[0]?.admission || null);
          }
        } else {
          setError(`Patient data not found for ${initialPatient.name || initialPatient.id}`);
        }
      } catch (err: any) {
        console.error("Error loading detailed patient data:", err);
        setError(err.message || "Failed to load detailed patient data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [initialPatient, searchParams]);

  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      variant={activeTab === k ? "default" : "ghost"}
      onClick={() => setActiveTab(k)}
      className="font-medium text-step--1 h-8 px-3 py-1.5"
    >
      {children}
    </Button>
  );

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading patient workspace...</div>;
  }

  if (error || !detailedPatientData) {
    return (
      <div className="p-6">
        <Button size="sm" variant="ghost" onClick={onBack} className="text-step-0">
          ← Patients
        </Button>
        <p className="text-red-500 mt-4">Error: {error || "Detailed patient data could not be loaded."}</p>
      </div>
    );
  }

  const { patient, admissions: patientAdmissionDetails } = detailedPatientData;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2 sticky top-0 z-30 h-10 bg-background/80 backdrop-blur-sm">
        <Button size="icon" variant="ghost" onClick={onBack} aria-label="Back to Patients" className="h-8 w-8 p-0 hover:bg-foreground/5 group">
          <div className="flex items-center">
            <ChevronLeft className="h-4 w-4 group-hover:text-neon" />
            <Users className="h-4 w-4 group-hover:text-neon" />
          </div>
        </Button>
      </div>

      <div className="px-4 pt-2 pb-2 flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-neon/30">
            <AvatarImage src={patient.photo} alt={patient.name} />
            <AvatarFallback className="text-xl bg-neon/20 text-neon font-medium">
              {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-baseline gap-4">
            <h1 className="text-step-2 font-bold text-foreground">{patient.name}</h1>
            <div className="text-step-0 text-muted-foreground">
              <span className="mr-4">DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
              <span>Gender: {patient.gender || 'N/A'}</span>
            </div>
            <button
              onClick={async () => {
                const newAd = await patientDataService.createNewAdmission(patient.id);
                setDetailedPatientData((prev: any) => {
                  if (!prev) return prev;
                  return { ...prev, admissions: [{ admission: newAd, diagnoses: [], labResults: [] }, ...prev.admissions] };
                });
                setSelectedAdmissionForConsultation(newAd);
                setActiveTab('consult');
              }}
              className="ml-6 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none w-[140px] h-[40px] flex items-center justify-center"
            >
              + New Consultation
            </button>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0">
          <label htmlFor="consultation-select-main" className="block text-xs font-medium text-muted-foreground mb-0.5">Select Visit:</label>
          <select
            id="consultation-select-main"
            className="block w-full max-w-xs pl-3 pr-7 py-1.5 text-sm border-border bg-background focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon rounded-md shadow-sm"
            value={selectedAdmissionForConsultation?.id || ""}
            onChange={(e) => {
              const admissionId = e.target.value;
              const selected = patientAdmissionDetails.find((ad: any) => ad.admission.id === admissionId)?.admission || null;
              setSelectedAdmissionForConsultation(selected);
            }}
          >
            <option value="" disabled>-- Select a consultation --</option>
            {patientAdmissionDetails.map((adDetail: any) => (
              <option key={adDetail.admission.id} value={adDetail.admission.id}>
                {new Date(adDetail.admission.scheduledStart).toLocaleString()} - {adDetail.admission.reason || 'N/A'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-background/70 backdrop-blur-sm border-b px-4 py-1 flex gap-2 sticky top-[calc(2.5rem+3rem)] z-20 overflow-x-auto shadow-sm">
        {[
          { key: "consult", label: "Consultation" },
          { key: "diagnosis", label: "Diagnosis" },
          { key: "treatment", label: "Treatment" },
          { key: "labs", label: "Labs" },
          { key: "prior", label: "Prior Auth" },
          { key: "trials", label: "Trials" },
          { key: "history", label: "History" },
          { key: "allData", label: "All Data" },
        ].map((t) => (
          <TabBtn key={t.key} k={t.key}>
            {t.label}
          </TabBtn>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {activeTab === "consult" &&
          <ConsultationTab
            patient={patient}
            allAdmissions={patientAdmissionDetails}
            selectedAdmission={selectedAdmissionForConsultation}
            onSelectAdmission={setSelectedAdmissionForConsultation}
          />}
        {activeTab === "diagnosis" && <DiagnosisTab patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "treatment" && <TreatmentTab patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "labs" && <LabsTab patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "prior" && <PriorAuthTab patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "trials" && <TrialsTab patient={patient} />}
        {activeTab === "history" && <HistoryTab patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "allData" && <AllDataView detailedPatientData={detailedPatientData} />}
      </ScrollArea>
    </div>
  );
} 