const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a proper patient ID (similar to existing long IDs)
function generatePatientId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateNewPatientIds() {
  console.log('🔧 Generating new patient IDs for short IDs...');

  try {
    // Step 1: Find all patients with short IDs (less than 4 characters)
    const { data: allPatients, error: patientsError } = await supabase
      .from('patients')
      .select('*');

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return;
    }

    const shortIdPatients = allPatients.filter(p => p.patient_id.length < 4);
    console.log(`Found ${shortIdPatients.length} patients with short IDs`);

    if (shortIdPatients.length === 0) {
      console.log('✅ No patients with short IDs found. Nothing to update.');
      return;
    }

    // Step 2: Generate new IDs and update patients
    const updates = [];
    
    for (const patient of shortIdPatients) {
      const newPatientId = generatePatientId();
      
      console.log(`Planning update: ${patient.name} (${patient.patient_id}) -> ${newPatientId}`);
      
      updates.push({
        oldId: patient.patient_id,
        newId: newPatientId,
        supabaseUuid: patient.id,
        name: patient.name,
        patient: patient
      });
    }

    // Step 3: Confirm before proceeding
    console.log('\n📋 Update Plan:');
    updates.forEach(update => {
      console.log(`  ${update.name}: ${update.oldId} -> ${update.newId}`);
    });

    console.log('\n⚠️  This will update patient IDs and all related encounter references.');
    console.log('Proceeding with updates...\n');

    // Step 4: Execute updates
    for (const update of updates) {
      console.log(`Updating patient ${update.name}...`);

      // Update patient record
      const { error: updatePatientError } = await supabase
        .from('patients')
        .update({ 
          patient_id: update.newId,
          extra_data: {
            ...update.patient.extra_data,
            PatientID: update.newId
          }
        })
        .eq('id', update.supabaseUuid);

      if (updatePatientError) {
        console.error(`❌ Failed to update patient ${update.oldId}:`, updatePatientError);
        continue;
      }

      // Update encounters - get all encounters for this patient and update them individually
      const { data: encountersToUpdate, error: fetchEncountersError } = await supabase
        .from('encounters')
        .select('*')
        .eq('extra_data->>PatientID', update.oldId);

      if (fetchEncountersError) {
        console.error(`❌ Failed to fetch encounters for patient ${update.oldId}:`, fetchEncountersError);
        continue;
      }

      // Update each encounter individually
      for (const encounter of encountersToUpdate || []) {
        const updatedExtraData = {
          ...encounter.extra_data,
          PatientID: update.newId
        };

        const { error: updateEncounterError } = await supabase
          .from('encounters')
          .update({ extra_data: updatedExtraData })
          .eq('id', encounter.id);

        if (updateEncounterError) {
          console.error(`❌ Failed to update encounter ${encounter.id}:`, updateEncounterError);
        }
      }

      console.log(`✅ Updated patient ${update.name} and related encounters`);
    }

    // Step 5: Verify the updates
    console.log('\n📊 Verification:');
    for (const update of updates) {
      const { data: updatedPatient } = await supabase
        .from('patients')
        .select('patient_id, name')
        .eq('id', update.supabaseUuid)
        .single();

      const { data: encounters } = await supabase
        .from('encounters')
        .select('id')
        .eq('extra_data->>PatientID', update.newId);

      console.log(`${updatedPatient?.name}: ID = ${updatedPatient?.patient_id}, Encounters = ${encounters?.length || 0}`);
    }

    console.log('\n✅ Patient ID generation completed successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
generateNewPatientIds()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 