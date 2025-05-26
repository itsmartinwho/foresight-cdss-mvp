const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTranscriptIssue() {
  console.log('🔍 Debugging transcript issue...\n');

  // 1. Check encounters table structure and data
  console.log('1. Checking encounters table...');
  const { data: encounters, error: encountersError } = await supabase
    .from('encounters')
    .select('*')
    .limit(5);

  if (encountersError) {
    console.error('Error fetching encounters:', encountersError);
    return;
  }

  console.log(`Found ${encounters.length} encounters:`);
  encounters.forEach((enc, i) => {
    console.log(`  ${i + 1}. ID: ${enc.id}`);
    console.log(`     Encounter ID: ${enc.encounter_id}`);
    console.log(`     Patient Supabase ID: ${enc.patient_supabase_id}`);
    console.log(`     Reason: ${enc.reason_display_text || 'N/A'}`);
    console.log(`     Date: ${enc.scheduled_start_datetime || 'N/A'}`);
    console.log(`     Transcript: ${enc.transcript ? `"${enc.transcript.substring(0, 100)}..."` : 'NULL/EMPTY'}`);
    console.log('');
  });

  // 2. Check patients table
  console.log('2. Checking patients table...');
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, patient_id, first_name, last_name, name')
    .limit(5);

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return;
  }

  console.log(`Found ${patients.length} patients:`);
  patients.forEach((patient, i) => {
    console.log(`  ${i + 1}. UUID: ${patient.id}`);
    console.log(`     Patient ID: ${patient.patient_id}`);
    console.log(`     Name: ${patient.name || `${patient.first_name} ${patient.last_name}`}`);
    console.log('');
  });

  // 3. Test patient-encounter relationship
  console.log('3. Testing patient-encounter relationship...');
  if (patients.length > 0 && encounters.length > 0) {
    const testPatient = patients[0];
    console.log(`Testing with patient: ${testPatient.patient_id} (UUID: ${testPatient.id})`);
    
    // Find encounters for this patient using both methods
    const { data: encountersByUUID, error: uuidError } = await supabase
      .from('encounters')
      .select('*')
      .eq('patient_supabase_id', testPatient.id);
    
    const { data: encountersByExtraData, error: extraDataError } = await supabase
      .from('encounters')
      .select('*')
      .eq('extra_data->>PatientID', testPatient.patient_id);
    
    console.log(`Encounters found by patient_supabase_id: ${encountersByUUID?.length || 0}`);
    console.log(`Encounters found by extra_data->PatientID: ${encountersByExtraData?.length || 0}`);
    
    if (encountersByUUID && encountersByUUID.length > 0) {
      console.log('Sample encounter by UUID:');
      const enc = encountersByUUID[0];
      console.log(`  ID: ${enc.id}, Encounter ID: ${enc.encounter_id}`);
      console.log(`  Transcript: ${enc.transcript ? `"${enc.transcript.substring(0, 100)}..."` : 'EMPTY'}`);
    }
  }

  // 4. Simulate the data service loading process
  console.log('\n4. Simulating data service loading process...');
  
  // Step 4a: Load all patients (like loadPatientData does)
  const { data: allPatients, error: allPatientsError } = await supabase
    .from('patients')
    .select('*');
  
  if (allPatientsError) {
    console.error('Error loading all patients:', allPatientsError);
    return;
  }
  
  console.log(`Loaded ${allPatients.length} patients`);
  
  // Step 4b: Create patient UUID to ID mapping
  const patientUuidToOriginalId = {};
  allPatients.forEach(row => {
    patientUuidToOriginalId[row.id] = row.patient_id;
  });
  
  console.log(`Created UUID mapping for ${Object.keys(patientUuidToOriginalId).length} patients`);
  
  // Step 4c: Load all encounters (like loadPatientData does)
  const { data: allEncounters, error: allEncountersError } = await supabase
    .from('encounters')
    .select('*');
  
  if (allEncountersError) {
    console.error('Error loading all encounters:', allEncountersError);
    return;
  }
  
  console.log(`Loaded ${allEncounters.length} encounters`);
  
  // Step 4d: Process encounters like the data service does
  const processedEncounters = {};
  const encountersByPatient = {};
  let skippedCount = 0;
  let processedCount = 0;
  
  allEncounters.forEach(row => {
    const encounterSupabaseUUID = row.id;
    const encounterBusinessKey = row.encounter_id;
    const patientSupabaseUUIDFromEncounter = row.patient_supabase_id;
    
    if (!encounterBusinessKey) {
      console.log(`Skipping encounter ${encounterSupabaseUUID}: missing encounter_id`);
      skippedCount++;
      return;
    }
    
    if (!patientSupabaseUUIDFromEncounter) {
      console.log(`Skipping encounter ${encounterSupabaseUUID}: missing patient_supabase_id`);
      skippedCount++;
      return;
    }
    
    const patientPublicId = patientUuidToOriginalId[patientSupabaseUUIDFromEncounter];
    
    if (!patientPublicId) {
      console.log(`Skipping encounter ${encounterSupabaseUUID}: patient UUID ${patientSupabaseUUIDFromEncounter} not found in mapping`);
      skippedCount++;
      return;
    }
    
    const compositeKey = `${patientPublicId}_${encounterBusinessKey}`;
    
    processedEncounters[compositeKey] = {
      id: encounterSupabaseUUID,
      encounterIdentifier: encounterBusinessKey,
      patientId: patientPublicId,
      transcript: row.transcript,
      reasonDisplayText: row.reason_display_text,
      scheduledStart: row.scheduled_start_datetime
    };
    
    if (!encountersByPatient[patientPublicId]) {
      encountersByPatient[patientPublicId] = [];
    }
    encountersByPatient[patientPublicId].push(compositeKey);
    processedCount++;
  });
  
  console.log(`Processed ${processedCount} encounters, skipped ${skippedCount}`);
  
  // Step 4e: Test retrieval for a specific patient
  const testPatientId = allPatients[0]?.patient_id;
  if (testPatientId && encountersByPatient[testPatientId]) {
    console.log(`\nTesting retrieval for patient ${testPatientId}:`);
    const patientEncounterKeys = encountersByPatient[testPatientId];
    console.log(`Found ${patientEncounterKeys.length} encounter keys for this patient`);
    
    patientEncounterKeys.forEach((key, i) => {
      const encounter = processedEncounters[key];
      if (encounter) {
        console.log(`  ${i + 1}. ${encounter.id} (${encounter.encounterIdentifier})`);
        console.log(`     Transcript: ${encounter.transcript ? `"${encounter.transcript.substring(0, 100)}..."` : 'EMPTY'}`);
      }
    });
  }
  
  // 5. Check for encounters with transcript data specifically
  console.log('\n5. Checking encounters with transcript data...');
  const { data: transcriptEncounters, error: transcriptError } = await supabase
    .from('encounters')
    .select('id, encounter_id, patient_supabase_id, transcript, reason_display_text')
    .not('transcript', 'is', null)
    .neq('transcript', '')
    .limit(5);
  
  if (transcriptError) {
    console.error('Error fetching transcript encounters:', transcriptError);
    return;
  }
  
  console.log(`Found ${transcriptEncounters.length} encounters with transcript data:`);
  transcriptEncounters.forEach((enc, i) => {
    const patientId = patientUuidToOriginalId[enc.patient_supabase_id];
    console.log(`  ${i + 1}. Encounter ID: ${enc.encounter_id}`);
    console.log(`     Patient UUID: ${enc.patient_supabase_id} -> Patient ID: ${patientId || 'NOT FOUND'}`);
    console.log(`     Transcript length: ${enc.transcript?.length || 0} characters`);
    console.log(`     Would create composite key: ${patientId}_${enc.encounter_id}`);
    console.log('');
  });
}

debugTranscriptIssue().catch(console.error); 