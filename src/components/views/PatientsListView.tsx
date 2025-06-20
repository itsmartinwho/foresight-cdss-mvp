'use client';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter } from "@/lib/types";
import { ArrowUp, ArrowDown, PlayCircle, Eye, Calendar } from '@phosphor-icons/react';
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
import { useModalManager } from '@/components/ui/modal-manager';
import FormCreationModal from '@/components/modals/FormCreationModal';
import PatientDataModal from '@/components/modals/PatientDataModal';

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
  const [showPriorAuthModal, setShowPriorAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showPatientDataModal, setShowPatientDataModal] = useState(false);
  const [selectedPatientForData, setSelectedPatientForData] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"allPatients" | "allConsultations">("allPatients");
  const router = useRouter();

  // Modal manager integration to detect pending restored modal
  const { getModalState } = useModalManager();
  const pendingRestoredPatientsModal = getModalState('new-consultation-patients');

  // Stabilize draggableConfig to prevent infinite re-renders
  const stableDraggableConfig = useMemo(() => ({
    id: 'new-consultation-patients',
    title: 'New Consultation',
    persistent: true,
    defaultPosition: typeof window !== 'undefined' ? {
      x: Math.max(50, Math.round((window.innerWidth - 672) / 2)),
      y: Math.max(50, Math.round((window.innerHeight - 600) / 2) - 32),
    } : { x: 200, y: 100 }
  }), []); // Empty dependency array since window dimensions are stable for each session

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

  useEffect(() => {
    if (
      pendingRestoredPatientsModal &&
      !pendingRestoredPatientsModal.isMinimized &&
      !pendingRestoredPatientsModal.isVisible
    ) {
      setShowNewConsultModal(true);
    }
  }, [pendingRestoredPatientsModal]);

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
                                onClick={() => router.push(`/patients/${patient.id}?tab=consultation&encounterId=${encounter.id}`)}
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {data.length > 0 ? (
          <Table className="text-step-0">
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('patientName', tableType)} className="w-[30%] cursor-pointer hover:text-neon">Patient{currentSortConfig?.key === 'patientName' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                <TableHead onClick={() => requestSort('scheduledDate', tableType)} className="w-[30%] cursor-pointer hover:text-neon">Scheduled date{currentSortConfig?.key === 'scheduledDate' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                <TableHead onClick={() => requestSort('reason', tableType)} className="w-[25%] cursor-pointer hover:text-neon">Reason{currentSortConfig?.key === 'reason' ? (currentSortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                <TableHead className="w-[15%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(({ patient, encounter }) => (
                <TableRow key={`${title.startsWith('Upcoming') ? 'upcoming' : 'past'}_${patient?.id}_${encounter.id}`} onClick={() => {
                  if (onSelect && patient) {
                    onSelect(patient);
                  } else if (patient?.id && encounter.id) {
                    // Navigate to patient workspace without auto-starting consultation
                    router.push(`/patients/${patient.id}?tab=consultation&encounterId=${encounter.id}`);
                  }
                }} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <TableCell className="w-[30%]">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={patient?.photo || "/images/default-avatar.png"} alt={patient?.name || 'Patient'} />
                      <AvatarFallback>{patient?.firstName?.charAt(0)}{patient?.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {patient?.name || `${patient?.firstName} ${patient?.lastName}`.trim()}
                  </div>
                </TableCell>
                <TableCell className="w-[30%]">{encounter.scheduledStart ? new Date(encounter.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                <TableCell className="w-[25%] truncate">
                  <span className="truncate" title={(encounter.reasonDisplayText || encounter.reasonCode) ?? "—"}>
                    {(encounter.reasonDisplayText || encounter.reasonCode) ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right w-[15%]">
                  <div className="flex gap-2 justify-end">
                    {(() => {
                      const now = new Date();
                      const scheduledTime = encounter.scheduledStart ? new Date(encounter.scheduledStart) : null;
                      const isUpcoming = scheduledTime && scheduledTime > now;
                      
                      // Only show Prepare button for upcoming consultations
                      if (isUpcoming) {
                        return (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              if (patient) {
                                setSelectedPatientForData(patient);
                                setShowPatientDataModal(true);
                              }
                            }}
                            title="View patient data to prepare for consultation"
                          >
                            <Eye size={16} className="mr-1" /> 
                            Prepare
                          </Button>
                        );
                      }
                      return null;
                    })()}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        if (patient?.id && encounter.id) {
                          // Check if this is an upcoming consultation to determine auto-start behavior
                          const now = new Date();
                          const scheduledTime = encounter.scheduledStart ? new Date(encounter.scheduledStart) : null;
                          const isUpcoming = scheduledTime && scheduledTime > now;
                          
                          if (isUpcoming) {
                            // For upcoming consultations, navigate with auto-start
                            router.push(`/patients/${patient.id}?tab=consultation&encounterId=${encounter.id}&autoStart=true`);
                          } else {
                            // For past consultations, just navigate normally
                            router.push(`/patients/${patient.id}?tab=consultation&encounterId=${encounter.id}`);
                          }
                        }
                      }}
                      title={(() => {
                        const now = new Date();
                        const scheduledTime = encounter.scheduledStart ? new Date(encounter.scheduledStart) : null;
                        const isUpcoming = scheduledTime && scheduledTime > now;
                        return isUpcoming ? "Start Consultation" : "Go to Consultation";
                      })()}
                    >
                      <PlayCircle size={20} className="mr-1" /> 
                      {(() => {
                        const now = new Date();
                        const scheduledTime = encounter.scheduledStart ? new Date(encounter.scheduledStart) : null;
                        const isUpcoming = scheduledTime && scheduledTime > now;
                        return isUpcoming ? "Start" : "Go to Consult";
                      })()}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()} scheduled.</p>
        )}
      </div>
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
        <div className="flex-1 overflow-y-auto pr-80 pl-8">
          {/* Main Content - Tables */}
          <TabsContent value="allPatients" className="mt-0 h-full">
            {renderAllPatientsTable()}
          </TabsContent>
          <TabsContent value="allConsultations" className="mt-0 h-full space-y-6">
            {renderTable("Upcoming Consultations", sortedRows.upcoming, 'upcoming')}
            {renderTable("Past Consultations", sortedRows.past, 'past')}
          </TabsContent>
        </div>

        {/* Fixed Right Side Panel - Actions */}
        <div className="fixed top-36 right-6 bottom-6 w-72 z-10 flex flex-col space-y-4">
          {/* New Consultation */}
          <div 
            className="relative flex-1 bg-sidebar/60 backdrop-blur-lg border border-border/20 rounded-xl p-6 pb-8 flex flex-col items-center justify-center cursor-pointer hover:bg-sidebar-accent transition-colors overflow-hidden"
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
                <span className="text-2xl">🩺</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">New Consultation</h3>
              </div>
            </div>
          </div>

          {/* Prior Auth */}
          <div 
            className="relative flex-1 bg-sidebar/60 backdrop-blur-lg border border-border/20 rounded-xl p-6 pb-8 flex flex-col items-center justify-center cursor-pointer hover:bg-sidebar-accent transition-colors overflow-hidden"
            onClick={() => setShowPriorAuthModal(true)}
          >
            <div className="absolute inset-0 rounded-xl" style={{ backgroundImage:`url(${SIDE_PANEL_CONFIG.backgroundImage})`, backgroundSize:SIDE_PANEL_CONFIG.backgroundSize, backgroundPosition:SIDE_PANEL_CONFIG.backgroundPosition, backgroundRepeat:SIDE_PANEL_CONFIG.backgroundRepeat, opacity:SIDE_PANEL_CONFIG.opacity, zIndex:-1 }} />
            <div className="relative text-center space-y-4 z-10">
              <div className="w-16 h-16 bg-white/60 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Prior Authorization</h3>
              </div>
            </div>
          </div>

          {/* Referral */}
          <div 
            className="relative flex-1 bg-sidebar/60 backdrop-blur-lg border border-border/20 rounded-xl p-6 pb-8 flex flex-col items-center justify-center cursor-pointer hover:bg-sidebar-accent transition-colors overflow-hidden"
            onClick={() => setShowReferralModal(true)}
          >
            <div className="absolute inset-0 rounded-xl" style={{ backgroundImage:`url(${SIDE_PANEL_CONFIG.backgroundImage})`, backgroundSize:SIDE_PANEL_CONFIG.backgroundSize, backgroundPosition:SIDE_PANEL_CONFIG.backgroundPosition, backgroundRepeat:SIDE_PANEL_CONFIG.backgroundRepeat, opacity:SIDE_PANEL_CONFIG.opacity, zIndex:-1 }} />
            <div className="relative text-center space-y-4 z-10">
              <div className="w-16 h-16 bg-white/60 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto shadow-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Referral</h3>
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
        draggable={false}
        allowDragging={false}
        draggableConfig={{
          id: 'new-consultation-patients',
          title: 'Start New Consultation',
          persistent: false,
        }}
      />

      {/* Prior Authorization Modal */}
      <FormCreationModal
        open={showPriorAuthModal}
        onOpenChange={setShowPriorAuthModal}
        formType="priorAuth"
      />

      {/* Referral Modal */}
      <FormCreationModal
        open={showReferralModal}
        onOpenChange={setShowReferralModal}
        formType="referral"
      />

      {/* Patient Data Modal */}
      <PatientDataModal
        isOpen={showPatientDataModal}
        onClose={() => {
          setShowPatientDataModal(false);
          setSelectedPatientForData(null);
        }}
        patient={selectedPatientForData}
      />
    </ContentSurface>
  );
} 