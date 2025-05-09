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
} from "lucide-react";

import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission } from "@/lib/types";

// ***********************************
// PATIENT DATA (loaded from central service)
// ***********************************

type UpcomingEntry = { patient: Patient; visit: Admission };

// ***********************************
// MOCK DATA
// ***********************************
const transcripts: Record<string, { s: string; t: string }[]> = {
  "1": [
    { s: "Dr.", t: "How have you been feeling since your last visit?" },
    {
      s: "Maria",
      t: "Still tired all the time and my hands ache in the morning.",
    },
    { s: "Dr.", t: "Any swelling or redness in the joints?" },
    { s: "Maria", t: "Some swelling, yes." },
  ],
};

const providerNotes: Record<string, { subjective: string; objective: string; assessment: string; plan: string }> = {
  "1": {
    subjective:
      "38-year-old female with 6-month history of symmetric hand pain and morning stiffness (90 min). Denies fever or rash.",
    objective:
      "MCP and PIP joints tender on palpation, mild edema. ESR 38 mm/h, CRP 18 mg/L, RF positive, anti-CCP strongly positive.",
    assessment: "Early rheumatoid arthritis highly likely [1].",
    plan: "Initiate methotrexate 15 mg weekly with folic acid 1 mg daily. Order baseline LFTs, schedule ultrasound of hands in 6 weeks. Discuss exercise and smoking cessation.",
  },
};

const diffDx: Record<string, { dx: string; p: number; cite?: string }[]> = {
  "1": [
    { dx: "Rheumatoid Arthritis", p: 0.45, cite: "[1]" },
    { dx: "Systemic Lupus Erythematosus", p: 0.22, cite: "[2]" },
    { dx: "Fibromyalgia", p: 0.16 },
  ],
};

const treatments: Record<string, { drug: string; status: string; rationale: string }[]> = {
  "1": [
    {
      drug: "Methotrexate 15 mg weekly",
      status: "Proposed",
      rationale: "First-line csDMARD per ACR 2023 guidelines after NSAID failure [3]",
    },
    {
      drug: "Folic acid 1 mg daily",
      status: "Supportive",
      rationale: "Reduces MTX-induced GI adverse effects [4]",
    },
  ],
};

const labs: Record<string, { test: string; value: string; ref: string; flag: string }[]> = {
  "1": [
    { test: "ESR", value: "38 mm/h", ref: "<20", flag: "H" },
    { test: "CRP", value: "18 mg/L", ref: "<5", flag: "H" },
    { test: "RF", value: "+", ref: "Neg", flag: "H" },
    { test: "anti-CCP", value: "++", ref: "Neg", flag: "H" },
  ],
};

const trials: Record<string, { id: string; title: string; distance: string; fit: number }[]> = {
  "1": [
    {
      id: "NCT055123",
      title: "Abatacept vs Placebo in Early RA",
      distance: "12 mi",
      fit: 0.82,
    },
    {
      id: "NCT061987",
      title: "JAK Inhibitor Tofacitinib Long-Term Safety",
      distance: "32 mi",
      fit: 0.77,
    },
  ],
};

const alerts = [
  {
    id: "ALR-017",
    patientId: 3,
    msg: "Possible vasculitis – refer to rheumatology",
    date: "Today 08:11",
    severity: "High",
    confidence: 0.87,
  },
  {
    id: "ALR-018",
    patientId: 2,
    msg: "Consider lung CT – persistent cough 6 mo",
    date: "Yesterday 17:40",
    severity: "Medium",
    confidence: 0.71,
  },
];

const analyticsData = [
  { date: "Apr 18", consults: 14, timeSaved: 132, accuracyGain: 0.11 },
  { date: "Apr 19", consults: 18, timeSaved: 162, accuracyGain: 0.14 },
  { date: "Apr 20", consults: 20, timeSaved: 180, accuracyGain: 0.12 },
  { date: "Apr 21", consults: 16, timeSaved: 144, accuracyGain: 0.1 },
  { date: "Apr 22", consults: 21, timeSaved: 198, accuracyGain: 0.15 },
  { date: "Apr 23", consults: 19, timeSaved: 171, accuracyGain: 0.13 },
  { date: "Apr 24", consults: 7, timeSaved: 63, accuracyGain: 0.12 },
];

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
function Dashboard({ onStartConsult }: { onStartConsult: (p: any) => void }) {
  const [patients, setPatients] = useState<UpcomingEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      await patientDataService.loadPatientData();
      const upcoming = patientDataService.getUpcomingConsultations();
      setPatients(upcoming);
    };
    load();
  }, []);

  return (
    <div className="p-6 grid xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
          <CardDescription>
            Select a patient to start consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {patients.map(({ patient: p, visit }) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(visit.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{visit.reason || p.reason}</TableCell>
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Complex Case Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={a.severity} />
                <span>{a.msg}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {Math.round(a.confidence * 100)}% • {a.date}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// PATIENT WORKSPACE
// ***********************************
function PatientWorkspace({
  patient,
  onBack,
}: {
  patient: any;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("consult");
  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      size="sm"
      variant={tab === k ? "default" : "ghost"}
      onClick={() => setTab(k)}
    >
      {children}
    </Button>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-6 py-2 sticky top-12 z-30">
        <Button size="sm" variant="ghost" onClick={onBack}>
          ← Patients
        </Button>
        <span className="font-semibold">{patient.name}</span>
        <span className="text-muted-foreground text-xs">DOB {patient.dateOfBirth}</span>
      </div>
      <div className="bg-slate-50 border-b px-6 py-2 flex gap-2 sticky top-20 z-30 overflow-x-auto text-sm">
        {[
          { key: "consult", label: "Consultation" },
          { key: "diagnosis", label: "Diagnosis" },
          { key: "treatment", label: "Treatment" },
          { key: "labs", label: "Labs" },
          { key: "prior", label: "Prior Auth" },
          { key: "trials", label: "Trials" },
          { key: "history", label: "History" },
        ].map((t) => (
          <TabBtn key={t.key} k={t.key}>
            {t.label}
          </TabBtn>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {tab === "consult" && <Consultation patient={patient} />}
        {tab === "diagnosis" && <Diagnosis patient={patient} />}
        {tab === "treatment" && <Treatment patient={patient} />}
        {tab === "labs" && <Labs patient={patient} />}
        {tab === "prior" && <PriorAuth patient={patient} />}
        {tab === "trials" && <Trials patient={patient} />}
        {tab === "history" && <History patient={patient} />}
      </ScrollArea>
    </div>
  );
}

function Consultation({ patient }: { patient: any }) {
  const lines = transcripts[patient.id] || [];
  const note = providerNotes[patient.id];
  return (
    <div className="p-6 grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Live Transcript</CardTitle>
        </CardHeader>
        <CardContent className="h-[60vh] overflow-y-auto space-y-2 text-sm">
          {lines.map((l, i) => (
            <p key={i}>
              <strong>{l.s}: </strong>
              {l.t}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Structured Note (SOAP)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>S:</strong> {note.subjective}
          </p>
          <p>
            <strong>O:</strong> {note.objective}
          </p>
          <p>
            <strong>A:</strong> {note.assessment}
          </p>
          <p>
            <strong>P:</strong> {note.plan}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ***********************************
// DIAGNOSIS & TREATMENT REPORTS
// ***********************************
function Diagnosis({ patient }: { patient: any }) {
  const list = diffDx[patient.id] || [];
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {list.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span>{item.dx}</span>
          <span className="text-muted-foreground text-xs">
            {item.p.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Treatment({ patient }: { patient: any }) {
  const treatmentRows = treatments[patient.id] || [];
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {treatmentRows.map((t, index) => (
        <div key={index} className="flex justify-between items-center">
          <span>{t.drug}</span>
          <span className="text-muted-foreground text-xs">
            {t.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function Labs({ patient }: { patient: any }) {
  const labRows = labs[patient.id] || [];
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {labRows.map((l, index) => (
        <div key={index} className="flex justify-between items-center">
          <span>{l.test}</span>
          <span className="text-muted-foreground text-xs">
            {l.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PriorAuth({ patient }: { patient: any }) {
  return (
    <div className="p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Prior Authorization Draft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Input disabled value={`Patient: ${patient.name}  DOB: ${patient.dateOfBirth}`} />
          <Input disabled value="Medication: Methotrexate 15 mg weekly" />
          <Input disabled value="Diagnosis: Rheumatoid Arthritis (ICD-10 M06.9)" />
          <Input disabled value="Justification: Failed NSAIDs, elevated CRP 18 mg/L" />
          <Button className="mt-2">Generate PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Trials({ patient }: { patient: any }) {
  const trialRows = trials[patient.id] || [];
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {trialRows.map((t, index) => (
        <div key={index} className="flex justify-between items-center">
          <span>{t.title}</span>
          <span className="text-muted-foreground text-xs">
            {t.distance}
          </span>
        </div>
      ))}
    </div>
  );
}

function History({ patient }: { patient: any }) {
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

function AlertsView() {
  return (
    <div className="p-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {alerts.map((a) => (
            <div key={a.id} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={a.severity} />
                <span>{a.msg}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {Math.round(a.confidence * 100)}% • {a.date}
              </span>
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
      past.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());

      setUpcomingRows(upcoming);
      setPastRows(past);
    };
    load();
  }, []);

  const displayName = (p: Patient | null) => {
    if (p?.firstName || p?.lastName) return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return p?.name ?? p?.id;
  };

  const renderSection = (title: string, rows: { patient: Patient | null; visit: Admission }[]) => (
    <>
      <h3 className="font-semibold text-sm mb-2 mt-4">{title}</h3>
      <Table>
        <TableBody>
          {rows.map(({ patient, visit }) => (
            <TableRow key={`${patient ? patient.id : 'null'}_${visit.id}`} onClick={() => patient && onSelect(patient)} className={patient ? "cursor-pointer hover:bg-slate-50" : "opacity-60"}>
              <TableCell className="flex items-center gap-2">
                {patient?.photo && <img src={patient.photo} alt="avatar" className="h-6 w-6 rounded-full" />}
                {displayName(patient)}
              </TableCell>
              <TableCell>{new Date(visit.scheduledStart).toLocaleString()}</TableCell>
              <TableCell>{visit.reason || (patient ? patient.reason : "") || ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

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
                <TableHead>Patient</TableHead>
                <TableHead>Scheduled date</TableHead>
                <TableHead>Reason for visit</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          {renderSection('Upcoming visits', upcomingRows)}
          {renderSection('Past visits', pastRows)}
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