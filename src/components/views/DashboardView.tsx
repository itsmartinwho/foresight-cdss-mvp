'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlayCircle, Bell, X } from "lucide-react";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission, ComplexCaseAlert } from "@/lib/types";
import NewConsultationModal from '../modals/NewConsultationModal';
import LoadingAnimation from '@/components/LoadingAnimation';
import ContentSurface from '@/components/layout/ContentSurface';

// Copied types and components from ForesightApp.tsx that DashboardView depends on
type UpcomingEntry = { patient: Patient; visit: Admission };

function LikelihoodBadge({ likelihood }: { likelihood?: number }) {
  const level = likelihood !== undefined ? likelihood : 0;
  const color =
    level >= 5 ? "bg-red-600 text-white" :
    level >= 4 ? "bg-red-400 text-white" :
    level >= 3 ? "bg-orange-400 text-white" :
    level >= 2 ? "bg-yellow-400 text-black" :
    level >= 1 ? "bg-green-300 text-black" :
    "bg-green-100 text-black";
  return (
    <span className={`${color} text-xs px-2 py-0.5 rounded-full`}>
      {level}
    </span>
  );
}

function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <Bell className="h-6 w-6 text-slate-600" />
      {count > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5">
          <div
            className="absolute inset-0 bg-red-600 text-white text-xs rounded-full flex items-center justify-center z-10"
          >
            {count > 99 ? '99+' : count}
          </div>
          <span
            className="absolute inset-0 rounded-full ring-2 ring-neon/40 animate-badge-pulse"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}

function AlertSidePanel({ isOpen, onClose, alerts, onAlertClick }: { isOpen: boolean; onClose: () => void; alerts: Array<ComplexCaseAlert & { patientName?: string }>; onAlertClick: (patientId: string) => void }) {
  const highPriorityAlerts = alerts.filter(alert => alert.likelihood !== undefined && alert.likelihood >= 4);
  return (
    <div
      className={`fixed top-0 right-0 h-full bg-white w-80 shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h3 className="font-semibold">High Priority Alerts</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 overflow-auto flex-1">
        {highPriorityAlerts.length === 0 ? (
          <p className="text-sm text-gray-500">No high-priority alerts at this time.</p>
        ) : (
          <div className="space-y-3">
            {highPriorityAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center space-x-3 p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onAlertClick(alert.patientId);
                  onClose();
                }}
              >
                <LikelihoodBadge likelihood={alert.likelihood} />
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {alert.patientName}
                  </p>
                  {alert.conditionType && (
                    <p className="text-xs text-gray-600 truncate">
                      {alert.conditionType}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {alert.date || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardView({ onStartConsult, onAlertClick }: { onStartConsult: (p: Patient) => void; onAlertClick: (patientId: string) => void }) {
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingEntry[]>([]);
  const [complexCaseAlertsForDisplay, setComplexCaseAlertsForDisplay] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      if (patientDataService.getAllPatients().length === 0) {
        await patientDataService.loadPatientData();
      }
      const upcoming = patientDataService.getUpcomingConsultations();
      setUpcomingAppointments(upcoming);

      const allPatients = patientDataService.getAllPatients();
      const collectedAlerts: Array<ComplexCaseAlert & { patientName?: string }> = [];
      allPatients.forEach(p => {
        if (p.alerts && p.alerts.length > 0) {
          p.alerts.forEach(alert => {
            collectedAlerts.push({ ...alert, patientName: p.name || p.id });
          });
        }
      });
      setComplexCaseAlertsForDisplay(collectedAlerts);
      console.log('DashboardView (Prod Debug): Alerts for display in DashboardView:', collectedAlerts);
      setIsLoading(false);
    };
    loadDashboardData();
  }, []);

  const highPriorityAlertsCount = complexCaseAlertsForDisplay.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;
  console.log('DashboardView (Prod Debug): High priority alerts count in DashboardView:', highPriorityAlertsCount);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <ContentSurface className="relative">
      <Card className="mb-6 bg-glass glass-dense backdrop-blur-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-step-1">Upcoming Appointments</CardTitle>
            <CardDescription className="text-step-0 text-muted-foreground/80">
              Select a patient to start consultation
            </CardDescription>
          </div>
          <button
            onClick={() => setShowNewConsultModal(true)}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-8 px-4 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none"
          >
            + New Consultation
          </button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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