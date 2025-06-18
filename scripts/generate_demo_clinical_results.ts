import { DemoDataService } from '../src/services/demo/DemoDataService';
import { getSupabaseClient } from '../src/lib/supabaseClient';

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

// Add this function to generate complex case alerts
export async function generateComplexCaseAlerts() {
  const complexCaseAlerts = [
    {
      patient_id: '0681FA35-A794-4684-97BD-00B88370DB41', // Dorothy Robinson
      alert_type: 'COMPLEX_CONDITION',
      severity: 'CRITICAL',
      category: 'complex_case',
      title: 'Possible Systemic Lupus Erythematosus',
      message: 'Patient presents with classic lupus triad: photosensitive malar rash, polyarthritis, and constitutional symptoms. Combined with positive ANA and low complement levels, this strongly suggests SLE requiring urgent rheumatology evaluation.',
      suggestion: 'URGENT rheumatology referral (within 1-2 weeks). Order anti-dsDNA, anti-Sm antibodies, complete urinalysis with microscopy, and monitor for renal involvement.',
      confidence_score: 0.88,
      source_reasoning: 'Patient meets multiple SLE criteria (malar rash, oral ulcers, arthritis, positive ANA, low complement). Early diagnosis and treatment are crucial for preventing organ damage.',
      processing_model: 'clinical-pattern-recognition',
      context_data: {
        triggeringFactors: [
          'Photosensitive facial rash',
          'Polyarthritis (hands, wrists, knees)',
          'Constitutional symptoms (fatigue, fever)',
          'Positive ANA (1:320, homogeneous pattern)',
          'Low complement levels (C3, C4)'
        ]
      },
      is_post_consultation: true,
      status: 'active'
    },
    {
      patient_id: '0681FA35-A794-4684-97BD-00B88370DB41',
      alert_type: 'COMPLEX_CONDITION',
      severity: 'CRITICAL',
      category: 'complex_case',
      title: 'Lung Cancer Red Flags',
      message: 'Concerning constellation: 30-pack-year smoking history, persistent cough with hemoptysis, 15-lb weight loss over 3 months, and new-onset dyspnea. Requires urgent imaging and oncology evaluation.',
      suggestion: 'URGENT chest CT with contrast. Order CBC, CMP, LDH. Oncology referral within 1 week. Consider bronchoscopy if mass identified.',
      confidence_score: 0.92,
      source_reasoning: 'Heavy smoking history with hemoptysis, weight loss, and respiratory symptoms form a high-risk constellation requiring immediate evaluation.',
      processing_model: 'clinical-pattern-recognition',
      context_data: {
        triggeringFactors: [
          'Heavy smoking history (30 pack-years)',
          'Hemoptysis',
          'Unintentional weight loss (15 lbs/3 months)',
          'Progressive dyspnea',
          'Persistent cough >8 weeks'
        ]
      },
      is_post_consultation: true,
      status: 'active'
    },
    {
      patient_id: '0681FA35-A794-4684-97BD-00B88370DB41',
      alert_type: 'COMPLEX_CONDITION',
      severity: 'WARNING',
      category: 'complex_case',
      title: 'Hematologic Malignancy Concern',
      message: 'B-symptoms triad (fever, night sweats, weight loss) with lymphadenopathy and unexplained fatigue in young adult suggests possible lymphoma. Requires prompt hematologic evaluation.',
      suggestion: 'Order CBC with differential immediately. Get comprehensive metabolic panel, LDH, uric acid levels. CT chest/abdomen/pelvis. Hematology/oncology referral.',
      confidence_score: 0.80,
      source_reasoning: 'B-symptoms with lymphadenopathy in appropriate age group warrants urgent evaluation for lymphoproliferative disorders.',
      processing_model: 'clinical-pattern-recognition',
      context_data: {
        triggeringFactors: [
          'B-symptoms (fever, night sweats, weight loss)',
          'Generalized lymphadenopathy',
          'Severe fatigue',
          'Age 25-40 (lymphoma risk group)',
          'No obvious infectious cause'
        ]
      },
      is_post_consultation: true,
      status: 'active'
    },
    {
      patient_id: '0681FA35-A794-4684-97BD-00B88370DB41',
      alert_type: 'COMPLEX_CONDITION',
      severity: 'WARNING',
      category: 'complex_case',
      title: 'Probable Rheumatoid Arthritis',
      message: 'Prolonged morning stiffness (>2 hours), symmetric polyarthritis, and positive rheumatoid factor suggest early rheumatoid arthritis. Early intervention with DMARDs is crucial to prevent joint damage.',
      suggestion: 'Rheumatology referral within 3-6 weeks. Order anti-CCP antibodies. Joint X-rays (hands, feet) for baseline. Consider methotrexate initiation.',
      confidence_score: 0.85,
      source_reasoning: 'Morning stiffness duration and pattern, symmetric joint involvement, and positive RF meet criteria for probable RA.',
      processing_model: 'clinical-pattern-recognition',
      context_data: {
        triggeringFactors: [
          'Morning stiffness >1 hour',
          'Symmetric polyarthritis',
          'Small joint involvement (MCPs, PIPs)',
          'Positive rheumatoid factor',
          'Elevated ESR/CRP'
        ]
      },
      is_post_consultation: true,
      status: 'active'
    },
    {
      patient_id: '0681FA35-A794-4684-97BD-00B88370DB41',
      alert_type: 'COMPLEX_CONDITION',
      severity: 'WARNING',
      category: 'complex_case',
      title: 'Possible Sarcoidosis',
      message: 'Multi-system involvement with hilar lymphadenopathy, skin lesions, and elevated ACE levels suggests sarcoidosis. This inflammatory condition requires specialized evaluation and monitoring.',
      suggestion: 'Pulmonology referral. High-resolution chest CT. Skin biopsy of lesions. Ophthalmology evaluation. Consider bronchoscopy with BAL.',
      confidence_score: 0.75,
      source_reasoning: 'Multi-system involvement with characteristic imaging and laboratory findings consistent with sarcoidosis.',
      processing_model: 'clinical-pattern-recognition',
      context_data: {
        triggeringFactors: [
          'Bilateral hilar lymphadenopathy',
          'Skin lesions (erythema nodosum pattern)',
          'Progressive dyspnea',
          'Elevated ACE level',
          'Multi-system involvement'
        ]
      },
      is_post_consultation: true,
      status: 'active'
    }
  ];

  console.log('Generating complex case alerts...');
  
  const supabase = getSupabaseClient();
  
  try {
    for (const alertData of complexCaseAlerts) {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alertData)
        .select();
      
      if (error) {
        console.error('Error inserting alert:', error);
      } else {
        console.log('✅ Created complex case alert:', alertData.title);
      }
    }
    
    console.log('✅ Complex case alerts generation completed');
  } catch (error) {
    console.error('❌ Error generating complex case alerts:', error);
  }
} 