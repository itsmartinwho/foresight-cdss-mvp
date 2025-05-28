'use client';
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Users, CaretLeft as ChevronLeft, Trash as Trash2, PlusCircle, X, CaretUp as ChevronUp } from '@phosphor-icons/react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ConsultationPanel from '@/components/modals/ConsultationPanel';
import { useDemo } from '@/contexts/DemoContext';
import { useDemoWorkspace } from '@/hooks/demo/useDemoWorkspace';
import { useDemoConsultation } from '@/hooks/demo/useDemoConsultation';

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
  const [showConsultationPanel, setShowConsultationPanel] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [encounterToDeleteId, setEncounterToDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPatientOverviewOpen, setIsPatientOverviewOpen] = useState(true);
  const [isTabContentOpen, setIsTabContentOpen] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Demo integration - now clean and separated
  const demoState = useDemo();
  const demoWorkspace = useDemoWorkspace({
    patient: initialPatientStub,
    isDemoActive: demoState.isDemoActive,
    demoStage: demoState.demoStage,
    demoPatient: demoState.demoPatient,
    exitDemo: demoState.exitDemo,
    advanceDemoStage: demoState.advanceDemoStage,
  });

  const demoConsultation = useDemoConsultation({
    patient: initialPatientStub,
    isDemoActive: demoState.isDemoActive,
    demoStage: demoState.demoStage,
    demoPatient: demoState.demoPatient,
    animatedTranscript: demoState.animatedTranscript,
    diagnosisText: demoState.diagnosisText,
    treatmentPlanText: demoState.treatmentPlanText,
    advanceDemoStage: demoState.advanceDemoStage,
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]); // selectedEncounterForConsultation intentionally excluded to prevent infinite loop

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Advance demo stage when workspace is ready
  useEffect(() => {
    if (demoWorkspace.shouldRunDemoUi && demoState.demoStage === 'navigatingToWorkspace') {
      // Small delay to ensure component is fully loaded
      const timer = setTimeout(() => {
        demoState.advanceDemoStage('consultationPanelReady');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [demoWorkspace.shouldRunDemoUi, demoState.demoStage, demoState.advanceDemoStage]);

  const TabBtn = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <Button
      variant={activeTab === k ? "default" : "ghost"}
      size="default"
      onClick={() => {
        console.log(`Tab clicked: ${k}, current activeTab: ${activeTab}`);
        setActiveTab(k);
      }}
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
      const success = await supabaseDataService.markEncounterAsDeleted(patient.id, encounterToDeleteId);
      
      if (success) {
        setDetailedPatientData((prev) => {
          if (!prev) return prev;
          const updatedEncounters = prev.encounters.map(ew => 
            ew.encounter.id === encounterToDeleteId 
              ? { ...ew, encounter: { ...ew.encounter, isDeleted: true, deletedAt: new Date().toISOString() } }
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
      } else {
        toast({ title: "Error", description: "Failed to delete encounter. Please try again.", variant: "destructive" });
      }
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

  const handleConsultationCreated = (encounter: Encounter) => {
    const newEncounterWrapper: EncounterDetailsWrapper = { 
      encounter: encounter, 
      diagnoses: [], 
      labResults: [] 
    };

    setDetailedPatientData((prev) => {
      if (!prev || !prev.patient) return { patient: patient, encounters: [newEncounterWrapper] };
      const newEncountersList = [newEncounterWrapper, ...(prev.encounters || [])];
      return { ...prev, encounters: newEncountersList };
    });

    setSelectedEncounterForConsultation(encounter);
    setActiveTab('consultation');
    // NOTE: Don't close the panel automatically - let user manually close when done
    // The panel should remain open for consultation content entry
    router.push(`/patients/${patient.id}?encounterId=${encounter.id}`);
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
    <ContentSurface className="relative space-y-3 overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* Close Button - Top Left Circle */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="absolute top-3 left-3 z-10 hover:bg-destructive/20 group w-8 h-8 p-0 rounded-full bg-background/80 border border-border/50 shadow-sm"
      >
        <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
      </Button>

      {/* Patient Overview - Collapsible */}
      <Collapsible open={isPatientOverviewOpen} onOpenChange={setIsPatientOverviewOpen} className="border-b border-border/20 pb-6 pl-12">
        {/* Patient Header */}
        <div className="flex items-start gap-6">
          <Avatar className="h-16 w-16 border-2 border-neon/30 shadow-lg">
            <AvatarImage src={patient.photo} alt={patient.name} />
            <AvatarFallback className="text-2xl bg-neon/20 text-neon font-bold">
              {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-step-3 font-bold text-foreground">{patient.name}</h1>
                {!isPatientOverviewOpen && (
                  <span className="text-sm text-muted-foreground font-normal">
                    - Patient Overview
                  </span>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:text-neon transition-all duration-200 p-2 rounded-lg hover:bg-foreground/5"
                >
                  <ChevronUp 
                    className={cn(
                      "h-5 w-5 text-muted-foreground hover:text-neon transition-all duration-300 ease-in-out",
                      isPatientOverviewOpen ? "rotate-0" : "rotate-180"
                    )} 
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
              <div className="transition-all duration-300 ease-in-out">
              
              {/* Demographics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 max-w-2xl mb-4">
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
            </CollapsibleContent>
          </div>
        </div>

        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <div className="pt-4 transition-all duration-300 ease-in-out">
            {/* Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6">
                {activeEncounterDetails.length > 0 && (
                  <div className="w-full sm:w-auto">
                    <label htmlFor="consultation-select" className="block text-sm font-semibold text-muted-foreground mb-2">
                      Select Consultation:
                    </label>
                <Select
                  value={selectedEncounterForConsultation?.id || ""}
                  onValueChange={(value) => {
                    const foundEncounter = activeEncounterDetails.find(ew => ew.encounter.id === value)?.encounter || null;
                    setSelectedEncounterForConsultation(foundEncounter);
                    if(foundEncounter) setActiveTab('consultation');
                  }}
                  disabled={showDeleteConfirmation}
                >
                  <SelectTrigger className="w-full sm:w-72 h-11">
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
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                setShowConsultationPanel(true);
              }}
              className="font-semibold"
            >
              <PlusCircle className="mr-2 h-5 w-5"/>
              New Consultation
            </Button>
            
            {selectedEncounterForConsultation && !showDeleteConfirmation && (
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
        </CollapsibleContent>
      </Collapsible>

      {/* Tab Navigation & Content - Collapsible */}
      <Collapsible open={isTabContentOpen} onOpenChange={setIsTabContentOpen} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20 pb-4">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto flex-1 sm:mr-4 scrollbar-hide">
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
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:text-neon transition-all duration-200 p-2 rounded-lg hover:bg-foreground/5 flex-shrink-0"
            >
              <ChevronUp 
                className={cn(
                  "h-5 w-5 text-muted-foreground hover:text-neon transition-all duration-300 ease-in-out",
                  isTabContentOpen ? "rotate-0" : "rotate-180"
                )} 
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <div className="pt-4 transition-all duration-300 ease-in-out">
            {/* Content Sections */}
            {activeTab === "consultation" && patient && (
              <ConsultationTab
                patient={patient}
                selectedEncounter={selectedEncounterForConsultation}
              />
            )}
            
            {activeTab === "diagnosis" && (
              <DiagnosisTab patient={patient} allEncounters={activeEncounterDetails} />
            )}
            
            {activeTab === "treatment" && (
              <TreatmentTab patient={patient} allEncounters={activeEncounterDetails} />
            )}
            
            {activeTab === "labs" && (
              <LabsTab patient={patient} allEncounters={activeEncounterDetails} />
            )}
            
            {activeTab === "prior" && (
              <PriorAuthTab patient={patient} allEncounters={activeEncounterDetails} />
            )}
            
            {activeTab === "trials" && (
              <TrialsTab patient={patient} />
            )}
            
            {activeTab === "history" && (
              <HistoryTab patient={patient} allEncounters={activeEncounterDetails} />
            )}
            
            {activeTab === "allData" && (
              <AllDataViewTab detailedPatientData={detailedPatientData} setDetailedPatientData={setDetailedPatientData} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

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

      {/* Consultation Panel */}
      <ConsultationPanel
        isOpen={showConsultationPanel}
        onClose={() => setShowConsultationPanel(false)}
        patient={patient}
        onConsultationCreated={handleConsultationCreated}
      />

      {/* Demo Consultation Panel */}
      {demoWorkspace.shouldRunDemoUi && demoState.demoPatient && (
        <ConsultationPanel
          isOpen={demoWorkspace.isDemoPanelOpen}
          onClose={() => {
            demoWorkspace.exitDemo();
          }}
          patient={demoState.demoPatient}
          isDemoMode={demoConsultation.isDemoMode}
          initialDemoTranscript={demoConsultation.initialDemoTranscript}
          demoDiagnosis={demoConsultation.demoDiagnosis}
          demoTreatment={demoConsultation.demoTreatment}
          onDemoClinicalPlanClick={demoConsultation.onDemoClinicalPlanClick}
          isDemoGeneratingPlan={demoConsultation.isDemoGeneratingPlan}
        />
      )}
    </ContentSurface>
  );
}