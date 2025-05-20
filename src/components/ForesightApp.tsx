'use client';
import React, { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, ChevronLeft } from "lucide-react";

import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, ComplexCaseAlert } from "@/lib/types";

import DashboardView from "@/components/views/DashboardView";
import PatientsListView from "@/components/views/PatientsListView";
import PatientWorkspaceView from "@/components/views/PatientWorkspaceView";
import AlertsScreenView from "@/components/views/AlertsScreenView";
import AnalyticsScreenView from "@/components/views/AnalyticsScreenView";
import SettingsScreenView from "@/components/views/SettingsScreenView";

function ForesightApp() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathSegments = pathname.split('/');
  const activeView = pathSegments[1] || "dashboard";
  const patientIdFromPath = activeView === "patients" ? pathSegments[2] : undefined;

  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [selectedPatientTab, setSelectedPatientTab] = useState<string>("consult");
  

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

  const handleAlertClick = (patientId: string) => {
    router.push(`/patients/${patientId}?tab=diagnosis`);
  };

  const handleStartConsult = (patient: Patient) => {
    setSelectedPatientTab("consult");
    router.push(`/patients/${patient.id}`);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientTab("consult");
    router.push(`/patients/${patient.id}`);
  };
  
  const handlePatientWorkspaceBack = () => {
    router.push("/patients");
  };

  let currentView;
  switch (activeView) {
    case "dashboard":
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} />;
      break;
    case "patients":
      if (patientIdFromPath) {
        currentView = (
          <PatientWorkspaceView
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
      currentView = <AlertsScreenView onAlertClick={handleAlertClick} />;
      break;
    case "analytics":
      currentView = <AnalyticsScreenView />;
      break;
    case "settings":
      currentView = <SettingsScreenView />;
      break;
    default:
      currentView = <DashboardView onStartConsult={handleStartConsult} onAlertClick={handleAlertClick} />;
  }

  return (
    <>
      {currentView}
    </>
  );
}

export default ForesightApp; 