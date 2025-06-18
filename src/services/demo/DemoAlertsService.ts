/**
 * Demo Alerts Service
 * 
 * Provides pre-defined alerts that trigger at specific points during the demo transcript
 * to demonstrate the real-time alert system without calling expensive AI models
 */

import { AlertType, AlertSeverity, AlertCategory } from '@/types/alerts';
import { DEMO_PATIENT_ID, DEMO_ENCOUNTER_ID } from './DemoDataService';

export interface DemoAlert {
  id: string;
  patientId: string;
  encounterId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  triggerPhrase: string; // Phrase in transcript that triggers this alert
  confidence: number;
  likelihood: number;
  triggeringFactors: string[];
  suggestedActions: string[];
  createdAt: string;
}

// Pre-defined alerts that trigger during the demo
const DEMO_ALERTS: DemoAlert[] = [
  {
    id: "demo_drug_interaction_alert",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.DRUG_INTERACTION,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.REAL_TIME,
    title: "High-Risk Drug Interaction Detected",
    message: "CRITICAL: Glyburide + Warfarin interaction significantly increases bleeding risk. Patient reports recent nosebleed and easy bruising. Consider discontinuing glyburide and monitoring INR closely.",
    triggerPhrase: "glyburide about three weeks ago. Oh, and I'm also taking warfarin",
    confidence: 95,
    likelihood: 5,
    triggeringFactors: [
      "Concurrent glyburide and warfarin therapy",
      "Recent glyburide initiation (3 weeks)",
      "Patient reports bleeding symptoms"
    ],
    suggestedActions: [
      "Discontinue glyburide immediately",
      "Check PT/INR stat",
      "Monitor for bleeding signs",
      "Consider alternative diabetes medication"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "demo_missing_labs_alert",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.MISSING_LAB_RESULT,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.REAL_TIME,
    title: "Critical Lab Monitoring Overdue",
    message: "Patient on warfarin with no INR check in 2 months and no diabetes monitoring labs in 4 months. Given bleeding symptoms and poor glucose control, immediate lab work is essential.",
    triggerPhrase: "I haven't had any blood work in probably four months",
    confidence: 90,
    likelihood: 4,
    triggeringFactors: [
      "INR monitoring overdue (2 months)",
      "No HbA1c in 4 months",
      "Active bleeding symptoms",
      "Poor diabetes control symptoms"
    ],
    suggestedActions: [
      "Order STAT PT/INR",
      "Order comprehensive metabolic panel",
      "Order HbA1c immediately",
      "Order CBC with differential"
    ],
    createdAt: new Date().toISOString()
  },
  // COMPLEX CASE ALERTS - Autoimmune Conditions
  {
    id: "demo_complex_autoimmune_lupus",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.POST_CONSULTATION,
    title: "Possible Systemic Lupus Erythematosus",
    message: "Patient presents with classic lupus triad: photosensitive malar rash, polyarthritis, and constitutional symptoms. Combined with positive ANA and low complement levels, this strongly suggests SLE requiring urgent rheumatology evaluation.",
    triggerPhrase: "rash on my face that gets worse in the sun",
    confidence: 88,
    likelihood: 5,
    triggeringFactors: [
      "Photosensitive facial rash",
      "Polyarthritis (hands, wrists, knees)",
      "Constitutional symptoms (fatigue, fever)",
      "Positive ANA (1:320, homogeneous pattern)",
      "Low complement levels (C3, C4)"
    ],
    suggestedActions: [
      "URGENT rheumatology referral (within 1-2 weeks)",
      "Order anti-dsDNA, anti-Sm antibodies",
      "Complete urinalysis with microscopy",
      "Baseline CBC, CMP, ESR, CRP",
      "Consider antimalarial therapy initiation"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "demo_complex_autoimmune_ra",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.POST_CONSULTATION,
    title: "Probable Rheumatoid Arthritis",
    message: "Prolonged morning stiffness (>2 hours), symmetric polyarthritis, and positive rheumatoid factor suggest early rheumatoid arthritis. Early intervention with DMARDs is crucial to prevent joint damage.",
    triggerPhrase: "morning stiffness in my hands lasts about two hours",
    confidence: 85,
    likelihood: 4,
    triggeringFactors: [
      "Morning stiffness >1 hour",
      "Symmetric polyarthritis",
      "Small joint involvement (MCPs, PIPs)",
      "Positive rheumatoid factor",
      "Elevated ESR/CRP"
    ],
    suggestedActions: [
      "Rheumatology referral within 3-6 weeks",
      "Order anti-CCP antibodies",
      "Joint X-rays (hands, feet) for baseline",
      "Consider methotrexate initiation",
      "Patient education on RA"
    ],
    createdAt: new Date().toISOString()
  },
  // COMPLEX CASE ALERTS - Oncology Concerns
  {
    id: "demo_complex_oncology_lung",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.POST_CONSULTATION,
    title: "Lung Cancer Red Flags",
    message: "Concerning constellation: 30-pack-year smoking history, persistent cough with hemoptysis, 15-lb weight loss over 3 months, and new-onset dyspnea. Requires urgent imaging and oncology evaluation.",
    triggerPhrase: "coughing up blood occasionally",
    confidence: 92,
    likelihood: 5,
    triggeringFactors: [
      "Heavy smoking history (30 pack-years)",
      "Hemoptysis",
      "Unintentional weight loss (15 lbs/3 months)",
      "Progressive dyspnea",
      "Persistent cough >8 weeks"
    ],
    suggestedActions: [
      "URGENT chest CT with contrast",
      "CBC, CMP, LDH",
      "Oncology referral (within 1 week)",
      "Pulmonology consultation",
      "Consider bronchoscopy if mass identified"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "demo_complex_oncology_hematologic",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.POST_CONSULTATION,
    title: "Hematologic Malignancy Concern",
    message: "B-symptoms triad (fever, night sweats, weight loss) with lymphadenopathy and unexplained fatigue in young adult suggests possible lymphoma. Requires prompt hematologic evaluation.",
    triggerPhrase: "soaking night sweats and swollen lymph nodes",
    confidence: 80,
    likelihood: 4,
    triggeringFactors: [
      "B-symptoms (fever, night sweats, weight loss)",
      "Generalized lymphadenopathy",
      "Severe fatigue",
      "Age 25-40 (lymphoma risk group)",
      "No obvious infectious cause"
    ],
    suggestedActions: [
      "CBC with differential immediately",
      "Comprehensive metabolic panel",
      "LDH, uric acid levels",
      "CT chest/abdomen/pelvis",
      "Hematology/oncology referral"
    ],
    createdAt: new Date().toISOString()
  },
  // COMPLEX CASE ALERTS - Rare/Complex Conditions
  {
    id: "demo_complex_rare_sarcoidosis",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.POST_CONSULTATION,
    title: "Possible Sarcoidosis",
    message: "Multi-system involvement with hilar lymphadenopathy, skin lesions, and elevated ACE levels suggests sarcoidosis. This inflammatory condition requires specialized evaluation and monitoring.",
    triggerPhrase: "shortness of breath and these skin bumps",
    confidence: 75,
    likelihood: 3,
    triggeringFactors: [
      "Bilateral hilar lymphadenopathy",
      "Skin lesions (erythema nodosum pattern)",
      "Progressive dyspnea",
      "Elevated ACE level",
      "Multi-system involvement"
    ],
    suggestedActions: [
      "Pulmonology referral",
      "High-resolution chest CT",
      "Skin biopsy of lesions",
      "Ophthalmology evaluation",
      "Consider bronchoscopy with BAL"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "demo_complex_endocrine_thyroid",
    patientId: DEMO_PATIENT_ID,
    encounterId: DEMO_ENCOUNTER_ID,
    alertType: AlertType.COMPLEX_CONDITION,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.POST_CONSULTATION,
    title: "Hyperthyroidism with Cardiac Manifestations",
    message: "Classic hyperthyroid symptoms with atrial fibrillation and heart failure features require urgent cardiology and endocrinology co-management. Risk of thyroid storm with current presentation.",
    triggerPhrase: "heart racing and can't sleep",
    confidence: 90,
    likelihood: 4,
    triggeringFactors: [
      "Tachycardia >120 bpm at rest",
      "New-onset atrial fibrillation",
      "Weight loss despite increased appetite",
      "Heat intolerance and diaphoresis",
      "Thyromegaly on exam"
    ],
    suggestedActions: [
      "STAT TSH, free T4, free T3",
      "ECG and echo immediately",
      "Cardiology consultation",
      "Endocrinology referral",
      "Consider beta-blocker therapy"
    ],
    createdAt: new Date().toISOString()
  }
];

export class DemoAlertsService {
  private triggeredAlerts: Set<string> = new Set();

  /**
   * Check if any alerts should be triggered based on the current transcript
   */
  checkForAlerts(transcript: string): DemoAlert[] {
    const newAlerts: DemoAlert[] = [];
    
    for (const alert of DEMO_ALERTS) {
      // Skip if this alert was already triggered
      if (this.triggeredAlerts.has(alert.id)) {
        continue;
      }
      
      // Check if the trigger phrase appears in the transcript
      if (transcript.toLowerCase().includes(alert.triggerPhrase.toLowerCase())) {
        this.triggeredAlerts.add(alert.id);
        newAlerts.push({
          ...alert,
          createdAt: new Date().toISOString() // Update timestamp to when triggered
        });
      }
    }
    
    return newAlerts;
  }

  /**
   * Get all currently triggered alerts
   */
  getTriggeredAlerts(): DemoAlert[] {
    return DEMO_ALERTS.filter(alert => this.triggeredAlerts.has(alert.id));
  }

  /**
   * Reset all triggered alerts (for demo restart)
   */
  resetAlerts(): void {
    this.triggeredAlerts.clear();
  }

  /**
   * Convert demo alert to the format expected by the alerts system
   */
  static formatDemoAlert(demoAlert: DemoAlert) {
    return {
      id: demoAlert.id,
      patientId: demoAlert.patientId,
      encounterId: demoAlert.encounterId,
      alertType: demoAlert.alertType,
      severity: demoAlert.severity,
      category: demoAlert.category,
      title: demoAlert.title,
      message: demoAlert.message,
      confidence: demoAlert.confidence,
      likelihood: demoAlert.likelihood,
      triggeringFactors: demoAlert.triggeringFactors,
      suggestedActions: demoAlert.suggestedActions,
      createdAt: demoAlert.createdAt,
      date: new Date(demoAlert.createdAt).toISOString().split('T')[0],
      type: demoAlert.alertType.toLowerCase(),
      conditionType: demoAlert.title
    };
  }
}

// Singleton instance for the demo
export const demoAlertsService = new DemoAlertsService(); 