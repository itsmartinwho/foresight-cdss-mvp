'use client';
import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronLeft,
  Bell,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from "@/lib/types";
import GlassHeader from '@/components/layout/GlassHeader';
import GlassSidebar from '@/components/layout/GlassSidebar';

// Import the newly extracted view components
import DashboardView from "@/components/views/DashboardView";
import PatientsListView from "@/components/views/PatientsListView";
import PatientWorkspaceView from "@/components/views/PatientWorkspaceView";
import AlertsScreenView from "@/components/views/AlertsScreenView";
import AnalyticsScreenView from "@/components/views/AnalyticsScreenView";
import SettingsScreenView from "@/components/views/SettingsScreenView";

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
    <div className="mt-3 p-4 rounded-xl bg-glass glass-dense backdrop-blur-lg">
      <h4 className="font-semibold text-sm text-gray-700 mb-1">{title}</h4>
      <Table className="text-xs mobile-card:block sm:table">
        <TableHeader className="mobile-card:hidden sm:table-header-group">
          <TableRow>
            {displayHeaders.map(header => <TableHead key={header} className="text-left">{header}</TableHead>)}
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
                  className="text-left mobile-card:flex mobile-card:flex-col sm:table-cell" 
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

function LikelihoodBadge({ likelihood }: { likelihood?: number }) {
  // Default to 0 if undefined
  const level = likelihood !== undefined ? likelihood : 0;
  
  // Color spectrum from pale green (level 0) to red (level 5)
  const color = 
    level >= 5 ? "bg-red-600 text-white" :
    level >= 4 ? "bg-red-400 text-white" :
    level >= 3 ? "bg-orange-400 text-white" :
    level >= 2 ? "bg-yellow-400 text-black" :
    level >= 1 ? "bg-green-300 text-black" :
    "bg-green-100 text-black";
  
  return (
    <span className={`${color} text-xs px-2 py-0.5 rounded-full`}>
      {level}
    </span>
  );
}

// Renamed NotificationBellV2 to NotificationBell
function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}> {/* Click area */} 
      <Bell className="h-6 w-6 text-slate-600" />
      {count > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5"> {/* Positioning container for badge & pulse */} 
          <div 
            className="absolute inset-0 bg-red-600 text-white text-xs rounded-full flex items-center justify-center z-10"
          >
            {count > 99 ? '99+' : count}
          </div>
          <span 
            className="absolute inset-0 rounded-full ring-2 ring-neon/40 animate-badge-pulse"
            aria-hidden 
          />
        </div>
      )}
    </div>
  );
}

// Alert Side Panel that slides in from the right
function AlertSidePanel({ 
  isOpen, 
  onClose, 
  alerts, 
  onAlertClick 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  alerts: Array<ComplexCaseAlert & { patientName?: string }>; 
  onAlertClick: (patientId: string) => void 
}) {
  const highPriorityAlerts = alerts.filter(alert => alert.likelihood !== undefined && alert.likelihood >= 4);
  
  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-white w-80 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">High Priority Alerts</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 overflow-auto max-h-[calc(100vh-64px)]">
        {highPriorityAlerts.length === 0 ? (
          <p className="text-sm text-gray-500">No high-priority alerts at this time.</p>
        ) : (
          <div className="space-y-3">
            {highPriorityAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center space-x-3 p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onAlertClick(alert.patientId);
                  onClose();
                }}
              >
                <LikelihoodBadge likelihood={alert.likelihood} />
                
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {alert.patientName}
                  </p>
                  {alert.conditionType && (
                    <p className="text-xs text-gray-600 truncate">
                      {alert.conditionType}
                    </p>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {alert.date || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ***********************************
// DASHBOARD
// ***********************************
function Dashboard({ onStartConsult, onAlertClick }: { onStartConsult: (p: Patient) => void; onAlertClick: (patientId: string) => void }) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  // State for alerts, now explicitly typed to include the patientName for display purposes
  const [complexCaseAlertsForDisplay, setComplexCaseAlertsForDisplay] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      if (patientDataService.getAllPatients().length === 0) {
        await patientDataService.loadPatientData();
      }
      
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

  const highPriorityAlertsCount = complexCaseAlertsForDisplay.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;

  if (isLoading) {
    return <div className="p-6 text-center">Loading dashboard...</div>
  }

  return (
    <div className="p-6 relative">
      <Card className="mb-6 bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            Select a patient to start consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <Table className="mobile-card:block sm:table">
              <TableHeader className="mobile-card:hidden sm:table-header-group">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="mobile-card:block sm:table-row-group">
                {upcomingAppointments.map(({ patient: p, visit }) => (
                  <TableRow 
                    key={`${p.id}_${visit.id}`} 
                    className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row"
                  >
                    <TableCell data-column="Time" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                      <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Time: </span>
                      {new Date(visit.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                    </TableCell>
                    <TableCell data-column="Patient" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                      <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Patient: </span>
                      {p.photo && (
                        <img src={p.photo} alt={p.name} className="h-6 w-6 rounded-full inline-block mr-2 mobile-card:hidden" />
                      )}
                      {p.name}
                    </TableCell>
                    <TableCell data-column="Reason" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                      <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Reason: </span>
                      {visit.reason}
                    </TableCell>
                    <TableCell className="mobile-card:col-span-2 mobile-card:mt-2 sm:table-cell">
                      <Button
                        size="sm"
                        onClick={() => onStartConsult(p)}
                        className="gap-1 w-full mobile-card:w-full"
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
      
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white p-2 rounded-full shadow-lg">
          <NotificationBell 
            count={highPriorityAlertsCount} 
            onClick={() => setIsAlertPanelOpen(true)} 
          />
        </div>
      </div>
      
      <AlertSidePanel
        isOpen={isAlertPanelOpen}
        onClose={() => setIsAlertPanelOpen(false)}
        alerts={complexCaseAlertsForDisplay}
        onAlertClick={onAlertClick}
      />
    </div>
  );
}

// ***********************************
// PATIENT WORKSPACE & ITS TABS
// ***********************************

interface PatientWorkspaceProps {
  patient: Patient; // The basic patient object passed for identification
  initialTab: string;
  onBack: () => void;
}

function PatientWorkspace({ patient: initialPatient, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [detailedPatientData, setDetailedPatientData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the consultation tab's selected admission
  const [selectedAdmissionForConsultation, setSelectedAdmissionForConsultation] = useState<Admission | null>(null);

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
      variant={activeTab === k ? "default" : "ghost"}
      onClick={() => setActiveTab(k)}
      className="font-medium"
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
      <div className="flex items-center gap-3 border-b bg-white px-4 py-2 sticky top-12 z-30 h-10">
        <Button size="icon" variant="ghost" onClick={onBack} aria-label="Back to Patients" className="p-3 hover:bg-white/10 group">
          <ChevronLeft className="h-[1.25em] w-[1.25em] group-hover:text-neon" />
          <Users className="h-[1.25em] w-[1.25em] ml-0.5 group-hover:text-neon" />
        </Button>
      </div>

      {/* New Patient Header & Select Visit Dropdown */}
      <div className="px-4 pt-2 pb-2 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-16 w-16 border-2 border-neon/30">
            <AvatarImage src={patient.photo} alt={patient.name} />
            <AvatarFallback className="text-2xl bg-neon/20 text-neon font-medium">
              {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          <div className="pt-1">
            <h1 className="text-step-2 font-bold text-foreground">{patient.name}</h1>
            <p className="text-step-0 text-muted-foreground">
              DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
              {/* Assuming age is available, if not, this part can be removed */}
              {/* {patient.age && ` (Age: ${patient.age})`} */}
            </p>
            <p className="text-step-0 text-muted-foreground">
              Gender: {patient.gender || 'N/A'}
            </p>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0 pt-1">
          <label htmlFor="consultation-select-main" className="block text-xs font-medium text-muted-foreground mb-0.5">Select Visit:</label>
          <select
            id="consultation-select-main"
            className="block w-full max-w-xs pl-3 pr-7 py-1.5 text-sm border-border bg-background focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon rounded-md shadow-sm"
            value={selectedAdmissionForConsultation?.id || ""}
            onChange={(e) => {
              const admissionId = e.target.value;
              const selected = patientAdmissionDetails.find(ad => ad.admission.id === admissionId)?.admission || null;
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

      <div className="bg-background/70 backdrop-blur-sm border-b px-4 py-1 flex gap-2 sticky top-[calc(2.5rem+5rem)] z-20 overflow-x-auto shadow-sm">
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
      {/* New Current Visit Banner (inside Consultation component's grid) */}
      {selectedAdmission && (
        <div className="lg:col-span-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm rounded-md px-4 py-2 mb-4">
          <span className="font-semibold">Current Visit:</span> {new Date(selectedAdmission.scheduledStart).toLocaleString()} &nbsp;—&nbsp; {selectedAdmission.reason || 'N/A'}
        </div>
      )}
      <Card className="lg:col-span-2 bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><span className="text-neon"><svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.97-4.03 9-9 9-1.87 0-3.61-.57-5.07-1.54L3 21l1.54-3.93A8.967 8.967 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z'/></svg></span> Live Transcript</CardTitle>
        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm">
          {currentDetailedAdmission?.transcript ?
            currentDetailedAdmission.transcript.replace(/\n/g, '\n').split('\n').map((line, i) => {
              const parts = line.split(':');
              const speaker = parts.length > 1 ? parts[0].trim() : '';
              const dialogue = parts.length > 1 ? parts.slice(1).join(':').trim() : line;
              return (
                <p key={i} className="text-step-0">
                  {speaker && <strong className="text-foreground/90 dark:text-foreground/70 font-medium">{speaker}:</strong>}
                  <span className="ml-1">{dialogue}</span>
                </p>
              );
            }) :
            <p>No transcript available for this consultation.</p>
          }
        </CardContent>
      </Card>
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><span className="text-neon"><svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 20h9M12 4h9M4 9h16M4 15h16'/></svg></span> Structured Note (SOAP)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 h-[60vh] overflow-y-auto">
          {currentDetailedAdmission?.soapNote ?
            currentDetailedAdmission.soapNote.split('\n').map((line, i) => <p key={i} className="text-step-0">{line}</p>) :
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
      {patient.alerts && patient.alerts.length > 0 && (
        <Card className="mt-6 mb-6">
          <CardHeader>
            <CardTitle>Active Complex Case Alerts for {patient.name || patient.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center space-x-3 p-3 border rounded-md shadow-sm"
              >
                <SeverityBadge severity={alert.severity || 'Unknown'} />
                <p className="flex-grow text-sm text-gray-700 truncate" title={alert.msg}>{alert.msg || 'No message'}</p>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {alert.confidence !== undefined ? `${Math.round(alert.confidence * 100)}%` : 'N/A'}
                  {' • '}
                  {alert.date || 'N/A'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
function AlertsView({ onAlertClick }: { onAlertClick: (patientId: string) => void }) {
  const [patientsWithAlerts, setPatientsWithAlerts] = useState<Patient[]>([]);
  const [allAlerts, setAllAlerts] = useState<Array<ComplexCaseAlert & { patientName?: string; lastConsultation?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likelihood'>('likelihood');

  useEffect(() => {
    const loadAlertData = async () => {
      setIsLoading(true);
      await patientDataService.loadPatientData();
      const allPatients = patientDataService.getAllPatients();
      
      // Store patients that have alerts
      setPatientsWithAlerts(allPatients.filter((p) => p.alerts && p.alerts.length > 0));
      
      // Collect all alerts with patient names and last consultation dates
      const alertsWithPatientNames: Array<ComplexCaseAlert & { patientName?: string; lastConsultation?: string }> = [];
      allPatients.forEach(patient => {
        if (patient.alerts && patient.alerts.length > 0) {
          // Find the most recent consultation date for this patient
          const patientAdmissions = patientDataService.getPatientAdmissions(patient.id);
          let lastConsultDate: string | undefined;
          
          if (patientAdmissions.length > 0) {
            // Sort admissions by date (most recent first)
            const sortedAdmissions = [...patientAdmissions].sort((a, b) => {
              const dateA = a.actualEnd || a.actualStart || a.scheduledStart;
              const dateB = b.actualEnd || b.actualStart || b.scheduledStart;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            
            // Use the date from the most recent admission
            const mostRecentAdmission = sortedAdmissions[0];
            if (mostRecentAdmission) {
              const admissionDate = mostRecentAdmission.actualEnd || mostRecentAdmission.actualStart || mostRecentAdmission.scheduledStart;
              if (admissionDate) {
                lastConsultDate = new Date(admissionDate).toLocaleDateString();
              }
            }
          }
          
          patient.alerts.forEach(alert => {
            alertsWithPatientNames.push({
              ...alert,
              patientName: patient.name || patient.id,
              lastConsultation: lastConsultDate
            });
          });
        }
      });
      
      setAllAlerts(alertsWithPatientNames);
      setIsLoading(false);
    };
    loadAlertData();
  }, []);
  
  // Sort alerts based on selected criteria
  const sortedAlerts = [...allAlerts].sort((a, b) => {
    if (sortBy === 'date') {
      // Sort by date (newest first)
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    } else {
      // Sort by likelihood (highest first)
      const likelihoodA = a.likelihood !== undefined ? a.likelihood : 0;
      const likelihoodB = b.likelihood !== undefined ? b.likelihood : 0;
      return likelihoodB - likelihoodA;
    }
  });

  // Calculate high priority alerts count
  const highPriorityAlertsCount = allAlerts.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;

  if (isLoading) {
    return <div className="p-6 text-center">Loading alerts...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Patient Alerts</CardTitle>
            {highPriorityAlertsCount > 0 && (
              <div className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {highPriorityAlertsCount}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Sort by:</span>
            <Button 
              variant={sortBy === 'likelihood' ? "default" : "outline"} 
              size="sm"
              onClick={() => setSortBy('likelihood')}
            >
              Priority
            </Button>
            <Button 
              variant={sortBy === 'date' ? "default" : "outline"} 
              size="sm"
              onClick={() => setSortBy('date')}
            >
              Date
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {sortedAlerts.length === 0 && <p>No active alerts for any patient.</p>}
          {sortedAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center space-x-3 p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onAlertClick(alert.patientId)}
            >
              <LikelihoodBadge likelihood={alert.likelihood} />
              
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{alert.patientName}</p>
                  {alert.conditionType && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {alert.conditionType}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 truncate" title={alert.msg}>{alert.msg || ""}</p>
                {alert.lastConsultation && (
                  <p className="text-xs text-gray-500">
                    Last consultation: {alert.lastConsultation}
                  </p>
                )}
              </div>
              
              <div className="text-xs text-gray-500 text-right">
                {alert.date && <div>{alert.date}</div>}
                {alert.severity && (
                  <div className="mt-1">
                    <SeverityBadge severity={alert.severity} />
                  </div>
                )}
              </div>
            </div>
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
// MAIN APP
// ***********************************

function ForesightApp() {
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split('/');
  const activeView = pathSegments[1] || "dashboard";
  const patientIdFromPath = activeView === "patients" ? pathSegments[2] : undefined;

  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [selectedPatientTab, setSelectedPatientTab] = useState<string>("consult");
  const [complexCaseAlerts, setComplexCaseAlerts] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);

  useEffect(() => {
    // Load patient data if a specific patient ID is in the path
    // and that patient isn't already the active one.
    if (patientIdFromPath && patientIdFromPath !== activePatient?.id) {
      patientDataService.loadPatientData().then(() => {
        const p = patientDataService.getPatient(patientIdFromPath);
        if (p) setActivePatient(p);
        else setActivePatient(null); // Patient not found for this ID
      });
    } else if (!patientIdFromPath && activeView === "patients") {
      // If on /patients main page, clear active patient
      setActivePatient(null);
    }
  }, [patientIdFromPath, activeView, activePatient?.id]);

  useEffect(() => {
    // Load global alerts data on app initialization or when not viewing a specific patient
    // This ensures alerts are available for the global bell, but might not reload if already populated.
    const loadGlobalAlerts = async () => {
        if (patientDataService.getAllPatients().length === 0) { // Ensure core data is there
            await patientDataService.loadPatientData();
        }
        const allPatients = patientDataService.getAllPatients();
        const collectedAlerts: Array<ComplexCaseAlert & { patientName?: string }> = [];
        allPatients.forEach(p => {
            if (p.alerts && p.alerts.length > 0) {
                p.alerts.forEach(alert => {
                    collectedAlerts.push({ ...alert, patientName: p.name || p.id });
                });
            }
        });
        setComplexCaseAlerts(collectedAlerts);
    };
    loadGlobalAlerts();
  }, []); // Runs once on mount, or add dependencies if it should re-run

  const handleAlertClick = (patientId: string) => {
    router.push(`/patients/${patientId}`);
    setSelectedPatientTab("diagnosis"); // As per original logic
  };

  const handleStartConsult = (patient: Patient) => {
    // setActivePatient(patient); // This will be handled by useEffect watching patientIdFromPath
    setSelectedPatientTab("consult");
    router.push(`/patients/${patient.id}`);
  };

  const handlePatientSelect = (patient: Patient) => {
    // setActivePatient(patient); // Handled by useEffect
    setSelectedPatientTab("consult");
    router.push(`/patients/${patient.id}`);
  };
  
  const handlePatientWorkspaceBack = () => {
    // setActivePatient(null); // Handled by useEffect
    router.push("/patients");
  };

  const highPriorityAlertsCount = complexCaseAlerts.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;

  let currentView;
  switch (activeView) {
    case "dashboard":
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} />;
      break;
    case "patients":
      if (activePatient && patientIdFromPath) {
        currentView = (
          <PatientWorkspaceView
            key={activePatient.id} // Ensures re-render if patient changes
            patient={activePatient}
            initialTab={selectedPatientTab}
            onBack={handlePatientWorkspaceBack}
          />
        );
      } else {
        currentView = <PatientsListView onSelect={handlePatientSelect} />;
      }
      break;
    case "alerts":
      currentView = <AlertsScreenView onAlertClick={handleAlertClick} />;
      break;
    case "analytics":
      currentView = <AnalyticsScreenView />;
      break;
    case "settings":
      currentView = <SettingsScreenView />;
      break;
    default:
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} />;
  }

  return (
    <>
      {currentView}
      {/* Global notification bell for all screens. It could also be part of RootLayout if always visible */}
      {/* For now, keeping it here to manage its state alongside ForesightApp's logic */}
      {activeView !== "dashboard" && (
         <div className="fixed bottom-6 right-6 z-40">
           <div className="bg-white p-2 rounded-full shadow-lg">
             <NotificationBell 
                count={highPriorityAlertsCount} 
                onClick={() => setIsAlertPanelOpen(true)} 
             />
           </div>
         </div>
      )}
      <AlertSidePanel
        isOpen={isAlertPanelOpen}
        onClose={() => setIsAlertPanelOpen(false)}
        alerts={complexCaseAlerts}
        onAlertClick={handleAlertClick} // Alert clicks from panel also navigate
      />
    </>
  );
}

export default ForesightApp; 