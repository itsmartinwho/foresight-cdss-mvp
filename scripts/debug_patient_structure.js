const { createClient } = require('@supabase/supabase-js');

// Test script to debug Dorothy Robinson patient data loading
async function debugDorothyPatient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const dorothyPatientId = '0681FA35-A794-4684-97BD-00B88370DB41';

  console.log('🔍 Debugging Dorothy Robinson patient data...');
  console.log('Patient ID:', dorothyPatientId);
  console.log('');

  // Test 1: Check if patient exists
  console.log('1️⃣ Checking if patient exists...');
  const { data: patientData, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('patient_id', dorothyPatientId);

  if (patientError) {
    console.error('❌ Error fetching patient:', patientError);
    return;
  }

  if (!patientData || patientData.length === 0) {
    console.error('❌ Patient not found');
    return;
  }

  console.log('✅ Patient found:', patientData[0]);
  console.log('');

  // Test 2: Check encounters using the exact query from SupabaseDataService
  console.log('2️⃣ Checking encounters using SupabaseDataService query...');
  const { data: encounterData, error: encounterError } = await supabase
    .from('encounters')
    .select('*')
    .eq('extra_data->>PatientID', dorothyPatientId);

  if (encounterError) {
    console.error('❌ Error fetching encounters:', encounterError);
    return;
  }

  console.log(`✅ Found ${encounterData.length} encounters:`, encounterData);
  console.log('');

  // Test 3: Check the composite key that would be created
  if (encounterData.length > 0) {
    console.log('3️⃣ Checking composite keys that would be created...');
    encounterData.forEach(enc => {
      const compositeKey = `${dorothyPatientId}_${enc.encounter_id}`;
      console.log(`- Encounter ID: ${enc.encounter_id}`);
      console.log(`- Composite Key: ${compositeKey}`);
      console.log(`- Reason: ${enc.reason_display_text}`);
      console.log(`- Scheduled: ${enc.scheduled_start_datetime}`);
      console.log(`- Extra Data: ${JSON.stringify(enc.extra_data)}`);
      console.log('');
    });
  }

  console.log('🎯 Debug complete!');
}

debugDorothyPatient().catch(console.error); 