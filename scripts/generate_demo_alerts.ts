#!/usr/bin/env npx tsx

/**
 * Demo Alert Generator
 * Generates sample alerts for Dorothy Robinson demo patient for demonstration purposes only.
 * This script does not affect production logic or other patients.
 */

import { UnifiedAlertsService } from '../src/lib/unifiedAlertsService';
import { AlertType, AlertSeverity, AlertCategory } from '../src/types/alerts';
import { DEMO_PATIENT_ID, DEMO_ENCOUNTER_ID } from '../src/services/demo/DemoDataService';

async function generateDemoAlerts() {
  console.log('🔔 Generating demo alerts for Dorothy Robinson...');
  
  const alertsService = new UnifiedAlertsService();
  
  try {
    // Alert 1: Drug interaction warning (relevant to opioid history)
    const drugInteractionAlert = await alertsService.createAlert({
      patientId: DEMO_PATIENT_ID,
      encounterId: DEMO_ENCOUNTER_ID,
      alertType: AlertType.DRUG_INTERACTION,
      severity: AlertSeverity.WARNING,
      category: AlertCategory.REAL_TIME,
      title: 'Opioid-Induced Constipation Risk',
      message: 'Patient has recent history of hydrocodone use which can cause severe constipation. Current presentation is consistent with opioid-induced bowel dysfunction.',
      suggestion: 'Consider prophylactic bowel regimen for future opioid prescriptions. Educate patient about constipation prevention with opioids.',
      confidenceScore: 0.92,
      sourceReasoning: 'Patient recently used hydrocodone post-dental surgery, presenting with 6-day constipation. Clear temporal relationship between opioid use and current symptoms.',
      processingModel: 'demo-alert-generator',
      isRealTime: true,
      relatedData: {
        medication: 'Hydrocodone',
        condition: 'Constipation',
        timeline: '2 weeks post-dental surgery'
      }
    });

    // Alert 2: Clinical guideline recommendation
    const guidelineAlert = await alertsService.createAlert({
      patientId: DEMO_PATIENT_ID,
      encounterId: DEMO_ENCOUNTER_ID,
      alertType: AlertType.CLINICAL_GUIDELINE,
      severity: AlertSeverity.INFO,
      category: AlertCategory.REAL_TIME,
      title: 'Cancer History - Enhanced Monitoring Recommended',
      message: 'Patient has history of acute myelomonocytic leukemia in remission. Consider enhanced monitoring for infection risk and secondary malignancies.',
      suggestion: 'Review CBC for any abnormalities. Ensure oncology follow-up is current. Monitor for signs of infection given immunocompromised history.',
      confidenceScore: 0.88,
      sourceReasoning: 'Patient has documented history of AML in remission. Current hospitalization provides opportunity for comprehensive health assessment.',
      processingModel: 'demo-alert-generator',
      isRealTime: true,
      relatedData: {
        condition: 'History of AML',
        status: 'In remission',
        riskFactors: ['Secondary malignancy risk', 'Infection susceptibility']
      }
    });

    console.log('✅ Demo alerts generated successfully:');
    console.log(`   - Drug Interaction Alert: ${drugInteractionAlert?.id}`);
    console.log(`   - Clinical Guideline Alert: ${guidelineAlert?.id}`);
    console.log(`\n📊 These alerts are now available in the demo consultation for Dorothy Robinson.`);
    
  } catch (error) {
    console.error('❌ Failed to generate demo alerts:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateDemoAlerts().catch(console.error);
}

export { generateDemoAlerts }; 