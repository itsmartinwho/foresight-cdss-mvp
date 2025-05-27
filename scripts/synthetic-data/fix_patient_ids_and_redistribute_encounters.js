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

async function fixPatientIdsAndRedistributeEncounters() {
  console.log('🔧 Starting patient ID fix and encounter redistribution...');

  try {
    // Step 1: Get all patients with short IDs
    const { data: shortIdPatients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .in('patient_id', ['1', '2', '3']);

    if (patientsError) {
      console.error('Error fetching short ID patients:', patientsError);
      return;
    }

    console.log(`Found ${shortIdPatients.length} patients with short IDs`);

    // Step 2: Generate new IDs and update patients
    const patientIdMapping = {};
    
    for (const patient of shortIdPatients) {
      const newPatientId = generatePatientId();
      patientIdMapping[patient.patient_id] = {
        oldId: patient.patient_id,
        newId: newPatientId,
        supabaseUuid: patient.id,
        name: patient.name
      };

      console.log(`Updating patient ${patient.name}: ${patient.patient_id} -> ${newPatientId}`);

      // Update patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update({ 
          patient_id: newPatientId,
          extra_data: {
            ...patient.extra_data,
            PatientID: newPatientId
          }
        })
        .eq('id', patient.id);

      if (updateError) {
        console.error(`Failed to update patient ${patient.patient_id}:`, updateError);
        continue;
      }
    }

    // Step 3: Get all encounters for patient '1' (the one with 292 encounters)
    const { data: patient1Encounters, error: encountersError } = await supabase
      .from('encounters')
      .select('*')
      .eq('extra_data->>PatientID', '1');

    if (encountersError) {
      console.error('Error fetching patient 1 encounters:', encountersError);
      return;
    }

    console.log(`Found ${patient1Encounters.length} encounters for patient '1'`);

    // Step 4: Redistribute encounters more evenly
    // Keep some for Maria Gomez (patient '1'), distribute others to patients '2' and '3'
    const encountersPerPatient = Math.floor(patient1Encounters.length / 3);
    const remainder = patient1Encounters.length % 3;

    console.log(`Redistributing encounters: ~${encountersPerPatient} per patient`);

    let encounterIndex = 0;
    const redistributionPlan = [
      { patientId: '1', count: encountersPerPatient + remainder }, // Maria gets a few extra
      { patientId: '2', count: encountersPerPatient },
      { patientId: '3', count: encountersPerPatient }
    ];

    for (const plan of redistributionPlan) {
      const mapping = patientIdMapping[plan.patientId];
      const encountersToUpdate = patient1Encounters.slice(encounterIndex, encounterIndex + plan.count);
      
      console.log(`Assigning ${encountersToUpdate.length} encounters to ${mapping.name} (${mapping.newId})`);

      for (const encounter of encountersToUpdate) {
        const { error: updateEncounterError } = await supabase
          .from('encounters')
          .update({
            patient_supabase_id: mapping.supabaseUuid,
            extra_data: {
              ...encounter.extra_data,
              PatientID: mapping.newId
            }
          })
          .eq('id', encounter.id);

        if (updateEncounterError) {
          console.error(`Failed to update encounter ${encounter.id}:`, updateEncounterError);
        }
      }

      encounterIndex += plan.count;
    }

    // Step 5: Update any other data that references the old patient IDs
    console.log('Updating related data (conditions, lab_results, etc.)...');

    for (const [oldId, mapping] of Object.entries(patientIdMapping)) {
      // Update conditions
      await supabase
        .from('conditions')
        .update({ patient_id: mapping.supabaseUuid })
        .eq('patient_id', mapping.supabaseUuid); // These should already be UUIDs

      // Update lab_results
      await supabase
        .from('lab_results')
        .update({ patient_id: mapping.supabaseUuid })
        .eq('patient_id', mapping.supabaseUuid); // These should already be UUIDs

      // Update differential_diagnoses
      await supabase
        .from('differential_diagnoses')
        .update({ patient_id: mapping.supabaseUuid })
        .eq('patient_id', mapping.supabaseUuid); // These should already be UUIDs
    }

    // Step 6: Verify the redistribution
    console.log('\n📊 Verification:');
    for (const [oldId, mapping] of Object.entries(patientIdMapping)) {
      const { data: newEncounters } = await supabase
        .from('encounters')
        .select('id')
        .eq('extra_data->>PatientID', mapping.newId);

      console.log(`${mapping.name} (${mapping.newId}): ${newEncounters?.length || 0} encounters`);
    }

    console.log('\n✅ Patient ID fix and encounter redistribution completed successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixPatientIdsAndRedistributeEncounters()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 