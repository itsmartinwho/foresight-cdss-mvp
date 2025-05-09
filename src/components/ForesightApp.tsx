'use client';
import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Users,
  BellRing,
  BarChart3,
  Settings as Cog,
  PlayCircle,
  UserCircle,
} from "lucide-react";

import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from "@/lib/types";

// ***********************************
// PATIENT DATA (loaded from central service)
// ***********************************

// Reinstated UpcomingEntry, ensure Patient and Admission are imported or correctly typed
// If Treatment is part of Admission or Patient type directly, it should be handled by their import.
// For now, assuming UpcomingEntry only needs Patient and Admission as per original structure.
type UpcomingEntry = { patient: Patient; visit: Admission };

// Placeholder for data used by views not currently in scope for full data unification
const alerts: any[] = []; 

// Reinstate analyticsData constant
const analyticsData: any[] = [
  { date: "Apr 18", consults: 14, timeSaved: 132, accuracyGain: 0.11 },
  { date: "Apr 19", consults: 18, timeSaved: 162, accuracyGain: 0.14 },
  { date: "Apr 20", consults: 20, timeSaved: 180, accuracyGain: 0.12 },
  { date: "Apr 21", consults: 16, timeSaved: 144, accuracyGain: 0.1 },
  { date: "Apr 22", consults: 21, timeSaved: 198, accuracyGain: 0.15 },
  { date: "Apr 23", consults: 19, timeSaved: 171, accuracyGain: 0.13 },
  { date: "Apr 24", consults: 7, timeSaved: 63, accuracyGain: 0.12 },
];

// ***********************************
// HELPER AND NEW TAB VIEW (DEFINED BEFORE PatientWorkspace)
// ***********************************

// Function to render a simple table for displaying object arrays
function renderDetailTable(title: string, dataArray: any[], headers: string[], columnAccessors?: string[]) {
  if (!dataArray || dataArray.length === 0) {
    return <p className="text-sm text-gray-500 mt-1">No {title.toLowerCase()} data available.</p>; // Simplified message
  }
  const displayHeaders = headers;
  const accessors = columnAccessors || headers.map(h => h.toLowerCase().replace(/\s+/g, '')); // default accessors

  return (
    <div className="mt-3">
      <h4 className="font-semibold text-sm text-gray-700 mb-1">{title}</h4>
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {displayHeaders.map(header => <TableHead key={header} className="text-left">{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataArray.map((item, index) => (
            <TableRow key={index}>
              {accessors.map(accessor => (
                <TableCell key={accessor} className="text-left">
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

// AllDataView Implementation
function AllDataView({ detailedPatientData }: { detailedPatientData: any }) {
  if (!detailedPatientData) return <p className="p-4 text-gray-600">No detailed data available.</p>;
  const { patient, admissions } = detailedPatientData;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader><CardTitle>Patient Demographics</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {Object.entries(patient).map(([key, value]) => (
            (typeof value !== 'object' || value === null) && // Avoid trying to render objects directly
            <div key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(value)}</div>
          ))}
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold mt-4">Admissions History</h3>
      {admissions.map((admMockWrapper: any, index: number) => {
        const adm: Admission = admMockWrapper.admission; 
        const diagnoses: Diagnosis[] = admMockWrapper.diagnoses || [];
        const labResults: LabResult[] = admMockWrapper.labResults || [];

        return (
          <Card key={adm.id || index} className="mt-2">
            <CardHeader>
              <CardTitle>Admission on {new Date(adm.scheduledStart).toLocaleString()} (ID: {adm.id})</CardTitle>
              <CardDescription>Reason: {adm.reason || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><strong>Actual Start:</strong> {adm.actualStart ? new Date(adm.actualStart).toLocaleString() : 'N/A'}</div>
              <div><strong>Actual End:</strong> {adm.actualEnd ? new Date(adm.actualEnd).toLocaleString() : 'N/A'}</div>
              {adm.transcript && <div><h4 className="font-semibold text-sm text-gray-700 mb-1">Transcript:</h4><pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{adm.transcript}</pre></div>}
              {adm.soapNote && <div><h4 className="font-semibold text-sm text-gray-700 mb-1">SOAP Note:</h4><pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{adm.soapNote}</pre></div>}
              
              {renderDetailTable("Diagnoses", diagnoses, ['Code', 'Description'], ['code', 'description'])}
              {renderDetailTable("Lab Results", labResults, ['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag'], ['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag'])}
              {renderDetailTable("Treatments", adm.treatments || [], ['Drug', 'Status', 'Rationale'], ['drug', 'status', 'rationale'])}
            </CardContent>
          </Card>
        );
      })}
       {admissions.length === 0 && <p className="text-gray-500">No admission history for this patient.</p>}
    </div>
  );
}

// ***********************************
// GENERIC UI COMPONENTS
// ***********************************
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

interface SidebarProps {
  active: string;
  setActive: (v: string) => void;
}

function Sidebar({ active, setActive }: SidebarProps) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "patients", label: "Patients", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "alerts", label: "Alerts", icon: BellRing },
    { key: "settings", label: "Settings", icon: Cog },
  ];
  return (
    <div className="h-full w-56 border-r bg-white shadow-sm flex-col p-2 hidden lg:flex">
      {items.map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={active === key ? "default" : "ghost"}
          className="justify-start gap-3 mb-1"
          onClick={() => setActive(key)}
        >
          <Icon className="h-4 w-4" /> {label}
        </Button>
      ))}
      <Separator className="my-4" />
      <Input placeholder="Quick search (⌘K)" className="text-sm" />
    </div>
  );
}

function Header() {
  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
      <span className="font-semibold text-lg">Foresight Clinical Co-Pilot</span>
      <div className="flex items-center gap-4">
        <Input placeholder="Global search…" className="w-64" />
        <img
          src="https://i.pravatar.cc/32?u=clinician"
          alt="avatar"
          className="rounded-full"
        />
      </div>
    </header>
  );
}

// ***********************************
// DASHBOARD
// ***********************************
function Dashboard({ onStartConsult }: { onStartConsult: (p: Patient) => void }) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  // State for alerts, now explicitly typed to include the patientName for display purposes
  const [complexCaseAlertsForDisplay, setComplexCaseAlertsForDisplay] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      await patientDataService.loadPatientData(); 
      
      const upcoming = patientDataService.getUpcomingConsultations();
      setUpcomingAppointments(upcoming);

      const allPatients = patientDataService.getAllPatients();
      const collectedAlerts: Array<ComplexCaseAlert & { patientName?: string }> = [];
      allPatients.forEach(p => {
        if (p.alerts && p.alerts.length > 0) {
          p.alerts.forEach(alert => {
            collectedAlerts.push({ ...alert, patientName: p.name || p.id }); 
          });
        }
      });
      setComplexCaseAlertsForDisplay(collectedAlerts);
      
      setIsLoading(false);
    };
    loadDashboardData();
  }, []);

  if (isLoading) {
    return <div className="p-6 text-center">Loading dashboard...</div>
  }

  return (
    <div className="p-6 grid xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            Select a patient to start consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAppointments.map(({ patient: p, visit }) => (
                  <TableRow key={`${p.id}_${visit.id}`}>
                    <TableCell>{new Date(visit.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{visit.reason}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => onStartConsult(p)}
                        className="gap-1"
                      >
                        <PlayCircle className="h-4 w-4" /> Start
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No upcoming appointments scheduled.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Complex Case Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {complexCaseAlertsForDisplay.length > 0 ? complexCaseAlertsForDisplay.map((alertWithPatientName) => (
            <div key={alertWithPatientName.id} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-base text-gray-800">Alert for: {alertWithPatientName.patientName || 'Unknown Patient'}</div>
                <SeverityBadge severity={alertWithPatientName.severity || 'Unknown'} />
              </div>
              <p className="text-gray-700 mb-1">{alertWithPatientName.msg || 'No message'}</p>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Confidence: {alertWithPatientName.confidence !== undefined ? `${Math.round(alertWithPatientName.confidence * 100)}%` : 'N/A'}</span>
                <span>Date: {alertWithPatientName.date || 'N/A'}</span>
              </div>
            </div>
          )) : (
             <p className="text-sm text-gray-500">No complex case alerts at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// PATIENT WORKSPACE & ITS TABS
// ***********************************

interface PatientWorkspaceProps {
  patient: Patient; // The basic patient object passed for identification
  onBack: () => void;
}

function PatientWorkspace({ patient: initialPatient, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("consult");
  const [detailedPatientData, setDetailedPatientData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the consultation tab's selected admission
  const [selectedAdmissionForConsultation, setSelectedAdmissionForConsultation] = useState<Admission | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!initialPatient?.id) {
        setError("No patient ID provided.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Ensure service is loaded (it might have been loaded by Dashboard already)
        // await patientDataService.loadPatientData(); // loadPatientData has an internal isLoaded check
        const data = patientDataService.getPatientData(initialPatient.id);
        if (data) {
          setDetailedPatientData(data);
          // Default select the first admission for the consultation tab if available
          if (data.admissions && data.admissions.length > 0) {
            // Find the most recent admission to pre-select, or the first one with a transcript/note
            // For now, just pick the first one from the comprehensive list.
            // The list of admissions might not be sorted yet by date within getPatientData
            // We might need to sort `data.admissions` here if a specific default is needed.
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
  }, [initialPatient]);

  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      size="sm"
      variant={activeTab === k ? "default" : "ghost"}
      onClick={() => setActiveTab(k)}
    >
      {children}
    </Button>
  );

  if (isLoading) {
    return <div className="p-6 text-center">Loading patient workspace...</div>;
  }

  if (error || !detailedPatientData) {
    return (
      <div className="p-6">
        <Button size="sm" variant="ghost" onClick={onBack}>
          ← Patients
        </Button>
        <p className="text-red-500 mt-4">Error: {error || "Detailed patient data could not be loaded."}</p>
      </div>
    );
  }
  
  const { patient, admissions: patientAdmissionDetails } = detailedPatientData; // `patient` here is the full patient object from the service

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-6 py-2 sticky top-12 z-30">
        <Button size="sm" variant="ghost" onClick={onBack}>
          ← Patients
        </Button>
        <span className="font-semibold">{patient.name}</span>
        <span className="text-muted-foreground text-xs">DOB {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div className="bg-slate-50 border-b px-6 py-2 flex gap-2 sticky top-[calc(3rem+1.5rem)] z-30 overflow-x-auto text-sm">
        {[
          { key: "consult", label: "Consultation" },
          { key: "diagnosis", label: "Diagnosis" },
          { key: "treatment", label: "Treatment" },
          { key: "labs", label: "Labs" },
          { key: "prior", label: "Prior Auth" },
          { key: "trials", label: "Trials" },
          { key: "history", label: "History" },
          { key: "allData", label: "All Data" }, // New Tab
        ].map((t) => (
          <TabBtn key={t.key} k={t.key}>
            {t.label}
          </TabBtn>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {activeTab === "consult" && 
          <Consultation 
            patient={patient} 
            allAdmissions={patientAdmissionDetails} 
            selectedAdmission={selectedAdmissionForConsultation} 
            onSelectAdmission={setSelectedAdmissionForConsultation} 
          />}
        {/* Other tabs will be updated similarly */}
        {activeTab === "diagnosis" && <Diagnosis patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "treatment" && <Treatment patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "labs" && <Labs patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "prior" && <PriorAuth patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "trials" && <Trials patient={patient} />}
        {activeTab === "history" && <History patient={patient} allAdmissions={patientAdmissionDetails} />}
        {activeTab === "allData" && <AllDataView detailedPatientData={detailedPatientData} />}
      </ScrollArea>
    </div>
  );
}

// Updated Consultation Tab
function Consultation({ 
  patient, 
  allAdmissions, 
  selectedAdmission, 
  onSelectAdmission 
}: { 
  patient: Patient; 
  allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }>; 
  selectedAdmission: Admission | null;
  onSelectAdmission: (admission: Admission | null) => void;
}) {
  const availableAdmissions = allAdmissions.map(ad => ad.admission);

  // Find the detailed selected admission object which includes transcript, soapNote etc.
  const currentDetailedAdmission = allAdmissions.find(ad => ad.admission.id === selectedAdmission?.id)?.admission;

  return (
    <div className="p-6 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3 mb-4">
        <label htmlFor="consultation-select" className="block text-sm font-medium text-gray-700 mb-1">Select Consultation Date:</label>
        <select 
          id="consultation-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedAdmission?.id || ""}
          onChange={(e) => {
            const admissionId = e.target.value;
            onSelectAdmission(availableAdmissions.find(a => a.id === admissionId) || null);
          }}
        >
          <option value="" disabled>-- Select a consultation --</option>
          {availableAdmissions.map((adm) => (
            <option key={adm.id} value={adm.id}>
              {new Date(adm.scheduledStart).toLocaleString()} - {adm.reason || 'N/A'}
            </option>
          ))}
        </select>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Live Transcript</CardTitle>
        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm">
          {currentDetailedAdmission?.transcript ? 
            currentDetailedAdmission.transcript.split('\n').map((line, i) => <p key={i}>{line}</p>) :
            <p>No transcript available for this consultation.</p>
          }
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Structured Note (SOAP)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 h-[60vh] overflow-y-auto">
          {currentDetailedAdmission?.soapNote ? 
             currentDetailedAdmission.soapNote.split('\n').map((line, i) => <p key={i}>{line}</p>) :
            <p>No SOAP note available for this consultation.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// DIAGNOSIS & TREATMENT REPORTS
// ***********************************
function Diagnosis({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p>No admission data to display diagnoses for.</p>}
      {allAdmissions.map(({ admission, diagnoses }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-md font-semibold text-gray-800">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Diagnoses for this visit', diagnoses, ['Code', 'Description'], ['code', 'description'])}
        </div>
      ))}
    </div>
  );
}

function Treatment({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[]; /* Admission type now includes treatments */ }> }) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p>No admission data to display treatments for.</p>}
      {allAdmissions.map(({ admission }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-md font-semibold text-gray-800">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Treatments for this visit', admission.treatments || [], ['Drug', 'Status', 'Rationale'], ['drug', 'status', 'rationale'])}
        </div>
      ))}
    </div>
  );
}

function Labs({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 space-y-6">
      {allAdmissions.length === 0 && <p>No admission data to display labs for.</p>}
      {allAdmissions.map(({ admission, labResults }) => (
        <div key={admission.id} className="mb-6 pb-4 border-b last:border-b-0">
          <h3 className="text-md font-semibold text-gray-800">Visit on: {new Date(admission.scheduledStart).toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mb-2">Reason: {admission.reason || 'N/A'}</p>
          {renderDetailTable('Labs for this visit', labResults, ['Test Name', 'Value', 'Units', 'Date/Time', 'Ref. Range', 'Flag'], ['name', 'value', 'units', 'dateTime', 'referenceRange', 'flag'])}
        </div>
      ))}
    </div>
  );
}

// Updated PriorAuth Tab
function PriorAuth({ patient: currentPatientInfo, allAdmissions }: { 
  patient: Patient; 
  allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }>
}) {
  const [selectedAdmissionState, setSelectedAdmissionState] = useState<Admission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (allAdmissions && allAdmissions.length > 0) {
      const sortedAdmissions = [...allAdmissions].sort((a, b) => 
        new Date(b.admission.scheduledStart).getTime() - new Date(a.admission.scheduledStart).getTime()
      );
      setSelectedAdmissionState(sortedAdmissions[0].admission);
    } else {
      setSelectedAdmissionState(null);
    }
    setIsLoading(false);
  }, [allAdmissions]);

  if (isLoading) {
    return <div className="p-6 text-center">Loading prior auth information...</div>;
  }

  const selectedAdmissionDetails = allAdmissions.find(ad => ad.admission.id === selectedAdmissionState?.id);

  const medicationForAuth = selectedAdmissionDetails?.admission.treatments?.[0]?.drug || "N/A";
  const diagnosisForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.description || "N/A";
  const diagnosisCodeForAuth = selectedAdmissionDetails?.diagnoses?.[0]?.code || "N/A";
  const justificationForAuth = selectedAdmissionDetails?.admission.priorAuthJustification || "No specific justification provided for this admission.";

  // Add a log to force change detection and help debug if needed
  // console.log("Selected Admission for Prior Auth:", selectedAdmissionState);
  // console.log("Detailed admission data for Prior Auth:", selectedAdmissionDetails);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="priorauth-admission-select" className="block text-sm font-medium text-gray-700 mb-1">Select Consultation for Prior Authorization:</label>
        <select 
          id="priorauth-admission-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
        <Card>
          <CardHeader>
            <CardTitle>Prior Authorization Draft</CardTitle>
            <CardDescription>For consultation on: {new Date(selectedAdmissionState.scheduledStart).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <label htmlFor="pa-patient-name" className="block text-sm font-medium text-gray-700">Patient Name</label>
              <Input id="pa-patient-name" disabled value={`${currentPatientInfo.name || 'N/A'}`} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <label htmlFor="pa-dob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <Input id="pa-dob" disabled value={`${currentPatientInfo.dateOfBirth ? new Date(currentPatientInfo.dateOfBirth).toLocaleDateString() : 'N/A'}`} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <label htmlFor="pa-medication" className="block text-sm font-medium text-gray-700">Medication / Treatment</label>
              <Input id="pa-medication" disabled value={medicationForAuth} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <label htmlFor="pa-diag-desc" className="block text-sm font-medium text-gray-700">Diagnosis (Description)</label>
              <Input id="pa-diag-desc" disabled value={diagnosisForAuth} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <label htmlFor="pa-diag-code" className="block text-sm font-medium text-gray-700">Diagnosis (ICD-10 Code)</label>
              <Input id="pa-diag-code" disabled value={diagnosisCodeForAuth} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <label htmlFor="pa-justification" className="block text-sm font-medium text-gray-700">Justification:</label>
              <textarea 
                id="pa-justification"
                disabled 
                value={justificationForAuth} 
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-24 bg-gray-50 p-2"
              />
            </div>
            <Button className="mt-3">Generate PDF (Placeholder)</Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-gray-500">Please select a consultation to view prior authorization details.</p>
      )}
    </div>
  );
}

function Trials({ patient }: { patient: Patient }) {
  // Original mock trials data, specific to patient '1'
  const MOCK_TRIALS_DATA: Record<string, { id: string; title: string; distance: string; fit: number }[]> = {
    "1": [
      { id: "NCT055123", title: "Abatacept vs Placebo in Early RA", distance: "12 mi", fit: 0.82, },
      { id: "NCT061987", title: "JAK Inhibitor Tofacitinib Long-Term Safety", distance: "32 mi", fit: 0.77, },
    ],
  };
  const trialRows = MOCK_TRIALS_DATA[patient.id] || [];
  
  if (trialRows.length === 0) {
    return <div className="p-6"><p>No clinical trial information available for this patient.</p></div>;
  }
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {renderDetailTable('Clinical Trials', trialRows, ['ID', 'Title', 'Distance', 'Fit Score'], ['id', 'title', 'distance', 'fit'])}
    </div>
  );
}

function History({ patient, allAdmissions }: { patient: Patient; allAdmissions: Array<{ admission: Admission; diagnoses: Diagnosis[]; labResults: LabResult[] }> }) {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
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

// ***********************************
// AUXILIARY VIEWS
// ***********************************

// AlertsView Updated with More Detailed Temporary Debug Output
function AlertsView() {
  const [allPatientsWithAlertsFromUI, setAllPatientsWithAlertsFromUI] = useState<Patient[]>([]); // Renamed to avoid confusion
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  useEffect(() => {
    const loadAlertData = async () => {
      setIsLoading(true);
      await patientDataService.loadPatientData(); // Ensure data is loaded
      const allPatientsFromService = patientDataService.getAllPatients();
      
      setAllPatientsWithAlertsFromUI(allPatientsFromService.filter(p => p.alerts && p.alerts.length > 0));
      
      // --- DETAILED TEMPORARY DEBUGGING --- 
      const newDebugMessages: string[] = [];
      newDebugMessages.push("--- Patient Service Debug --- GHOST --- ");
      newDebugMessages.push(`Total patients loaded by service: ${allPatientsFromService.length}`);
      newDebugMessages.push("All Patient IDs loaded by service:");
      allPatientsFromService.forEach(p => newDebugMessages.push(`  - ${p.id} (Name: ${p.name || 'N/A'})`));
      newDebugMessages.push("---------------------------");

      const targetPatientId1 = 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F';
      const targetPatientId2 = '64182B95-EB72-4E2B-BE77-8050B71498CE';
      
      const patient1 = patientDataService.getPatient(targetPatientId1);
      newDebugMessages.push(`Debug for Patient ${targetPatientId1}:`);
      if (patient1) {
        newDebugMessages.push(`  Name: ${patient1.name}`);
        // To access alertsJSON, we'd ideally need to see the raw data before Patient object creation.
        // For now, we log patient.alerts which is the result AFTER parsing in the service.
        newDebugMessages.push(`  patient.alerts (from service): ${JSON.stringify(patient1.alerts, null, 2) || 'undefined/empty'}`);
      } else {
        newDebugMessages.push(`  Patient ${targetPatientId1} NOT FOUND by service.getPatient().`);
      }
      
      const patient2 = patientDataService.getPatient(targetPatientId2);
      newDebugMessages.push(`Debug for Patient ${targetPatientId2}:`);
      if (patient2) {
        newDebugMessages.push(`  Name: ${patient2.name}`);
        newDebugMessages.push(`  patient.alerts (from service): ${JSON.stringify(patient2.alerts, null, 2) || 'undefined/empty'}`);
      } else {
        newDebugMessages.push(`  Patient ${targetPatientId2} NOT FOUND by service.getPatient().`);
      }
      newDebugMessages.push("--- End Patient Service Debug --- GHOST ---");
      setDebugMessages(newDebugMessages);
      // --- END DETAILED TEMPORARY DEBUGGING ---

      setIsLoading(false);
    };
    loadAlertData();
  }, []);

  if (isLoading) {
    return <div className="p-6 text-center">Loading alerts...</div>;
  }

  return (
    <div className="p-6">
      {/* --- TEMPORARY DEBUGGING OUTPUT --- */}
      {debugMessages.length > 0 && (
        <Card className="mb-4 bg-yellow-50 border-yellow-300">
          <CardHeader><CardTitle className="text-yellow-700">Temporary Debug Info (Alerts Source & Patient Load Status)</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-all text-yellow-800">
              {debugMessages.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
      {/* --- END TEMPORARY DEBUGGING OUTPUT --- */}

      <Card>
        <CardHeader>
          <CardTitle>Patient Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {allPatientsWithAlertsFromUI.length === 0 && !isLoading && <p>No active alerts for any patient.</p>}
          {isLoading && <p>Loading alerts display...</p>}
          {allPatientsWithAlertsFromUI.map(patient => (
            patient.alerts?.map(alert => (
              <div key={alert.id} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-base text-gray-800">Alert for: {patient.name || patient.id}</div>
                  <SeverityBadge severity={alert.severity || 'Unknown'} />
                </div>
                <p className="text-gray-700 mb-1">{alert.msg || 'No message'}</p>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>Confidence: {alert.confidence !== undefined ? `${Math.round(alert.confidence * 100)}%` : 'N/A'}</span>
                  <span>Date: {alert.date || 'N/A'}</span>
                </div>
              </div>
            ))
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics (Mock)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Consults</TableHead>
                <TableHead>Minutes Saved</TableHead>
                <TableHead>Accuracy Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{d.date}</TableCell>
                  <TableCell>{d.consults}</TableCell>
                  <TableCell>{d.timeSaved}</TableCell>
                  <TableCell>{(d.accuracyGain * 100).toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            User profile, integrations & alert threshold configuration panels
            will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// PATIENTS LIST VIEW
// ***********************************
function PatientsList({ onSelect }: { onSelect: (p: Patient) => void }) {
  const [upcomingRows, setUpcomingRows] = useState<{ patient: Patient | null; visit: Admission }[]>([]);
  const [pastRows, setPastRows] = useState<{ patient: Patient | null; visit: Admission }[]>([]);

  useEffect(() => {
    const load = async () => {
      await patientDataService.loadPatientData();
      const now = new Date();

      const upcoming: { patient: Patient | null; visit: Admission }[] = [];
      const past: { patient: Patient | null; visit: Admission }[] = [];

      patientDataService.getAllAdmissions().forEach(({ patient, admission }) => {
        const arr = new Date(admission.scheduledStart) > now ? upcoming : past;
        arr.push({ patient, visit: admission });
      });

      upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
      past.sort((a, b) => new Date(b.visit.scheduledStart).getTime() - new Date(a.visit.scheduledStart).getTime());

      setUpcomingRows(upcoming);
      setPastRows(past);
    };
    load();
  }, []);

  const displayName = (p: Patient | null) => {
    if (p?.name) return p.name;
    if (p?.firstName || p?.lastName) return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return p?.id;
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Consultations</CardTitle>
          <CardDescription>Click a patient to open the workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Patient</TableHead>
                <TableHead className="text-left">Scheduled date</TableHead>
                <TableHead className="text-left">Reason for visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingRows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-4 pb-2 text-left text-gray-700">Upcoming visits</TableCell>
                </TableRow>
              )}
              {upcomingRows.map(({ patient, visit }) => (
                <TableRow key={`upcoming_${visit.id}_${patient?.id ?? 'no-patient'}`} onClick={() => patient && onSelect(patient)} className={patient ? "cursor-pointer hover:bg-slate-50" : "opacity-60"}>
                  <TableCell className="text-left flex items-center gap-2">
                    {patient?.photo ? <img src={patient.photo} alt="avatar" className="h-6 w-6 rounded-full" /> : <UserCircle className="h-6 w-6 text-gray-400" />}
                    {patient ? displayName(patient) : (visit.patientId ?? 'Unknown Patient')}
                  </TableCell>
                  <TableCell className="text-left">{new Date(visit.scheduledStart).toLocaleString()}</TableCell>
                  <TableCell className="text-left">{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}

              {pastRows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-6 pb-2 text-left text-gray-700">Past visits</TableCell>
                </TableRow>
              )}
              {pastRows.map(({ patient, visit }) => (
                <TableRow key={`past_${visit.id}_${patient?.id ?? 'no-patient'}`} onClick={() => patient && onSelect(patient)} className={patient ? "cursor-pointer hover:bg-slate-50" : "opacity-60"}>
                  <TableCell className="text-left flex items-center gap-2">
                    {patient?.photo ? <img src={patient.photo} alt="avatar" className="h-6 w-6 rounded-full" /> : <UserCircle className="h-6 w-6 text-gray-400" />}
                    {patient ? displayName(patient) : (visit.patientId ?? 'Unknown Patient')}
                  </TableCell>
                  <TableCell className="text-left">{new Date(visit.scheduledStart).toLocaleString()}</TableCell>
                  <TableCell className="text-left">{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// MAIN APP
// ***********************************

function ForesightApp() {
  const [active, setActive] = useState("dashboard");
  const [activePatient, setActivePatient] = useState<any | null>(null);

  const onStartConsult = (p: any) => {
    setActivePatient(p);
    setActive("patients");
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} setActive={setActive} />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {active === "dashboard" && <Dashboard onStartConsult={onStartConsult} />}
          {active === "patients" && !activePatient && (
            <PatientsList onSelect={(p) => setActivePatient(p)} />
          )}
          {active === "patients" && activePatient && (
            <PatientWorkspace
              patient={activePatient}
              onBack={() => setActivePatient(null)}
            />
          )}
          {active === "alerts" && <AlertsView />}
          {active === "analytics" && <AnalyticsView />}
          {active === "settings" && <SettingsView />}
        </div>
      </div>
    </div>
  );
}

export default ForesightApp; 