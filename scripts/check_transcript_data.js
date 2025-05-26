const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTranscriptData() {
  try {
    console.log('Checking encounters table for transcript data...\n');
    
    // Get all encounters with transcript data
    const { data: encounters, error } = await supabase
      .from('encounters')
      .select('id, encounter_id, patient_supabase_id, transcript, scheduled_start_datetime, reason_display_text')
      .not('transcript', 'is', null)
      .not('transcript', 'eq', '');
    
    if (error) {
      console.error('Error fetching encounters:', error);
      return;
    }
    
    console.log(`Found ${encounters.length} encounters with transcript data:`);
    
    encounters.forEach((encounter, index) => {
      console.log(`\n${index + 1}. Encounter ID: ${encounter.encounter_id}`);
      console.log(`   Supabase ID: ${encounter.id}`);
      console.log(`   Patient UUID: ${encounter.patient_supabase_id}`);
      console.log(`   Date: ${encounter.scheduled_start_datetime}`);
      console.log(`   Reason: ${encounter.reason_display_text || 'N/A'}`);
      console.log(`   Transcript length: ${encounter.transcript ? encounter.transcript.length : 0} characters`);
      if (encounter.transcript) {
        console.log(`   Transcript preview: ${encounter.transcript.substring(0, 100)}...`);
      }
    });
    
    // Check patient mapping
    console.log('\n\nChecking patient data...');
    const { data: patients, error: pError } = await supabase
      .from('patients')
      .select('id, patient_id, name');
    
    if (pError) {
      console.error('Error fetching patients:', pError);
      return;
    }
    
    console.log(`Found ${patients.length} patients:`);
    patients.forEach(patient => {
      console.log(`- ${patient.name} (ID: ${patient.patient_id}, UUID: ${patient.id})`);
    });
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkTranscriptData(); 