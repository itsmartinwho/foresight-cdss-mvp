#!/usr/bin/env tsx

// Test script for exact consultation scenario described by user
import { UnifiedAlertsService } from '../src/lib/unifiedAlertsService';

async function testConsultationScenario() {
  console.log('🏥 Testing Real Consultation Scenario...\n');
  console.log('Simulating: Patient with rheumatoid arthritis symptoms + drug interaction\n');

  const alertsService = new UnifiedAlertsService();
  
  // Test patient and encounter IDs
  const patientId = 'test-patient-ra-001';
  const encounterId = 'test-encounter-001';
  
  // The exact transcript from user's consultation
  const transcript = `Speaker 0: I have been feeling quite fatigued for the past two years I am tired all the time no matter how much I sleep. No matter what I do, And, also, I have been feeling lots of inflammation everywhere in my body. Worse than that, I have been feeling pain everywhere for the past couple of years, especially in my joints like my knees and my elbows. It gets better when I take omega-three. A friend also gave me methotrexate and I take paracetamol for the pain. I also have ADHD and IBS.`;

  console.log('📋 Patient transcript:');
  console.log(transcript);
  console.log('\n');

  try {
    // Test 1: Start real-time session
    console.log('🔄 Starting real-time alerts session...');
    await alertsService.startRealTimeProcessing(patientId, encounterId);
    console.log('✅ Real-time session started');

    // Test 2: Simulate transcript updates (real-time processing)
    console.log('📝 Updating transcript for real-time processing...');
    await alertsService.updateTranscript(patientId, encounterId, transcript);
    console.log('✅ Transcript updated');

    // Wait a moment for processing
    console.log('⏳ Waiting for real-time processing...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds

    // Test 3: Check for real-time alerts
    console.log('🔍 Checking for real-time alerts...');
    const realTimeAlerts = await alertsService.getAlerts({
      patientId,
      encounterId,
      isRealTime: true
    });
    
    console.log(`📊 Found ${realTimeAlerts.alerts.length} real-time alerts:`);
    realTimeAlerts.alerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.severity} - ${alert.title}`);
      console.log(`     ${alert.message}`);
      console.log(`     Suggestion: ${alert.suggestion}`);
      console.log(`     Confidence: ${alert.confidenceScore}`);
      console.log('');
    });

    // Test 4: Stop real-time processing
    console.log('⏹️ Stopping real-time processing...');
    alertsService.stopRealTimeProcessing();

    // Test 5: Run post-consultation analysis
    console.log('📊 Running post-consultation analysis...');
    await alertsService.processPostConsultationAlerts(patientId, encounterId);

    // Test 6: Check for post-consultation alerts
    console.log('🔍 Checking for post-consultation alerts...');
    const postConsultationAlerts = await alertsService.getAlerts({
      patientId,
      encounterId,
      isPostConsultation: true
    });
    
    console.log(`📊 Found ${postConsultationAlerts.alerts.length} post-consultation alerts:`);
    postConsultationAlerts.alerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.severity} - ${alert.title}`);
      console.log(`     ${alert.message}`);
      console.log(`     Suggestion: ${alert.suggestion}`);
      console.log(`     Confidence: ${alert.confidenceScore}`);
      console.log('');
    });

    // Test 7: Get all alerts for this consultation
    console.log('📋 Summary of all alerts for this consultation:');
    const allAlerts = await alertsService.getAlerts({
      patientId,
      encounterId
    });
    
    console.log(`Total alerts: ${allAlerts.alerts.length}`);
    console.log(`Real-time alerts: ${allAlerts.alerts.filter(a => a.isRealTime).length}`);
    console.log(`Post-consultation alerts: ${allAlerts.alerts.filter(a => a.isPostConsultation).length}`);

    if (allAlerts.alerts.length === 0) {
      console.log('\n❌ NO ALERTS GENERATED - This indicates an issue with the alerts system');
      console.log('Expected alerts:');
      console.log('1. Drug interaction alert (methotrexate + paracetamol/acetaminophen)');
      console.log('2. Complex condition alert (possible rheumatoid arthritis)');
      console.log('3. Monitoring alert (methotrexate requires lab monitoring)');
    } else {
      console.log('\n✅ Alerts system is working! Generated alerts for:');
      allAlerts.alerts.forEach(alert => {
        console.log(`- ${alert.alertType}: ${alert.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConsultationScenario().catch(console.error); 