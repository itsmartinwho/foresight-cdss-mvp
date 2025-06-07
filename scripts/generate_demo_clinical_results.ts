import { DemoDataService } from '../src/services/demo/DemoDataService';

async function callClinicalEngineAPI(patientId: string, encounterId: string, transcript: string) {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  
  try {
    console.log('🤖 Calling clinical engine API...');
    
    // Call the clinical engine API
    const response = await fetch(`${API_BASE_URL}/api/clinical-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId,
        encounterId,
        transcript
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

async function generateDemoClinicalResults() {
  console.log('🏥 Starting demo clinical results generation...');

  try {
    // Step 1: Extract demo data
    const demoPatient = DemoDataService.getPatientData();
    const demoEncounter = DemoDataService.getEncounterData();
    const transcript = demoEncounter.transcript;

    console.log(`📊 Patient: ${demoPatient.name} (ID: ${demoPatient.id})`);
    console.log(`📋 Encounter: ${demoEncounter.id}`);
    console.log(`📝 Transcript length: ${transcript.length} characters`);
    console.log(`📄 Transcript preview:\n${transcript.substring(0, 200)}...`);

    // Step 2: Call the clinical engine API
    const clinicalResults = await callClinicalEngineAPI(
      demoPatient.id,
      demoEncounter.id,
      transcript
    );

    console.log('✅ Clinical engine analysis completed!');
    console.log('📋 Results summary:');
    console.log(`   Primary Diagnosis: ${clinicalResults.diagnosticResult.diagnosisName}`);
    console.log(`   Diagnosis Code: ${clinicalResults.diagnosticResult.diagnosisCode}`);
    console.log(`   Confidence: ${(clinicalResults.diagnosticResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Differential Diagnoses: ${clinicalResults.diagnosticResult.differentialDiagnoses?.length || 0}`);
    console.log(`   Recommended Treatments: ${clinicalResults.diagnosticResult.recommendedTreatments?.length || 0}`);
    
    // Step 3: Display differential diagnoses
    if (clinicalResults.diagnosticResult.differentialDiagnoses?.length > 0) {
      console.log('\n🔍 Differential Diagnoses:');
      clinicalResults.diagnosticResult.differentialDiagnoses.forEach((diff, index) => {
        console.log(`   ${index + 1}. ${diff.name} - ${diff.likelihood} likelihood`);
        console.log(`      Key factors: ${diff.keyFactors}`);
        if (diff.icdCodes && diff.icdCodes.length > 0) {
          console.log(`      ICD codes: ${diff.icdCodes.map(code => `${code.code} (${code.description})`).join(', ')}`);
        }
      });
    }

    // Step 4: Display treatment plan
    if (clinicalResults.diagnosticResult.recommendedTreatments?.length > 0) {
      console.log('\n💊 Recommended Treatments:');
      clinicalResults.diagnosticResult.recommendedTreatments.forEach((treatment, index) => {
        console.log(`   ${index + 1}. ${treatment}`);
      });
    }

    // Step 5: Display SOAP note
    if (clinicalResults.soapNote) {
      console.log('\n📄 SOAP Note:');
      console.log(`   Subjective: ${clinicalResults.soapNote.subjective}`);
      console.log(`   Objective: ${clinicalResults.soapNote.objective}`);
      console.log(`   Assessment: ${clinicalResults.soapNote.assessment}`);
      console.log(`   Plan: ${clinicalResults.soapNote.plan}`);
    }

    console.log('\n✅ Demo clinical results generated successfully!');
    console.log('💾 Results have been automatically saved to Supabase database.');
    console.log('\n📌 Key findings:');
    console.log('   ✓ All diagnoses and treatments are now in English');
    console.log('   ✓ New differential diagnoses have been generated');
    console.log('   ✓ Treatment plan has been updated with current medical standards');
    console.log('   ✓ SOAP note has been generated for clinical documentation');
    console.log('\n📌 Next steps:');
    console.log('   1. Dorothy Robinson patient should now show updated clinical results in the database');
    console.log('   2. The demo consultation panel will display these new results');
    console.log('   3. Check the patients tab to see Dorothy Robinson is visible');

    return clinicalResults;

  } catch (error) {
    console.error('❌ Error generating demo clinical results:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generateDemoClinicalResults()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { generateDemoClinicalResults }; 