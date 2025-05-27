const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEncounterPatientLinks() {
  console.log('🔧 Starting encounter patient link repair...');

  try {
    // First, get all encounters with missing patient_supabase_id
    const { data: brokenEncounters, error: fetchError } = await supabase
      .from('encounters')
      .select('id, encounter_id, patient_supabase_id, extra_data')
      .is('patient_supabase_id', null);

    if (fetchError) {
      console.error('Error fetching broken encounters:', fetchError);
      return;
    }

    console.log(`Found ${brokenEncounters.length} encounters with missing patient_supabase_id`);

    if (brokenEncounters.length === 0) {
      console.log('✅ No broken encounters found. All encounters have proper patient links.');
      return;
    }

    // Get all patients to create a mapping
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, patient_id');

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return;
    }

    // Create mapping from original patient_id to Supabase UUID
    const patientIdToUuid = {};
    patients.forEach(patient => {
      patientIdToUuid[patient.patient_id] = patient.id;
    });

    console.log(`Created mapping for ${patients.length} patients`);

    let fixedCount = 0;
    let skippedCount = 0;

    // Fix each broken encounter
    for (const encounter of brokenEncounters) {
      const originalPatientId = encounter.extra_data?.PatientID;
      
      if (!originalPatientId) {
        console.warn(`⚠️  Encounter ${encounter.encounter_id} has no PatientID in extra_data, skipping`);
        skippedCount++;
        continue;
      }

      const patientUuid = patientIdToUuid[originalPatientId];
      
      if (!patientUuid) {
        console.warn(`⚠️  No patient found for PatientID ${originalPatientId}, skipping encounter ${encounter.encounter_id}`);
        skippedCount++;
        continue;
      }

      // Update the encounter with the correct patient_supabase_id
      const { error: updateError } = await supabase
        .from('encounters')
        .update({ patient_supabase_id: patientUuid })
        .eq('id', encounter.id);

      if (updateError) {
        console.error(`❌ Failed to update encounter ${encounter.encounter_id}:`, updateError);
        skippedCount++;
      } else {
        console.log(`✅ Fixed encounter ${encounter.encounter_id} -> patient ${originalPatientId} (${patientUuid})`);
        fixedCount++;
      }
    }

    console.log('\n📊 Repair Summary:');
    console.log(`✅ Fixed: ${fixedCount} encounters`);
    console.log(`⚠️  Skipped: ${skippedCount} encounters`);
    console.log(`📝 Total processed: ${brokenEncounters.length} encounters`);

    // Verify the fix
    const { data: stillBroken, error: verifyError } = await supabase
      .from('encounters')
      .select('id')
      .is('patient_supabase_id', null);

    if (verifyError) {
      console.error('Error verifying fix:', verifyError);
    } else {
      console.log(`\n🔍 Verification: ${stillBroken.length} encounters still have missing patient_supabase_id`);
      
      if (stillBroken.length === 0) {
        console.log('🎉 All encounters now have proper patient links!');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixEncounterPatientLinks()
  .then(() => {
    console.log('🏁 Encounter patient link repair completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Repair failed:', error);
    process.exit(1);
  }); 