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