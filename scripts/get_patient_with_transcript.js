const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getPatientWithTranscript() {
  try {
    console.log('Finding a patient with transcript data for testing...\n');
    
    // Get an encounter with substantial transcript data
    const { data: encounters, error: encError } = await supabase
      .from('encounters')
      .select('id, encounter_id, patient_supabase_id, transcript, reason_display_text, scheduled_start_datetime')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .gt('transcript', 'length', 100)
      .limit(1);
    
    if (encError) {
      console.error('Error fetching encounters:', encError);
      return;
    }
    
    if (!encounters || encounters.length === 0) {
      console.log('No encounters with substantial transcript data found');
      return;
    }
    
    const encounter = encounters[0];
    
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
    
    console.log('🎯 Test Patient Found:');
    console.log(`Patient Name: ${patient.name}`);
    console.log(`Patient ID: ${patient.patient_id}`);
    console.log(`Patient UUID: ${patient.id}`);
    console.log('');
    console.log('📋 Test Encounter:');
    console.log(`Encounter ID: ${encounter.encounter_id}`);
    console.log(`Encounter UUID: ${encounter.id}`);
    console.log(`Reason: ${encounter.reason_display_text}`);
    console.log(`Date: ${encounter.scheduled_start_datetime}`);
    console.log(`Transcript Length: ${encounter.transcript?.length || 0} characters`);
    console.log('');
    console.log('🌐 Test URLs:');
    console.log(`Patient Workspace: http://localhost:3000/patients/${patient.patient_id}`);
    console.log(`Direct Encounter: http://localhost:3000/patients/${patient.patient_id}?encounterId=${encounter.id}`);
    console.log('');
    console.log('📝 Transcript Preview:');
    console.log(encounter.transcript?.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

getPatientWithTranscript(); 