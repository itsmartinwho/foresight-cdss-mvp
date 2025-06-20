'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Users, CaretLeft as ChevronLeft, X, CaretUp as ChevronUp } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseDataService } from "@/lib/supabaseDataService";
import type { Patient, Encounter, EncounterDetailsWrapper } from "@/lib/types";
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import ConsolidatedConsultationTab from "@/components/patient-workspace-tabs/ConsolidatedConsultationTab";
import AllDataViewTab from "@/components/patient-workspace-tabs/AllDataViewTab";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import LoadingAnimation from "@/components/LoadingAnimation";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertDialogCancel } from "@/components/ui/alert-dialog";
import { AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import ContentSurface from "@/components/layout/ContentSurface";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ConsultationPanel from '@/components/modals/ConsultationPanel';
import { useDemo } from '@/contexts/DemoContext';
import { useDemoWorkspace } from '@/hooks/demo/useDemoWorkspace';
import { useDemoConsultation } from '@/hooks/demo/useDemoConsultation';
import { DemoDataService } from "@/services/demo/DemoDataService";
import { useModalManager } from '@/components/ui/modal-manager';
import FormCreationModal from '@/components/modals/FormCreationModal';

interface PatientWorkspaceProps {
  patient: Patient;
  initialTab: string;
  onBack: () => void;
}

export type DetailedPatientDataType = { patient: Patient; encounters: EncounterDetailsWrapper[] } | null;

export default function PatientWorkspaceViewModern({ patient: initialPatientStub, initialTab, onBack }: PatientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("consultation");
  const [patient, setPatient] = useState<Patient>(initialPatientStub);
  const [detailedPatientData, setDetailedPatientData] = useState<{ patient: Patient; encounters: EncounterDetailsWrapper[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEncounterDetails, setActiveEncounterDetails] = useState<EncounterDetailsWrapper[]>([]);
  const [selectedEncounterForConsultation, setSelectedEncounterForConsultation] = useState<Encounter | null>(null);
  const [showConsultationPanel, setShowConsultationPanel] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [encounterToDeleteId, setEncounterToDeleteId] = useState<string | null>(null);
  const [isPatientOverviewOpen, setIsPatientOverviewOpen] = useState(false);
  const [showPriorAuthModal, setShowPriorAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Demo integration using proper service layer
  const demoState = useDemo();
  const demoWorkspace = useDemoWorkspace({
    patient: patient,
    isDemoActive: demoState.isDemoActive,
    demoStage: demoState.demoStage,
    demoPatient: demoState.demoPatient,
    exitDemo: demoState.exitDemo,
    advanceDemoStage: demoState.advanceDemoStage,
  });

  // Demo consultation behavior
  const demoConsultation = useDemoConsultation({
    patient,
    isDemoActive: demoState.isDemoActive,
    demoStage: demoState.demoStage,
    animatedTranscript: demoState.animatedTranscript,
    onAdvanceStage: demoState.advanceDemoStage,
  });

  // Force demo panel open when on demo route
  const isDemoRoute = searchParams.get('demo') === 'true';
  const [demoPanelForceOpen, setDemoPanelForceOpen] = useState(false);

  const isLoadingDataRef = useRef(false);
  const loadedPatientIdRef = useRef<string | null>(null);

  // Track previous consultation selection to restore on discard
  const previousEncounterRef = useRef<Encounter | null>(null);

  // Modal manager integration to detect consultation-panel restoration
  const { getModalState } = useModalManager();
  const consultationModalId = `consultation-panel-patient-${initialPatientStub.id}`;
  const pendingRestoredConsultModal = getModalState(consultationModalId);

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
        
        // Check if we should auto-start the consultation panel (for existing encounters)
        const autoStart = searchParams.get('autoStart');
        if (autoStart === 'true') {
          // Save current selection to restore if modal is discarded
          previousEncounterRef.current = foundEncounter;
          setShowConsultationPanel(true);
        }
        
        // For new consultations with autoStartTranscription, just set the encounter and let ConsultationTab handle it
        // The consultation tab will automatically start transcription based on the autoStartTranscription parameter
      }
    }
  }, [searchParams, activeEncounterDetails]);

  const loadPatientData = useCallback(async (force = false) => {
    if (!patient?.id) return;
    
    // Prevent multiple simultaneous loads of the same patient, unless forcing refresh
    if (isLoadingDataRef.current || (!force && loadedPatientIdRef.current === patient.id)) {
      return;
    }
    
    isLoadingDataRef.current = true;
    loadedPatientIdRef.current = patient.id;
    setLoading(true);
    setError(null);
    
    try {
      // Handle demo mode with mock data
      if (demoState.isDemoActive && patient.id === demoState.demoPatient?.id) {
        const demoPatient = DemoDataService.getPatientData();
        const demoEncounter = DemoDataService.getEncounterData();
        
        const mockEncounterWrapper: EncounterDetailsWrapper = {
          encounter: {
            id: demoEncounter.id,
            encounterIdentifier: demoEncounter.encounterIdentifier,
            patientId: demoPatient.id,
            scheduledStart: demoEncounter.actualStart,
            scheduledEnd: demoEncounter.actualEnd,
            actualStart: demoEncounter.actualStart,
            actualEnd: demoEncounter.actualEnd,
            reasonCode: demoEncounter.reasonCode,
            reasonDisplayText: demoEncounter.reasonDisplayText,
            transcript: demoEncounter.transcript,
            soapNote: demoEncounter.soapNote,
            treatments: demoEncounter.treatments.map(t => ({
              drug: t.drug,
              status: t.status,
              rationale: t.rationale
            }))
          },
          diagnoses: [{
            patientId: demoEncounter.diagnosis.patientId,
            encounterId: demoEncounter.diagnosis.encounterId,
            code: demoEncounter.diagnosis.code,
            description: demoEncounter.diagnosis.description
          }],
          labResults: []
        };

        setDetailedPatientData({
          patient: demoPatient,
          encounters: [mockEncounterWrapper]
        });
        setPatient(demoPatient);
        setActiveEncounterDetails([mockEncounterWrapper]);
        setSelectedEncounterForConsultation(mockEncounterWrapper.encounter);
      } else {
        // Normal database loading for non-demo mode
        const detailedData = await supabaseDataService.getPatientData(patient.id);
        if (detailedData) {
          setDetailedPatientData(detailedData);
          setPatient(detailedData.patient);
          
          const nonDeletedEncounters = (detailedData.encounters || []).filter(ew => !ew.encounter.isDeleted);
          setActiveEncounterDetails(nonDeletedEncounters);
          
          // Only set selected encounter if none is currently selected
          const currentlySelected = selectedEncounterForConsultation;
          if (nonDeletedEncounters.length > 0 && !currentlySelected) {
            setSelectedEncounterForConsultation(nonDeletedEncounters[0].encounter);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load patient data", err);
      setError(err instanceof Error ? err.message : "Failed to load patient data");
    } finally {
      setLoading(false);
      isLoadingDataRef.current = false;
    }
  }, [patient?.id, demoState.isDemoActive, demoState.demoPatient, selectedEncounterForConsultation]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Subscribe to data changes to refresh when consultation data is saved
  useEffect(() => {
    const handleDataChange = () => {
      if (patient?.id) {
        loadPatientData(true); // Force refresh
      }
    };

    const handleCustomDataChange = (event: CustomEvent) => {
      if (event.detail?.patientId === patient?.id) {
        loadPatientData(true); // Force refresh for the specific patient
      }
    };

    // Subscribe to changes
    supabaseDataService.subscribe(handleDataChange);
    
    // Also listen for custom events from the editable fields
    window.addEventListener('supabase-data-change', handleCustomDataChange as EventListener);

    // Cleanup subscription on unmount
    return () => {
      supabaseDataService.unsubscribe(handleDataChange);
      window.removeEventListener('supabase-data-change', handleCustomDataChange as EventListener);
    };
  }, [patient?.id, loadPatientData]);

  useEffect(() => {
    // Only log when there are significant changes
    if (isDemoRoute && demoState.isDemoActive && !demoPanelForceOpen) {
      console.log('[PatientWorkspace] Demo route effect triggered:', {
        isDemoRoute,
        isDemoActive: demoState.isDemoActive,
        demoPanelForceOpen,
        currentStage: demoState.demoStage
      });
    }
    
    if (isDemoRoute && demoState.isDemoActive && !demoPanelForceOpen) {
      console.log('[PatientWorkspace] Setting demo panel force open and advancing from navigatingToWorkspace');
      setDemoPanelForceOpen(true);
      if (demoState.demoStage === 'navigatingToWorkspace') {
        demoState.advanceDemoStage('consultationPanelReady');
      }
    }
  }, [isDemoRoute, demoState.isDemoActive, demoState.demoStage]); // Remove demoPanelForceOpen to prevent loops

  useEffect(() => {
    // Only log when entering consultationPanelReady stage
    if (demoState.demoStage === 'consultationPanelReady') {
      console.log('[PatientWorkspace] Demo stage advancement effect triggered:', {
        currentStage: demoState.demoStage,
        advanceDemoStage: !!demoState.advanceDemoStage,
        isDemoActive: demoState.isDemoActive,
        animatedTranscriptLength: demoState.animatedTranscript?.length || 0
      });
      
      console.log('[PatientWorkspace] Stage is consultationPanelReady, setting timer to advance to animatingTranscript');
      const timer = setTimeout(() => {
        console.log('[PatientWorkspace] Timer executed, advancing to animatingTranscript');
        demoState.advanceDemoStage('animatingTranscript');
      }, 500); // Small delay to allow panel to render
      return () => {
        console.log('[PatientWorkspace] Clearing demo stage advancement timer');
        clearTimeout(timer);
      };
    }
  }, [demoState.demoStage]); // Remove extra dependencies that cause loops

  useEffect(() => {
    if (
      pendingRestoredConsultModal &&
      !pendingRestoredConsultModal.isMinimized &&
      !pendingRestoredConsultModal.isVisible
    ) {
      setShowConsultationPanel(true);
    }
  }, [pendingRestoredConsultModal]);

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
    
    // Navigate with autoStartTranscription=true to automatically start transcription
    const url = new URL(window.location.href);
    url.searchParams.delete('autoStart'); // Clear old autoStart parameter
    url.searchParams.set('encounterId', encounter.id);
    url.searchParams.set('tab', 'consultation');
    url.searchParams.set('autoStartTranscription', 'true'); // Add auto-start transcription
    window.history.replaceState({}, '', url.toString());
    
    // Close the consultation panel since we're now showing the new consultation in the workspace
    setShowConsultationPanel(false);
  };

  const openDeleteConfirmation = (encounterId: string) => {
    setEncounterToDeleteId(encounterId);
    setShowDeleteConfirmation(true);
  };

  // Memoize draggableConfig objects to prevent infinite loops
  const regularConsultationConfig = useMemo(() => ({
    id: `consultation-panel-patient-${patient.id}`,
    title: "New Consultation",
    defaultPosition: { x: 150, y: 80 },
    persistent: true
  }), [patient.id]);
  
  const demoConsultationConfig = useMemo(() => ({
    id: `demo-consultation-panel-${patient.id}`,
    title: "Demo Consultation",
    defaultPosition: { x: 200, y: 120 },
    persistent: false
  }), [patient.id]);

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
        {/* Patient Header - Always visible */}
        <div className="flex items-start gap-6">
          <Avatar className="h-16 w-16 border-2 border-neon/30 shadow-lg flex-shrink-0">
            <AvatarImage src={patient.photo} alt={patient.name} />
            <AvatarFallback className="text-2xl bg-neon/20 text-neon font-bold">
              {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Name and controls row */}
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-step-3 font-bold text-foreground">{patient.name}</h1>
              
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
              
              {!isPatientOverviewOpen && (
                <span className="text-sm text-muted-foreground font-normal">
                  DOB: {formatDate(patient.dateOfBirth)}
                </span>
              )}
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


      </Collapsible>

      {/* Tab Navigation & Content */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20 pb-4">
          {/* Left Side: Consultation Tab and Selector */}
          <div className="flex items-center gap-3">
            <TabBtn k="consultation">
              Consultation
            </TabBtn>
            {activeEncounterDetails.length > 0 && (
              <Select
                value={selectedEncounterForConsultation?.id || ""}
                onValueChange={(value) => {
                  const foundEncounter = activeEncounterDetails.find(ew => ew.encounter.id === value)?.encounter || null;
                  setSelectedEncounterForConsultation(foundEncounter);
                  if(foundEncounter) setActiveTab('consultation');
                }}
                disabled={showDeleteConfirmation}
              >
                <SelectTrigger className="w-64 h-9">
                  <SelectValue placeholder="Select consultation..." />
                </SelectTrigger>
                <SelectContent className="w-[32rem]">
                  {activeEncounterDetails
                    .sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime())
                    .map((ew) => (
                    <SelectItem key={ew.encounter.id} value={ew.encounter.id} className="max-w-full">
                      <span className="truncate">
                        {new Date(ew.encounter.scheduledStart).toLocaleDateString()} - {ew.encounter.reasonDisplayText || ew.encounter.reasonCode || 'Encounter'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Right Side: All Data Tab and New Consultation Button */}
          <div className="flex items-center gap-3">
            <TabBtn k="allData">
              All Data
            </TabBtn>
            <Button
              variant="default"
              size="default"
              onClick={() => {
                // Save current selection to restore if modal is discarded
                previousEncounterRef.current = selectedEncounterForConsultation;
                setShowConsultationPanel(true);
              }}
              className="font-semibold"
            >
              <span className="mr-2 text-base">🩺</span>
              New Consultation
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setShowPriorAuthModal(true)}
              className="font-semibold"
            >
              <span className="mr-2 text-base">📋</span>
              Prior Auth
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setShowReferralModal(true)}
              className="font-semibold"
            >
              <span className="mr-2 text-base">📝</span>
              Referral
            </Button>
          </div>
        </div>

        <div className="pt-4">
          {/* Content Sections */}
          {activeTab === "consultation" && patient && (
            <ConsolidatedConsultationTab
              patient={patient}
              selectedEncounter={selectedEncounterForConsultation}
              allEncounters={activeEncounterDetails}
              onDeleteEncounter={openDeleteConfirmation}
              autoStartTranscription={searchParams.get('autoStartTranscription') === 'true'}
            />
          )}
          
          {activeTab === "allData" && (
            <AllDataViewTab detailedPatientData={detailedPatientData} setDetailedPatientData={setDetailedPatientData} />
          )}
        </div>
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

      {/* Regular Consultation Panel - separated from demo */}
      <ConsultationPanel
        isOpen={showConsultationPanel && !demoWorkspace.shouldRunDemoUi}
        onClose={() => {
          // Close modal and restore previous selection if discarded
          setShowConsultationPanel(false);
          setSelectedEncounterForConsultation(previousEncounterRef.current);
          previousEncounterRef.current = null;
          
          // Remove autoStartTranscription parameter from URL to prevent re-triggering
          const url = new URL(window.location.href);
          url.searchParams.delete('autoStartTranscription');
          window.history.replaceState({}, '', url.toString());
        }}
        patient={patient}
        onConsultationCreated={handleConsultationCreated}
        isDemoMode={false}
        draggable={true}
        allowDragging={false}
        draggableConfig={regularConsultationConfig}
        selectedEncounter={selectedEncounterForConsultation}
        autoStartTranscription={searchParams.get('autoStartTranscription') === 'true'}
      />

      {/* Demo Consultation Panel - separate instance for demo */}
      {(demoWorkspace.shouldRunDemoUi || (isDemoRoute && demoPanelForceOpen)) && (
        <ConsultationPanel
          isOpen={demoWorkspace.isDemoPanelOpen || demoPanelForceOpen}
          onClose={() => {
            setDemoPanelForceOpen(false);
            demoState.exitDemoStayOnPage();
          }}
          patient={patient}
          onConsultationCreated={handleConsultationCreated}
          isDemoMode={true}  // Force demo mode when on demo route
          initialDemoTranscript={demoConsultation.initialDemoTranscript}
          demoDiagnosis={demoConsultation.demoDiagnosis}
          demoTreatment={demoConsultation.demoTreatment}
          demoDifferentialDiagnoses={demoConsultation.demoDifferentialDiagnoses}
          demoSoapNote={demoConsultation.demoSoapNote}
          isDemoGeneratingPlan={demoConsultation.isDemoGeneratingPlan}
          onDemoClinicalPlanClick={demoConsultation.onDemoClinicalPlanClick}
          draggable={true}
          allowDragging={false}
          draggableConfig={demoConsultationConfig}
        />
      )}

      {/* Prior Authorization Modal */}
      <FormCreationModal
        open={showPriorAuthModal}
        onOpenChange={setShowPriorAuthModal}
        formType="priorAuth"
        patientId={patient?.id}
        encounterId={selectedEncounterForConsultation?.id}
      />

      {/* Referral Modal */}
      <FormCreationModal
        open={showReferralModal}
        onOpenChange={setShowReferralModal}
        formType="referral"
        patientId={patient?.id}
        encounterId={selectedEncounterForConsultation?.id}
      />
    </ContentSurface>
  );
}