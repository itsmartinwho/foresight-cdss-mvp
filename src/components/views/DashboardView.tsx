'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlayCircle, PlusCircle } from '@phosphor-icons/react';
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter, ComplexCaseAlert } from "@/lib/types";
import NewConsultationModal from '../modals/NewConsultationModal';
import LoadingAnimation from '@/components/LoadingAnimation';
import ContentSurface from '@/components/layout/ContentSurface';
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Import shared UI components
import LikelihoodBadge from "@/components/ui/LikelihoodBadge";
import NotificationBell from "@/components/ui/NotificationBell";
import AlertSidePanel from "@/components/ui/AlertSidePanel";

// Type for upcoming appointments, specific to this view
type UpcomingEntry = { patient: Patient; encounter: Encounter };

interface DashboardViewProps {
  onStartConsult: (p: Patient) => void;
  onAlertClick: (patientId: string) => void;
  allAlerts: Array<ComplexCaseAlert & { patientName?: string }>;
}

export default function DashboardView({ onStartConsult, onAlertClick, allAlerts }: DashboardViewProps) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);

  useEffect(() => {
    const loadUpcomingAppointments = async () => {
      setIsLoadingAppointments(true);
      if (supabaseDataService.getAllPatients().length === 0) {
        await supabaseDataService.loadPatientData();
      }
      const upcoming = supabaseDataService.getUpcomingConsultations() as UpcomingEntry[];
      setUpcomingAppointments(upcoming);
      setIsLoadingAppointments(false);
    };
    loadUpcomingAppointments();
  }, []);

  const highPriorityAlertsCount = allAlerts.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;

  if (isLoadingAppointments) {
    return <LoadingAnimation />;
  }

  return (
    <ContentSurface fullBleed className="p-6 flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-step-1 font-semibold">Upcoming Consultations</h1>
        </div>
        <Button
          variant="default"
          iconLeft={<PlusCircle />}
          onClick={() => setShowNewConsultModal(true)}
          size="sm"
          className="rounded-full sm:ml-auto"
        >
          New Consultation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {upcomingAppointments.length > 0 ? (
          <Table className="mobile-card:block sm:table text-step-0">
            <TableHeader className="mobile-card:hidden sm:table-header-group">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="mobile-card:block sm:table-row-group">
              {upcomingAppointments.map(({ patient: p, encounter }) => (
                <TableRow
                  key={`upcoming_dashboard_${p.id}_${encounter.id}`}
                  className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row"
                >
                  <TableCell data-column="Time" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Time: </span>
                    {encounter.scheduledStart ? new Date(encounter.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : "N/A"}
                  </TableCell>
                  <TableCell data-column="Patient" className="mobile-card:flex mobile-card:flex-col sm:table-cell items-center">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Patient: </span>
                    {p.photo && (
                      <Image src={p.photo} alt={p.name || "Patient photo"} width={24} height={24} className="rounded-full inline-block mr-2 mobile-card:hidden" />
                    )}
                    {p.name}
                  </TableCell>
                  <TableCell data-column="Reason" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Reason: </span>
                    {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
                  </TableCell>
                  <TableCell className="mobile-card:col-span-2 mobile-card:mt-2 sm:table-cell text-right">
                    <Button
                      variant="secondary"
                      iconLeft={<PlayCircle />}
                      size="sm"
                      onClick={() => onStartConsult(p)}
                      className="gap-1 w-full mobile-card:w-full"
                    >
                      Start
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming consultations scheduled.</p>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white p-2 rounded-full shadow-lg">
          <NotificationBell
            count={highPriorityAlertsCount}
            onClick={() => setIsAlertPanelOpen(true)}
          />
        </div>
      </div>

      {isAlertPanelOpen && (
        <AlertSidePanel
          isOpen={true}
          onClose={() => setIsAlertPanelOpen(false)}
          alerts={allAlerts}
          onAlertClick={onAlertClick}
        />
      )}
      <NewConsultationModal open={showNewConsultModal} onOpenChange={setShowNewConsultModal} />
    </ContentSurface>
  );
} 