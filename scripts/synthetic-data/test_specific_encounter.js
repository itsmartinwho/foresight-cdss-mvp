const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpecificEncounter() {
  try {
    console.log('Testing specific encounter with transcript data...\n');
    
    // Get a specific encounter with substantial transcript data
    const { data: encounters, error } = await supabase
      .from('encounters')
      .select('*')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .gt('transcript', 'length', 100)
      .limit(1);
    
    if (error) {
      console.error('Error fetching encounter:', error);
      return;
    }
    
    if (!encounters || encounters.length === 0) {
      console.log('No encounters with substantial transcript found');
      return;
    }
    
    const encounter = encounters[0];
    console.log('Test encounter:');
    console.log(`  ID: ${encounter.id}`);
    console.log(`  Encounter ID: ${encounter.encounter_id}`);
    console.log(`  Patient UUID: ${encounter.patient_supabase_id}`);
    console.log(`  Transcript length: ${encounter.transcript?.length || 0}`);
    console.log(`  Transcript content: "${encounter.transcript}"`);
    console.log('');
    
    // Get the patient for this encounter
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', encounter.patient_supabase_id)
      .single();
    
    if (patientError) {
      console.error('Error fetching patient:', patientError);
      return;
    }
    
    console.log('Associated patient:');
    console.log(`  UUID: ${patient.id}`);
    console.log(`  Patient ID: ${patient.patient_id}`);
    console.log(`  Name: ${patient.name || `${patient.first_name} ${patient.last_name}`}`);
    console.log('');
    
    // Test the data service loading for this specific patient
    console.log('Testing data service for this patient...');
    
    // Simulate what the data service does
    const { supabaseDataService } = require('../../src/lib/supabaseDataService.ts');
    
    // Load all data first
    await supabaseDataService.loadPatientData();
    
    // Get patient data
    const patientData = await supabaseDataService.getPatientData(patient.patient_id);
    
    if (patientData) {
      console.log(`Data service found patient: ${patientData.patient.name}`);
      console.log(`Encounters found: ${patientData.encounters.length}`);
      
      // Find the specific encounter
      const foundEncounter = patientData.encounters.find(encWrapper => 
        encWrapper.encounter.id === encounter.id
      );
      
      if (foundEncounter) {
        console.log('Found the test encounter in data service:');
        console.log(`  ID: ${foundEncounter.encounter.id}`);
        console.log(`  Identifier: ${foundEncounter.encounter.encounterIdentifier}`);
        console.log(`  Transcript: "${foundEncounter.encounter.transcript}"`);
        console.log(`  Transcript length: ${foundEncounter.encounter.transcript?.length || 0}`);
      } else {
        console.log('ERROR: Test encounter not found in data service results');
        console.log('Available encounters:');
        patientData.encounters.forEach((encWrapper, i) => {
          console.log(`  ${i + 1}. ${encWrapper.encounter.id} (${encWrapper.encounter.encounterIdentifier})`);
        });
      }
    } else {
      console.log('ERROR: Patient data not found in data service');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

testSpecificEncounter(); 