'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, ComplexCaseAlert } from "@/lib/types";
import ContentSurface from '@/components/layout/ContentSurface';

// Copied LikelihoodBadge and SeverityBadge from ForesightApp.tsx as they are used here
function LikelihoodBadge({ likelihood }: { likelihood?: number }) {
  const level = likelihood !== undefined ? likelihood : 0;
  const color =
    level >= 5 ? "bg-red-600 text-white" :
    level >= 4 ? "bg-red-400 text-white" :
    level >= 3 ? "bg-orange-400 text-white" :
    level >= 2 ? "bg-yellow-400 text-black" :
    level >= 1 ? "bg-green-300 text-black" :
    "bg-green-100 text-black";
  return <span className={`${color} text-xs px-2 py-0.5 rounded-full`}>{level}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "High" ? "bg-red-600" :
    severity === "Medium" ? "bg-orange-500" :
    "bg-slate-500";
  return <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full`}>{severity}</span>;
}

// AlertsView function from ForesightApp.tsx (approx. lines 825-977)
export default function AlertsScreenView({ onAlertClick }: { onAlertClick: (patientId: string) => void }) {
  const [allAlerts, setAllAlerts] = useState<Array<ComplexCaseAlert & { patientName?: string; lastConsultation?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likelihood'>('likelihood');

  useEffect(() => {
    const loadAlertData = async () => {
      setIsLoading(true);
      if (patientDataService.getAllPatients().length === 0) { // Avoid re-fetch if already loaded
          await patientDataService.loadPatientData();
      }
      const allPatients = patientDataService.getAllPatients();
      const alertsWithPatientNames: Array<ComplexCaseAlert & { patientName?: string; lastConsultation?: string }> = [];
      allPatients.forEach(patient => {
        if (patient.alerts && patient.alerts.length > 0) {
          const patientAdmissions = patientDataService.getPatientAdmissions(patient.id);
          let lastConsultDate: string | undefined;
          if (patientAdmissions.length > 0) {
            const sortedAdmissions = [...patientAdmissions].sort((a, b) => {
              const dateA = a.actualEnd || a.actualStart || a.scheduledStart;
              const dateB = b.actualEnd || b.actualStart || b.scheduledStart;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            const mostRecentAdmission = sortedAdmissions[0];
            if (mostRecentAdmission) {
              const admissionDate = mostRecentAdmission.actualEnd || mostRecentAdmission.actualStart || mostRecentAdmission.scheduledStart;
              if (admissionDate) {
                lastConsultDate = new Date(admissionDate).toLocaleDateString();
              }
            }
          }
          patient.alerts.forEach(alert => {
            alertsWithPatientNames.push({
              ...alert,
              patientName: patient.name || patient.id,
              lastConsultation: lastConsultDate
            });
          });
        }
      });
      setAllAlerts(alertsWithPatientNames);
      console.log('AlertsScreenView (Prod Debug): All alerts with patient names in AlertsScreenView:', alertsWithPatientNames);
      setIsLoading(false);
    };
    loadAlertData();
  }, []);

  const sortedAlerts = [...allAlerts].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    } else {
      const likelihoodA = a.likelihood !== undefined ? a.likelihood : 0;
      const likelihoodB = b.likelihood !== undefined ? b.likelihood : 0;
      return likelihoodB - likelihoodA;
    }
  });

  console.log('AlertsScreenView (Prod Debug): Sorted alerts in AlertsScreenView:', sortedAlerts);

  const highPriorityAlertsCount = allAlerts.filter(
    alert => alert.likelihood !== undefined && alert.likelihood >= 4
  ).length;

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <ContentSurface fullBleed className="p-6">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-step-1">Patient Alerts</CardTitle>
            {highPriorityAlertsCount > 0 && (
              <div className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {highPriorityAlertsCount}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Button
              variant={sortBy === 'likelihood' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('likelihood')}
              className="text-step--1"
            >
              Priority
            </Button>
            <Button
              variant={sortBy === 'date' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('date')}
              className="text-step--1"
            >
              Date
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {sortedAlerts.length === 0 && <p className="text-muted-foreground">No active alerts for any patient.</p>}
          {sortedAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center space-x-3 p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-background/50 hover:bg-foreground/5"
              onClick={() => onAlertClick(alert.patientId)}
            >
              <LikelihoodBadge likelihood={alert.likelihood} />
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{alert.patientName}</p>
                  {alert.conditionType && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {alert.conditionType}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate" title={alert.msg}>{alert.msg || ""}</p>
                {alert.lastConsultation && (
                  <p className="text-xs text-muted-foreground/80">
                    Last consultation: {alert.lastConsultation}
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground/80 text-right">
                {alert.date && <div>{alert.date}</div>}
                {alert.severity && (
                  <div className="mt-1">
                    <SeverityBadge severity={alert.severity} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ContentSurface>
  );
} 