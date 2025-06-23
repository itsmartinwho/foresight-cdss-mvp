'use client';
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlayCircle, Eye } from '@phosphor-icons/react';
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter, ComplexCaseAlert } from "@/lib/types";
import NewConsultationModal from '../modals/NewConsultationModal';
import LoadingAnimation from '@/components/LoadingAnimation';
import ContentSurface from '@/components/layout/ContentSurface';
// No Progress import needed for this change
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  DraggableDialogContent,
} from "@/components/ui/dialog";

// Import side panel configuration
import { SIDE_PANEL_CONFIG } from '@/lib/side-panel-config';

// Import modal manager
import { useModalManager } from "@/components/ui/modal-manager";
import FormCreationModal from '@/components/modals/FormCreationModal';
import PatientDataModal from '@/components/modals/PatientDataModal';

// Type for upcoming appointments, specific to this view
type UpcomingEntry = { patient: Patient; encounter: Encounter };

interface DashboardViewProps {
  onAlertClick: (patientId: string) => void;
  allAlerts: Array<ComplexCaseAlert & { patientName?: string }>;
}

export default function DashboardView({ onAlertClick, allAlerts }: DashboardViewProps) {
  const router = useRouter();
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);
  const [showPriorAuthModal, setShowPriorAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showPatientDataModal, setShowPatientDataModal] = useState(false);
  const [selectedPatientForData, setSelectedPatientForData] = useState<Patient | null>(null);

  const {
    hasDemoRun,
    isDemoModalOpen,
    demoStage,
    startDemo,
    skipDemo,
    setDemoModalOpen,
    isDemoActive,
  } = useDemo();

  // Automatically show New Consultation modal if it was restored from another page
  const { getModalState } = useModalManager();
  const pendingRestoredDashboardModal = getModalState('new-consultation-dashboard');

  // Stabilize demo modal draggableConfig to prevent infinite re-renders
  const stableDemoDraggableConfig = useMemo(() => ({
    id: 'demo-intro-modal',
    title: '',
    defaultPosition: typeof window !== 'undefined' ? {
      x: Math.max(50, Math.round((window.innerWidth - 750) / 2)),
      y: Math.round((window.innerHeight - Math.min(window.innerHeight * 0.85, 700)) / 2),
    } : { x: 200, y: 100 },
    persistent: false
  }), []); // Empty dependency array since window dimensions are stable per session

  useEffect(() => {
    if (
      pendingRestoredDashboardModal &&
      !pendingRestoredDashboardModal.isMinimized &&
      !pendingRestoredDashboardModal.isVisible
    ) {
      // Open the modal so that it can register itself and become visible
      setShowNewConsultModal(true);
    }
  }, [pendingRestoredDashboardModal]);

  // Debug demo state - reduce frequency and use useMemo to prevent object recreation
  const demoStateDebug = useMemo(() => ({
    hasDemoRun,
    isDemoModalOpen,
    demoStage,
    isDemoActive
  }), [hasDemoRun, isDemoModalOpen, demoStage, isDemoActive]);

  useEffect(() => {
    // Only log demo state changes in development and less frequently
    if (process.env.NODE_ENV === 'development') {
      console.log('DashboardView demo state:', demoStateDebug);
    }
  }, [demoStateDebug]);

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-step-1 font-semibold">Upcoming Consultations</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-80 pt-4 pl-8">
        {/* Main Content - Table */}
        {upcomingAppointments.length > 0 ? (
          <Table className="mobile-card:block sm:table text-step-0">
            <TableHeader className="mobile-card:hidden sm:table-header-group">
              <TableRow>
                <TableHead className="w-24">Time</TableHead>
                <TableHead className="w-40">Patient</TableHead>
                <TableHead className="w-32">Reason</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="mobile-card:block sm:table-row-group">
              {upcomingAppointments.map(({ patient: p, encounter }) => (
                <TableRow
                  key={`upcoming_dashboard_${p.id}_${encounter.id}`}
                  className="mobile-card:relative mobile-card:rounded-xl mobile-card:bg-glass mobile-card:backdrop-blur-sm mobile-card:overflow-hidden mobile-card:mb-3 mobile-card:grid mobile-card:grid-cols-2 mobile-card:gap-x-2 mobile-card:p-4 sm:table-row cursor-pointer hover:bg-white/10 hover:backdrop-blur-md transition-all duration-200 hover:shadow-md"
                  onClick={() => {
                    // Navigate to patient workspace without auto-starting consultation
                    router.push(`/patients/${p.id}?tab=consultation&encounterId=${encounter.id}`);
                  }}
                >
                  <TableCell data-column="Time" className="mobile-card:flex mobile-card:flex-col sm:table-cell w-24">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Time: </span>
                    <div className="text-sm font-medium">
                      {encounter.scheduledStart ? new Date(encounter.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : "N/A"}
                    </div>
                  </TableCell>
                  <TableCell data-column="Patient" className="mobile-card:flex mobile-card:flex-col sm:table-cell w-40">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Patient: </span>
                    <div className="flex items-center">
                      {p.photo && (
                        <Image src={p.photo} alt={p.name || "Patient photo"} width={24} height={24} className="rounded-full inline-block mr-2 mobile-card:hidden flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell data-column="Reason" className="mobile-card:flex mobile-card:flex-col sm:table-cell w-32">
                    <span className="mobile-card:text-xs mobile-card:text-muted-foreground sm:hidden">Reason: </span>
                    <div className="text-sm leading-snug break-words" title={encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}>
                      {encounter.reasonDisplayText || encounter.reasonCode || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="mobile-card:col-span-2 mobile-card:mt-2 sm:table-cell text-right w-44">
                    <div className="flex gap-1 mobile-card:flex-col sm:flex-row justify-end">
                      <Button
                        variant="outline"
                        iconLeft={<Eye />}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click when button is clicked
                          setSelectedPatientForData(p);
                          setShowPatientDataModal(true);
                        }}
                        className="gap-1 text-xs px-2 py-1 h-7 mobile-card:w-full"
                      >
                        Prepare
                      </Button>
                      <Button
                        variant="secondary"
                        iconLeft={<PlayCircle />}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click when button is clicked
                          // Navigate to patient workspace WITH auto-start consultation
                          router.push(`/patients/${p.id}?tab=consultation&encounterId=${encounter.id}&autoStart=true`);
                        }}
                        className="gap-1 text-xs px-2 py-1 h-7 mobile-card:w-full"
                      >
                        Start
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming consultations scheduled.</p>
        )}
      </div>

      {/* Fixed Right Side Panel - New Consultation */}
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

        {/* Prior Authorization */}
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
      <NewConsultationModal 
        open={showNewConsultModal} 
        onOpenChange={setShowNewConsultModal}
        draggable={false}
        allowDragging={false}
        draggableConfig={{
          id: 'new-consultation-dashboard',
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

      {/* Demo Modal */}
      {demoStage === 'introModal' && isDemoModalOpen && (
        <Dialog open={isDemoModalOpen} onOpenChange={setDemoModalOpen}>
          <DialogContent 
            className="sm:max-w-[750px] max-h-[650px] p-8 demo-modal-glass"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-8 min-h-[500px]">
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-center text-3xl font-bold">See Foresight in Action</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center items-center flex-1">
                <Image
                  src="/images/background_waves_larger.gif"
                  alt="Foresight Animation"
                  width={600}
                  height={350}
                  className="max-w-full max-h-72 w-auto h-auto object-contain rounded-lg"
                  style={{ maxWidth: '600px', maxHeight: '350px' }}
                  unoptimized
                />
              </div>
              <DialogFooter className="flex flex-row justify-center gap-6 mt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    skipDemo();
                  }}
                  className="min-w-[100px]"
                >
                  Skip
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    startDemo();
                  }}
                  className="min-w-[140px]"
                >
                  Start Demo
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

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