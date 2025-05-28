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
// No Progress import needed for this change
import Image from 'next/image';
// No BarChart imports needed for this change

// Import shared UI components
// No LikelihoodBadge import needed for this change
import NotificationBell from "@/components/ui/NotificationBell";
import AlertSidePanel from "@/components/ui/AlertSidePanel";

// Demo Context and UI
import { useDemo } from "@/contexts/DemoContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


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

  const {
    hasDemoRun,
    isDemoModalOpen,
    demoStage,
    startDemo,
    skipDemo,
    setDemoModalOpen,
    isDemoActive,
  } = useDemo();

  // Debug demo state
  useEffect(() => {
    console.log('DashboardView demo state:', {
      hasDemoRun,
      isDemoModalOpen,
      demoStage,
      isDemoActive
    });
  }, [hasDemoRun, isDemoModalOpen, demoStage, isDemoActive]);

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
      {/* Temporary Demo Reset Button for Testing */}
      {(hasDemoRun || demoStage === 'finished') && (
        <div className="fixed top-20 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Demo reset button clicked');
              localStorage.removeItem('hasDemoRun');
              window.location.reload();
            }}
            className="bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200"
          >
            🔄 Reset Demo
          </Button>
        </div>
      )}

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

      {/* Demo Modal */}
      {demoStage === 'introModal' && (
        <Dialog open={isDemoModalOpen} onOpenChange={setDemoModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>See Foresight in Action</DialogTitle>
              <DialogDescription>
                Take a quick guided tour using a sample patient to see how Foresight can help you.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  skipDemo();
                }}
              >
                Skip
              </Button>
              <Button
                onClick={() => {
                  startDemo();
                }}
              >
                Start Demo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Demo FAB (Persistent Teaser Bubble) */}
      {demoStage === 'fabVisible' && !hasDemoRun && !isDemoActive && (
        <div
          onClick={() => {
            startDemo();
          }}
          className="fixed right-8 bottom-24 w-16 h-16 rounded-full bg-gradient-to-tr from-teal-300 to-yellow-300 animate-pulse shadow-lg cursor-pointer flex items-center justify-center z-50"
          // Placed bottom-24 to avoid overlap with NotificationBell, can be adjusted
        >
          <PlayCircle className="text-white w-8 h-8" />
        </div>
      )}
    </ContentSurface>
  );
}