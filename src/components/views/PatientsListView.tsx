'use client';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Admission } from "@/lib/types";
import { ArrowUp, ArrowDown, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewConsultationModal from '../modals/NewConsultationModal';
import { useRouter } from 'next/navigation';
import ContentSurface from '@/components/layout/ContentSurface';
import LoadingAnimation from "@/components/LoadingAnimation";

// Define SortableKey and SortConfig types
type SortableKey = 'patientName' | 'scheduledDate' | 'reason';
interface SortConfig {
  key: SortableKey;
  direction: 'ascending' | 'descending';
}

interface PatientsListViewProps {
  onSelect: (patient: Patient) => void;
}

export default function PatientsListView({ onSelect }: PatientsListViewProps) {
  const [upcomingRowsData, setUpcomingRowsData] = useState<Array<{ patient: Patient | null; visit: Admission }>>([]);
  const [pastRowsData, setPastRowsData] = useState<Array<{ patient: Patient | null; visit: Admission }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    setIsLoading(true);
    await supabaseDataService.loadPatientData();
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

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = useMemo(() => {
    const sortData = (data: { patient: Patient | null; visit: Admission }[]) => {
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
      upcoming: sortData(upcomingRowsData),
      past: sortData(pastRowsData),
    };
  }, [upcomingRowsData, pastRowsData, sortConfig, displayName]);

  const renderTable = (title: string, data: Array<{ patient: Patient | null; visit: Admission }>) => (
    <Card className="mb-6 bg-glass-sidebar backdrop-blur-lg border-slate-700/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table className="text-slate-200 text-step-0">
            <TableHeader>
              <TableRow className="border-slate-700/50">
                <TableHead onClick={() => requestSort('patientName')} className="w-[35%] cursor-pointer hover:text-neon">Patient{sortConfig?.key === 'patientName' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                <TableHead onClick={() => requestSort('scheduledDate')} className="w-[25%] cursor-pointer hover:text-neon">Scheduled date{sortConfig?.key === 'scheduledDate' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
                <TableHead onClick={() => requestSort('reason')} className="cursor-pointer hover:text-neon">Reason{sortConfig?.key === 'reason' ? (sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />) : null}</TableHead>
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
                      <img src={patient.photo} alt={displayName(patient)} className="h-6 w-6 rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{visit.scheduledStart ? new Date(visit.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-neon hover:text-neon/80 hover:bg-neon/10">
                      View Details
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

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <ContentSurface fullBleed className="p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <CardTitle className="text-slate-100 text-step-1">All Consultations</CardTitle>
        <Button 
          onClick={() => setShowNewConsultModal(true)}
          className="bg-neon text-slate-900 hover:bg-neon/90 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <PlusCircle className="h-4 w-4"/>
          New Consultation
        </Button>
      </div>
      {renderTable("Upcoming Consultations", sortedRows.upcoming)}
      {renderTable("Past Consultations", sortedRows.past)}
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