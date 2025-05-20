'use client';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission } from "@/lib/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewConsultationModal from '../modals/NewConsultationModal';
import { useRouter } from 'next/navigation';
import ContentSurface from '@/components/layout/ContentSurface';

// Define SortableKey and SortConfig types
type SortableKey = 'patientName' | 'scheduledDate';
interface SortConfig {
  key: SortableKey;
  direction: 'ascending' | 'descending';
}

// PatientsList function from ForesightApp.tsx (approx. lines 1034-1124)
export default function PatientsListView({ onSelect }: { onSelect: (p: Patient) => void }) {
  const [upcomingRowsData, setUpcomingRowsData] = useState<{ patient: Patient | null; visit: Admission }[]>([]);
  const [pastRowsData, setPastRowsData] = useState<{ patient: Patient | null; visit: Admission }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await patientDataService.loadPatientData();
      const now = new Date();
      const upcoming: { patient: Patient | null; visit: Admission }[] = [];
      const past: { patient: Patient | null; visit: Admission }[] = [];

      patientDataService.getAllAdmissions().forEach(({ patient, admission }) => {
        if ((admission as any).isDeleted) return; // skip soft-deleted visits
        const arr = new Date(admission.scheduledStart) > now ? upcoming : past;
        arr.push({ patient, visit: admission });
      });

      upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
      past.sort((a, b) => new Date(b.visit.scheduledStart).getTime() - new Date(a.visit.scheduledStart).getTime());

      setUpcomingRowsData(upcoming);
      setPastRowsData(past);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const cb = () => {
      const load = async () => {
        setIsLoading(true);
        await patientDataService.loadPatientData();
        const now = new Date();
        const upcoming: { patient: Patient | null; visit: Admission }[] = [];
        const past: { patient: Patient | null; visit: Admission }[] = [];

        patientDataService.getAllAdmissions().forEach(({ patient, admission }) => {
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
      load();
    };
    patientDataService.subscribe(cb);
    return () => {
      patientDataService.unsubscribe(cb);
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
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'patientName') {
          aValue = displayName(a.patient).toLowerCase();
          bValue = displayName(b.patient).toLowerCase();
        } else if (sortConfig.key === 'scheduledDate') {
          aValue = new Date(a.visit.scheduledStart).getTime();
          bValue = new Date(b.visit.scheduledStart).getTime();
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

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading patient list...</div>;
  }

  return (
    <ContentSurface fullBleed className="flex flex-col">
      <Card className="bg-glass glass-dense backdrop-blur-lg flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-6">
          <div>
            <CardTitle className="text-step-1">Consultations</CardTitle>
            <CardDescription className="text-step-0 text-muted-foreground/80">Click a patient to open the workspace</CardDescription>
          </div>
          <button
            onClick={() => setShowNewConsultModal(true)}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-8 px-4 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none"
          >
            + New Consultation
          </button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <Table className="text-step-0">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[40%] cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => requestSort('patientName')}
                >
                  <div className="flex items-center gap-1 py-1">
                    Patient
                    {sortConfig?.key === 'patientName' && 
                      (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3 text-muted-foreground/80" /> : <ArrowDown className="h-3 w-3 text-muted-foreground/80" />)}
                  </div>
                </TableHead>
                <TableHead
                  className="w-60 cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => requestSort('scheduledDate')}
                >
                  <div className="flex items-center gap-1 py-1">
                    Scheduled date
                    {sortConfig?.key === 'scheduledDate' && 
                      (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3 text-muted-foreground/80" /> : <ArrowDown className="h-3 w-3 text-muted-foreground/80" />)}
                  </div>
                </TableHead>
                <TableHead><div className="py-1">Reason for visit</div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.upcoming.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-4 pb-2 text-foreground/80">Upcoming visits</TableCell>
                </TableRow>
              )}
              {sortedRows.upcoming.map(({ patient, visit }) => (
                <TableRow key={`upcoming_${patient?.id}_${visit.id}`} onClick={() => {
                    if (patient) {
                      router.push(`/patients/${patient.id}?ad=${visit.id}`);
                    }
                  }} className={patient ? "cursor-pointer hover:bg-foreground/5" : "opacity-60"}>
                  <TableCell className="flex items-center gap-2">
                    {patient?.photo && (
                      <img src={patient.photo} alt={displayName(patient)} className="h-6 w-6 rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{visit.scheduledStart ? new Date(visit.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(sortedRows.upcoming.length === 0 && sortedRows.past.length === 0) && (
                 <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No consultations found.</TableCell></TableRow>
              )}
              {sortedRows.past.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-6 pb-2 text-foreground/80">Past visits</TableCell>
                </TableRow>
              )}
              {sortedRows.past.map(({ patient, visit }) => (
                <TableRow key={`past_${patient?.id}_${visit.id}`} onClick={() => {
                    if (patient) {
                      router.push(`/patients/${patient.id}?ad=${visit.id}`);
                    }
                  }} className={patient ? "cursor-pointer hover:bg-foreground/5" : "opacity-60"}>
                  <TableCell className="flex items-center gap-2">
                    {patient?.photo && (
                      <img src={patient.photo} alt={displayName(patient)} className="h-6 w-6 rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{visit.scheduledStart ? new Date(visit.scheduledStart).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <NewConsultationModal open={showNewConsultModal} onOpenChange={setShowNewConsultModal} />
    </ContentSurface>
  );
} 