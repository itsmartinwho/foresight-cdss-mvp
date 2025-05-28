'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'; // Added useRef
import { useRouter } from 'next/navigation';
import { Patient } from '../lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';

// 1. Define interfaces for the encounter data
interface DemoTreatmentData {
  drug: string;
  status: string;
  rationale: string;
}

interface DemoDiagnosisData {
  patientId: string;
  encounterId: string;
  code: string;
  description: string;
}

interface DemoEncounterData {
  id: string;
  patientId: string;
  encounterIdentifier: string;
  actualStart: string;
  actualEnd: string;
  reasonCode: string;
  reasonDisplayText: string;
  transcript: string;
  soapNote: string; 
  treatments: DemoTreatmentData[];
  diagnosis: DemoDiagnosisData;
}

// Define DemoContextState interface
interface DemoContextState {
  hasDemoRun: boolean;
  isDemoModalOpen: boolean;
  isDemoActive: boolean;
  demoStage: string;
  dorothyRobinsonPatient: Patient | null;
  dorothyRobinsonEncounterData: DemoEncounterData | null;
  animatedTranscript: string;
  diagnosisForDemo: string;
  treatmentPlanForDemo: string;
  startDemo: () => Promise<void>;
  skipDemo: () => void;
  exitDemo: () => void;
  advanceDemoStage: (stage: string) => void;
  setDemoModalOpen: (isOpen: boolean) => void;
}

const DemoContext = createContext<DemoContextState | undefined>(undefined);

const dorothyRobinsonEncounterJSON: Omit<DemoEncounterData, 'diagnosis'> = {
  id: "097bf62e-9bd9-4972-a972-2714038ff55e",
  patientId: "0681FA35-A794-4684-97BD-00B88370DB41",
  encounterIdentifier: "2",
  actualStart: "2010-11-06T11:41:58Z",
  actualEnd: "2010-11-21T17:39:59Z",
  reasonCode: "Reactive arthritis (Reiter's)",
  reasonDisplayText: "Reiter's disease, vertebrae",
  transcript: "Clinician: Hi Dorothy, I understand you've been having back pain and some other symptoms. Can you tell me more about them?\nDorothy: Yes, for the past few weeks my lower back has been very stiff and painful, especially in the mornings. I've also had pain in my heels when I walk, and my eyes have been red and irritated.\nClinician: That's interesting. Did you notice any rash or any urinary symptoms, like pain when you urinate?\nDorothy: I haven't noticed a rash. I did have some burning when I urinate, on and off, but I wasn't sure if it was important.\nClinician: Any recent infections or illnesses before these symptoms started? Sometimes a stomach bug or other infection can trigger these kinds of symptoms.\nDorothy: Actually, yes – I had a really bad stomach flu about a month ago. It lasted a few days and I felt better, but then a couple weeks later this all started.\nClinician: Thank you. This combination of joint pain, heel pain, eye redness, and recent infection makes me suspect something called Reiter's syndrome, or reactive arthritis. It's an arthritis that can happen after an infection. Let's do a physical exam and some tests.\n[**Exam:** Tenderness over the lower back (sacroiliac joints) and heels (Achilles tendon areas). Slight swelling of the right knee. Redness in both eyes consistent with conjunctivitis.]\nClinician: On exam, you have some inflammation in your lower back and right knee, and your eyes are indeed red. I'm going to order some blood tests to check for inflammation and a genetic marker called HLA-B27, which is often positive in reactive arthritis. In the meantime, we'll start treatment to help with your pain.\nDorothy: Okay, thank you, doctor.\n",
  soapNote: "S: 32-year-old female with 3-week history of inflammatory low back pain (worse in the morning, improving with activity), plus bilateral heel pain and episodes of eye redness. Also had dysuria intermittently. Notable gastrointestinal illness ~1 month ago.\nO: Exam reveals tenderness at sacroiliac joints and Achilles tendon insertions, restricted lumbar flexion (positive Schober's test), and mild effusion of the right knee. Bilateral conjunctivitis present. Labs: ESR 40 mm/hr (elevated), HLA-B27 positive.\nA: Reactive Arthritis (Reiter's syndrome) triggered by recent infection (likely gastrointestinal). Differential diagnoses considered: ankylosing spondylitis (less likely given acute onset and GI trigger), rheumatoid arthritis (unlikely due to involvement of spine and enthesitis).\nP: Start NSAID therapy (Indomethacin 50 mg TID) for pain and inflammation. Monitor symptoms. If no improvement in 1-2 months or disease becomes chronic, initiate Sulfasalazine. Advise rest and stretching exercises. Ophthalmology consult for eye inflammation. Follow-up in 2 weeks.",
  treatments: [
    { drug: "Indomethacin 50 mg TID", status: "Prescribed", rationale: "NSAID for inflammation and pain relief in reactive arthritis." },
    { drug: "Sulfasalazine (start if no improvement in 1-2 months)", status: "Planned", rationale: "DMARD to help manage chronic reactive arthritis if initial NSAID therapy is insufficient." }
  ]
};
const dorothyRobinsonDiagnosisJSON: DemoDiagnosisData = {
  patientId: "0681FA35-A794-4684-97BD-00B88370DB41",
  encounterId: "097bf62e-9bd9-4972-a972-2714038ff55e",
  code: "M02.9",
  description: "Reactive arthritis (Reiter's syndrome)"
};
const combinedDorothyRobinsonEncounterData: DemoEncounterData = {
  ...dorothyRobinsonEncounterJSON,
  diagnosis: dorothyRobinsonDiagnosisJSON,
};

interface DemoProviderProps {
  children: ReactNode;
}

const TRANSCRIPT_ANIMATION_INTERVAL = 1200; 
const CLINICAL_PLAN_SIMULATION_DELAY = 1800; 

export const DemoProvider = ({ children }: DemoProviderProps) => {
  const router = useRouter();

  const [hasDemoRun, setHasDemoRunState] = useState<boolean>(() => typeof window !== 'undefined' ? localStorage.getItem('hasDemoRun') === 'true' : false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(() => typeof window !== 'undefined' ? !(localStorage.getItem('hasDemoRun') === 'true') : true);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [demoStage, setDemoStage] = useState<string>(() => typeof window !== 'undefined' ? (localStorage.getItem('hasDemoRun') === 'true' ? 'finished' : 'introModal') : 'introModal');
  
  const demoStageRef = useRef(demoStage); // Ref for current demoStage
  useEffect(() => {
    demoStageRef.current = demoStage;
  }, [demoStage]);

  const [dorothyRobinsonPatient, setDorothyRobinsonPatient] = useState<Patient | null>(null);
  const [dorothyRobinsonEncounterData] = useState<DemoEncounterData | null>(combinedDorothyRobinsonEncounterData);

  const [animatedTranscript, setAnimatedTranscript] = useState<string>('');
  const [currentTranscriptLineIndex, setCurrentTranscriptLineIndex] = useState<number>(0);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [transcriptIntervalId, setTranscriptIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [clinicalPlanTimeoutId, setClinicalPlanTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (dorothyRobinsonEncounterData?.transcript && typeof dorothyRobinsonEncounterData.transcript === 'string' && dorothyRobinsonEncounterData.transcript.trim() !== '') {
      setTranscriptLines(dorothyRobinsonEncounterData.transcript.split('\n').filter(line => line.trim() !== ''));
    } else {
      console.warn("Demo transcript is missing or empty. Initializing to empty array.");
      setTranscriptLines([]);
    }
  }, [dorothyRobinsonEncounterData?.transcript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasDemoRun', String(hasDemoRun));
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'hasDemoRun') {
          const newValue = event.newValue === 'true';
          if (hasDemoRun !== newValue) {
            setHasDemoRunState(newValue);
            if (newValue) {
              setDemoStage('finished');
              setIsDemoModalOpen(false);
              setIsDemoActive(false);
            } else {
              setDemoStage('introModal');
              setIsDemoModalOpen(true);
            }
          }
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [hasDemoRun]);

  const advanceDemoStage = useCallback((stage: string) => {
    console.log(`Advancing demo stage to: ${stage}`);
    setDemoStage(stage);
  }, []);

  useEffect(() => {
    if (isDemoActive && demoStage === 'animatingTranscript' && transcriptLines.length > 0) {
      setAnimatedTranscript(transcriptLines[0] || ''); 
      setCurrentTranscriptLineIndex(1);
      const intervalId = setInterval(() => {
        setCurrentTranscriptLineIndex(prevIndex => {
          if (prevIndex < transcriptLines.length) {
            setAnimatedTranscript(prevTranscript => prevTranscript + '\n' + transcriptLines[prevIndex]);
            return prevIndex + 1;
          } else {
            clearInterval(intervalId);
            setTranscriptIntervalId(null);
            advanceDemoStage('simulatingPlanGeneration');
            return prevIndex;
          }
        });
      }, TRANSCRIPT_ANIMATION_INTERVAL);
      setTranscriptIntervalId(intervalId);
    } else if (transcriptIntervalId) { 
      clearInterval(transcriptIntervalId);
      setTranscriptIntervalId(null);
    }
    return () => { 
      if (transcriptIntervalId) clearInterval(transcriptIntervalId);
    };
  }, [isDemoActive, demoStage, transcriptLines, advanceDemoStage, transcriptIntervalId]);

  useEffect(() => {
    if (isDemoActive && demoStage === 'simulatingPlanGeneration') {
      const timeoutId = setTimeout(() => {
        advanceDemoStage('showingPlan');
        setClinicalPlanTimeoutId(null);
      }, CLINICAL_PLAN_SIMULATION_DELAY);
      setClinicalPlanTimeoutId(timeoutId);
    } else if (clinicalPlanTimeoutId) { 
      clearTimeout(clinicalPlanTimeoutId);
      setClinicalPlanTimeoutId(null);
    }
    return () => { 
      if (clinicalPlanTimeoutId) clearTimeout(clinicalPlanTimeoutId);
    };
  }, [isDemoActive, demoStage, advanceDemoStage, clinicalPlanTimeoutId]);

  const resetDemoAnimationStates = useCallback(() => {
    if (transcriptIntervalId) clearInterval(transcriptIntervalId);
    setTranscriptIntervalId(null);
    if (clinicalPlanTimeoutId) clearTimeout(clinicalPlanTimeoutId);
    setClinicalPlanTimeoutId(null);
    setAnimatedTranscript('');
    setCurrentTranscriptLineIndex(0);
  }, [transcriptIntervalId, clinicalPlanTimeoutId]);

  const startDemo = async () => {
    resetDemoAnimationStates(); 
    setIsDemoModalOpen(false);
    setIsDemoActive(true);
    setDemoStage('selectingPatient');
    try {
      const patient = await supabaseDataService.getPatient("0681FA35-A794-4684-97BD-00B88370DB41");
      if (patient) {
        setDorothyRobinsonPatient(patient);
        setHasDemoRunState(true); 
        if (dorothyRobinsonEncounterData) {
          router.push(`/patients/${patient.id}?demo=true&encounterId=${dorothyRobinsonEncounterData.id}`);
        } else {
          router.push(`/patients/${patient.id}?demo=true`);
        }
        advanceDemoStage('navigatingToWorkspace');
      } else {
        console.error("Demo patient Dorothy Robinson not found.");
        exitDemo();
      }
    } catch (error) {
      console.error("Error starting demo:", error);
      exitDemo();
    }
  };
  
  const skipDemo = () => {
    resetDemoAnimationStates();
    setIsDemoModalOpen(false);
    setIsDemoActive(false);
    setHasDemoRunState(true);
    setDemoStage('finished');
  };

  const exitDemo = useCallback(() => {
    resetDemoAnimationStates();
    setIsDemoActive(false);
    setHasDemoRunState(true);
    setDemoStage('finished');
    setIsDemoModalOpen(false);
    router.push('/dashboard');
  }, [resetDemoAnimationStates, router]);

  const setDemoModalOpen = (open: boolean) => {
    setIsDemoModalOpen(open);
    if (!open && !isDemoActive && !hasDemoRun && demoStageRef.current === 'introModal') {
      advanceDemoStage('fabVisible');
    }
  };

  const diagnosisForDemo = dorothyRobinsonEncounterData?.diagnosis?.description || "Diagnosis information not available for demo.";
  const treatmentPlanForDemo = (Array.isArray(dorothyRobinsonEncounterData?.treatments) && dorothyRobinsonEncounterData.treatments.length > 0)
    ? dorothyRobinsonEncounterData.treatments
        .map(t => `${t.drug} (${t.status}): ${t.rationale}`)
        .join('\n')
    : "Treatment information not available for demo.";

  return (
    <DemoContext.Provider
      value={{
        hasDemoRun,
        isDemoModalOpen,
        isDemoActive,
        demoStage,
        dorothyRobinsonPatient,
        dorothyRobinsonEncounterData,
        animatedTranscript,
        diagnosisForDemo,
        treatmentPlanForDemo,
        startDemo,
        skipDemo,
        exitDemo,
        advanceDemoStage,
        setDemoModalOpen,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextState => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
