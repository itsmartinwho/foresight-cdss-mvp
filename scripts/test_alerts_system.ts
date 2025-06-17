#!/usr/bin/env node

// Test script for alerts system
// This script tests both real-time and post-consultation alerts to verify the system is working

import { alertEngine } from '../src/lib/alerts/alert-engine';
import { UnifiedAlertsService } from '../src/lib/unifiedAlertsService';

async function testAlertsSystem() {
  console.log('🔬 Testing Alerts System...\n');
  
  // Test data
  const patientId = 'test-patient-123';
  const encounterId = 'test-encounter-456';
  const testTranscript = `
    I have been feeling quite fatigued for the past two years I am tired all the time no matter how much I sleep. 
    No matter what I do, And, also, I have been feeling lots of inflammation everywhere in my body. 
    Worse than that, I have been feeling pain everywhere for the past couple of years, especially in my joints 
    like my knees and my elbows. It gets better when I take omega-three. A friend also gave me methotrexate 
    and I take paracetamol for the pain. I also have ADHD and IBS.
  `;

  // Test 1: Real-time alerts
  console.log('📱 Testing Real-time Alerts...');
  try {
    const realTimeAlerts = await alertEngine.processRealTimeAlerts(
      patientId,
      encounterId,
      testTranscript.substring(0, 100), // First segment
      testTranscript
    );
    
    console.log(`✅ Real-time alerts generated: ${realTimeAlerts.length}`);
    realTimeAlerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. ${alert.title} (${alert.severity})`);
      console.log(`      ${alert.message}`);
    });
  } catch (error) {
    console.error('❌ Real-time alerts failed:', error);
  }

  console.log('\n');

  // Test 2: Post-consultation alerts
  console.log('📋 Testing Post-consultation Alerts...');
  try {
    const postConsultationAlerts = await alertEngine.processPostConsultationAlerts(
      patientId,
      encounterId
    );
    
    console.log(`✅ Post-consultation alerts generated: ${postConsultationAlerts.length}`);
    postConsultationAlerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. ${alert.title} (${alert.severity})`);
      console.log(`      ${alert.message}`);
    });
  } catch (error) {
    console.error('❌ Post-consultation alerts failed:', error);
  }

  console.log('\n');

  // Test 3: Environment variables check
  console.log('🔧 Environment Check...');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`   NEXT_PUBLIC_ENABLE_MOCK_ALERTS: ${process.env.NEXT_PUBLIC_ENABLE_MOCK_ALERTS || 'Not set'}`);

  console.log('\n✨ Test completed!');
  console.log('\n💡 If no alerts were generated:');
  console.log('   1. Add NEXT_PUBLIC_ENABLE_MOCK_ALERTS=true to your .env.local file');
  console.log('   2. Restart your development server');
  console.log('   3. Try creating a consultation with the test transcript above');
}

// Run the test
testAlertsSystem().catch(console.error); 