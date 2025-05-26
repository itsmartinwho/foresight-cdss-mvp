'use client';
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CaretLeft as ChevronLeft, Trash as Trash2, PlusCircle, X } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter, EncounterDetailsWrapper, ComplexCaseAlert } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from "@/lib/utils";
import RenderDetailTable from "@/components/ui/RenderDetailTable";
import ConsultationTab from "@/app/consultation/[id]/ConsultationTab";
import DiagnosisTab from "@/components/patient-workspace-tabs/DiagnosisTab";
import TreatmentTab from "@/components/patient-workspace-tabs/TreatmentTab";
import LabsTab from "@/components/patient-workspace-tabs/LabsTab";
import PriorAuthTab from "@/components/patient-workspace-tabs/PriorAuthTab";
import TrialsTab from "@/components/patient-workspace-tabs/TrialsTab";
import HistoryTab from "@/components/patient-workspace-tabs/HistoryTab";
import AllDataViewTab from "@/components/patient-workspace-tabs/AllDataViewTab";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertDialogCancel } from "@/components/ui/alert-dialog";
import { AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { buttonVariants } from "@/components/ui/button";

interface PatientWorkspaceProps {
  patient: Patient;
  initialTab: string;
  onBack: () => void;
}

export type DetailedPatientDataType = { patient: Patient; encounters: EncounterDetailsWrapper[] } | null;

export default function PatientWorkspaceView({ patient: initialPatientStub, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("consultation");
  const { toast } = useToast();
  const [detailedPatientData, setDetailedPatientData] = useState<DetailedPatientDataType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEncounterForConsultation, setSelectedEncounterForConsultation] = useState<Encounter | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [encounterToDeleteId, setEncounterToDeleteId] = useState<string | null>(null);
  const [isStartingNewConsultation, setIsStartingNewConsultation] = useState(false);
  const [newConsultationReason, setNewConsultationReason] = useState('');
  const [newConsultationDate, setNewConsultationDate] = useState<Date | null>(new Date());
  const [newConsultationDuration, setNewConsultationDuration] = useState<number | null>(null);
  const [sidebarKey, setSidebarKey] = useState(Date.now());

  const searchParams = useSearchParams();
  const router = useRouter();

  const activeEncounterDetails: EncounterDetailsWrapper[] = React.useMemo(() => {
    if (!detailedPatientData?.encounters) return [];
    return detailedPatientData.encounters.filter(ew => !ew.encounter.isDeleted);
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
      const data = await supabaseDataService.getPatientData(initialPatientStub.id);
      if (data) {
        const typedData: DetailedPatientDataType = {
          patient: data.patient,
          encounters: data.encounters || [] 
        };
        setDetailedPatientData(typedData);
        
        const paramEncounterId = searchParams?.get('encounterId') || searchParams?.get('ad');
        const encountersToSearch = typedData.encounters || [];
        const firstActiveNonDeleted = encountersToSearch.find(eWrapper => !eWrapper.encounter.isDeleted)?.encounter || null;

        if (paramEncounterId) {
          const foundEncounterWrapper = encountersToSearch.find(eWrapper => eWrapper.encounter.id === paramEncounterId && !eWrapper.encounter.isDeleted);
          setSelectedEncounterForConsultation(foundEncounterWrapper?.encounter || firstActiveNonDeleted);
        } else {
          setSelectedEncounterForConsultation(firstActiveNonDeleted);
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
    const cb = async () => {
      await loadData();
    }
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

  const handleDeleteEncounter = async () => {
    if (encounterToDeleteId && patient?.id) {
      const currentPatientId = patient.id;
      try {
        await supabaseDataService.markEncounterAsDeleted(currentPatientId, encounterToDeleteId);
        
        setDetailedPatientData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            encounters: prevData.encounters.map(ew => 
              ew.encounter.id === encounterToDeleteId 
                ? { ...ew, encounter: { ...ew.encounter, isDeleted: true } } 
                : ew
            ),
          };
        });

        if (selectedEncounterForConsultation?.id === encounterToDeleteId) {
            const activeEncountersAfterDelete = (detailedPatientData?.encounters || [])
                .filter(ew => !ew.encounter.isDeleted && ew.encounter.id !== encounterToDeleteId)
                .map(ew => ew.encounter);

            const nextSelected = activeEncountersAfterDelete.length > 0 ? activeEncountersAfterDelete[0] : null;
            setSelectedEncounterForConsultation(nextSelected);
            if (nextSelected) {
                router.push(`/patients/${currentPatientId}?encounterId=${nextSelected.id}`);
            } else {
                router.push(`/patients/${currentPatientId}`);
            }
        }
        
        toast({ title: "Encounter Deleted", description: "The encounter has been marked as deleted." });
      } catch (err) {
        console.error("Failed to delete encounter:", err);
        toast({ title: "Error", description: "Failed to delete encounter.", variant: "destructive" });
      }
      setEncounterToDeleteId(null);
      setShowDeleteConfirmation(false);
    } else {
      toast({ title: "Error", description: "No encounter selected for deletion or patient context missing.", variant: "destructive" });
    }
  };

  const handleCancelDelete = () => {
    setEncounterToDeleteId(null);
    setShowDeleteConfirmation(false);
  };

  const handleFinalizeNewConsultation = async (): Promise<Encounter | null> => {
    if (!patient?.id) return null;
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: newConsultationReason || undefined,
        scheduledStart: newConsultationDate ? newConsultationDate.toISOString() : new Date().toISOString(),
      });
      
      const newEncounterWrapper: EncounterDetailsWrapper = { 
        encounter: newEncounter, 
        diagnoses: [], 
        labResults: [] 
      };

      setDetailedPatientData((prev) => {
        if (!prev || !prev.patient) return { patient: patient, encounters: [newEncounterWrapper] };
        const newEncountersList = [newEncounterWrapper, ...(prev.encounters || [])];
        return { ...prev, encounters: newEncountersList };
      });

      setSelectedEncounterForConsultation(newEncounter);
      setIsStartingNewConsultation(false);
      setActiveTab('consultation');
      router.push(`/patients/${patient.id}?encounterId=${newEncounter.id}`);
      return newEncounter;
    } catch (err: unknown) {
      console.error("Failed to finalize new consultation", err);
      setError(err instanceof Error ? err.message : "Failed to create new consultation visit.");
      toast({ title: "Error", description: `Failed to create new encounter: ${err instanceof Error ? err.message : "Unknown error"}`, variant: "destructive" });
      return null;
    }
  };

  const openDeleteConfirmation = (encounterId: string) => {
    setEncounterToDeleteId(encounterId);
    setShowDeleteConfirmation(true);
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
            <Button
              variant="default"
              onClick={async () => {
                if (isStartingNewConsultation) {
                  setIsStartingNewConsultation(false);
                  if (activeEncounterDetails && activeEncounterDetails.length > 0) {
                    const previouslySelectedId = selectedEncounterForConsultation?.id;
                    setSelectedEncounterForConsultation(null); 
                    const reselectEncounter = previouslySelectedId 
                      ? activeEncounterDetails.find(ew => ew.encounter.id === previouslySelectedId && !ew.encounter.isDeleted)?.encounter
                      : activeEncounterDetails.find(ew => !ew.encounter.isDeleted)?.encounter;
                    setSelectedEncounterForConsultation(reselectEncounter || null);
                  } else {
                    setSelectedEncounterForConsultation(null);
                  }
                } else {
                  setSelectedEncounterForConsultation(null); 
                  setIsStartingNewConsultation(true);
                  setActiveTab('consultation');
                }
              }}
              className="ml-auto"
            >
              {isStartingNewConsultation ? <X className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
              {isStartingNewConsultation ? "Cancel New Consultation" : "New Consultation"}
            </Button>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          {!isStartingNewConsultation && (
            <div>
              <label htmlFor="consultation-select-main" className="block text-xs font-medium text-muted-foreground mb-0.5">Select Visit:</label>
              <Select
                value={selectedEncounterForConsultation?.id || ""}
                onValueChange={(value) => {
                  const foundEncounter = activeEncounterDetails.find(ew => ew.encounter.id === value)?.encounter || null;
                  setSelectedEncounterForConsultation(foundEncounter);
                  if(foundEncounter) setActiveTab('consultation');
                }}
                disabled={showDeleteConfirmation || isStartingNewConsultation}
              >
                <SelectTrigger className={cn(
                  "w-full max-w-xs pl-3 pr-7 py-1.5 text-sm border-border bg-background focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon rounded-md shadow-sm",
                  !selectedEncounterForConsultation ? "text-[var(--placeholder-color)] opacity-[var(--placeholder-opacity)]" : "text-foreground opacity-100"
                )}>
                  <SelectValue placeholder="Select an encounter..." />
                </SelectTrigger>
                <SelectContent>
                  {activeEncounterDetails.map((ew) => (
                    <SelectItem key={ew.encounter.id} value={ew.encounter.id}>
                      {new Date(ew.encounter.scheduledStart).toLocaleDateString()} - {ew.encounter.reasonDisplayText || ew.encounter.reasonCode || 'Encounter'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedEncounterForConsultation && !showDeleteConfirmation && !isStartingNewConsultation && (
            <Button 
              variant="destructive" 
              onClick={() => openDeleteConfirmation(selectedEncounterForConsultation.id)}
              className="mt-4"
              aria-label="Delete selected encounter"
              size="sm"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {showDeleteConfirmation && encounterToDeleteId && (
        <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this encounter? This action cannot be undone immediately, but encounters can be restored by an admin.
                <br /> <br />
                Encounter Date: {format(activeEncounterDetails.find(ew => ew.encounter.id === encounterToDeleteId)?.encounter.scheduledStart || new Date(), 'PPP ppp')}
                <br />
                Reason: {activeEncounterDetails.find(ew => ew.encounter.id === encounterToDeleteId)?.encounter.reasonDisplayText || activeEncounterDetails.find(ew => ew.encounter.id === encounterToDeleteId)?.encounter.reasonCode || 'N/A'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEncounter} className={buttonVariants({ variant: "destructive" })}>Delete Encounter</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="bg-background/70 backdrop-blur-sm border-b px-4 py-1 flex gap-2 sticky top-[calc(2.5rem+3rem)] z-20 overflow-x-auto shadow-sm">
        {[
          { key: "consultation", label: "Consultation" },
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
      <div className="flex-1 overflow-y-auto">
        {activeTab === "consultation" && selectedEncounterForConsultation && patient &&
          <ConsultationTab
            patient={patient}
            selectedEncounter={selectedEncounterForConsultation}
            isStartingNewConsultation={isStartingNewConsultation}
            newConsultationReason={newConsultationReason}
            onNewConsultationReasonChange={setNewConsultationReason}
            newConsultationDate={newConsultationDate}
            onNewConsultationDateChange={setNewConsultationDate}
            newConsultationDuration={newConsultationDuration}
            onNewConsultationDurationChange={setNewConsultationDuration}
            onStartTranscriptionForNewConsult={handleFinalizeNewConsultation}
          />}
        {activeTab === "consultation" && isStartingNewConsultation && patient &&
           <ConsultationTab
            patient={patient}
            selectedEncounter={null}
            isStartingNewConsultation={isStartingNewConsultation}
            newConsultationReason={newConsultationReason}
            onNewConsultationReasonChange={setNewConsultationReason}
            newConsultationDate={newConsultationDate}
            onNewConsultationDateChange={setNewConsultationDate}
            newConsultationDuration={newConsultationDuration}
            onNewConsultationDurationChange={setNewConsultationDuration}
            onStartTranscriptionForNewConsult={handleFinalizeNewConsultation}
          />
        }
        {activeTab === "diagnosis" && <DiagnosisTab patient={patient} allEncounters={activeEncounterDetails} />}
        {activeTab === "treatment" && <TreatmentTab patient={patient} allEncounters={activeEncounterDetails} />}
        {activeTab === "labs" && <LabsTab patient={patient} allEncounters={activeEncounterDetails} />}
        {activeTab === "prior" && <PriorAuthTab patient={patient} allEncounters={activeEncounterDetails} />}
        {activeTab === "trials" && <TrialsTab patient={patient} />}
        {activeTab === "history" && <HistoryTab patient={patient} allEncounters={activeEncounterDetails} />}
        {activeTab === "allData" && <AllDataViewTab detailedPatientData={detailedPatientData} setDetailedPatientData={setDetailedPatientData} />}
      </div>
    </div>
  );
} 