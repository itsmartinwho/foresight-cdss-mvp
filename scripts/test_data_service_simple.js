const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDataServiceSimple() {
  try {
    console.log('Testing data service logic manually...\n');
    
    // Step 1: Get a patient with encounters that have transcript data
    const { data: encountersWithTranscripts, error: encError } = await supabase
      .from('encounters')
      .select('id, encounter_id, patient_supabase_id, transcript, reason_display_text, scheduled_start_datetime')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .gt('transcript', 'length', 100)
      .limit(5);
    
    if (encError) {
      console.error('Error fetching encounters:', encError);
      return;
    }
    
    console.log(`Found ${encountersWithTranscripts.length} encounters with substantial transcript data`);
    
    if (encountersWithTranscripts.length === 0) {
      console.log('No encounters with substantial transcript data found');
      return;
    }
    
    // Step 2: Get the patient for the first encounter
    const testEncounter = encountersWithTranscripts[0];
    console.log(`\nTesting with encounter: ${testEncounter.encounter_id}`);
    console.log(`Patient UUID: ${testEncounter.patient_supabase_id}`);
    console.log(`Transcript length: ${testEncounter.transcript?.length || 0}`);
    
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testEncounter.patient_supabase_id)
      .single();
    
    if (patientError) {
      console.error('Error fetching patient:', patientError);
      return;
    }
    
    console.log(`Patient: ${patient.name} (ID: ${patient.patient_id})`);
    
    // Step 3: Simulate the data service logic manually
    console.log('\nSimulating data service logic...');
    
    // Load all patients
    const { data: allPatients, error: allPatientsError } = await supabase
      .from('patients')
      .select('*');
    
    if (allPatientsError) {
      console.error('Error loading all patients:', allPatientsError);
      return;
    }
    
    // Create patient UUID to ID mapping
    const patientUuidToOriginalId = {};
    allPatients.forEach(row => {
      patientUuidToOriginalId[row.id] = row.patient_id;
    });
    
    // Load all encounters
    const { data: allEncounters, error: allEncountersError } = await supabase
      .from('encounters')
      .select('*');
    
    if (allEncountersError) {
      console.error('Error loading all encounters:', allEncountersError);
      return;
    }
    
    // Process encounters for our test patient
    const processedEncounters = {};
    const encountersByPatient = {};
    
    allEncounters.forEach(row => {
      const encounterSupabaseUUID = row.id;
      const encounterBusinessKey = row.encounter_id;
      const patientSupabaseUUIDFromEncounter = row.patient_supabase_id;
      
      if (!encounterBusinessKey || !patientSupabaseUUIDFromEncounter) {
        return;
      }
      
      const patientPublicId = patientUuidToOriginalId[patientSupabaseUUIDFromEncounter];
      
      if (!patientPublicId) {
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
    });
    
    // Step 4: Check if our test patient's encounters are correctly processed
    const testPatientId = patient.patient_id;
    const patientEncounterKeys = encountersByPatient[testPatientId] || [];
    
    console.log(`\nTest patient ${testPatientId} has ${patientEncounterKeys.length} encounters in processed data`);
    
    // Find our test encounter
    const testCompositeKey = `${testPatientId}_${testEncounter.encounter_id}`;
    const processedTestEncounter = processedEncounters[testCompositeKey];
    
    if (processedTestEncounter) {
      console.log('\n✅ SUCCESS: Test encounter found in processed data:');
      console.log(`  ID: ${processedTestEncounter.id}`);
      console.log(`  Identifier: ${processedTestEncounter.encounterIdentifier}`);
      console.log(`  Transcript length: ${processedTestEncounter.transcript?.length || 0}`);
      console.log(`  Transcript preview: "${processedTestEncounter.transcript?.substring(0, 100)}..."`);
    } else {
      console.log('\n❌ ERROR: Test encounter NOT found in processed data');
      console.log(`Expected composite key: ${testCompositeKey}`);
      console.log('Available keys for this patient:');
      patientEncounterKeys.forEach(key => {
        console.log(`  - ${key}`);
      });
    }
    
    // Step 5: Test the getPatientEncounters logic
    console.log('\n--- Testing getPatientEncounters logic ---');
    const patientEncounters = patientEncounterKeys.map(compositeKey => {
      const encounter = processedEncounters[compositeKey];
      if (!encounter) return null;
      
      return {
        encounter: {
          id: encounter.id,
          encounterIdentifier: encounter.encounterIdentifier,
          patientId: encounter.patientId,
          transcript: encounter.transcript,
          reasonDisplayText: encounter.reasonDisplayText,
          scheduledStart: encounter.scheduledStart,
          isDeleted: false
        },
        diagnoses: [],
        labResults: []
      };
    }).filter(Boolean);
    
    console.log(`Patient encounters result: ${patientEncounters.length} encounters`);
    
    const testEncounterInResult = patientEncounters.find(ew => 
      ew.encounter.id === testEncounter.id
    );
    
    if (testEncounterInResult) {
      console.log('\n✅ SUCCESS: Test encounter found in final result:');
      console.log(`  ID: ${testEncounterInResult.encounter.id}`);
      console.log(`  Transcript: "${testEncounterInResult.encounter.transcript?.substring(0, 100)}..."`);
    } else {
      console.log('\n❌ ERROR: Test encounter NOT found in final result');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

testDataServiceSimple(); 