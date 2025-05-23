'use client';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Admission } from "@/lib/types";
import { ArrowUp, ArrowDown, PlusCircle, PlayCircle, Eye, Calendar } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import NewConsultationModal from '../modals/NewConsultationModal';
import { useRouter } from 'next/navigation';
import ContentSurface from '@/components/layout/ContentSurface';
import LoadingAnimation from "@/components/LoadingAnimation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from 'next/image';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Define SortableKey and SortConfig types
type SortableKey = 'patientName' | 'scheduledDate' | 'reason';
interface SortConfig {
  key: SortableKey;
  direction: 'ascending' | 'descending';
}

// Define AllPatientsSortableKey and AllPatientsSortConfig types
type AllPatientsSortableKey = keyof Patient | 'consultationsCount'; // Add more specific patient keys if needed
interface AllPatientsSortConfig {
  key: AllPatientsSortableKey;
  direction: 'ascending' | 'descending';
}

interface PatientsListViewProps {
  onSelect: (patient: Patient) => void;
}

export default function PatientsListView({ onSelect }: PatientsListViewProps) {
  const [upcomingRowsData, setUpcomingRowsData] = useState<Array<{ patient: Patient | null; visit: Admission }>>([]);
  const [pastRowsData, setPastRowsData] = useState<Array<{ patient: Patient | null; visit: Admission }>>([]);
  const [allPatientsData, setAllPatientsData] = useState<Patient[]>([]); // Added state for all patients
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingSortConfig, setUpcomingSortConfig] = useState<SortConfig | null>(null);
  const [pastSortConfig, setPastSortConfig] = useState<SortConfig | null>(null);
  const [allPatientsSortConfig, setAllPatientsSortConfig] = useState<AllPatientsSortConfig | null>(null); // Added state for all patients table sort config
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"allPatients" | "allConsultations">("allPatients");
  const router = useRouter();

  const fetchData = async () => {
    setIsLoading(true);
    await supabaseDataService.loadPatientData();
    const allPatients = supabaseDataService.getAllPatients();
    setAllPatientsData(allPatients);

    const now = new Date();
    const upcoming: { patient: Patient | null; visit: Admission }[] = [];
    const past: { patient: Patient | null; visit: Admission }[] = [];

    supabaseDataService.getAllAdmissions().forEach(({ patient, admission }) => {
      if ((admission as any).isDeleted) return;
      const arr = new Date(admission.scheduledStart) > now ? upcoming : past;
      arr.push({ patient, visit: admission });
    });

    upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
    past.sort((a, b) => new Date(b.visit.scheduledStart).getTime() - new Date(a.visit.scheduledStart).getTime());

    setUpcomingRowsData(upcoming);
    setPastRowsData(past);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    const cb = () => fetchData();
    supabaseDataService.subscribe(cb);
    return () => {
      supabaseDataService.unsubscribe(cb);
    };
  }, []);

  const displayName = useCallback((p: Patient | null) => {
    if (p?.name) return p.name;
    if (p?.firstName || p?.lastName) return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return p?.id || "Unknown Patient";
  }, []);

  const requestSort = (key: SortableKey, tableType: 'upcoming' | 'past') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    const currentSortConfig = tableType === 'upcoming' ? upcomingSortConfig : pastSortConfig;
    const setSortConfigAction = tableType === 'upcoming' ? setUpcomingSortConfig : setPastSortConfig;

    if (currentSortConfig && currentSortConfig.key === key && currentSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigAction({ key, direction });
  };

  const requestAllPatientsSort = (key: AllPatientsSortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (allPatientsSortConfig && allPatientsSortConfig.key === key && allPatientsSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setAllPatientsSortConfig({ key, direction });
  };

  const sortedAllPatients = useMemo(() => {
    if (!allPatientsSortConfig) return allPatientsData;
    return [...allPatientsData].sort((a, b) => {
      const key = allPatientsSortConfig.key;
      let aValue: any = a[key as keyof Patient];
      let bValue: any = b[key as keyof Patient];

      // Handle specific sort cases if needed, e.g., for dates or numbers
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      // if (key === 'consultationsCount') { // Example for a derived value
      //   aValue = supabaseDataService.getPatientAdmissions(a.id)?.length || 0;
      //   bValue = supabaseDataService.getPatientAdmissions(b.id)?.length || 0;
      // }


      if (aValue < bValue) return allPatientsSortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return allPatientsSortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [allPatientsData, allPatientsSortConfig]);

  const sortedRows = useMemo(() => {
    const sortData = (data: { patient: Patient | null; visit: Admission }[], sortConfig: SortConfig | null) => {
      if (!sortConfig) return data;
      return [...data].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'patientName') {
          aValue = displayName(a.patient).toLowerCase();
          bValue = displayName(b.patient).toLowerCase();
        } else if (sortConfig.key === 'scheduledDate') {
          aValue = new Date(a.visit.scheduledStart).getTime();
          bValue = new Date(b.visit.scheduledStart).getTime();
        } else if (sortConfig.key === 'reason') {
          aValue = (a.visit.reason || "").toLowerCase();
          bValue = (b.visit.reason || "").toLowerCase();
        } else {
          return 0; // Should not happen
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    };
    return {
      upcoming: sortData(upcomingRowsData, upcomingSortConfig),
      past: sortData(pastRowsData, pastSortConfig),
    };
  }, [upcomingRowsData, pastRowsData, upcomingSortConfig, pastSortConfig, displayName]);

  const renderAllPatientsTable = () => {
    // Core columns in required order
    const coreColumns: { key: keyof Patient; header: string; sortable?: boolean; className?: string }[] = [
      { key: "firstName", header: "First Name", sortable: true, className: "w-[180px] truncate" },
      { key: "lastName", header: "Last Name", sortable: true, className: "w-[140px] truncate" },
      { key: "gender", header: "Gender", sortable: true, className: "w-[100px]" },
      { key: "dateOfBirth", header: "Date of Birth", sortable: true, className: "w-[150px]" },
    ];

    const additionalColumns: { key: keyof Patient; header: string; sortable?: boolean; className?: string }[] = [
      { key: "race", header: "Race", sortable: true, className: "w-[110px] truncate" },
      { key: "maritalStatus", header: "Marital Status", sortable: true, className: "w-[140px] truncate" },
      { key: "language", header: "Language", sortable: true, className: "w-[110px] truncate" },
      { key: "povertyPercentage", header: "Poverty %", sortable: true, className: "w-[110px]" },
      { key: "primaryDiagnosis", header: "Primary Diagnosis", sortable: true, className: "w-[220px] truncate" },
      { key: "nextAppointment", header: "Next Appointment", sortable: true, className: "w-[180px] truncate" },
      { key: "reason", header: "General Reason", sortable: true, className: "w-[220px] truncate" },
    ];

    // Assemble headers: core + consultations + rest
    const tableHeaders: (typeof coreColumns[number] | { key: AllPatientsSortableKey; header: string; sortable?: boolean; className?: string })[] = [
      ...coreColumns,
      { key: "consultationsCount" as AllPatientsSortableKey, header: "Consultations", sortable: true, className: "w-[260px]" },
      ...additionalColumns,
    ];

    if (isLoading) {
      return <LoadingAnimation />;
    }
    
    if (sortedAllPatients.length === 0 && !isLoading) {
        return <p className="text-sm text-slate-400">No patients found.</p>;
    }

    return (
      <Card className="bg-glass-sidebar backdrop-blur-lg border-slate-700/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">All Patient Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="text-slate-200 text-step-0">
            <TableHeader>
              <TableRow className="border-slate-700/50">
                {tableHeaders.map(field => (
                  <TableHead 
                    key={field.key}
                    onClick={field.sortable ? () => requestAllPatientsSort(field.key as AllPatientsSortableKey) : undefined}
                    className={`${field.className || ''} ${field.sortable ? "cursor-pointer hover:text-neon" : ""}`}
                  >
                    {field.header}
                    {field.sortable && allPatientsSortConfig?.key === field.key && (
                      allPatientsSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAllPatients.map((patient) => {
                const patientAdmissions = supabaseDataService.getPatientAdmissions(patient.id) || [];
                return (
                  <TableRow 
                    key={patient.id} 
                    className="border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150 ease-in-out"
                  >
                    {/* Avatar Cell - Removed */}
                    {/* Core columns */}
                    {coreColumns.map(field => (
                      <TableCell 
                        key={`${patient.id}-${field.key}`} 
                        className={`${field.className ?? ''} cursor-pointer truncate`} 
                        onClick={() => router.push(`/patients/${patient.id}`)}
                      >
                        {field.key === 'firstName' ? (
                          <div className="flex items-center gap-2">
                            {patient.photo ? (
                              <Image src={patient.photo} alt={displayName(patient)} width={32} height={32} className="rounded-full flex-shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-500/40 flex items-center justify-center text-xs text-white flex-shrink-0">
                                {patient.firstName?.charAt(0) ?? "?"}{patient.lastName?.charAt(0) ?? ""}
                              </div>
                            )}
                            <span className="truncate">{patient[field.key] ? String(patient[field.key]) : "—"}</span>
                          </div>
                        ) : (
                          patient[field.key] ? String(patient[field.key]) : "—"
                        )}
                      </TableCell>
                    ))}

                    {/* Consultations column */}
                    <TableCell className="w-[260px]">
                      {patientAdmissions.length > 0 ? (
                        <ul className="list-none p-0 m-0 space-y-1">
                          {patientAdmissions.slice(0, 3).map(admission => (
                            <li key={admission.id}>
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft={<Calendar />}
                                className="truncate text-xs"
                                onClick={() => router.push(`/patients/${patient.id}?ad=${admission.id}`)}
                                title={new Date(admission.scheduledStart).toLocaleString()}
                              >
                                {new Date(admission.scheduledStart).toLocaleDateString()}
                              </Button>
                            </li>
                          ))}
                          {patientAdmissions.length > 3 && (
                            <li><span className="text-xs text-slate-400">+{patientAdmissions.length - 3} more</span></li>
                          )}
                        </ul>
                      ) : "No consultations"}
                    </TableCell>

                    {/* Additional columns */}
                    {additionalColumns.map(field => (
                      <TableCell key={`${patient.id}-${field.key}`} className={`${field.className ?? ''} truncate`}>
                        {patient[field.key] ? String(patient[field.key]) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderTable = (
    title: string,
    data: Array<{ patient: Patient | null; visit: Admission }>,
    tableType: 'upcoming' | 'past'
  ) => {
    const currentSortConfig = tableType === 'upcoming' ? upcomingSortConfig : pastSortConfig;
    return (
      <Card className="mb-6 bg-glass-sidebar backdrop-blur-lg border-slate-700/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <Table className="text-slate-200 text-step-0">
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead onClick={() => requestSort('patientName', tableType)} className="w-[25%] cursor-pointer hover:text-neon">Patient{currentSortConfig?.key === 'patientName' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                  <TableHead onClick={() => requestSort('scheduledDate', tableType)} className="w-[25%] cursor-pointer hover:text-neon">Scheduled date{currentSortConfig?.key === 'scheduledDate' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                  <TableHead onClick={() => requestSort('reason', tableType)} className="cursor-pointer hover:text-neon">Reason{currentSortConfig?.key === 'reason' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                  <TableHead className="w-[15%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(({ patient, visit }) => (
                  <TableRow key={`${title.startsWith('Upcoming') ? 'upcoming' : 'past'}_${patient?.id}_${visit.id}`} onClick={() => {
                    if (patient) {
                      router.push(`/patients/${patient.id}?ad=${visit.id}`);
                    }
                  }} className={patient ? "cursor-pointer hover:bg-slate-700/30 border-slate-700/50 transition-colors duration-150 ease-in-out" : "opacity-60"}>
                  <TableCell className="flex items-center gap-2">
                    {patient?.photo && (
                      <Image src={patient.photo} alt={displayName(patient)} width={24} height={24} className="rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{visit.scheduledStart ? new Date(visit.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="secondary"
                      iconLeft={tableType === 'upcoming' ? <PlayCircle /> : <Eye />}
                      size="sm"
                      onClick={() => router.push(`/patients/${patient?.id}?tab=consult&ad=${visit.id}`)}
                    >
                      {tableType === 'upcoming' ? 'Start' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400">No {title.toLowerCase()} scheduled.</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <ContentSurface fullBleed className="p-6 flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "allPatients" | "allConsultations")} className="flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger 
              value="allPatients" 
              className="text-step-1 px-4 py-2 rounded-md data-[state=active]:bg-neon/40 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:shadow-none data-[state=active]:rounded-full data-[state=inactive]:font-normal data-[state=inactive]:text-slate-700"
            >
              All Patients
            </TabsTrigger>
            <TabsTrigger 
              value="allConsultations" 
              className="text-step-1 px-4 py-2 rounded-md data-[state=active]:bg-neon/40 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:shadow-none data-[state=active]:rounded-full data-[state=inactive]:font-normal data-[state=inactive]:text-slate-700"
            >
              All Consultations
            </TabsTrigger>
          </TabsList>
          <Button 
            variant="default"
            iconLeft={<PlusCircle />}
            onClick={() => setShowNewConsultModal(true)}
            size="sm"
            className="ml-auto rounded-full"
          >
            New Consultation
          </Button>
        </div>
        <TabsContent value="allPatients" className="mt-0 flex-grow">
          {renderAllPatientsTable()}
        </TabsContent>
        <TabsContent value="allConsultations" className="mt-0 flex-grow">
          {renderTable("Upcoming Consultations", sortedRows.upcoming, 'upcoming')}
          {renderTable("Past Consultations", sortedRows.past, 'past')}
        </TabsContent>
      </Tabs>
      <NewConsultationModal 
        open={showNewConsultModal} 
        onOpenChange={setShowNewConsultModal}
        onConsultationCreated={(patient, admission) => {
          if (patient && admission) {
            onSelect(patient);
          } else {
            fetchData();
          }
        }}
      />
    </ContentSurface>
  );
} 