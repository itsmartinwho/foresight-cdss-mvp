'use client';
import React, { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Users, CaretLeft as ChevronLeft } from '@phosphor-icons/react';
import { Toaster } from "@/components/ui/sonner";

import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, ComplexCaseAlert } from "@/lib/types";

import DashboardView from "@/components/views/DashboardView";
import PatientsListView from "@/components/views/PatientsListView";
import PatientWorkspaceViewModern from "@/components/views/PatientWorkspaceViewModern";
import AlertsScreenView from "@/components/views/AlertsScreenView";
import AnalyticsScreenView from "@/components/views/AnalyticsScreenView";
import SettingsScreenView from "@/components/views/SettingsScreenView";
import LoadingAnimation from '@/components/LoadingAnimation';
import { DemoProvider } from "@/contexts/DemoContext";

function ForesightApp() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathSegments = pathname.split('/');
  const activeView = pathSegments[1] || "dashboard";
  const patientIdFromPath = activeView === "patients" ? pathSegments[2] : undefined;

  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [selectedPatientTab, setSelectedPatientTab] = useState<string>("consultation");
  const [complexCaseAlerts, setComplexCaseAlerts] = useState<Array<ComplexCaseAlert & { patientName?: string }>>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    if (patientIdFromPath && patientIdFromPath !== activePatient?.id) {
      supabaseDataService.loadPatientData().then(() => {
        const p = supabaseDataService.getPatient(patientIdFromPath);
        if (p) setActivePatient(p);
        else setActivePatient(null);
      });
    } else if (!patientIdFromPath && activeView === "patients") {
      setActivePatient(null);
    }
  }, [patientIdFromPath, activeView, activePatient?.id]);

  useEffect(() => {
    const queryTab = searchParams.get('tab');
    if (patientIdFromPath && queryTab) {
      if (queryTab !== selectedPatientTab) { 
          setSelectedPatientTab(queryTab);
      }
    }
  }, [patientIdFromPath, searchParams, selectedPatientTab]);

  useEffect(() => {
    const loadInitialData = async () => {
        setIsAppLoading(true);
        await supabaseDataService.loadPatientData(); 
        const allPatients = supabaseDataService.getAllPatients();
        const collectedAlerts: Array<ComplexCaseAlert & { patientName?: string }> = [];
        allPatients.forEach(p => {
            if (p.alerts && p.alerts.length > 0) {
                p.alerts.forEach(alert => {
                    collectedAlerts.push({ ...alert, patientName: p.name || p.id });
                });
            }
        });
        setComplexCaseAlerts(collectedAlerts);
        setIsAppLoading(false);
    };
    loadInitialData();
  }, []);

  const handleAlertClick = (patientId: string) => {
    router.push(`/patients/${patientId}?tab=diagnosis`);
  };

  const handleStartConsult = (patient: Patient) => {
    setSelectedPatientTab("consultation");
    router.push(`/patients/${patient.id}`);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientTab("consultation");
    router.push(`/patients/${patient.id}`);
  };
  
  const handlePatientWorkspaceBack = () => {
    router.push("/patients");
  };

  if (isAppLoading) {
    return <LoadingAnimation />;
  }

  let currentView;
  switch (activeView) {
    case "dashboard":
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} allAlerts={complexCaseAlerts} />;
      break;
    case "patients":
      if (patientIdFromPath) {
        currentView = (
          <PatientWorkspaceViewModern
            key={patientIdFromPath}
            patient={{ id: patientIdFromPath } as Patient}
            initialTab={selectedPatientTab}
            onBack={handlePatientWorkspaceBack}
          />
        );
      } else {
        currentView = <PatientsListView onSelect={handlePatientSelect} />;
      }
      break;
    case "alerts":
      currentView = <AlertsScreenView onAlertClick={handleAlertClick} allAlerts={complexCaseAlerts} />;
      break;
    case "analytics":
      currentView = <AnalyticsScreenView />;
      break;
    case "settings":
      currentView = <SettingsScreenView />;
      break;
    default:
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} allAlerts={complexCaseAlerts} />;
  }

  return (
    <DemoProvider>
      {currentView}
    </DemoProvider>
  );
}

export default ForesightApp;