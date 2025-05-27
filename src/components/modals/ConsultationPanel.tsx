'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from '@phosphor-icons/react';
import { Mic } from 'lucide-react';
import { format } from 'date-fns';
import type { Patient, Encounter } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ConsultationPanelProps {
  /** Controls open state from parent */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Patient to create consultation for */
  patient: Patient;
  /** Callback when consultation is successfully created */
  onConsultationCreated?: (encounter: Encounter) => void;
}

// Styled DatePicker component to match the design
const StyledDatePicker = React.forwardRef<any, any>(({ className, ...props }, ref) => (
  <DatePicker
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
StyledDatePicker.displayName = "StyledDatePicker";

export default function ConsultationPanel({
  isOpen,
  onClose,
  patient,
  onConsultationCreated
}: ConsultationPanelProps) {
  const { toast } = useToast();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Form state
  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState(30);
  
  // Consultation state
  const [started, setStarted] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [treatmentText, setTreatmentText] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [planGenerated, setPlanGenerated] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus and cursor positioning for transcript textarea
  useEffect(() => {
    if (started && transcriptTextareaRef.current) {
      transcriptTextareaRef.current.focus();
      const textLength = transcriptText.length;
      transcriptTextareaRef.current.setSelectionRange(textLength, textLength);
      transcriptTextareaRef.current.scrollTop = transcriptTextareaRef.current.scrollHeight;
      console.log('Transcript textarea focused and cursor positioned.', { textLength: transcriptText.length });
    }
  }, [started, transcriptText]);

  // Log transcript length and Clinical Plan button enablement status
  useEffect(() => {
    console.log(`Transcript length: ${transcriptText.length}, Clinical Plan button enabled: ${transcriptText.length >= 10}`);
  }, [transcriptText]);

  // Log active tab changes
  useEffect(() => {
    console.log('Active tab is now:', activeTab);
  }, [activeTab]);

  // Effect to make tab bar visible with a delay for transition
  useEffect(() => {
    if (planGenerated) {
      const timer = setTimeout(() => {
        setTabBarVisible(true);
      }, 50); // Small delay to ensure element is in DOM for transition
      return () => clearTimeout(timer);
    } else {
      setTabBarVisible(false); // Reset if plan is no longer generated (e.g. panel reset)
    }
  }, [planGenerated]);

  const handleClinicalPlan = useCallback(async () => {
    setIsGeneratingPlan(true);
    console.log('handleClinicalPlan started, isGeneratingPlan: true');

    try {
      console.log('Simulating AI/engine call...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Shortened for testing

      // Simulate an error condition
      if (Math.random() < 0.5) { // Adjust probability as needed for testing
        throw new Error("Simulated AI engine failure!");
      }

      const mockDiagnosis = "Based on the transcript, the preliminary diagnosis is Acute Bronchitis. Common cold symptoms present, with persistent cough.";
      const mockTreatment = "Recommended treatment: Rest, increase fluid intake. Consider over-the-counter cough suppressant. If symptoms worsen or fever develops, schedule a follow-up.";
      
      setDiagnosisText(mockDiagnosis);
      setTreatmentText(mockTreatment);
      setPlanGenerated(true);
      setActiveTab('diagnosis'); // Switch to diagnosis tab on success
      console.log('AI/engine call simulation complete.', { diagnosis: mockDiagnosis, treatment: mockTreatment });

    } catch (error) {
      console.error("Error during clinical plan generation:", error);
      toast({
        title: "Error Generating Plan",
        description: "An unexpected error occurred. Please try again or complete the plan manually.",
        variant: "destructive",
      });
      // setPlanGenerated(false); // Not strictly needed if it's default false and only set true on success
      // setActiveTab('transcript'); // Optionally revert, but default behavior is fine
    } finally {
      setIsGeneratingPlan(false);
      console.log('handleClinicalPlan finished (finally), isGeneratingPlan: false');
    }
  }, [toast]);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCreating) return;
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: reason || undefined,
        scheduledStart: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        duration: duration || undefined,
      });
      
      setEncounter(newEncounter);
      
      if (onConsultationCreated) {
        onConsultationCreated(newEncounter);
      }
    } catch (error) {
      console.error('Failed to create encounter:', error);
      toast({
        title: "Error",
        description: `Failed to create consultation encounter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [patient?.id, isCreating, reason, scheduledDate, duration, onConsultationCreated, onClose, toast]);

  // Reset form when panel opens and create encounter
  useEffect(() => {
    if (isOpen) {
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
      // Automatically create encounter when panel opens
      createEncounter();
    }
  }, [isOpen, createEncounter]);

  const handleClose = useCallback(async () => {
    if (!encounter?.id) {
      console.log('No encounter to save, closing directly.');
      onClose();
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    console.log('Attempting to save consultation data...', { 
      encounterId: encounter.id, 
      transcript: transcriptText, 
      diagnosis: diagnosisText, 
      treatment: treatmentText 
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate save

      const saveSuccess = Math.random() > 0.3; // 70% chance of success
      if (!saveSuccess) {
        throw new Error("Simulated save failure");
      }

      // Placeholder for actual Supabase call:
      console.log('Placeholder: supabaseDataService.updateEncounterDetails(encounter.id, { transcript, diagnosis, treatment }) would be called here.');
      // await supabaseDataService.updateEncounterDetails(encounter.id, {
      //   transcript: transcriptText,
      //   diagnosis_text: diagnosisText, 
      //   treatment_text: treatmentText,
      // });
      
      console.log('Data saved successfully (simulated).');
      toast({ title: "Consultation Saved", description: "Your changes have been saved." });
      
      // According to notes, don't reset state here, rely on parent unmount/re-init
      onClose(); // Close panel on success

    } catch (error) {
      console.error('Failed to save data:', error);
      toast({
        title: "Save Failed",
        description: "Could not save data. Please try again.",
        variant: "destructive",
      });
      // Do NOT call onClose() here. User can retry or edit.
    } finally {
      setIsSaving(false);
      console.log('Save attempt finished, isSaving set to false.');
    }
  }, [encounter, isSaving, transcriptText, diagnosisText, treatmentText, onClose, toast]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const startVoiceInput = useCallback(() => {
    // In a real app, this would initiate voice recognition.
    console.log("Voice input started - full functionality to be implemented");
    setStarted(true);
    setTranscriptText("Voice input received: (User's speech would go here)");
  }, []);

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const handleStart = () => {
    if (!encounter) {
      createEncounter();
    } else {
      // TODO: Start recording/transcription functionality
      console.log('Starting consultation with encounter:', encounter.id);
    }
  };

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl relative w-[90%] max-w-lg p-6 max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20"
          onClick={handleClose}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Main content area */}
        <div className="pt-8">
          {isCreating ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Creating consultation...</p>
              </div>
            </div>
          ) : encounter ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">New Consultation</h2>
                <p className="text-sm text-muted-foreground">
                  Consultation ID: {encounter.id}
                </p>
              </div>
              
              {/* TODO: This will be replaced with transcript/editor and tabs in future phases */}
              <div className="border border-border rounded-lg p-4 min-h-[300px] bg-background/50">
                <p className="text-sm text-muted-foreground">
                  Consultation content will appear here...
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
                <Button variant="default">
                  Start Recording
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Failed to create consultation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
} 