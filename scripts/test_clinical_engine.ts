#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local from the project root
const envPath = path.resolve(__dirname, '../.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // It's possible the file doesn't exist or isn't readable, 
  // which is fine if env vars are set globally.
  console.warn(`Warning: Could not load .env.local file from ${envPath}. Error: ${result.error.message}`);
  console.warn('Proceeding with script execution. If Supabase connection fails, ensure environment variables are set globally or .env.local is correctly placed and readable.');
} else {
  console.log(`.env.local loaded successfully from ${envPath}.`);
  if (result.parsed) {
    console.log('Variables parsed from .env.local:', Object.keys(result.parsed).join(', '));
  } else {
    console.log('.env.local was loaded, but no variables were parsed. This might mean the file is empty.');
  }
}

/**
 * Test script for Clinical Engine V2
 * Run this after executing phase2_test_data.sql to test the diagnostic pipeline
 */

import { ClinicalEngineServiceV2 } from '@/lib/clinicalEngineServiceV2';

async function testClinicalEngine() {
  console.log('=== Clinical Engine V2 Test ===\n');
  
  const engine = new ClinicalEngineServiceV2();
  
  // Test cases
  const testCases = [
    {
      name: 'Diabetic Patient with Poor Control',
      patientId: 'TEST_DM_001',
      admissionId: 'TEST_DM_001_TEST_DM_001-V1',
      expectedDiagnosis: 'fatigue'
    },
    {
      name: 'Patient with Joint Pain (Possible RA)',
      patientId: 'TEST_RA_001',
      admissionId: 'TEST_RA_001_TEST_RA_001-V1',
      expectedDiagnosis: 'arthritis'
    },
    {
      name: 'Patient with URI Symptoms',
      patientId: 'TEST_URI_001',
      admissionId: 'TEST_URI_001_TEST_URI_001-V1',
      expectedDiagnosis: 'respiratory infection'
    },
    {
      name: 'Patient with Chest Pain',
      patientId: 'TEST_CP_001',
      admissionId: 'TEST_CP_001_TEST_CP_001-V1',
      expectedDiagnosis: 'chest pain'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    console.log('=' .repeat(50));
    
    try {
      const result = await engine.runDiagnosticPipeline(
        testCase.patientId,
        testCase.admissionId
      );
      
      console.log('\n📋 Diagnostic Result:');
      console.log(`   Diagnosis: ${result.diagnosticResult.diagnosisName} (${result.diagnosticResult.diagnosisCode})`);
      console.log(`   Confidence: ${(result.diagnosticResult.confidence * 100).toFixed(0)}%`);
      
      if (result.diagnosticResult.differentialDiagnoses.length > 0) {
        console.log('\n🔍 Differential Diagnoses:');
        result.diagnosticResult.differentialDiagnoses.forEach(dd => {
          console.log(`   - ${dd.name} (${dd.likelihood})`);
        });
      }
      
      if (result.diagnosticResult.recommendedTests.length > 0) {
        console.log('\n🧪 Recommended Tests:');
        result.diagnosticResult.recommendedTests.forEach(test => {
          console.log(`   - ${test}`);
        });
      }
      
      if (result.soapNote) {
        console.log('\n📝 SOAP Note:');
        console.log(`   S: ${result.soapNote.subjective.slice(0, 100)}...`);
        console.log(`   O: ${result.soapNote.objective}`);
        console.log(`   A: ${result.soapNote.assessment}`);
        console.log(`   P: ${result.soapNote.plan.slice(0, 100)}...`);
      }
      
      if (result.referralDocument) {
        console.log('\n🏥 Referral Generated:');
        console.log(`   To: ${result.referralDocument.referralTo}`);
        console.log(`   Reason: ${result.referralDocument.reasonForReferral}`);
      }
      
      if (result.priorAuthDocument) {
        console.log('\n📄 Prior Authorization Generated:');
        console.log(`   For: ${result.priorAuthDocument.medicationOrService}`);
        console.log(`   Reason: ${result.priorAuthDocument.reasonForRequest}`);
      }
      
      console.log('\n✅ Test completed successfully');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
    }
  }
  
  console.log('\n\n=== All Tests Completed ===');
}

// Run the test
testClinicalEngine().catch(console.error); 