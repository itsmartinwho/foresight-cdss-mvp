'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlayCircle } from "lucide-react";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Admission, ComplexCaseAlert } from "@/lib/types";
import NewConsultationModal from '../modals/NewConsultationModal';
import LoadingAnimation from '@/components/LoadingAnimation';
import ContentSurface from '@/components/layout/ContentSurface';

// Import shared UI components
import LikelihoodBadge from "@/components/ui/LikelihoodBadge";
import NotificationBell from "@/components/ui/NotificationBell";
import AlertSidePanel from "@/components/ui/AlertSidePanel";

// Type for upcoming appointments, specific to this view
type UpcomingEntry = { patient: Patient; visit: Admission };

export default function DashboardView({ onStartConsult, onAlertClick }: { onStartConsult: (p: Patient) => void; onAlertClick: (patientId: string) => void }) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  const [complexCaseAlertsForDisplay, setComplexCaseAlertsForDisplay] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      if (supabaseDataService.getAllPatients().length === 0) {
        await supabaseDataService.loadPatientData();
      }
      const upcoming = supabaseDataService.getUpcomingConsultations();
      setUpcomingAppointments(upcoming);

      const allPatients = supabaseDataService.getAllPatients();
      const collectedAlerts: Array<ComplexCaseAlert & { patientName?: string }> = [];
      allPatients.forEach(p => {
        if (p.alerts && p.alerts.length > 0) {
          p.alerts.forEach(alert => {
            collectedAlerts.push({ ...alert, patientName: p.name || p.id });
          });
        }
      });
      setComplexCaseAlertsForDisplay(collectedAlerts);
      // console.log('DashboardView (Prod Debug): Alerts for display in DashboardView:', collectedAlerts);
      setIsLoading(false);
    };
    loadDashboardData();
  }, []);

  const highPriorityAlertsCount = complexCaseAlertsForDisplay.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;
  // console.log('DashboardView (Prod Debug): High priority alerts count in DashboardView:', highPriorityAlertsCount);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <ContentSurface fullBleed className="p-6 flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-step-1 font-semibold">Upcoming Appointments</h1>
          <p className="text-step-0 text-muted-foreground/80">
            Select a patient to start consultation
          </p>
        </div>
        <button
          onClick={() => setShowNewConsultModal(true)}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-8 px-4 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none"
        >
          + New Consultation
        </button>
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
              {upcomingAppointments.map(({ patient: p, visit }) => (
                <TableRow
                  key={`upcoming_dashboard_${p.id}_${visit.id}`}
                  className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row"
                >
                  <TableCell data-column="Time" className="mobile-card:flex mobile-card:flex-col sm:table-cell">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Time: </span>
                    {visit.scheduledStart ? new Date(visit.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : "N/A"}
                  </TableCell>
                  <TableCell data-column="Patient" className="mobile-card:flex mobile-card:flex-col sm:table-cell items-center">
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
                      className="gap-1 w-full mobile-card:w-full text-step--1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <PlayCircle className="h-[1em] w-[1em]" /> Start
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming appointments scheduled.</p>
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
          alerts={complexCaseAlertsForDisplay}
          onAlertClick={onAlertClick}
        />
      )}
      <NewConsultationModal open={showNewConsultModal} onOpenChange={setShowNewConsultModal} />
    </ContentSurface>
  );
} 