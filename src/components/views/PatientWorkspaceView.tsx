'use client';
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronLeft, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Admission, AdmissionDetailsWrapper, ComplexCaseAlert } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from "@/lib/utils";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import ConsultationTab from "@/components/patient-workspace-tabs/ConsultationTab";
import DiagnosisTab from "@/components/patient-workspace-tabs/DiagnosisTab";
import TreatmentTab from "@/components/patient-workspace-tabs/TreatmentTab";
import LabsTab from "@/components/patient-workspace-tabs/LabsTab";
import PriorAuthTab from "@/components/patient-workspace-tabs/PriorAuthTab";
import TrialsTab from "@/components/patient-workspace-tabs/TrialsTab";
import HistoryTab from "@/components/patient-workspace-tabs/HistoryTab";
import AllDataViewTab from "@/components/patient-workspace-tabs/AllDataViewTab";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import LoadingAnimation from "@/components/LoadingAnimation";

interface PatientWorkspaceProps {
  patient: Patient;
  initialTab: string;
  onBack: () => void;
}

export type DetailedPatientDataType = { patient: Patient; admissions: AdmissionDetailsWrapper[] } | null;

export default function PatientWorkspaceView({ patient: initialPatientStub, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [detailedPatientData, setDetailedPatientData] = useState<DetailedPatientDataType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdmissionForConsultation, setSelectedAdmissionForConsultation] = useState<Admission | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [visitToDeleteId, setVisitToDeleteId] = useState<string | null>(null);
  const [isStartingNewConsultation, setIsStartingNewConsultation] = useState(false);
  const [newConsultationReason, setNewConsultationReason] = useState('');
  const [newConsultationDate, setNewConsultationDate] = useState<Date | null>(new Date());
  const [newConsultationDuration, setNewConsultationDuration] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const activeAdmissionDetails: AdmissionDetailsWrapper[] = React.useMemo(() => {
    if (!detailedPatientData?.admissions) return [];
    return detailedPatientData.admissions.filter(adWrapper => !adWrapper.admission.isDeleted);
  }, [detailedPatientData]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = useCallback(async () => {
    if (!initialPatientStub?.id) {
      setError("No patient ID provided.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      await supabaseDataService.loadPatientData();
      const data = supabaseDataService.getPatientData(initialPatientStub.id);
      if (data) {
        setDetailedPatientData(data as DetailedPatientDataType);
        const paramAd = searchParams?.get('ad');
        const admissionsToSearch = data.admissions || [];
        const firstActiveNonDeleted = admissionsToSearch.find(aWrapper => !aWrapper.admission.isDeleted)?.admission || null;

        if (paramAd) {
          const foundAdmissionWrapper = admissionsToSearch.find(aWrapper => aWrapper.admission.id === paramAd && !aWrapper.admission.isDeleted);
          setSelectedAdmissionForConsultation(foundAdmissionWrapper?.admission || firstActiveNonDeleted);
        } else {
          setSelectedAdmissionForConsultation(firstActiveNonDeleted);
        }
      } else {
        setError(`Patient data not found for ${initialPatientStub.id}`);
      }
    } catch (err: unknown) {
      console.error("Error loading detailed patient data:", err);
      setError(err instanceof Error ? err.message : "Failed to load detailed patient data.");
    } finally {
      setIsLoading(false);
    }
  }, [initialPatientStub, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const cb = () => loadData();
    supabaseDataService.subscribe(cb);
    return () => {
      supabaseDataService.unsubscribe(cb);
    };
  }, [loadData]);

  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      variant={activeTab === k ? "default" : "ghost"}
      onClick={() => setActiveTab(k)}
      className="font-medium text-step--1 h-8 px-3 py-1.5"
    >
      {children}
    </Button>
  );

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (error || !detailedPatientData || !detailedPatientData.patient) {
    return (
      <div className="p-6">
        <Button size="sm" variant="ghost" onClick={() => {
          setIsStartingNewConsultation(false);
          onBack();
        }} className="text-step-0">
          ← Patients
        </Button>
        <ErrorDisplay message={error || "Detailed patient data could not be loaded."} />
      </div>
    );
  }
  
  const { patient } = detailedPatientData;

  const handleDeleteInitiate = () => {
    if (selectedAdmissionForConsultation) {
      setVisitToDeleteId(selectedAdmissionForConsultation.id);
      setShowDeleteConfirmation(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (visitToDeleteId && patient?.id) {
      const currentPatientId = patient.id;
      if (supabaseDataService.markAdmissionAsDeleted(currentPatientId, visitToDeleteId)) {
        setDetailedPatientData((prevData) => {
          if (!prevData) return prevData;
          const newAdmissions = prevData.admissions.map(adWrapper => {
            if (adWrapper.admission.id === visitToDeleteId) {
              return {
                ...adWrapper,
                admission: { ...adWrapper.admission, isDeleted: true, deletedAt: new Date().toISOString() },
              };
            }
            return adWrapper;
          });
          return { ...prevData, admissions: newAdmissions };
        });

        const stillActiveAdmissions = activeAdmissionDetails
            .map(adWrapper => adWrapper.admission)
            .filter(adm => adm.id !== visitToDeleteId);

        if (stillActiveAdmissions.length > 0) {
          const sortedActive = [...stillActiveAdmissions].sort((a,b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
          setSelectedAdmissionForConsultation(sortedActive[0]);
        } else {
          const newAd = await supabaseDataService.createNewAdmission(currentPatientId);
          setDetailedPatientData((prevData) => {
            if (!prevData) return { patient, admissions: [{ admission: newAd, diagnoses: [], labResults: [] }] };
            const baseAdmissions = prevData.admissions.filter(w => w.admission.id !== visitToDeleteId);
            return { 
              ...prevData, 
              admissions: [{ admission: newAd, diagnoses: [], labResults: [] }, ...baseAdmissions]
            };
          });
          setSelectedAdmissionForConsultation(newAd);
        }
      }
      setShowDeleteConfirmation(false);
      setVisitToDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setVisitToDeleteId(null);
  };

  const handleFinalizeNewConsultation = async (): Promise<Admission | null> => {
    if (!patient?.id) return null;
    try {
      const newAd = await supabaseDataService.createNewAdmission(patient.id, {
        reason: newConsultationReason || undefined,
        scheduledStart: newConsultationDate ? newConsultationDate.toISOString() : new Date().toISOString(),
        duration: newConsultationDuration || undefined,
      });
      setDetailedPatientData((prev) => {
        const newAdmissionEntry: AdmissionDetailsWrapper = { admission: newAd, diagnoses: [], labResults: [] };
        if (!prev || !prev.patient) return { patient: patient, admissions: [newAdmissionEntry] };
        const newAdmissionsList = [newAdmissionEntry, ...(prev.admissions || [])];
        return { ...prev, admissions: newAdmissionsList };
      });
      setSelectedAdmissionForConsultation(newAd);
      setIsStartingNewConsultation(false);
      setActiveTab('consult');
      return newAd;
    } catch (err: unknown) {
      console.error("Failed to finalize new consultation", err);
      setError(err instanceof Error ? err.message : "Failed to create new consultation visit.");
      return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2 sticky top-0 z-30 h-10 bg-background/80 backdrop-blur-sm">
        <Button size="icon" variant="ghost" onClick={onBack} aria-label="Back to Patients" className="h-8 w-8 p-0 hover:bg-foreground/5 group">
          <div className="flex items-center">
            <ChevronLeft className="h-4 w-4 group-hover:text-neon" />
            <Users className="h-4 w-4 group-hover:text-neon" />
          </div>
        </Button>
      </div>

      <div className="px-4 pt-2 pb-2 flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-neon/30">
            <AvatarImage src={patient.photo} alt={patient.name} />
            <AvatarFallback className="text-xl bg-neon/20 text-neon font-medium">
              {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-baseline gap-4">
            <h1 className="text-step-2 font-bold text-foreground">{patient.name}</h1>
            <div className="text-step-0 text-muted-foreground">
              <span className="mr-4">DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
              <span>Gender: {patient.gender || 'N/A'}</span>
            </div>
            <button
              onClick={async () => {
                if (isStartingNewConsultation) {
                  setIsStartingNewConsultation(false);
                  if (activeAdmissionDetails && activeAdmissionDetails.length > 0) {
                    const firstActiveWrapper = activeAdmissionDetails.find(adWrapper => !adWrapper.admission.isDeleted);
                    setSelectedAdmissionForConsultation(selectedAdmissionForConsultation || firstActiveWrapper?.admission || null);
                  } else {
                    setSelectedAdmissionForConsultation(null);
                  }
                } else {
                  setIsStartingNewConsultation(true);
                  setNewConsultationReason('');
                  setNewConsultationDate(new Date());
                  setNewConsultationDuration(null);
                  setSelectedAdmissionForConsultation(null);
                  setActiveTab('consult');
                }
              }}
              className="ml-6 inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none"
            >
              {isStartingNewConsultation ? "Cancel New Consultation" : "+ New Consultation"}
            </button>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          {!isStartingNewConsultation && (
            <div>
              <label htmlFor="consultation-select-main" className="block text-xs font-medium text-muted-foreground mb-0.5">Select Visit:</label>
              <select
                id="consultation-select-main"
                className="block w-full max-w-xs pl-3 pr-7 py-1.5 text-sm border-border bg-background focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon rounded-md shadow-sm"
                value={selectedAdmissionForConsultation?.id || ""}
                onChange={(e) => {
                  const admissionId = e.target.value;
                  const selected = activeAdmissionDetails.find(adWrap => adWrap.admission.id === admissionId)?.admission || null;
                  setSelectedAdmissionForConsultation(selected);
                }}
                disabled={showDeleteConfirmation || isStartingNewConsultation}
              >
                <option value="" disabled>-- Select a consultation --</option>
                {activeAdmissionDetails.map((adDetailWrapper: AdmissionDetailsWrapper) => (
                  <option key={adDetailWrapper.admission.id} value={adDetailWrapper.admission.id}>
                    {new Date(adDetailWrapper.admission.scheduledStart).toLocaleString()} - {adDetailWrapper.admission.reason || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedAdmissionForConsultation && !showDeleteConfirmation && !isStartingNewConsultation && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 h-8 w-8 mt-4"
              onClick={handleDeleteInitiate}
              aria-label="Delete selected visit"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {showDeleteConfirmation && visitToDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-background shadow-xl max-w-sm">
            <CardHeader>
              <CardTitle>Confirm Deletion</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Are you sure you want to delete this visit? <br />
                Scheduled: {
                  new Date(
                    activeAdmissionDetails.find(adWrap => adWrap.admission.id === visitToDeleteId)?.admission.scheduledStart || new Date()
                  ).toLocaleString()
                }
                <br />
                Reason: {activeAdmissionDetails.find(adWrap => adWrap.admission.id === visitToDeleteId)?.admission.reason || 'N/A'}
              </p>
            </CardContent>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleDeleteCancel}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="bg-background/70 backdrop-blur-sm border-b px-4 py-1 flex gap-2 sticky top-[calc(2.5rem+3rem)] z-20 overflow-x-auto shadow-sm">
        {[
          { key: "consult", label: "Consultation" },
          { key: "diagnosis", label: "Diagnosis" },
          { key: "treatment", label: "Treatment" },
          { key: "labs", label: "Labs" },
          { key: "prior", label: "Prior Auth" },
          { key: "trials", label: "Trials" },
          { key: "history", label: "History" },
          { key: "allData", label: "All Data" },
        ].map((t) => (
          <TabBtn key={t.key} k={t.key}>
            {t.label}
          </TabBtn>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {activeTab === "consult" &&
          <ConsultationTab
            patient={patient}
            allAdmissions={activeAdmissionDetails}
            selectedAdmission={selectedAdmissionForConsultation}
            onSelectAdmission={setSelectedAdmissionForConsultation}
            isStartingNewConsultation={isStartingNewConsultation}
            newConsultationReason={newConsultationReason}
            onNewConsultationReasonChange={setNewConsultationReason}
            newConsultationDate={newConsultationDate}
            onNewConsultationDateChange={setNewConsultationDate}
            newConsultationDuration={newConsultationDuration}
            onNewConsultationDurationChange={setNewConsultationDuration}
            onStartTranscriptionForNewConsult={handleFinalizeNewConsultation}
          />}
        {activeTab === "diagnosis" && <DiagnosisTab patient={patient} allAdmissions={activeAdmissionDetails} />}
        {activeTab === "treatment" && <TreatmentTab patient={patient} allAdmissions={activeAdmissionDetails} />}
        {activeTab === "labs" && <LabsTab patient={patient} allAdmissions={activeAdmissionDetails} />}
        {activeTab === "prior" && <PriorAuthTab patient={patient} allAdmissions={activeAdmissionDetails} />}
        {activeTab === "trials" && <TrialsTab patient={patient} />}
        {activeTab === "history" && <HistoryTab patient={patient} allAdmissions={activeAdmissionDetails} />}
        {activeTab === "allData" && <AllDataViewTab detailedPatientData={detailedPatientData} setDetailedPatientData={setDetailedPatientData} />}
      </ScrollArea>
    </div>
  );
} 