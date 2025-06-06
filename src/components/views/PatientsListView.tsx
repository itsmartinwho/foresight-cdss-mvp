'use client';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter } from "@/lib/types";
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
import { DataTable } from "@/components/ui/data-table";
import { columns as patientColumns } from "./patient-columns";

// Import side panel configuration
import { SIDE_PANEL_CONFIG } from '@/lib/side-panel-config';

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
  const [upcomingRowsData, setUpcomingRowsData] = useState<Array<{ patient: Patient | null; encounter: Encounter }>>([]);
  const [pastRowsData, setPastRowsData] = useState<Array<{ patient: Patient | null; encounter: Encounter }>>([]);
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

    // Use robust service methods for filtering
    const upcoming = supabaseDataService.getUpcomingConsultations();
    const past = supabaseDataService.getPastConsultations();

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
      //   aValue = supabaseDataService.getPatientEncounters(a.id)?.length || 0;
      //   bValue = supabaseDataService.getPatientEncounters(b.id)?.length || 0;
      // }


      if (aValue < bValue) return allPatientsSortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return allPatientsSortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [allPatientsData, allPatientsSortConfig]);

  const sortedRows = useMemo(() => {
    const sortData = (data: { patient: Patient | null; encounter: Encounter }[], sortConfig: SortConfig | null) => {
      if (!sortConfig) return data;
      return [...data].sort((a, b) => {
        let aValue: any = 'N/A';
        let bValue: any = 'N/A';
        if (sortConfig.key === 'patientName' && a.patient && b.patient) {
          aValue = (a.patient.name || `${a.patient.firstName} ${a.patient.lastName}`).toLowerCase();
          bValue = (b.patient.name || `${b.patient.firstName} ${b.patient.lastName}`).toLowerCase();
        } else if (sortConfig.key === 'scheduledDate' && a.encounter && b.encounter) {
          aValue = new Date(a.encounter.scheduledStart).getTime();
          bValue = new Date(b.encounter.scheduledStart).getTime();
        } else if (sortConfig.key === 'reason' && a.encounter && b.encounter) {
          aValue = (a.encounter.reasonDisplayText || a.encounter.reasonCode || "").toLowerCase();
          bValue = (b.encounter.reasonDisplayText || b.encounter.reasonCode || "").toLowerCase();
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
  }, [upcomingRowsData, pastRowsData, upcomingSortConfig, pastSortConfig]);

  const renderAllPatientsTable = () => {
    // Core columns in required order
    const coreColumns: { key: keyof Patient; header: string; sortable?: boolean; className?: string }[] = [
      { key: "firstName", header: "First Name", sortable: true, className: "w-[180px] truncate" },
      { key: "lastName", header: "Last Name", sortable: true, className: "w-[140px] truncate" },
      { key: "gender", header: "Gender", sortable: true, className: "w-[100px]" },
      { key: "dateOfBirth", header: "Date of Birth", sortable: true, className: "w-[185px] min-w-[185px]" },
    ];

    const additionalColumns: { key: keyof Patient; header: string; sortable?: boolean; className?: string }[] = [
      { key: "race", header: "Race", sortable: true, className: "w-[110px] truncate" },
      { key: "maritalStatus", header: "Marital Status", sortable: true, className: "w-[140px] truncate" },
      { key: "language", header: "Language", sortable: true, className: "w-[110px] truncate" },
      { key: "povertyPercentage", header: "Poverty %", sortable: true, className: "w-[145px] min-w-[145px]" },
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
                const patientEncounters = supabaseDataService.getPatientEncounters(patient.id) || [];
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
                      {patientEncounters.length > 0 ? (
                        <ul className="list-none p-0 m-0 space-y-1">
                          {patientEncounters.slice(0, 3).map(encounter => (
                            <li key={encounter.id}>
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft={<Calendar />}
                                className="truncate text-xs"
                                onClick={() => router.push(`/patients/${patient.id}?encounterId=${encounter.id}`)}
                                title={new Date(encounter.scheduledStart).toLocaleString()}
                              >
                                {new Date(encounter.scheduledStart).toLocaleDateString()}
                              </Button>
                            </li>
                          ))}
                          {patientEncounters.length > 3 && (
                            <li><span className="text-xs text-slate-400">+{patientEncounters.length - 3} more</span></li>
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
    data: Array<{ patient: Patient | null; encounter: Encounter }>,
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
                {data.map(({ patient, encounter }) => (
                  <TableRow key={`${title.startsWith('Upcoming') ? 'upcoming' : 'past'}_${patient?.id}_${encounter.id}`} onClick={() => {
                    if (onSelect && patient) {
                      onSelect(patient);
                    } else if (patient?.id && encounter.id) {
                      router.push(`/patients/${patient.id}?encounterId=${encounter.id}`);
                    }
                  }} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={patient?.photo || "/images/default-avatar.png"} alt={patient?.name || 'Patient'} />
                        <AvatarFallback>{patient?.firstName?.charAt(0)}{patient?.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {patient?.name || `${patient?.firstName} ${patient?.lastName}`.trim()}
                    </div>
                  </TableCell>
                  <TableCell>{encounter.scheduledStart ? new Date(encounter.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{(encounter.reasonDisplayText || encounter.reasonCode) ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        if (patient?.id && encounter.id) {
                          router.push(`/patients/${patient?.id}?tab=consultation&encounterId=${encounter.id}`);
                        }
                      }}
                      title="Go to Consultation"
                    >
                      <PlayCircle size={20} className="mr-1" /> Go to Consult
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
        {/* Header with Tabs Only */}
        <div className="mb-6">
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-96">
          {/* Main Content - Tables */}
          <TabsContent value="allPatients" className="mt-0 h-full">
            {renderAllPatientsTable()}
          </TabsContent>
          <TabsContent value="allConsultations" className="mt-0 h-full space-y-6">
            {renderTable("Upcoming Consultations", sortedRows.upcoming, 'upcoming')}
            {renderTable("Past Consultations", sortedRows.past, 'past')}
          </TabsContent>
        </div>

        {/* Fixed Right Side Panel - New Consultation */}
        <div className="fixed top-32 right-6 bottom-6 w-80 z-10">
          <div 
            className="relative h-full bg-sidebar backdrop-blur-lg border border-border/20 rounded-xl p-6 pb-8 flex flex-col items-center justify-center cursor-pointer hover:bg-sidebar-accent transition-colors overflow-hidden"
            onClick={() => setShowNewConsultModal(true)}
          >
            {/* Background Image with transparency */}
            <div 
              className="absolute inset-0 rounded-xl"
              style={{
                backgroundImage: `url(${SIDE_PANEL_CONFIG.backgroundImage})`,
                backgroundSize: SIDE_PANEL_CONFIG.backgroundSize,
                backgroundPosition: SIDE_PANEL_CONFIG.backgroundPosition,
                backgroundRepeat: SIDE_PANEL_CONFIG.backgroundRepeat,
                opacity: SIDE_PANEL_CONFIG.opacity,
                zIndex: -1,
              }}
            />
            
            {/* Content on top of background */}
            <div className="relative text-center space-y-4 z-10">
              <div className="w-16 h-16 bg-white/60 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto shadow-lg">
                <PlusCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">New Consultation</h3>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
      <NewConsultationModal 
        open={showNewConsultModal} 
        onOpenChange={setShowNewConsultModal}
        onConsultationCreated={(patient, encounter) => {
          if (patient && encounter) {
            onSelect(patient);
          } else {
            fetchData();
          }
        }}
      />
    </ContentSurface>
  );
} 