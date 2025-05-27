'use client';
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Users, CaretLeft as ChevronLeft, Trash as Trash2, PlusCircle, X } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter, EncounterDetailsWrapper } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from "@/lib/utils";
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
import { buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import ContentSurface from "@/components/layout/ContentSurface";
import Section from "@/components/ui/section";

interface PatientWorkspaceProps {
  patient: Patient;
  initialTab: string;
  onBack: () => void;
}

export type DetailedPatientDataType = { patient: Patient; encounters: EncounterDetailsWrapper[] } | null;

export default function PatientWorkspaceViewModern({ patient: initialPatientStub, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("consultation");
  const [patient, setPatient] = useState<Patient>(initialPatientStub);
  const [detailedPatientData, setDetailedPatientData] = useState<DetailedPatientDataType>(null);
  const [activeEncounterDetails, setActiveEncounterDetails] = useState<EncounterDetailsWrapper[]>([]);
  const [selectedEncounterForConsultation, setSelectedEncounterForConsultation] = useState<Encounter | null>(null);
  const [isStartingNewConsultation, setIsStartingNewConsultation] = useState(false);
  const [newConsultationReason, setNewConsultationReason] = useState("");
  const [newConsultationDate, setNewConsultationDate] = useState<Date | null>(new Date());
  const [newConsultationDuration, setNewConsultationDuration] = useState(30);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [encounterToDeleteId, setEncounterToDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  useEffect(() => {
    const encounterId = searchParams.get('encounterId');
    if (encounterId && activeEncounterDetails.length > 0) {
      const foundEncounter = activeEncounterDetails.find(ew => ew.encounter.id === encounterId)?.encounter;
      if (foundEncounter) {
        setSelectedEncounterForConsultation(foundEncounter);
      }
    }
  }, [searchParams, activeEncounterDetails]);

  const loadPatientData = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const detailedData = await supabaseDataService.getPatientData(patient.id);
      if (detailedData) {
        setDetailedPatientData(detailedData);
        setPatient(detailedData.patient);
        
        const nonDeletedEncounters = (detailedData.encounters || []).filter(ew => !ew.encounter.isDeleted);
        setActiveEncounterDetails(nonDeletedEncounters);
        
        if (nonDeletedEncounters.length > 0 && !selectedEncounterForConsultation) {
          setSelectedEncounterForConsultation(nonDeletedEncounters[0].encounter);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load patient data", err);
      setError(err instanceof Error ? err.message : "Failed to load patient data");
    } finally {
      setLoading(false);
    }
  }, [patient?.id, selectedEncounterForConsultation]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      variant={activeTab === k ? "default" : "ghost"}
      size="default"
      onClick={() => setActiveTab(k)}
      className={cn(
        "whitespace-nowrap transition-all duration-200 font-semibold px-6 py-3 h-auto",
        activeTab === k 
          ? "bg-neon/20 text-neon border-neon/30 shadow-sm" 
          : "hover:bg-foreground/5 hover:text-neon text-muted-foreground"
      )}
    >
      {children}
    </Button>
  );

  const handleDeleteEncounter = async () => {
    if (!encounterToDeleteId) return;
    
    try {
      supabaseDataService.markEncounterAsDeleted(patient.id, encounterToDeleteId);
      
      setDetailedPatientData((prev) => {
        if (!prev) return prev;
        const updatedEncounters = prev.encounters.map(ew => 
          ew.encounter.id === encounterToDeleteId 
            ? { ...ew, encounter: { ...ew.encounter, isDeleted: true } }
            : ew
        );
        return { ...prev, encounters: updatedEncounters };
      });

      const nonDeletedEncounters = activeEncounterDetails.filter(ew => ew.encounter.id !== encounterToDeleteId);
      setActiveEncounterDetails(nonDeletedEncounters);
      
      if (selectedEncounterForConsultation?.id === encounterToDeleteId) {
        setSelectedEncounterForConsultation(nonDeletedEncounters.length > 0 ? nonDeletedEncounters[0].encounter : null);
      }
      
      toast({ title: "Success", description: "Encounter deleted successfully." });
    } catch (err: unknown) {
      console.error("Failed to delete encounter", err);
      toast({ title: "Error", description: `Failed to delete encounter: ${err instanceof Error ? err.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setShowDeleteConfirmation(false);
      setEncounterToDeleteId(null);
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
      setError(err instanceof Error ? err.message : "Failed to create new consultation encounter.");
      toast({ title: "Error", description: `Failed to create new encounter: ${err instanceof Error ? err.message : "Unknown error"}`, variant: "destructive" });
      return null;
    }
  };

  const openDeleteConfirmation = (encounterId: string) => {
    setEncounterToDeleteId(encounterId);
    setShowDeleteConfirmation(true);
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error || !patient) {
    return (
      <ContentSurface className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Button variant="ghost" onClick={onBack} className="self-start mb-8 hover:text-neon">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <Users className="h-5 w-5 mr-1" />
          Back to Patients
        </Button>
        <ErrorDisplay message={error || 'Patient not found'} />
      </ContentSurface>
    );
  }

  return (
    <ContentSurface className="relative space-y-8 overflow-y-auto">
      {/* Close Button - Top Right */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="absolute top-4 right-4 z-10 hover:text-destructive group p-2"
      >
        <X className="h-6 w-6 group-hover:text-destructive transition-colors" />
      </Button>

      {/* Header Section */}
      <div className="space-y-6 border-b border-border/20 pb-8">

          {/* Patient Header */}
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 border-2 border-neon/30 shadow-lg">
              <AvatarImage src={patient.photo} alt={patient.name} />
              <AvatarFallback className="text-3xl bg-neon/20 text-neon font-bold">
                {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-step-3 font-bold text-foreground mb-2">{patient.name}</h1>
                
                {/* Demographics Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-2xl">
                  <div className="font-semibold text-muted-foreground">Date of Birth:</div>
                  <div className="font-medium text-foreground">{formatDate(patient.dateOfBirth)}</div>
                  
                  <div className="font-semibold text-muted-foreground">Age:</div>
                  <div className="font-medium text-foreground">{calculateAge(patient.dateOfBirth)} years</div>
                  
                  <div className="font-semibold text-muted-foreground">Gender:</div>
                  <div className="font-medium text-foreground">{patient.gender || 'N/A'}</div>
                  
                  {patient.ethnicity && (
                    <>
                      <div className="font-semibold text-muted-foreground">Ethnicity:</div>
                      <div className="font-medium text-foreground">{patient.ethnicity}</div>
                    </>
                  )}
                  
                  {patient.race && (
                    <>
                      <div className="font-semibold text-muted-foreground">Race:</div>
                      <div className="font-medium text-foreground">{patient.race}</div>
                    </>
                  )}
                  
                  {patient.id && (
                    <>
                      <div className="font-semibold text-muted-foreground">Patient ID:</div>
                      <div className="font-mono text-sm text-foreground bg-muted/50 px-2 py-1 rounded">{patient.id}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {!isStartingNewConsultation && activeEncounterDetails.length > 0 && (
                <div className="space-y-2">
                  <label htmlFor="consultation-select" className="block text-sm font-semibold text-muted-foreground">
                    Select Consultation:
                  </label>
                  <Select
                    value={selectedEncounterForConsultation?.id || ""}
                    onValueChange={(value) => {
                      const foundEncounter = activeEncounterDetails.find(ew => ew.encounter.id === value)?.encounter || null;
                      setSelectedEncounterForConsultation(foundEncounter);
                      if(foundEncounter) setActiveTab('consultation');
                    }}
                    disabled={showDeleteConfirmation || isStartingNewConsultation}
                  >
                    <SelectTrigger className="w-72 h-11">
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
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="lg"
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
                className="font-semibold"
              >
                {isStartingNewConsultation ? <X className="mr-2 h-5 w-5"/> : <PlusCircle className="mr-2 h-5 w-5"/>}
                {isStartingNewConsultation ? "Cancel New Consultation" : "New Consultation"}
              </Button>
              
              {selectedEncounterForConsultation && !showDeleteConfirmation && !isStartingNewConsultation && (
                <Button 
                  variant="ghost" 
                  onClick={() => openDeleteConfirmation(selectedEncounterForConsultation.id)}
                  size="default"
                  className="font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group"
                >
                  <Trash2 className="mr-2 h-4 w-4 group-hover:h-5 group-hover:w-5 transition-all duration-200" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

      {/* Tab Navigation */}
      <Section title="Patient Data" className="border-b border-border/20 pb-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
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
      </Section>

      {/* Content Sections */}
      <div className="space-y-8">
        {activeTab === "consultation" && patient && (
          <Section title="Consultation" collapsible defaultOpen contentClassName="space-y-4">
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
            />
          </Section>
        )}
        
        {activeTab === "diagnosis" && (
          <Section title="Diagnoses & Conditions" collapsible defaultOpen contentClassName="space-y-4">
            <DiagnosisTab patient={patient} allEncounters={activeEncounterDetails} />
          </Section>
        )}
        
        {activeTab === "treatment" && (
          <Section title="Treatments & Medications" collapsible defaultOpen contentClassName="space-y-4">
            <TreatmentTab patient={patient} allEncounters={activeEncounterDetails} />
          </Section>
        )}
        
        {activeTab === "labs" && (
          <Section title="Laboratory Results" collapsible defaultOpen contentClassName="space-y-4">
            <LabsTab patient={patient} allEncounters={activeEncounterDetails} />
          </Section>
        )}
        
        {activeTab === "prior" && (
          <Section title="Prior Authorization" collapsible defaultOpen contentClassName="space-y-4">
            <PriorAuthTab patient={patient} allEncounters={activeEncounterDetails} />
          </Section>
        )}
        
        {activeTab === "trials" && (
          <Section title="Clinical Trials" collapsible defaultOpen contentClassName="space-y-4">
            <TrialsTab patient={patient} />
          </Section>
        )}
        
        {activeTab === "history" && (
          <Section title="Encounter History" collapsible defaultOpen contentClassName="space-y-4">
            <HistoryTab patient={patient} allEncounters={activeEncounterDetails} />
          </Section>
        )}
        
        {activeTab === "allData" && (
          <Section title="All Patient Data" collapsible defaultOpen contentClassName="space-y-4">
            <AllDataViewTab detailedPatientData={detailedPatientData} setDetailedPatientData={setDetailedPatientData} />
          </Section>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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
    </ContentSurface>
  );
} 