const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function findRealPatients() {
  console.log('🔍 Finding real patients in database...');
  
  try {
    // Make a request to our own API to get patient data
    const response = await fetch('http://localhost:3000/api/clinical-engine/patients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      // If no dedicated patients endpoint, we'll use a manual list
      console.log('ℹ️  No patients API endpoint, using known patient IDs from our enrichment work');
      return [
        { patient_id: 'PAT_0100001', name: 'Maria Gomez' },
        { patient_id: 'PAT_0100002', name: 'James Lee' },
        { patient_id: 'PAT_0100003', name: 'Priya Patel' },
        { patient_id: 'PAT_0100004', name: 'Alice Smith' }
      ];
    }
    
    const patients = await response.json();
    return patients;
    
  } catch (error) {
    console.log('ℹ️  Using fallback patient IDs');
    return [
      { patient_id: 'PAT_0100001', name: 'Maria Gomez' },
      { patient_id: 'PAT_0100002', name: 'James Lee' },
      { patient_id: 'PAT_0100003', name: 'Priya Patel' },
      { patient_id: 'PAT_0100004', name: 'Alice Smith' }
    ];
  }
}

async function processClinicalEngine(patientId, encounterId, transcript) {
  console.log(`📡 Processing patient ${patientId}, encounter ${encounterId}...`);
  
  try {
    const payload = {
      patientId: patientId,
      encounterId: encounterId,
      transcript: transcript
    };
    
    const response = await fetch('http://localhost:3000/api/clinical-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ Clinical engine completed for', patientId);
    
    // Log key results
    if (result.diagnosticResult) {
      console.log('  📝 Diagnosis:', result.diagnosticResult.diagnosisName || 'Not specified');
      console.log('  🎯 Confidence:', result.diagnosticResult.confidence ? (result.diagnosticResult.confidence * 100).toFixed(0) + '%' : 'N/A');
      console.log('  💊 Treatments:', result.diagnosticResult.recommendedTreatments?.length || 0);
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Error processing clinical engine:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting clinical engine processing for real patients...');
  
  // Get patient list
  const patients = await findRealPatients();
  console.log(`📋 Found ${patients.length} patients to process`);
  
  // Simple enriched transcript template
  const enrichedTranscript = `Clinician: Good morning. What brings you in today?
Patient: I've been experiencing persistent headaches over the last two weeks, along with some nausea.
Clinician: On a scale of 1 to 10, how severe are the headaches?
Patient: Around a 6. They tend to worsen in the afternoon.
Clinician: Any visual disturbances, like blurred vision or aura?
Patient: Occasionally some blurred vision when the pain peaks.
Clinician: Do you have any history of migraines or chronic headaches?
Patient: No, this is new for me.
Clinician: Have you taken any medication that helps?
Patient: Over-the-counter ibuprofen helps a bit, but the pain returns.
Clinician: Understood. Let's perform a physical exam and consider neuro-imaging if necessary.`;

  let processedCount = 0;
  let successCount = 0;
  
  // Process each patient
  for (const patient of patients) {
    console.log(`\n👤 Processing ${patient.name} (${patient.patient_id})...`);
    
    // Generate a simple encounter ID
    const encounterId = `enc_${patient.patient_id}_001`;
    
    const result = await processClinicalEngine(
      patient.patient_id,
      encounterId,
      enrichedTranscript
    );
    
    processedCount++;
    if (result.success) {
      successCount++;
      console.log(`✅ Successfully processed ${patient.name}`);
    } else {
      console.log(`❌ Failed to process ${patient.name}: ${result.error}`);
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Processing Summary:`);
  console.log(`  Total patients: ${patients.length}`);
  console.log(`  Processed: ${processedCount}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${processedCount - successCount}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Clinical engine processing completed! Check your database for the rich content fields.');
  }
}

main().catch(console.error); 