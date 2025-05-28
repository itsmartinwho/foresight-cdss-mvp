import { ClinicalEngineServiceV3 } from '../src/lib/clinicalEngineServiceV3';

async function testClinicalEngineV3() {
  console.log('=== Clinical Engine V3 Test ===\n');
  
  const engine = new ClinicalEngineServiceV3();
  
  try {
    console.log('Testing Clinical Engine V3 with sample patient data...');
    
    // Test with a simple scenario
    const result = await engine.runDiagnosticPipeline(
      'TEST_PATIENT_001', 
      'TEST_PATIENT_001_TEST_ENC_001',
      'Patient presents with fever, cough, and fatigue for 3 days. No recent travel. No known sick contacts.'
    );
    
    console.log('\n✅ Clinical Engine V3 Test Results:');
    console.log('Request ID:', result.requestId);
    console.log('Patient ID:', result.patientId);
    console.log('Diagnosis:', result.diagnosticResult.diagnosisName);
    console.log('Confidence:', result.diagnosticResult.confidence);
    console.log('Treatments:', result.diagnosticResult.recommendedTreatments);
    console.log('SOAP Note:', result.soapNote);
    
    if (result.diagnosticResult.diagnosisName === 'Clinical evaluation pending') {
      console.log('\n❌ Test failed: Got fallback diagnosis, indicating GPT calls failed');
      return false;
    }
    
    console.log('\n✅ Test passed: Clinical Engine V3 is working correctly!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Clinical Engine V3 test failed:', error);
    return false;
  }
}

// Run the test
testClinicalEngineV3()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }); 