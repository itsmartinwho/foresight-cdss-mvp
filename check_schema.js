const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check encounters table schema
  console.log('1. Encounters table sample:');
  const { data: encounters, error: encountersError } = await supabase
    .from('encounters')
    .select('*')
    .limit(1);

  if (encountersError) {
    console.error('Error fetching encounters:', encountersError);
    return;
  }

  if (encounters && encounters.length > 0) {
    console.log('Columns:', Object.keys(encounters[0]));
    console.log('Sample row:', encounters[0]);
    console.log('');
  }

  // Check patients table schema
  console.log('2. Patients table sample:');
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .limit(1);

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return;
  }

  if (patients && patients.length > 0) {
    console.log('Columns:', Object.keys(patients[0]));
    console.log('Sample row:', patients[0]);
    console.log('');
  }

  // Test the relationship between patients and encounters
  console.log('3. Testing patient-encounter relationship:');
  if (patients && patients.length > 0 && encounters && encounters.length > 0) {
    const patient = patients[0];
    const encounter = encounters[0];
    
    console.log(`Patient UUID: ${patient.id}`);
    console.log(`Patient ID: ${patient.patient_id}`);
    console.log(`Encounter patient_supabase_id: ${encounter.patient_supabase_id}`);
    console.log(`Encounter extra_data: ${JSON.stringify(encounter.extra_data)}`);
    
    // Check if the relationship works
    const match1 = encounter.patient_supabase_id === patient.id;
    const match2 = encounter.extra_data?.PatientID === patient.patient_id;
    
    console.log(`patient_supabase_id matches patient.id: ${match1}`);
    console.log(`extra_data.PatientID matches patient.patient_id: ${match2}`);
  }
}

checkSchema().catch(console.error); 